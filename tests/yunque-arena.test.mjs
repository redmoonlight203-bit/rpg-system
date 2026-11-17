import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
// «La arena no usa la red»: cualquier fetch, dentro o fuera del contexto del módulo, falla y se cuenta.
let llamadasRed=0;
const sinRed=()=>{llamadasRed++;throw Error('red');};
const fetchOriginal=globalThis.fetch;
globalThis.fetch=sinRed;
test.after(()=>{globalThis.fetch=fetchOriginal;});
const A=cargarDependencia('yunque-arena',{fetch:sinRed});
const {acciones,deshacer}=cargarDependencia('combate');
const {aGrafo}=cargarDependencia('yunque-grafo');
const F=JSON.parse(readFileSync(new URL('./fixtures/yunque-borradores.json',import.meta.url),'utf8'));
const clon=x=>JSON.parse(JSON.stringify(x));
const creacion=b=>({id:b.id,nombre:b.nombre,tipo:b.clasificacion,tipo_creacion:b.tipo,descripcion:'',historia:'',requisitos:'',defectos:'',imagen_url:'',clase:b.clase,stats:b.stats,stats_rango:{},es_grupo:false,slot_tipo:b.slot,estado:'',ligado_al_alma:false,es_vendible:false,precio_sugerido:'',habilidades:[],pasivas:[],reglas:b.reglas,reglas_pasivas:b.reglas_pasivas,equipamiento:{},configuracion_dados:b.efectos,requisitos_uso:b.requisitos_uso});
const CREACIONES=[F.objeto,F.habilidad,F.pasiva].map(creacion);
const ctx=(b,creaciones=CREACIONES)=>({creaciones,stats:b.stats});
const ctxGrafo={creaciones:CREACIONES.map(c=>({id:c.id,nombre:c.nombre,tipo_creacion:c.tipo_creacion}))};
const m=(c,id)=>c.miembros.find(x=>x.id===id);
const arena=(b,...rest)=>{const r=A.crearArena(b,ctx(b),...rest);assert.ok(r.combate,r.error);return r.combate;};

test('ajustes base del doll y del saco',()=>{
 assert.deepEqual(clon(A.DOLL_BASE),{vida:40,ph:20,fatiga:10,armadura:0,salvacion:0});
 assert.deepEqual(clon(A.SACO_BASE),{vida:60,ph:0,fatiga:0,armadura:0,salvacion:0});
});

test('cada tipo de los fixtures crea una arena válida con doll y saco',()=>{
 for(const [k,b] of Object.entries(F)){
  const r=A.crearArena(clon(b),ctx(b));
  assert.equal(r.error,undefined,`${k}: ${r.error}`);
  const c=r.combate;
  assert.equal(c.fase,'en_curso',k);assert.equal(c.actual,'doll',k);
  assert.deepEqual(c.miembros.map(x=>x.id).sort(),['doll','saco'],k);
  const saco=m(c,'saco');assert.equal(saco.vida,60,k);assert.equal((saco.configuracion.habilidades||[]).length,0,k);
 }
 const objeto=m(arena(clon(F.objeto)),'doll');
 assert.equal(objeto.configuracion.equipamiento.mano_der.nombre,'Lanza del Alba');
 assert.equal(objeto.vida,40);assert.equal(objeto.ph,20);
 assert.ok(acciones(objeto).some(a=>a.id==='equipo:mano_der:e-estocada'));
 const habilidad=m(arena(clon(F.habilidad)),'doll');
 assert.deepEqual(habilidad.configuracion.habilidades[0].efectos.map(e=>e.id),['h-llamado']);
 assert.deepEqual(habilidad.configuracion.habilidades[0].reglas.map(r=>r.id),['r-herida']);
 assert.ok(acciones(habilidad).some(a=>a.id===`hab:${F.habilidad.id}:h-llamado`),'los requisitos de uso no bloquean la prueba');
 const pasiva=m(arena(clon(F.pasiva)),'doll');
 assert.deepEqual(pasiva.configuracion.pasivas[0].reglas.map(r=>r.id),['p-corteza','p-savia']);
 const personaje=m(arena(clon(F.personaje)),'doll');
 assert.equal(personaje.nombre,'Aldric');assert.equal(personaje.vida,40);assert.equal(personaje.ph,12);
 assert.deepEqual(personaje.configuracion.habilidades.map(h=>h.nombre),['Llamado del Lobo']);
 assert.deepEqual(personaje.configuracion.pasivas.map(p=>p.nombre),['Piel de Roble']);
 assert.equal(personaje.configuracion.equipamiento.mano_der.nombre,'Lanza del Alba');
 assert.equal(m(arena(clon(F.titulo)),'doll').configuracion.equipamiento.titulo.nombre,F.titulo.nombre);
});

test('usar una acción de daño baja la vida del saco y el saco nunca actúa',()=>{
 const b=clon(F.objeto);
 const c=arena(b);
 const n=A.usar(c,'equipo:mano_der:e-estocada','saco',()=>3);
 assert.equal(m(n,'saco').vida,60-(3+3+2));
 assert.equal(n.actual,'doll');assert.equal(n.ronda,c.ronda+1);assert.equal(m(n,'doll').accion_usada,false);
 const nuevas=n.registro.slice(0,n.registro.length-c.registro.length);
 assert.equal(nuevas.filter(l=>/: coste \d+ PH/.test(l)).length,1,'solo actúa el portador');
 assert.ok(!nuevas.some(l=>l.startsWith('Saco de golpes ·')||/Golpéame/.test(l)));
 assert.ok(A.activados(c,n,aGrafo(b,ctxGrafo)).includes('accion:e-estocada'));
 assert.equal(m(deshacer(n),'saco').vida,60,'usar se deshace en un solo paso');
});

test('golpeame mágico activa una reacción de absorción del portador',()=>{
 const b=clon(F.antigua);b.tipo='habilidad';
 const c=arena(b);
 const n=A.golpeame(c,{cantidad:2,caras:8,naturaleza:'magica'},()=>6);
 const d=m(n,'doll'),perdida=40-d.vida;
 assert.ok(perdida>0&&perdida<12,`perdió ${perdida} de 12`);
 assert.equal(d.recursos_especiales['Energía absorbida'],3);
 assert.equal(n.actual,'doll');assert.equal(d.accion_usada,false);
 assert.equal((m(n,'saco').configuracion.habilidades||[]).length,0,'el saco sigue sin habilidades');
 assert.ok(A.activados(c,n,aGrafo(b,ctxGrafo)).includes('reaccion:a-absorcion'));
 const atras=deshacer(n);assert.equal(m(atras,'doll').vida,40);assert.equal(atras.actual,'doll');
 // Un golpe físico no dispara la absorción (solo mágica).
 assert.equal(40-m(A.golpeame(c,{cantidad:2,caras:8,naturaleza:'fisica'},()=>6),'doll').vida,12);
});

test('golpeame activa una pasiva recibir_dano',()=>{
 const b=clon(F.pasiva);
 b.reglas_pasivas.push({id:'p-espinas',nombre:'Espinas',condicion:'siempre',evento:'recibir_dano',bonos:{},curacion:0,recuperar_ph:0,reducir_fatiga:0,represalia_dados:1,represalia_caras:4});
 const c=arena(b);
 const n=A.golpeame(c,{cantidad:1,caras:6,naturaleza:'fisica',elemento:'fuego'},()=>2);
 assert.ok(n.registro.some(l=>l.includes('Espinas (recibir_dano).')));
 assert.equal(m(n,'saco').vida,60-2,'la represalia llega al saco');
 const ids=A.activados(c,n,aGrafo(b,ctxGrafo));
 assert.ok(ids.includes('pasiva:p-espinas'),ids.join());
 assert.ok(!ids.includes('pasiva:p-savia'));
});

test('activados enciende las reglas del motor',()=>{
 const b=clon(F.objeto);
 b.reglas=[{id:'r-eco',nombre:'Eco',evento:'causar_dano',condicion:{tipo:'siempre'},efectos:[{tipo:'mensaje',destino:'yo',nombre:'Eco'}],coste_ph:0,coste_fatiga:0,enfriamiento:0,usos:0,prioridad:0}];
 const c=arena(b);
 const n=A.usar(c,'equipo:mano_der:e-estocada','saco',()=>3);
 assert.ok(A.activados(c,n,aGrafo(b,ctxGrafo)).includes('cuando:r-eco'));
});

test('el saco a 0 de vida se recompone',()=>{
 const c=arena(clon(F.objeto),undefined,{vida:5});
 const n=A.usar(c,'equipo:mano_der:e-estocada','saco',()=>6);
 assert.equal(n.fase,'en_curso');assert.equal(m(n,'saco').vida,5);
 assert.ok(n.registro.includes('El saco se recompone.'));
 assert.equal(n.actual,'doll');
});

test('borrador con dados en 0 devuelve un error en vez de lanzar',()=>{
 const b=clon(F.objeto);b.efectos[1].cantidad=0;b.efectos[1].caras=0;
 const r=A.crearArena(b,ctx(b));
 assert.equal(r.combate,undefined);
 assert.match(r.error,/^La prueba no puede empezar: ./);
});

test('personaje con habilidad borrada arranca sin ella',()=>{
 const b=clon(F.personaje);b.habilidades=[...b.habilidades,'00000000-0000-4000-8000-0000000000ff'];
 const r=A.crearArena(b,ctx(b,CREACIONES.filter(c=>c.tipo_creacion!=='habilidad')));
 assert.equal(r.error,undefined);
 const d=m(r.combate,'doll');
 assert.equal((d.configuracion.habilidades||[]).length,0);
 assert.equal(d.configuracion.pasivas.length,1);
});

test('ajustes del doll editables',()=>{
 const d=m(arena(clon(F.habilidad),{vida:25,armadura:3}),'doll');
 assert.equal(d.vida,25);assert.equal(d.stats.armadura,3);assert.equal(d.ph,20);
});

test('la arena no usa la red',()=>{
 const b=clon(F.antigua);b.tipo='habilidad';
 A.golpeame(arena(b),{cantidad:1,caras:4,naturaleza:'magica'});
 const p=arena(clon(F.personaje));A.usar(p,'equipo:mano_der:e-estocada');
 assert.equal(llamadasRed,0);
});

test('turno pasa sin actuar y vuelve al portador en un solo paso',()=>{
 const c=arena(clon(F.objeto));
 const n=A.turno(c);
 assert.equal(n.actual,'doll');assert.equal(n.ronda,c.ronda+1);
 assert.equal(m(n,'saco').vida,60);
 assert.equal(m(n,'doll').vida,m(c,'doll').vida,'el doll no pierde ni gana vida');
 assert.equal(deshacer(n).ronda,c.ronda,'turno se deshace en un solo paso');
});

test('leerPaso: lo absorbido sale de las líneas reales del registro',()=>{
 const b=clon(F.antigua);b.tipo='habilidad';
 const c=arena(b);
 // Absorción (Kion): detiene 6 fijos de un golpe mágico de 12.
 const n=A.golpeame(c,{cantidad:2,caras:8,naturaleza:'magica'},()=>6);
 const r=A.leerPaso(c,n,1);
 const de=(tipo,quien='doll')=>r.flotantes.filter(f=>f.tipo===tipo&&f.quien===quien).map(f=>f.valor);
 assert.deepEqual(clon(de('dano')),[40-m(n,'doll').vida]);
 assert.deepEqual(clon(de('absorbido')),[12-(40-m(n,'doll').vida)]);
 assert.ok(r.dados.length>0&&r.dados.every(d=>d.caras===8||d.caras===20),'dados del golpe');
 // Golpe que tumba al doll: lo recibido se topa en su vida, pero lo absorbido sigue siendo lo que detuvo la reacción.
 const bajo=arena(b,{vida:3});
 const k=A.golpeame(bajo,{cantidad:2,caras:8,naturaleza:'magica'},()=>6);
 assert.equal(m(k,'doll').vida,0);
 const rk=A.leerPaso(bajo,k,2);
 assert.deepEqual(clon(rk.flotantes.filter(f=>f.tipo==='dano').map(f=>f.valor)),[3]);
 assert.deepEqual(clon(rk.flotantes.filter(f=>f.tipo==='absorbido').map(f=>f.valor)),[6],'no 9: el exceso no lo absorbió nadie');
 // Totales intermedios: × 2 y «Tras ARM» cambian el total antes de la reacción.
 const falso=(registro,vida)=>({...c,registro,miembros:c.miembros.map(x=>x.id==='doll'?{...x,vida}:x)});
 const base=falso([...c.registro],40);
 const doble=falso(['Doll portador recibe 10 daño; vida 30.','Doll portador activa Absorción (2 PH).','Superconducción: daño principal × 2.','Daño: dados 8 + modificador 0 + bono 0 = 8.',...c.registro],30);
 assert.deepEqual(clon(A.leerPaso(base,doble,3).flotantes.filter(f=>f.tipo==='absorbido').map(f=>f.valor)),[6],'16 tras × 2, recibe 10');
 const arm=falso(['Doll portador recibe 4 daño; vida 36.','Doll portador activa Absorción (2 PH).','Tras ARM: 7.','Daño: dados 9 + modificador 0 + bono 0 = 9.',...c.registro],36);
 assert.deepEqual(clon(A.leerPaso(base,arm,4).flotantes.filter(f=>f.tipo==='absorbido').map(f=>f.valor)),[3],'7 tras ARM, recibe 4');
 const salvada=falso(['Doll portador recibe 9 daño; vida 31.','Doll portador: salvación d20 (2) + salvacion (0) = 2, CD 14: fallida.','Doll portador activa Absorción (2 PH).','Daño: dados 9 + modificador 0 + bono 0 = 9.',...c.registro],31);
 assert.equal(A.leerPaso(base,salvada,5).flotantes.filter(f=>f.tipo==='absorbido').length,0,'una reacción con la salvación fallida no absorbe');
});
test('personaje con habilidad archivada arranca sin ella (como el grafo, que la marca rota)',()=>{
 const b=clon(F.personaje);
 const creaciones=CREACIONES.map(c=>c.tipo_creacion==='habilidad'?{...c,estado:'archivado'}:{...c,estado:'aprobado'});
 const r=A.crearArena(b,ctx(b,creaciones));
 assert.equal(r.error,undefined);
 const d=m(r.combate,'doll');
 assert.equal((d.configuracion.habilidades||[]).length,0);
 assert.equal(d.configuracion.pasivas.length,1);
 const g=aGrafo(b,{creaciones:creaciones.map(c=>({id:c.id,nombre:c.nombre,tipo_creacion:c.tipo_creacion,estado:c.estado}))});
 assert.ok(g.nodos.some(n=>n.tipo==='vinculo'&&n.error==='Esta creación ya no está en La Creación.'));
});
