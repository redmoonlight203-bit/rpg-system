import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,defensas,aplica,campoE} from './helpers/campo-estados.mjs';
import {BIO,rasgoEf,bola} from './helpers/kuro.mjs';
// Partida de prueba del plan maestro (verificación global): todo creado como DATOS, sin código nuevo por caso.
const mordisco={id:'desarmado',nombre:'Mordisco',alcance:1,dano:{cantidad:2,caras:6,modificador:0,tipo_dano:'perforante',naturaleza:'natural'},coste:{ph:0,fatiga:1},animacion:'punos',requiere_mano:false};
const caparazon={id:'guardia',nombre:'Caparazón',bonos:{armadura:4},duracion:{tipo:'turnos',turnos:2},coste:{ph:0,fatiga:0},condiciones:{inmovil:true}};
const pasivo=(id,extra)=>ef(id,{efecto:'estado',estado:id,cantidad:0,solo_pasivo:true,...extra});
function partida(){
 return campoE([
  {id:'kuro',bando:'jugador',x:1,y:1,stats:{fatiga:6},efectos:[bola,rasgoEf(BIO),ef('dominar',{efecto:'estado',estado:'',estado_tipo:'control_mental',duracion:2,cantidad:0,ignora:['categoria:mental'],tablero:{alcance:6,forma:'individual',tamano:0,afecta:'todos'}}),ef('miedo',{efecto:'estado',estado:'',estado_tipo:'control_mental',duracion:2,cantidad:0,tablero:{alcance:6,forma:'individual',tamano:0,afecta:'todos'}}),ef('ola',{elemento:'agua',cantidad:1,caras:4,tablero:{alcance:6,forma:'individual',tamano:0,afecta:'todos'}})]},
  {id:'dragon',bando:'enemigo',x:4,y:1,stats:{fatiga:6},efectos:[pasivo('escamas',{inmunidades:[{tipo:'dano',valor:'fuego',modo:'bloquear_dano'},{tipo:'estado',valor:'quemadura',modo:'bloquear_aplicacion'}],concepto:mordisco}),pasivo('caparazon',{concepto:caparazon})]},
  {id:'monje',bando:'enemigo',x:2,y:3,efectos:[ef('golpe'),pasivo('mente',{inmunidades:[{tipo:'categoria',valor:'mental:control',modo:'bloquear_aplicacion'}]})]},
 ]);
}
test('dragón inmune al fuego y a Quemadura: la Bola de fuego no lo daña ni lo quema',()=>{
 const n=m.actuar(turnoDe(partida(),'kuro'),'kuro','hab:hkuro:bola','dragon',dados([3]));
 assert.equal(de(n,'dragon').vida,50);assert.equal(de(n,'dragon').estados.length,0);
});
test('Bola de fuego potenciada con bioelectricidad sobre un dragón Mojado: solo el rayo pasa, con Superconducción',()=>{
 const mojar=m.actuar(turnoDe(partida(),'kuro'),'kuro','hab:hkuro:ola','dragon',dados([2]));
 assert.ok(de(mojar,'dragon').estados.some(e=>e.tipo==='mojado'));
 const n=m.actuar(turnoDe(mojar,'kuro'),'kuro','hab:hkuro:bola','dragon',dados([3]),false,undefined,[{rasgo:'bioelectricidad',potenciador:'carga',unidades:2}]);
 assert.equal(de(n,'dragon').vida,50-4-18,'agua 1d4+1d4 = 4 y luego rayo (2d6+1d4)×2 = 18; el fuego no pasa');
 assert.match(n.registro.join('\n'),/Técnica potenciada: Bola de fuego 2d6 fuego \+ 2d6 electricidad por 2 CB/);
});
test('personaje inmune al control mental: la habilidad común falla, la que lo ignora le controla',()=>{
 assert.equal(de(m.actuar(turnoDe(partida(),'kuro'),'kuro','hab:hkuro:miedo','monje',dados([1])),'monje').estados.length,0);
 const n=m.actuar(turnoDe(partida(),'kuro'),'kuro','hab:hkuro:dominar','monje',dados([1]));
 assert.equal(m.controlDe(de(n,'monje')).fuente,'kuro');
});
test('desarmado y guardia personalizados del dragón',()=>{
 const c=partida();const d=de(c,'dragon');
 const ataque=m.acciones(d).find(a=>a.id==='ataque');assert.equal(ataque.nombre,'Mordisco');
 const g=m.actuar(turnoDe(c,'dragon'),'dragon','guardia','dragon',dados([1]));
 assert.equal(m.estadisticas(de(g,'dragon')).armadura,4);assert.equal(m.movimientoRestante(de(g,'dragon')),0);
});
test('los seis esqueletos base animan su arma',()=>{
 for(const id of ['espada','hacha','lanza','arco','baston','punos']){
  const c=campoE([{id:'k',bando:'jugador',x:1,efectos:[ef('golpe',{esqueleto:id})]},{id:'o',bando:'enemigo',x:2}]);
  const n=m.actuar(turnoDe(c,'k'),'k','hab:hk:golpe','o',dados([1]));
  assert.equal(n.evento_visual.arma_visual,id);
 }
});
