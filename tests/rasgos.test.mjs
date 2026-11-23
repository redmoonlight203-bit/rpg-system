import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
import {CB,BIO,bola} from './helpers/kuro.mjs';
const {validarRasgo,etiquetasDe,potenciar,describirPotenciado,potenciadoresPara}=cargarDependencia('./rasgos');
test('el rasgo de ejemplo (bioelectricidad) se valida',()=>{assert.equal(validarRasgo(BIO),null);});
test('un potenciador acepta al menos una etiqueta y añade algo',()=>{
 assert.match(validarRasgo({...BIO,potenciadores:[{...BIO.potenciadores[0],acepta:[]}]}),/etiqueta/);
 assert.match(validarRasgo({...BIO,potenciadores:[{...BIO.potenciadores[0],componentes_anadidos:[]}]}),/al menos un componente/);
 assert.match(validarRasgo({...BIO,potenciadores:[{...BIO.potenciadores[0],acepta:['plasma']}]}),/etiqueta/);
 assert.match(validarRasgo({...BIO,recursos:[]}),/no define/);
});
test('etiquetas derivadas de la técnica',()=>{
 const et=etiquetasDe({...bola,tablero:{alcance:6,forma:'circulo',tamano:1,afecta:'todos'}});
 for(const x of ['ataque','magica','fuego','area','distancia','proyectil'])assert.ok(et.includes(x),x);
});
test('potenciar: 2 CB añaden 2d6 eléctricos; mismo elemento suma dados; máximo de componentes',()=>{
 const r=potenciar(bola,[BIO],[{rasgo:'bioelectricidad',potenciador:'carga',unidades:2}]);
 assert.equal(JSON.stringify(r.efecto.componentes.map(c=>[c.elemento,c.cantidad,c.caras])),JSON.stringify([['fuego',2,6],['electricidad',2,6]]));
 assert.equal(r.coste.recursos[0].cantidad,2);
 assert.equal(describirPotenciado('Bola de fuego',r.efecto,r.coste),'Bola de fuego 2d6 fuego + 2d6 electricidad por 2 CB');
 const otro={...BIO,id:'tormenta',nombre:'Tormenta',potenciadores:[{...BIO.potenciadores[0],id:'chispa'}]};
 const dos=potenciar(bola,[BIO,otro],[{rasgo:'bioelectricidad',potenciador:'carga',unidades:1},{rasgo:'tormenta',potenciador:'chispa',unidades:2}]);
 assert.equal(dos.efecto.componentes.length,2,'dos rasgos del mismo elemento suman sus dados');assert.equal(dos.efecto.componentes[1].cantidad,3);
 assert.throws(()=>potenciar(bola,[BIO],[{rasgo:'bioelectricidad',potenciador:'carga',unidades:1},{rasgo:'bioelectricidad',potenciador:'carga',unidades:1}]),/un solo potenciador/);
 assert.throws(()=>potenciar(bola,[BIO],[{rasgo:'bioelectricidad',potenciador:'carga',unidades:4}]),/de 1 a 3/);
 const hielo={...BIO,id:'gelido',nombre:'Gélido',potenciadores:[{...BIO.potenciadores[0],id:'h',componentes_anadidos:[{elemento:'hielo',cantidad:1,caras:4}],coste:{ph:1}}],recursos:[]};
 const agua={...hielo,id:'marea',nombre:'Marea',potenciadores:[{...hielo.potenciadores[0],id:'w',componentes_anadidos:[{elemento:'agua',cantidad:1,caras:4}]}]};
 assert.throws(()=>potenciar(bola,[BIO,hielo,agua],[{rasgo:'bioelectricidad',potenciador:'carga',unidades:1},{rasgo:'gelido',potenciador:'h'},{rasgo:'marea',potenciador:'w'}]),/máximo 3/);
 assert.equal(potenciadoresPara([BIO],{...bola,efecto:'curacion'}).length,0,'una curación no es un ataque');
});
