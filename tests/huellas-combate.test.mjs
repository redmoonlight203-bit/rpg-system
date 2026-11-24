import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../supabase/functions/equipo-combate/motor.js';

const punto=(x,y)=>({x,y});
const huella=(ancho,alto)=>({ancho,alto});
const rng=()=>20;
const blanco=(b,id)=>b.miembros.find(m=>m.id===id);
const prisma=(id,x,y,tamano,efectos=[])=>({
 id,nombre:id,forja_id:null,posicion:punto(x,y),
 stats:{vida:40,ph:8,fatiga:10,armadura:0,movimiento:7},
 configuracion:{tipo_creacion:'personaje',huella:tamano,habilidades:efectos.length?[{id:'h',nombre:'Pruebas',stats:{},efectos}]:[]},
});
const mapa=(celdas={})=>({id:'mapa',version:1,nombre:'Cuadrícula',columnas:8,filas:8,celdas});
function preparar(actor,enemigos,celdas={}){
 let b=c.configurarMapa(c.nuevoCombate(),mapa(celdas));
 b=c.agregar(b,actor,'jugador',rng);
 for(const enemigo of enemigos)b=c.agregar(b,enemigo,'enemigo',()=>1);
 b.regla='directo';
 return b;
}
const empezar=(...args)=>c.iniciar(preparar(...args),()=>1);
const golpe=(tablero)=>({
 id:'golpe',nombre:'Impacto controlado',efecto:'dano',cantidad:0,caras:6,modificador:5,
 tipo_dano:'fisico',estado:'',duracion:0,coste_ph:0,coste_fatiga:0,tablero,
});
const forma={
 id:'forma',nombre:'Forma colosal',efecto:'transformacion',cantidad:0,caras:6,modificador:0,
 coste_ph:3,coste_fatiga:0,transformacion:{id:'coloso',nombre:'Coloso',tipo:'forma',
 etapas:[{id:'grande',nombre:'Grande',stats:{},huella:huella(3,3)}]},
};

test('colocación conserva un ancla válida y reserva las cuatro casillas, incluso en el borde',()=>{
 const b=preparar(prisma('a',6,6,huella(2,2)),[prisma('b',7,7)]);
 const p=c.posicionesTablero(b);
 assert.deepEqual(p.a,punto(6,6));
 assert.ok(p.b,'el segundo combatiente debe quedar colocado');
 assert.ok(!(p.b.x>=6&&p.b.y>=6),'una casilla no ancla también está ocupada');
});

test('el tablero reubica huellas cuyo borde solapa un muro o excede el mapa',()=>{
 for(const [x,y,celdas] of [[6,6,{'7,7':'muro'}],[7,6,{}]]){
  const b=preparar(prisma('a',x,y,huella(2,2)),[prisma('b',4,4)],celdas);
  const p=c.posicionesTablero(b).a;
  assert.ok(p && p.x>=0&&p.y>=0&&p.x<=6&&p.y<=6);
  for(const dx of [0,1])for(const dy of [0,1])assert.notEqual(celdas[(p.x+dx)+','+(p.y+dy)],'muro');
 }
});

test('movimiento valida toda la huella que se mueve y las casillas no ancla de otros',()=>{
 const b=empezar(prisma('a',1,1,huella(2,2)),[prisma('b',3,2,huella(2,2))],{'2,3':'muro'});
 assert.equal(c.casillasAlcanzables(b,'a')['2,1'],undefined,'colisión solo en la esquina');
 assert.equal(c.casillasAlcanzables(b,'a')['1,2'],undefined,'muro bajo la esquina no ancla');
 assert.equal(c.casillasAlcanzables(b,'a')['7,1'],undefined,'no sobresale del tablero');
 assert.throws(()=>c.desplazar(b,'a',punto(2,1)),/casilla|movimiento/i);
 const n=c.desplazar(b,'a',punto(0,1));
 assert.deepEqual(c.posicionesTablero(n).a,punto(0,1));
 assert.equal(blanco(n,'a').movimiento.gastado,1);
 const individual=empezar(prisma('a',2,3),[prisma('b',3,2,huella(2,2))]);
 assert.equal(c.casillasAlcanzables(individual,'a')['3,3'],undefined);
});

test('alcance individual usa la distancia mínima entre las huellas',()=>{
 const habilidad=golpe({alcance:1,forma:'individual',tamano:0,afecta:'enemigos'});
 const b=empezar(prisma('a',1,1,huella(3,2),[habilidad]),[prisma('b',4,2,huella(2,2)),prisma('lejos',5,4)]);
 const n=c.actuar(b,'a','hab:h:golpe','b',rng);
 assert.equal(blanco(n,'b').vida,35);
 assert.throws(()=>c.actuar(b,'a','hab:h:golpe','lejos',rng),/alcance|distancia/i);
});

test('un área daña por intersección, una sola vez aunque cubra varias casillas',()=>{
 const habilidad=golpe({alcance:8,forma:'cuadrado',tamano:3,afecta:'enemigos'});
 const b=empezar(prisma('a',1,1,undefined,[habilidad]),[prisma('b',3,2,huella(3,3)),prisma('e',4,5)]);
 const n=c.actuar(b,'a','hab:h:golpe','',rng,false,punto(5,4));
 assert.equal(blanco(n,'b').vida,35,'cuatro celdas del blanco dentro, su ancla fuera');
 assert.equal(blanco(n,'e').vida,35);
 assert.equal(n.evento_visual.cambios_vida.filter(cambio=>cambio.id==='b').length,1);
});

test('transformación que no cabe no cambia ancla ni gasta acción o PH',()=>{
 for(const [x,y,bx,by,terreno] of [
  [1,1,3,3,{}],
  [1,1,6,6,{'3,3':'muro'}],
  [6,6,3,3,{}],
 ]){
  const b=empezar(prisma('a',x,y,huella(2,1),[forma]),[prisma('b',bx,by)],terreno);
  const antes=JSON.stringify(b);
  assert.throws(()=>c.actuar(b,'a','hab:h:forma','a',rng),/espacio|casilla|huella|cabe|forma|tamaño/i);
  assert.equal(JSON.stringify(b),antes);
 }
});

test('transformación válida mantiene el ancla y volver libera solo el espacio añadido',()=>{
 let b=empezar(prisma('a',1,1,huella(2,1),[forma]),[prisma('e',4,3)]);
 b=c.actuar(b,'a','hab:h:forma','a',rng);
 assert.equal(blanco(b,'a').transformacion?.etapa_id,'grande');
 assert.deepEqual(c.posicionesTablero(b).a,punto(1,1));
 assert.equal(c.casillasAlcanzables(b,'e')['3,3'],undefined);
 b=c.siguiente(c.siguiente(b,rng),rng);
 b=c.actuar(b,'a','volver_forma','a',rng);
 assert.ok(!blanco(b,'a').transformacion);
 assert.deepEqual(c.posicionesTablero(b).a,punto(1,1));
 assert.equal(c.casillasAlcanzables(b,'e')['3,3'],1);
 assert.equal(c.casillasAlcanzables(b,'e')['2,1'],undefined,'la extensión original de dos casillas permanece');
});

test('el GM puede ajustar a un personaje real en preparación; un tamaño que no cabe no muta el encuentro',()=>{
 const b=preparar({...prisma('jugador',1,1),personaje_id:'personaje-registrado'},[prisma('otro',3,3)]);
 const a=c.configurarHuellaParticipante(b,'jugador',huella(2,2));
 assert.deepEqual(c.huellaDe(blanco(a,'jugador')),huella(2,2));
 assert.equal(blanco(a,'jugador').personaje_id,'personaje-registrado');
 assert.throws(()=>c.configurarHuellaParticipante(a,'jugador',huella(3,3)),/espacio/);
 assert.deepEqual(c.huellaDe(blanco(a,'jugador')),huella(2,2));
 assert.throws(()=>c.configurarHuellaParticipante(c.iniciar(a,rng),'jugador',huella(1,1)),/antes de iniciar/);
});

test('una forma más pequeña reserva el espacio base hasta expirar automáticamente',()=>{
 const menor={...forma,duracion:1,transformacion:{...forma.transformacion,duracion_turnos:1,etapas:[{id:'menor',nombre:'Menor',stats:{},huella:huella(1,1)}]}};
 let b=empezar(prisma('a',5,5,huella(2,2),[menor]),[prisma('b',7,7)]);
 b=c.actuar(b,'a','hab:h:forma','a',rng);
 assert.deepEqual(c.huellaDe(blanco(b,'a')),huella(1,1));
 assert.equal(c.casillasAlcanzables(b,'a')['7,5'],undefined);
 assert.equal(c.casillasAlcanzables(b,'b')['6,6'],undefined);
 b=c.siguiente(c.siguiente(c.siguiente(b,rng),rng),rng);
 assert.equal(blanco(b,'a').transformacion,null);
 assert.deepEqual(c.huellaDe(blanco(b,'a')),huella(2,2));
 assert.deepEqual(c.posicionesTablero(b).a,punto(5,5));
});

test('una casilla cercana no cubierta de una ficha grande no hereda la cobertura de su ancla',()=>{
 const ataque=golpe({alcance:3,forma:'individual',tamano:0,afecta:'enemigos'});
 const b=empezar(prisma('a',6,2,undefined,[ataque]),[prisma('b',2,2,huella(3,1))],{'2,2':'cobertura'});
 b.regla='impacto';
 const n=c.actuar(b,'a','hab:h:golpe','b',caras=>caras===20?1:5);
 // El 1 puede fallar por su regla propia; la armadura mostrada no incluye los +2 del ancla cubierta.
 assert.ok(n.registro.some(linea=>linea.includes('ARM 0.')));
});
