// Evolución y legado: lógica pura y combate. Datos ficticios (ningún personaje ni lobo es contenido de campaña).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia as cargar} from './helpers/cargar-ts.mjs';
import * as c from '../supabase/functions/equipo-combate/motor.js';
const ev=cargar('evolucion');
// El módulo se evalúa en otro contexto de vm: se comparan valores planos.
const igual=(a,b,m)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),b,m);

const etapa=(id,nombre,stats,extra={})=>({id,tipo:'etapa_vida',nombre,stats,habilidades:[],pasivas:[],...extra});
const t=(id,desde,hasta,requisito={tipo:'autorizacion_gm'},extra={})=>({id,desde,hasta,requisito,modo:'manual_gm',...extra});
const vida=()=>({version:1,inicial:'e6',etapas:[
 etapa('e6','Infancia',{vida:12,ph:2,fuerza:1},{edad:6}),etapa('e12','Adolescencia',{vida:20,ph:4,fuerza:3},{edad:12}),
 etapa('e18','Juventud',{vida:35,ph:8,fuerza:6},{edad:18}),etapa('e30','Adultez',{vida:45,ph:10,fuerza:8},{edad:30}),
],transiciones:[t('a','e6','e12',{tipo:'edad',minimo:12},{modo:'automatica'}),t('b','e12','e18',{tipo:'edad',minimo:18},{modo:'automatica'}),t('c','e18','e30',{tipo:'edad',minimo:30},{modo:'automatica'})]});
const lobos=()=>({version:1,inicial:'joven',etapas:[
 etapa('joven','Lobo joven',{vida:20},{tipo:'evolucion'}),etapa('adulto','Lobo adulto',{vida:35},{tipo:'evolucion'}),
 etapa('guerra','Lobo de guerra',{vida:60,fuerza:9},{tipo:'evolucion'}),etapa('colosal','Lobo colosal',{vida:120},{tipo:'evolucion',final:true,huella:{ancho:2,alto:2}}),
 etapa('espiritu','Lobo espiritual',{vida:45,ph:20},{tipo:'evolucion',secreta:true}),etapa('ancestral','Lobo ancestral',{vida:80,ph:40},{tipo:'evolucion',final:true}),
],transiciones:[t('t1','joven','adulto',{tipo:'nivel',minimo:5},{modo:'automatica'}),t('t2','adulto','guerra',{tipo:'derrotar',forja_id:'oso',cantidad:3},{exclusiva:true}),t('t3','guerra','colosal'),
 t('t4','adulto','espiritu',{tipo:'todas',condiciones:[{tipo:'energia',clave:'luna',minimo:10},{tipo:'no',condicion:{tipo:'mision',clave:'Caza'}}]},{secreta:true}),t('t5','espiritu','ancestral')]});
const ctx=(extra={})=>({nivel:1,exp_total:0,stats:{},objetos:[],habilidades:[],hitos:{},...extra});
const ficha=(extra={})=>({nivel:4,exp_total:900,atributos:{vida:12,ph:2,fuerza:1},vida_actual:7,ph_actual:1,...extra});
const estado=l=>({linea:l,etapa_actual:l.inicial,hitos:{},historial:[]});

test('1-2: un personaje atraviesa etapas de vida sin cambiar identidad, nivel ni EXP',()=>{
 const l=vida();assert.equal(ev.validarLinea(l),null);
 let e=estado(l),f=ficha();
 for(const [tr,edad] of [['a',12],['b',18],['c',30]]){
  const r=ev.transicionar(e,f,ctx({hitos:{edad}}),{transicion_id:tr,action_id:'acc-'+tr,origen:'automatica'});
  e=r.estado;f=r.ficha;
 }
 assert.equal(e.etapa_actual,'e30');assert.equal(f.nivel,4);assert.equal(f.exp_total,900);assert.equal(f.atributos.fuerza,8);
 assert.equal(e.historial.length,3);
});
test('3-4: el historial conserva estadísticas propias aunque la línea se edite después',()=>{
 const l=vida();const r=ev.transicionar(estado(l),ficha(),ctx({hitos:{edad:12}}),{transicion_id:'a',action_id:'x',origen:'automatica'});
 l.etapas[1].stats.fuerza=999;r.estado.linea.etapas[1].stats.vida=1;
 assert.equal(r.registro.snapshot.stats.fuerza,3);assert.equal(r.registro.snapshot.stats.vida,20);
});
test('5-6: evolución lineal y ramificada; la ruta exclusiva cierra la alternativa; las finales no evolucionan',()=>{
 const l=lobos();assert.equal(ev.validarLinea(l),null);
 let e=estado(l);
 e=ev.transicionar(e,ficha(),ctx({nivel:5}),{transicion_id:'t1',action_id:'1',origen:'automatica'}).estado;
 igual(ev.transicionesDesde(l,'adulto',e.hitos).map(x=>x.id),['t2','t4']);
 e=ev.transicionar(e,ficha(),ctx({hitos:{derrotados:{oso:3}}}),{transicion_id:'t2',action_id:'2',origen:'gm'}).estado;
 igual(e.hitos.rutas_cerradas,['t4']);
 assert.equal(ev.esFinal(l,'colosal'),true);
 assert.match(ev.validarLinea({...l,transiciones:[...l.transiciones,t('x','colosal','joven')]}),/final|inicial/);
});
test('7: requisitos Y/O/NO, objetos a consumir y salvaciones',()=>{
 const r={tipo:'todas',condiciones:[{tipo:'alguna',condiciones:[{tipo:'nivel',minimo:10},{tipo:'objeto',forja_id:'gema',consumir:true}]},{tipo:'no',condicion:{tipo:'evento',clave:'Traición'}},{tipo:'salvacion',atributo:'voluntad',cd:15}]};
 assert.equal(ev.evaluarRequisito(r,ctx({objetos:['gema'],hitos:{salvaciones:{'voluntad:15':16}}})).cumple,true);
 igual(ev.evaluarRequisito(r,ctx({objetos:['gema'],hitos:{salvaciones:{'voluntad:15':16}}})).consumir,['gema']);
 assert.equal(ev.evaluarRequisito(r,ctx({objetos:['gema'],hitos:{eventos:['Traición'],salvaciones:{'voluntad:15':20}}})).cumple,false);
 assert.equal(ev.evaluarRequisito(r,ctx({nivel:10})).cumple,false,'falta la salvación');
 igual(ev.salvacionesPendientes(r),[{atributo:'voluntad',cd:15}]);
 const l=lobos();assert.throws(()=>ev.transicionar(estado(l),ficha(),ctx(),{transicion_id:'t1',action_id:'q',origen:'automatica'}),/Faltan requisitos/);
 assert.equal(ev.transicionar(estado(l),ficha(),ctx(),{transicion_id:'t1',action_id:'q',origen:'gm',forzar:true}).registro.condiciones[0].startsWith('Forzada'),true);
});
test('7: impide ciclos, conexiones rotas y duplicadas',()=>{
 const l=lobos();
 assert.match(ev.validarLinea({...l,transiciones:[...l.transiciones,t('y','guerra','adulto')]}),/ciclo/);
 assert.match(ev.validarLinea({...l,transiciones:[t('z','joven','nadie')]}),/rota/);
 assert.equal(ev.creariaCiclo(l,'colosal','adulto'),true);assert.equal(ev.creariaCiclo(l,'joven','ancestral'),false);
});
test('13: sin recuperación accidental; recuperación solo si se configura',()=>{
 const destino=etapa('d','Mayor',{vida:40,ph:10});
 const f=ev.aplicarEtapaPermanente(ficha({vida_actual:7,ph_actual:1}),destino);
 assert.equal(f.vida_actual,7);assert.equal(f.ph_actual,1);
 assert.equal(ev.aplicarEtapaPermanente(ficha({vida_actual:12}),etapa('m','Menor',{vida:8})).vida_actual,8,'se limita al nuevo máximo');
 assert.equal(ev.aplicarEtapaPermanente(ficha(),destino,{modo:'completa'}).vida_actual,40);
 assert.equal(ev.aplicarEtapaPermanente(ficha({vida_actual:6}),destino,{modo:'proporcional'}).vida_actual,20);
 // El bono de equipo (vida_maxima_actual) se traslada: las heridas no se convierten en curación.
 const conEquipo=ev.aplicarEtapaPermanente(ficha({vida_maxima_actual:17,vida_actual:10}),destino);
 assert.equal(conEquipo.vida_maxima_actual,45);assert.equal(conEquipo.vida_actual,10);
});
test('14: el mismo action_id no evoluciona dos veces',()=>{
 const l=vida(),s={transicion_id:'a',action_id:'clic',origen:'automatica'};
 const r1=ev.transicionar(estado(l),ficha(),ctx({hitos:{edad:12}}),s);
 const r2=ev.transicionar(r1.estado,r1.ficha,ctx({hitos:{edad:12}}),s);
 assert.equal(r2.repetida,true);assert.equal(r2.estado.historial.length,1);
 assert.throws(()=>ev.transicionar(r1.estado,r1.ficha,ctx({hitos:{edad:12}}),{...s,action_id:'otro'}),/etapa actual/);
});
test('15: el jugador no activa una evolución manual del GM',()=>{
 const l=lobos();l.transiciones[0].modo='manual_gm';assert.throws(()=>ev.transicionar(estado(l),ficha(),ctx({nivel:9}),{transicion_id:'t1',action_id:'p',origen:'jugador'}),/Solo el GM/);
});
test('16: la vista del jugador oculta etapas secretas y estadísticas futuras',()=>{
 const l=lobos();let e=estado(l);e=ev.transicionar(e,ficha(),ctx({nivel:5}),{transicion_id:'t1',action_id:'1',origen:'gm'}).estado;
 const v=ev.vistaJugador(e,ctx());
 igual(v.etapas.map(x=>[x.nombre,x.estado]),[['Lobo adulto','actual'],['Lobo de guerra','siguiente']]);
 igual(v.etapas[1].stats,{});assert.equal(JSON.stringify(v).includes('espiritual'),false);
});
test('herencia: crear etapa desde la actual copia todo sin compartir referencias',()=>{
 const l=vida();l.etapas[0].reglas=[{id:'r1',nombre:'Coraje',evento:'inicio_turno',condicion:{tipo:'siempre'},efectos:[],coste_ph:0,coste_fatiga:0,enfriamiento:0,usos:0,prioridad:0}];
 const {linea,etapa:nueva}=ev.crearEtapaDesde(l,'e6',{nombre:'Infancia tardía'});
 assert.equal(nueva.nombre,'Infancia tardía');igual(nueva.stats,l.etapas[0].stats);assert.notEqual(nueva.stats,l.etapas[0].stats);
 assert.notEqual(nueva.reglas[0].id,'r1');assert.equal(ev.validarLinea(linea),null);
 igual(ev.heredarLista(['a','b','c'],{b:{conservar:false}},['d']),['a','c','d']);
 const cmp=ev.compararEtapas(l.etapas[0],l.etapas[3]);assert.equal(cmp.stats.find(x=>x.clave==='vida').delta,33);
});
test('18: las formas antiguas se leen como etapas de vida y se reflejan de vuelta',()=>{
 const l=ev.desdeFormasHistoria([{nombre:'Kion niño',historia:'h',imagen:'/k.webp'},{nombre:'',historia:'',imagen:''}],{vida:10});
 assert.equal(ev.validarLinea(l),null);assert.equal(l.etapas[1].nombre,'Forma 2');
 igual(ev.aFormasHistoria(l)[0],{nombre:'Kion niño',historia:'h',imagen:'/k.webp'});
 assert.equal(ev.desdeFormasHistoria([]),null);
});

// ── Combate ──
const ataque={id:'garra',nombre:'Garra',efecto:'dano',cantidad:0,caras:6,modificador:5,tipo_dano:'fisico',estado:'',duracion:0,coste_ph:0};
const forma={...ataque,id:'forma',nombre:'Furia',efecto:'transformacion',coste_ph:2,duracion:0,transformacion:{id:'furia',nombre:'Furia',tipo:'poder',etapas:[{id:'f1',nombre:'Furia',stats:{dano:7},habilidades:[]}]}};
function campo(politica){
 let b=c.nuevoCombate();
 b=c.agregar(b,{id:'a',personaje_id:'41',posicion:{x:1,y:1},nombre:'Lobo',forja_id:null,stats:{vida:20,ph:10,fatiga:10,dano:1},configuracion:{tipo_creacion:'personaje',stats_base:{vida:20,ph:10,fatiga:10,dano:1},habilidades:[{id:'h',nombre:'Furia',stats:{},efectos:[forma,ataque]}]}},'jugador',()=>20);
 b=c.agregar(b,{id:'b',posicion:{x:2,y:1},nombre:'Oso',forja_id:null,stats:{vida:40,ph:0},configuracion:{tipo_creacion:'personaje'}},'enemigo',()=>1);
 if(politica)b={...b,politica};
 return c.iniciar(b,()=>10);
}
const lobo=b=>b.miembros.find(m=>m.id==='a');
const colosal=etapa('colosal','Lobo colosal',{vida:60,ph:10,fatiga:10,dano:4},{tipo:'evolucion',huella:{ancho:2,alto:2},retrato:'https://example.com/colosal.webp',vfx:{entrada:'aura-dorada'}});
test('8: evoluciona en combate sin crear otro combatiente, con tamaño, retrato y registro',()=>{
 let b=campo({modo:'oficial'});lobo(b).vida=9;lobo(b).cooldowns={x:2};
 const n=c.evolucionarEnCombate(b,'a',colosal,{action_id:'evo-1',transicion_id:'t',rng:()=>1});
 assert.equal(n.miembros.length,2);const m=lobo(n);
 assert.equal(m.id,'a');assert.equal(m.stats.dano,4);assert.equal(m.vida,9,'13: sin curación');igual(m.cooldowns,{x:2},'no reinicia enfriamientos');
 igual(m.configuracion.huella,{ancho:2,alto:2});assert.equal(m.configuracion.imagen_url,'https://example.com/colosal.webp');
 assert.match(n.registro[0],/evoluciona/);assert.equal(n.actual,b.actual,'no duplica ni altera el turno');
 const piezas=new Set();for(const x of n.miembros){const p=c.posicionesTablero(n)[x.id];for(let dx=0;dx<(x.configuracion.huella?.ancho||1);dx++)for(let dy=0;dy<(x.configuracion.huella?.alto||1);dy++){const k=(p.x+dx)+','+(p.y+dy);assert.equal(piezas.has(k),false,'el empuje deja las huellas sin solaparse');piezas.add(k);}}
 assert.equal(c.evolucionarEnCombate(n,'a',colosal,{action_id:'evo-1'}),n,'14: idempotente');
 igual(c.evolucionesPendientes(n),[{personaje_id:'41',etapa_id:'colosal',transicion_id:'t',action_id:'evo-1'}]);
 igual(c.evolucionesPendientes(c.finalizar(n)).map(x=>x.etapa_id),['colosal'],'9: sigue pendiente al finalizar');
});
test('10-11: la transformación parte de la etapa evolucionada y vuelve a ella',()=>{
 let b=c.evolucionarEnCombate(campo(),'a',colosal,{action_id:'e',rng:()=>1});
 b=c.actuar(b,'a','hab:h:forma','a',()=>20);
 assert.equal(lobo(b).stats.dano,7);assert.equal(c.maxVida(lobo(b)),60);
 b=c.siguiente(c.siguiente(b,()=>20),()=>20);b=c.actuar(b,'a','volver_forma','a');
 assert.equal(lobo(b).transformacion,null);assert.equal(lobo(b).stats.dano,4,'regresa a la etapa permanente actual, no a la inicial');
});
test('evolucionar con una transformación activa actualiza su referencia',()=>{
 let b=c.actuar(campo(),'a','hab:h:forma','a',()=>20);
 b=c.evolucionarEnCombate(b,'a',colosal,{action_id:'e2',rng:()=>1});
 assert.equal(lobo(b).stats.dano,7,'conserva el poder temporal');
 assert.equal(lobo(b).transformacion.stats_originales.dano,4);
});
test('sin stats_base los bonos de equipo no se cuentan dos veces',()=>{
 let b=c.nuevoCombate();b=c.agregar(b,{id:'e',posicion:{x:1,y:1},nombre:'Eq',forja_id:null,stats:{vida:20,armadura:7},configuracion:{tipo_creacion:'personaje',bonos_equipamiento:{armadura:5}}},'jugador',()=>20);
 const n=c.evolucionarEnCombate(b,'e',etapa('x','X',{vida:30}),{action_id:'z',rng:()=>1});
 assert.equal(n.miembros[0].stats.armadura,7);assert.equal(n.miembros[0].configuracion.stats_base.armadura,2);
});
test('9/17: en práctica o en recreación histórica nunca se marca para guardar',()=>{
 const p=c.evolucionarEnCombate(campo({modo:'entrenamiento'}),'a',colosal,{action_id:'p',rng:()=>1});
 igual(c.evolucionesPendientes(p),[]);assert.equal(lobo(p).evolucion.persistir,false);
 const real={id:'x',nombre:'Axel ficticio',personaje_id:'7',stats:{vida:90,fuerza:20},configuracion:{tipo_creacion:'personaje',equipamiento:{mano_der:{id:'esp',nombre:'Espada',stats:{dano:5}}},bonos_equipamiento:{dano:5}}};
 const antes=JSON.stringify(real);
 const hist=c.prepararEtapaHistorica(real,etapa('n','Infancia · 6 años',{vida:12,fuerza:1},{retrato:'https://example.com/n.webp'}));
 assert.equal(JSON.stringify(real),antes,'no modifica al personaje real');
 assert.equal(hist.personaje_id,undefined);igual(hist.configuracion.equipamiento,{},'12: no duplica objetos reales');
 assert.equal(hist.stats.vida,12);assert.equal(hist.etapa_historica.nombre,'Infancia · 6 años');
 const pol=c.politicaHistorica({modo:'oficial',automatico:true,limite_rondas:10,exp_base:100,exp_objetivo:50,dificultad:1,reparto:'replicar',premiar_retirados:false});
 assert.equal(pol.modo,'entrenamiento');assert.equal(pol.exp_base,0);
});
test('20: rendimiento — validar y evaluar una línea grande es inmediato',()=>{
 const etapas=Array.from({length:64},(_,i)=>etapa('n'+i,'Etapa '+i,{vida:10+i}));
 const transiciones=etapas.slice(1).map((e,i)=>t('t'+i,'n'+Math.floor(i/2),e.id,{tipo:'todas',condiciones:[{tipo:'nivel',minimo:i},{tipo:'no',condicion:{tipo:'evento',clave:'x'}}]}));
 const l={version:1,inicial:'n0',etapas,transiciones};
 const inicio=performance.now();for(let i=0;i<200;i++){assert.equal(ev.validarLinea(l),null);ev.disponerArbol(l);}
 assert.ok(performance.now()-inicio<2000);
});
