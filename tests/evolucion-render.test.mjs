// El editor «Evolución y legado» se renderiza sin JSON a la vista: tarjetas, línea temporal, árbol y comparador.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderizar} from './helpers/render-tsx.mjs';
const etapa=(id,nombre,stats,extra={})=>({id,tipo:'evolucion',nombre,stats,habilidades:[],pasivas:[],...extra});
const linea={version:1,inicial:'j',etapas:[etapa('j','Lobo joven',{vida:20}),etapa('a','Lobo adulto',{vida:35}),etapa('g','Lobo de guerra',{vida:60}),etapa('s','Lobo espiritual',{vida:45},{secreta:true})],
 transiciones:[{id:'1',desde:'j',hasta:'a',modo:'automatica',requisito:{tipo:'nivel',minimo:5}},{id:'2',desde:'a',hasta:'g',modo:'manual_gm',requisito:{tipo:'autorizacion_gm'}},{id:'3',desde:'a',hasta:'s',modo:'manual_gm',secreta:true,requisito:{tipo:'siempre'}}]};
const base={catalogo:[],atributos:[{clave:'vida',etiqueta:'Vida'}],statsBase:{vida:20},nombre:'Lobo de prueba',onChange(){}};
test('sin línea ofrece empezar o convertir las formas antiguas',()=>{
 const html=renderizar('components/EvolucionLegado.tsx','default',{...base,linea:null,formasAntiguas:[{nombre:'Cachorro',historia:'',imagen:''}]});
 assert.match(html,/Empezar con una etapa de vida/);assert.match(html,/Convertir sus 1 formas en etapas de vida/);
});
test('con línea muestra la línea temporal, la etapa actual y «Crear etapa desde la actual»',()=>{
 const html=renderizar('components/EvolucionLegado.tsx','default',{...base,linea,instancia:{etapa_actual:'a',historial:[{id:'h',etapa_id:'j',snapshot:linea.etapas[0],ficha:{nivel:1,exp_total:0,stats:{}},origen:'inicial'}],hitos:{}},onAplicar(){}});
 assert.match(html,/Línea temporal/);assert.match(html,/Árbol evolutivo/);assert.match(html,/Comparador/);
 assert.match(html,/aria-current="true"/);assert.match(html,/Crear etapa desde la actual/);
 assert.match(html,/Evolucionar/);assert.doesNotMatch(html,/"tipo":/,'nunca muestra JSON');
});
test('el árbol dibuja nodos y conexiones; el comparador, las diferencias',()=>{
 const arbol=renderizar('components/EvolucionLegado.tsx','ArbolEvolutivo',{linea,actual:'a',vividas:new Set(['j','a']),cerradas:[],sel:null,selT:null,onSel(){},onSelT(){},onMover(){},onConectar(){return true;}});
 assert.equal((arbol.match(/<g class="evo-nodo/g)||[]).length,4);assert.equal((arbol.match(/evo-arista-zona/g)||[]).length,3);assert.match(arbol,/is-secreta/);
 const cmp=renderizar('components/EvolucionLegado.tsx','Comparador',{linea,catalogo:[],atributos:base.atributos});
 assert.match(cmp,/\+15/);
});
