import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderizar} from './helpers/render-tsx.mjs';

const NOMBRES={personaje:'Axel Kuro',habilidad:'Aliento de Dragón',objeto:'Espada Rota',pasiva:'Pulmones de dragón',titulo:'Matadragones',otro:'Reliquia sin nombre'};
export function fixture(tipo,extra={}){
 return {id:extra.id||`id-${tipo}`,nombre:NOMBRES[tipo]||tipo,tipo:extra.tipo||'general',tipo_creacion:tipo,
  descripcion:'',historia:'',requisitos:'',defectos:'',imagen_url:'',clase:'A',es_grupo:false,slot_tipo:'ninguno',
  ligado_al_alma:false,stats:{},stats_rango:{},habilidades:[],pasivas:[],equipamiento:{},configuracion_dados:[],reglas_pasivas:[],reglas:[],...extra};
}
export function propsBase(items=[],extra={}){
 const nada=()=>{},promesa=async()=>{};
 return {items,cargando:false,iconoDe:()=>'ojo',tipoDe:i=>i.tipo_creacion,clasificacion:k=>k,clasificaciones:[],
  etiqueta:(_,k)=>k,esMonstruo:i=>i.tipo==='bestia',onEditar:nada,onEntregar:nada,onBatalla:nada,onEliminar:promesa,onNueva:nada,onImagen:promesa,onRestablecer:promesa,...extra};
}

test('el arnés renderiza una Carta de la galería',()=>{
 const item=fixture('habilidad');
 const html=renderizar('components/GaleriaCreacion.tsx','Carta',{item,props:propsBase([item]),dueno:null,orden:0});
 assert.match(html,/cg-carta/);
 assert.match(html,/Aliento de Dragón/);
});
