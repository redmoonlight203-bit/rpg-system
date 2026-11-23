import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,aplica,campoE,contado} from './helpers/campo-estados.mjs';
// Paso 4.4: una pasiva concede inmunidad a una categoría; las rutas especiales pasan por la comprobación.
const mente={id:'mi',nombre:'Mente Inquebrantable',reglas:[],inmunidades:[{tipo:'categoria',valor:'mental:control',modo:'bloquear_aplicacion'}]};
const control=aplica('dominar',{estado_tipo:'control_mental',duracion:2,salvacion:{cd:30,atributo:'salvacion',exito:'anula'}});
const campo=()=>campoE([{id:'a',bando:'enemigo',x:1,efectos:[control,ef('golpe')]},{id:'k',bando:'jugador',x:2,pasivas:[mente]}]);
test('la pasiva bloquea un control sin tirar salvación',()=>{
 const r=contado([1]);const n=m.actuar(turnoDe(campo(),'a'),'a','hab:ha:dominar','k',r);
 assert.equal(de(n,'k').estados.length,0);assert.equal(r.n,0);
 assert.match(n.registro.join('\n'),/Mente Inquebrantable/);
});
test('un daño físico no se bloquea',()=>{
 const n=m.actuar(turnoDe(campo(),'a'),'a','hab:ha:golpe','k',dados([4]));
 assert.equal(de(n,'k').vida,46);
});
test('rutas especiales: dominar, espejo mental y la voz del artefacto pasan por la inmunidad',()=>{
 const total={id:'mt',nombre:'Mente de acero',reglas:[],inmunidades:[{tipo:'categoria',valor:'mental',modo:'bloquear_aplicacion'}]};
 const c=campoE([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2,pasivas:[total]}]);
 assert.equal(m.estaDominado(de(m.dominar(c,'k',true),'k')),false);
 assert.equal(de(m.lanzarEspejo(c,'k',{espejar:true,intercambiar:false,ocultar:false}),'k').espejo_mental,undefined);
 const r=contado([1]);assert.equal(de(m.tomarArtefacto(c,'k',{cd:15,atributo:'voluntad',voces:[]},r),'k').voz_artefacto,undefined);assert.equal(r.n,0);
 // Sin inmunidad, las rutas siguen igual (regresión).
 const libre=campoE([{id:'a',bando:'enemigo',x:1},{id:'k',bando:'jugador',x:2}]);
 assert.equal(m.estaDominado(de(m.dominar(libre,'k',true),'k')),true);
});
