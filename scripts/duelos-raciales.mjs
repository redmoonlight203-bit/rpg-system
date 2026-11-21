// Compara únicamente los atributos base por nivel, sin equipo ni pasivas.
import { readFileSync } from 'node:fs';
import { agregar, iniciar, actuar, siguiente, nuevoCombate, casillasAlcanzables, desplazar, posicionesTablero, distanciaCasillas } from '../supabase/functions/equipo-combate/motor.js';

const sql=readFileSync(new URL('../supabase/migrations/20261120183100_bases_raciales_balance.sql',import.meta.url),'utf8');
const claves=['vida','armadura','ph','fatiga','bono_impacto','dano','iniciativa','salvacion','movimiento'];
const stats=lista=>Object.fromEntries(lista.split(',').map((v,i)=>[claves[i],Number(v)]));
const razas=Array.from(sql.matchAll(/\('([a-z_]+)',array\[([\d,-]+)\],array\[([\d,-]+)\]\)/g),
  ([,nombre,actual,anterior])=>({nombre,actual:stats(actual),anterior:stats(anterior)}));
if(razas.length!==8)throw Error('Se esperaban ocho perfiles raciales.');
const nivel=Number(process.argv[2]||1);
if(![1,5,10,20,50,100].includes(nivel))throw Error('Niveles de referencia: 1, 5, 10, 20, 50 y 100.');
const modalidad=process.argv[3]||'desarmado';
if(!['desarmado','magia'].includes(modalidad))throw Error('Selecciona desarmado o magia.');
const proyectil={id:'proyectil',nombre:'Proyectil',efecto:'dano',cantidad:2,caras:6,modificador:0,duracion:0,coste_ph:2,tipo_dano:'MAGIA',naturaleza:'magica',estado:'',tablero:{alcance:6,forma:'individual',tamano:0,afecta:'enemigos'}};
function combate(equipos,version,semilla){
  let estado=semilla;
  const rng=caras=>{estado=(Math.imul(1664525,estado)+1013904223)>>>0;return 1+Math.floor(estado/2**32*caras);};
  let c=nuevoCombate();
  c.regla='impacto';
  for(const [i,equipo] of equipos.entries()) for(const [fila,raza] of equipo.entries()){
    // Progresión vigente: +2 HP y +1 PH por nivel. Sin gastar puntos de árbol.
    const base=raza[version];
    const stats={...base,nivel,vida:base.vida+2*(nivel-1),ph:base.ph+nivel-1};
    const habilidades=modalidad==='magia'?[{id:'hechizo',nombre:'Proyectil',stats:{},efectos:[proyectil]}]:[];
    c=agregar(c,{id:raza.nombre,nombre:raza.nombre,forja_id:null,stats,configuracion:{tipo_creacion:'personaje',habilidades}},i?'enemigo':'jugador',rng);
    c.miembros.find(m=>m.id===raza.nombre).posicion={x:i+1,y:fila+1};
  }
  c=iniciar(c,rng);
  for(let turno=0;turno<600;turno++){
    const actor=c.miembros.find(m=>m.id===c.actual);
    const posiciones=posicionesTablero(c);
    const distancia=m=>distanciaCasillas(posiciones[actor.id],posiciones[m.id]);
    const rival=c.miembros.filter(m=>m.vida>0&&m.bando!==actor.bando).sort((x,y)=>distancia(x)-distancia(y))[0];
    if(!rival)throw Error('Falta el bando rival.');
    const usaMagia=modalidad==='magia' && actor.ph>=proyectil.coste_ph;
    const alcance=usaMagia?6:1;
    if(distancia(rival)>alcance){
      const destino=Object.keys(casillasAlcanzables(c,actor.id)).map(k=>k.split(',').map(Number))
        .map(([x,y])=>({x,y})).sort((p,q)=>distanciaCasillas(p,posiciones[rival.id])-distanciaCasillas(q,posiciones[rival.id]))[0];
      if(destino && distanciaCasillas(destino,posiciones[rival.id])<distancia(rival))c=desplazar(c,actor.id,destino);
    }
    if(distanciaCasillas(posicionesTablero(c)[actor.id],posiciones[rival.id])<=alcance){
      c=actuar(c,actor.id,usaMagia?'hab:hechizo:proyectil':'ataque',rival.id,rng);
    }
    const supervivientes=c.miembros.filter(m=>m.vida>0);
    if(new Set(supervivientes.map(m=>m.bando)).size===1)return supervivientes[0].bando==='jugador'?0:1;
    if(c.actual===actor.id)c=siguiente(c,rng);
    c.historial=[];c.registro=[];
  }
  return null;
}
const repeticiones=32;
console.log(`Nivel ${nivel}, modalidad ${modalidad}. Semilla 20261120. Porcentajes de victoria sobre los 7 rivales, alternando los bandos.`);
console.log('| Raza | Antes | Después |');
console.log('|---|---:|---:|');
const resultados={};
for(const version of ['anterior','actual']){
  const victorias=new Map(razas.map(r=>[r.nombre,0]));
  for(const [i,a] of razas.entries())for(const b of razas.slice(i+1)){
    for(let n=0;n<repeticiones;n++){
      const semilla=20261120+Math.floor(n/2)*65537;
      const bandos=n%2?[[b],[a]]:[[a],[b]];
      const indice=combate(bandos,version,semilla);
      if(indice===null)continue;
      const ganador=bandos[indice][0].nombre;
      victorias.set(ganador,victorias.get(ganador)+1);
    }
  }
  resultados[version]=victorias;
}
for(const raza of razas){
  const porcentaje=v=>(resultados[v].get(raza.nombre)*100/(7*repeticiones)).toFixed(1)+' %';
  console.log('| '+[raza.nombre,porcentaje('anterior'),porcentaje('actual')].join(' | ')+' |');
}

const equipoA=['personajes','elfos','enanos'].map(k=>razas.find(r=>r.nombre===k));
const equipoB=['gigantes','hadas','hombres_bestia'].map(k=>razas.find(r=>r.nombre===k));
const tasas=[];
for(const version of ['anterior','actual']){
  let victorias=0,inconclusos=0;
  for(let n=0;n<repeticiones;n++){
    const bandos=n%2?[equipoB,equipoA]:[equipoA,equipoB];
    const ganador=combate(bandos,version,20261120+Math.floor(n/2)*65537);
    if(ganador===null)inconclusos++; else if(bandos[ganador]===equipoA)victorias++;
  }
  tasas.push((victorias*100/repeticiones).toFixed(1)+' % ('+inconclusos+' inconclusos)');
}
console.log('| Humano, elfo y enano contra gigante, hada y hombre bestia (3 contra 3) | '+tasas.join(' | ')+' |');
