'use client';
// Vínculos de personajes y monstruos: la figura de su raza con los huecos de equipo como puertos (pie del núcleo)
// y el editor de cada vínculo (qué es la creación enlazada, si la cumple, a qué hueco va y desenlazar).
import {useState,type PointerEvent as PE} from 'react';
import {Plus,Trash2,X} from 'lucide-react';
import IconoYugen from '../../IconoYugen';
import RetratoRaza from '../../RetratoRaza';
import {Fichas} from '../Controles';
import {SLOTS,efectosDe} from '../../../lib/creacion';
import {describirEfecto} from '../../../lib/descripciones';
import {huecosCompatibles,nombreHueco,planMoverEquipo,type Enlazable} from '../../../lib/yunque-vinculos';
import type {Borrador} from '../../../lib/yunque-borrador';
import type {Nodo} from '../../../lib/yunque-grafo';
import type {Operacion} from '../../../lib/yunque-operaciones';
import type {ContextoTaller,Creable} from '../contexto';

export type EnlazableVista=Enlazable&{icono?:string|null;clase?:string;imagen?:string};
const ICONO_TIPO:Record<string,string>={objeto:'espada',titulo:'corona',habilidad:'fuego',pasiva:'escudo',personaje:'humano',otro:'yugen'};
const ICONO_HUECO:Record<string,string>={casco:'corona',pechera:'armadura',pantalones:'armadura',zapatos:'escudo',capa:'espectro',mano_der:'espada',mano_izq:'escudo',titulo:'corona'};
/** Huecos del cuerpo, colocados sobre la figura (en % de la caja). La mano derecha del personaje queda a la izquierda. */
const CUERPO:Record<string,{x:number;y:number}>={casco:{x:50,y:9},capa:{x:80,y:24},pechera:{x:50,y:34},mano_der:{x:15,y:50},mano_izq:{x:85,y:50},pantalones:{x:50,y:62},zapatos:{x:50,y:90}};
const ANILLOS=SLOTS.filter(s=>!CUERPO[s.clave]).map(s=>s.clave);
export const idDeVinculo=(nodo:string)=>nodo.split(':').slice(2).join(':');
export const iconoEnlazable=(c?:{icono?:string|null;tipo?:string})=>c?.icono||ICONO_TIPO[c?.tipo||'otro']||'yugen';

type FiguraProps={
 b:Borrador;figura?:string;raza?:string;piezas:Map<string,EnlazableVista>;
 /** Pieza enlazable que se está arrastrando desde el Grimorio (para iluminar los huecos compatibles). */
 arrastrando?:EnlazableVista|null;sobre?:string|null;
 onElegir:(nodo:string)=>void;onQuitar:(slot:string)=>void;onCrear:(tipo:Creable,slot?:string)=>void;
};
/** Figura de la raza con sus huecos de equipo. Cada hueco es una salida (`data-salida="hueco:<slot>"`) donde soltar equipo. */
export function FiguraEquipo({b,figura,raza,piezas,arrastrando,sobre,onElegir,onQuitar,onCrear}:FiguraProps){
 const [elegido,setElegido]=useState<string|null>(null);
 const compatibles=arrastrando?new Set(huecosCompatibles(arrastrando.slot_tipo)):null;
 const dosManos=Object.values(b.equipamiento).some(id=>piezas.get(id)?.slot_tipo==='dos_manos');
 const parar=(e:PE)=>e.stopPropagation();
 const hueco=(slot:string,estilo?:{left:string;top:string})=>{
  const id=b.equipamiento[slot],p=id?piezas.get(id):undefined;
  const ocupadoPorDos=!id&&dosManos&&(slot==='mano_der'||slot==='mano_izq');
  const estado=compatibles?(compatibles.has(slot)?(sobre===slot?'destino':'compatible'):'apagado'):undefined;
  return <button type="button" key={slot} data-salida={`hueco:${slot}`} data-hueco={slot} data-estado={estado} aria-pressed={elegido===slot}
   className={`yq-hueco${id?' is-lleno':''}${ocupadoPorDos?' is-dos-manos':''}${estilo?'':' is-anillo'}`} style={estilo}
   aria-label={`${nombreHueco(slot)}: ${id?(p?.nombre??'creación desconocida'):ocupadoPorDos?'ocupada por el arma a dos manos':'vacío'}`}
   title={`${nombreHueco(slot)}${id?` · ${p?.nombre??'creación desconocida'}`:''}`}
   onPointerDown={parar} onClick={()=>setElegido(e=>e===slot?null:slot)}>
   <IconoYugen id={p?iconoEnlazable(p):ICONO_HUECO[slot]||'anillo'} size={estilo?20:15}/>
  </button>;
 };
 const actual=elegido?b.equipamiento[elegido]:undefined,pieza=actual?piezas.get(actual):undefined;
 return <div className="yq-maniqui" data-maniqui="">
  <div className="yq-maniqui-cuerpo">
   <RetratoRaza src={figura} nombre={raza} className="yq-maniqui-raza"/>
   <svg className="yq-maniqui-hilos" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    {Object.entries(CUERPO).map(([s,p])=><line key={s} x1="50" y1="46" x2={p.x} y2={p.y} data-lleno={b.equipamiento[s]?'':undefined}/>)}
   </svg>
   {Object.entries(CUERPO).map(([s,p])=>hueco(s,{left:`${p.x}%`,top:`${p.y}%`}))}
  </div>
  <div className="yq-maniqui-anillos" role="group" aria-label="Accesorios y título">{ANILLOS.map(s=>hueco(s))}</div>
  {elegido&&<div className="yq-hueco-detalle" onPointerDown={parar}>
   <p><small>{nombreHueco(elegido)}</small><strong>{actual?(pieza?.nombre??'Creación desconocida'):'Vacío'}</strong></p>
   <div>
    {actual&&<button type="button" onClick={()=>onElegir(`vinculo:${elegido}:${actual}`)}>Ver</button>}
    {actual&&<button type="button" className="is-peligro" aria-label={`Quitar de ${nombreHueco(elegido)}`} onClick={()=>onQuitar(elegido)}><Trash2 size={13}/></button>}
    <button type="button" onClick={()=>onCrear(elegido==='titulo'?'titulo':'objeto',elegido)}><Plus size={13}/>Crear aquí</button>
    <button type="button" aria-label="Cerrar" onClick={()=>setElegido(null)}><X size={13}/></button>
   </div>
  </div>}
  {!elegido&&<p className="yq-maniqui-pista">{arrastrando?compatibles?.size?'Suéltala en un hueco que brille, o sobre el núcleo.':'Suéltala sobre el núcleo.':'Arrastra equipo de la Colección a un hueco. Pulsa un hueco para crear ahí.'}</p>}
 </div>;
}

type EditorProps={b:Borrador;nodo:Nodo;ctx:ContextoTaller;ejecutar:(ops:Operacion[])=>void;avisar:(t:string)=>void;faltantes:(id:string)=>string[];onCrear:(tipo:Creable,slot?:string)=>void};
/** Editor de un vínculo: ficha de la creación enlazada, requisitos que no cumple, hueco y desenlazar. */
export default function EditorVinculo({b,nodo,ctx,ejecutar,avisar,faltantes,onCrear}:EditorProps){
 const id=idDeVinculo(nodo.id),c=ctx.creaciones.find(x=>x.id===id);
 const enEquipo=nodo.ruta[0]==='equipamiento',slot=enEquipo?String(nodo.ruta[1]):null;
 const quitar=()=>ejecutar([{op:'quitar',nodo:nodo.id}]);
 if(!c)return <div className="yq-editor yq-editor--vinculo"><p className="yq-nota">Esta creación ya no está en La Creación. Desenlázala o enlaza otra desde la Colección.</p>
  <button type="button" className="yq-boton is-peligro" onClick={quitar}><Trash2 size={14}/>Desenlazar</button></div>;
 const fallos=faltantes(id);
 const efectos=efectosDe(c);
 const huecos=slot?huecosCompatibles(c.slot_tipo):[];
 return <div className="yq-editor yq-editor--vinculo">
  <div className="yq-vinculo-carta">
   <span className="yq-vinculo-arte">{c.imagen_url?<Arte src={c.imagen_url}/>:<IconoYugen id={iconoEnlazable({icono:c.icono,tipo:nodo.ruta[0]==='habilidades'?'habilidad':nodo.ruta[0]==='pasivas'?'pasiva':'objeto'})} size={34}/>}</span>
   <span><strong>{c.nombre}</strong><small>Clase {c.clase||'F'}{slot?` · ${nombreHueco(slot)}`:''}</small></span>
  </div>
  {c.descripcion&&<p className="yq-vinculo-texto">{c.descripcion}</p>}
  {efectos.length>0&&<ul className="yq-vinculo-efectos">{efectos.map(e=><li key={e.id}><IconoYugen id="rayo" size={13}/>{describirEfecto(e).resumen}</li>)}</ul>}
  {(c.reglas_pasivas||[]).length>0&&<p className="yq-nota">Pasivas: {(c.reglas_pasivas||[]).map(p=>p.nombre).join(', ')}.</p>}
  {fallos.length>0&&<p className="yq-vinculo-fallo" role="alert">No cumple: {fallos.join('; ')}</p>}
  {slot&&huecos.length>1&&<Fichas etiqueta="Hueco" opciones={huecos.map(h=>({valor:h,nombre:nombreHueco(h)}))} valor={slot} onChange={h=>{
   try{ejecutar(planMoverEquipo(b,slot,h,ctx.creaciones));}catch(e){avisar(e instanceof Error?e.message:'No se pudo mover.');}
  }}/>}
  <div className="yq-vinculo-acciones">
   <button type="button" className="yq-boton is-peligro" onClick={quitar}><Trash2 size={14}/>Desenlazar</button>
   {slot&&<button type="button" className="yq-boton" onClick={()=>onCrear(slot==='titulo'?'titulo':'objeto',slot)}><Plus size={14}/>Crear otra aquí</button>}
  </div>
 </div>;
}
// eslint-disable-next-line @next/next/no-img-element -- URL pública de Storage, tamaño fijo por CSS
const Arte=({src}:{src:string})=><img src={src} alt="" loading="lazy" width={56} height={56}/>;
