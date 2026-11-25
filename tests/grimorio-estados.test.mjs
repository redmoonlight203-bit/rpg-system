import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
import {m,dados,de,turnoDe,aplica,campoE} from './helpers/campo-estados.mjs';
const g=cargarDependencia('estados-biblioteca');
const sopor={id:'sopor_toxico',nombre:'Sopor tóxico',categoria:'fisico',origen:'veneno',duracion:{tipo:'turnos',turnos:2},efectos:[{tipo:'perder_turno'},{tipo:'dano_periodico',cantidad:2,caras:6,tipo_dano:'veneno',momento:'fin'}]};
const fijo=v=>()=>v;

test('idLibre evita el catálogo base y los ya guardados',()=>{
 assert.equal(g.idLibre('congelado',[]),'congelado_2');
 assert.equal(g.idLibre('sopor',['sopor','sopor_2']),'sopor_3');
 assert.equal(g.idLibre('nuevo',[]),'nuevo');
});
test('validarEstadoGuardado: catálogo, duplicados y color',()=>{
 assert.equal(g.validarEstadoGuardado(sopor,'#aabbcc',[]),null);
 assert.match(g.validarEstadoGuardado({...sopor,id:'veneno'},'#aabbcc',[]),/catálogo base/);
 assert.match(g.validarEstadoGuardado(sopor,'#aabbcc',['sopor_toxico']),/Ya tienes/);
 assert.match(g.validarEstadoGuardado(sopor,'rojo',[]),/color/);
 assert.match(g.validarEstadoGuardado({...sopor,efectos:[{tipo:'inventada'}]},'#aabbcc',[]),/Primitiva/);
});
test('leerFila descarta filas inválidas o con id cambiado',()=>{
 assert.equal(g.leerFila({id:'sopor_toxico',definicion:sopor,color:'#112233'}).color,'#112233');
 assert.equal(g.leerFila({id:'sopor_toxico',definicion:sopor,color:null}).color,g.AURA_CATEGORIA.fisico);
 assert.equal(g.leerFila({id:'otro',definicion:sopor}),null);
 assert.equal(g.leerFila({id:'x',definicion:null}),null);
});
test('la copia para una habilidad es independiente del original',()=>{
 const c=g.copiaParaHabilidad(sopor);c.efectos[1].cantidad=9;assert.equal(sopor.efectos[1].cantidad,2);
});
test('poderEstado siempre de 1 a 5',()=>{
 for(const d of [sopor,{...sopor,efectos:[]},{...sopor,duracion:{tipo:'turnos',turnos:99},efectos:Array(8).fill({tipo:'cesion_control',controlador:'fuente'})}]){const p=g.poderEstado(d);assert.ok(p>=1&&p<=5,String(p));}
});
test('muñeco: daño periódico al final y pérdida de turno durante la duración',()=>{
 const r=g.simularEstado(sopor,{vida:30,tirar:fijo(3)});
 assert.equal(r.turnos.length,2);assert.equal(r.vidaFinal,18,'2d6=6 por turno, 2 turnos');
 assert.ok(r.turnos.every(t=>t.eventos.some(e=>e.tipo==='pierde')));
 assert.ok(r.turnos[1].eventos.some(e=>e.texto==='Se agota la duración'));
});
test('muñeco: despertar al recibir daño y salvación que rompe',()=>{
 const dormido={id:'d',nombre:'D',categoria:'mental',duracion:{tipo:'turnos',turnos:3},despertar:{recibir_dano:true},efectos:[{tipo:'perder_turno'},{tipo:'dano_periodico',cantidad:1,caras:4,tipo_dano:'fuego',momento:'inicio'}]};
 const r=g.simularEstado(dormido,{tirar:fijo(2)});assert.equal(r.turnos.length,1);assert.ok(r.turnos[0].eventos.some(e=>e.texto==='El daño lo despierta'));
 const par={id:'p',nombre:'P',categoria:'fisico',duracion:{tipo:'salvacion',salvacion:{cd:12,atributo:'salvacion'}},efectos:[{tipo:'modificador_movimiento',modo:'cero'}]};
 const r2=g.simularEstado(par,{tirar:fijo(15)});assert.equal(r2.turnos.length,1);assert.ok(r2.turnos[0].eventos.some(e=>e.tipo==='salvacion'&&/rompe/.test(e.texto)));
});
test('muñeco: bonos, inmunidades y reacciones van a «mientras dura»; hasta_su_turno acaba enseguida',()=>{
 const d={id:'g',nombre:'G',categoria:'fisico',duracion:{tipo:'hasta_su_turno'},efectos:[{tipo:'bonos',bonos:{armadura:2}}]};
 const r=g.simularEstado(d);assert.equal(JSON.stringify(r.pasivos),'["+2 armadura"]');assert.equal(r.turnos.length,1);assert.equal(r.turnos[0].activo,false);
});
test('un estado del grimorio copiado en una habilidad lo ejecuta el motor sin cambios',()=>{
 const def=g.copiaParaHabilidad(sopor);
 const n0=m.actuar(turnoDe(campoE([{id:'a',bando:'enemigo',x:1,efectos:[aplica('nube',{estado_def:def,duracion:0})]},{id:'k',bando:'jugador',x:2}]),'a'),'a','hab:ha:nube','k',dados([1]));
 const n=m.siguiente(n0,dados([5]));
 assert.equal(de(n,'k').accion_usada,true);
 assert.equal(de(m.siguiente(n,dados([5])),'k').vida,40);
});
