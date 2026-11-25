import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {cargarTsx} from './helpers/render-tsx.mjs';

const {CatalogoReglas,SelectorRegla}=cargarTsx('components/SelectorRegla.tsx');
const h=React.createElement;
test('los menús conservan la referencia guardada y comparten estados de ramas y atributos configurados',()=>{
 const regla={condicion:{tipo:'estado',sujeto:'yo',estado:'marca_antigua'},efectos:[{
  tipo:'salvacion',destino:'yo',exito:[{tipo:'estado',clave:'velo_01',nombre:'Velo boreal'}],
  fallo:[{tipo:'atributo',atributo:'armadura',valor:{atributo:'pulso_lunar'}}],
 }]};
 const fuente={reglas:[regla]};
 const original=JSON.stringify(fuente);
 const menu=(tipo,valor)=>renderToStaticMarkup(h(CatalogoReglas,{
  atributos:[{clave:'pulso_lunar',etiqueta:'Pulso lunar del clan'}],fuentes:[fuente],
 },h(SelectorRegla,{tipo,valor,etiqueta:'Elegir',onChange:()=>assert.fail('Abrir un menú cambió la regla')})));
 assert.match(menu('estado','marca_antigua'),/value="marca_antigua" selected="">Marca antigua</);
 assert.match(menu('estado','velo_01'),/value="velo_01" selected="">Velo boreal</);
 assert.match(menu('atributo','pulso_lunar'),/value="pulso_lunar" selected="">Pulso lunar del clan</);
 assert.match(menu('atributo','legado_externo'),/value="legado_externo" selected="">Legado externo</);
 assert.equal(JSON.stringify(fuente),original);
});
