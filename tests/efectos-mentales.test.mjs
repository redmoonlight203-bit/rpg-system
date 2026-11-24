import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,dados,de,turnoDe,defensas,aplica,campoE,contado} from './helpers/campo-estados.mjs';
// Paso 4.3: superar la salvación, resistir e inmunidad completa son tres resultados distintos.
const miedo=aplica('miedo',{estado_tipo:'asustado',duracion:4,categoria:'mental',subcategoria:'miedo',salvacion:{cd:12,atributo:'salvacion',exito:'anula'}});
const victima=(...inm)=>({id:'k',bando:'jugador',x:2,efectos:[ef('golpe'),...(inm.length?[defensas(...inm)]:[])]});
const lanzar=(c,r)=>m.actuar(turnoDe(c,'a'),'a','hab:ha:miedo','k',r);
test('supera la salvación: el efecto no ocurre',()=>{
 const n=lanzar(campoE([{id:'a',bando:'enemigo',x:1,efectos:[miedo]},victima()]),dados([15]));
 assert.equal(de(n,'k').estados.length,0);
});
test('resiste: el efecto ocurre acortado',()=>{
 const n=lanzar(campoE([{id:'a',bando:'enemigo',x:1,efectos:[miedo]},victima({tipo:'categoria',valor:'mental',modo:'resistir'})]),dados([2]));
 const e=de(n,'k').estados.find(x=>x.tipo==='asustado');
 assert.equal(e.restantes,2,'4 turnos a la mitad');
});
test('inmunidad completa: se bloquea antes de la salvación',()=>{
 const r=contado([2]);
 const n=lanzar(campoE([{id:'a',bando:'enemigo',x:1,efectos:[miedo]},victima({tipo:'categoria',valor:'mental',modo:'bloquear_aplicacion'})]),r);
 assert.equal(de(n,'k').estados.length,0);assert.equal(r.n,0,'sin tirada');
});
test('un efecto sin categoría no se ve afectado por inmunidades mentales',()=>{
 const aturdir=aplica('golpe_seco',{estado_tipo:'aturdido',duracion:1});
 const n=m.actuar(turnoDe(campoE([{id:'a',bando:'enemigo',x:1,efectos:[aturdir]},victima({tipo:'categoria',valor:'mental',modo:'bloquear_todo'})]),'a'),'a','hab:ha:golpe_seco','k',dados([2]));
 assert.ok(de(n,'k').estados.some(e=>e.tipo==='aturdido'));
});
