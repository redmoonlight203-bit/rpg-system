'use client';
import type {CSSProperties} from 'react';
import {Eye} from 'lucide-react';
import OjoVisual from './OjoVisual';
import type {Posicion,VistaOcular,ObjetivoOcular} from '../lib/combate';
import {NOMBRE_DIRECCION,VECTOR_DIRECCION,direccionAtaque,type DireccionOcular} from '../lib/vision';
import './ocular.css';

const GIRO:Record<DireccionOcular,number>={n:0,ne:45,e:90,se:135,s:180,so:225,o:270,no:315};
const ETIQUETA_ATRIBUTO:Record<string,string>={vida:'Vida máx.',ph:'PH máx.',armadura:'ARM',bono_impacto:'Impacto',dano:'Daño',salvacion:'Salvación',iniciativa:'Iniciativa',movimiento:'Movimiento',fatiga:'Fatiga máx.',nivel:'Nivel'};

/** Variables CSS del ojo principal (color e intensidad del velo). */
export function estiloOcular(vista?:VistaOcular|null):CSSProperties|undefined{
 const v=vista?.visiones[0];if(!v)return undefined;
 return {'--ojo':v.apariencia.color,'--ocular-opacidad':[0,.3,.55,.8][v.apariencia.velo]??.5} as CSSProperties;
}
/** Casillas desde las que golpear un punto débil: clave «x,y» → nombre del objetivo. */
export function casillasDebiles(vista:VistaOcular|null|undefined,fichas:{id:string;nombre:string;posicion:Posicion}[],columnas:number,filas:number):Map<string,string>{
 const r=new Map<string,string>();if(!vista)return r;
 for(const f of fichas)for(const d of vista.objetivos[f.id]?.puntos||[]){const v=VECTOR_DIRECCION[d],x=f.posicion.x+v.x,y=f.posicion.y+v.y;if(x>=0&&y>=0&&x<columnas&&y<filas)r.set(`${x},${y}`,f.nombre);}
 return r;
}
/** Línea de previsualización: si atacar desde `origen` cae en un punto débil del objetivo. */
export function lineaOcular(vista:VistaOcular|null|undefined,objetivo:{id:string;posicion:Posicion},origen?:Posicion):string|null{
 const o=vista?.objetivos[objetivo.id];if(!o?.puntos?.length||!origen)return null;
 const d=direccionAtaque(objetivo.posicion,origen);
 if(d&&o.puntos.includes(d))return `Punto débil desde el ${NOMBRE_DIRECCION[d]}: ${o.recompensa}.`;
 return `Puntos débiles: ${o.puntos.map(p=>NOMBRE_DIRECCION[p]).join(', ')}. Muévete a ese lado para ${o.recompensa}.`;
}

/** Marcas sobre una ficha vista por el ojo: flechas en sus lados débiles y un anillo si está analizada. */
export function MarcasOculares({objetivo}:{objetivo?:ObjetivoOcular}){
 if(!objetivo)return null;
 return <>{objetivo.detalle&&<span className="ocular-revelado" aria-hidden="true"/>}
  {!!objetivo.puntos?.length&&<span className="ocular-puntos" aria-hidden="true">{objetivo.puntos.map(d=><i key={d} className="ocular-punto" style={{left:`${50+VECTOR_DIRECCION[d].x*46}%`,top:`${50+VECTOR_DIRECCION[d].y*46}%`,'--giro':GIRO[d]+'deg'} as CSSProperties}/>)}</span>}</>;
}

/** Cabecera del ojo abierto: dibujo, nombre, turnos y conmutador de amenazas. */
export function HudOcular({vista,turnoPropio,verAmenazas,onAmenazas}:{vista:VistaOcular;turnoPropio:boolean;verAmenazas:boolean;onAmenazas:()=>void}){
 const v=vista.visiones[0],otros=vista.visiones.length-1,vistos=Object.keys(vista.objetivos).length;
 return <div className="ocular-hud" role="status">
  <OjoVisual key={vista.visiones.map(x=>x.clave).join('|')} apariencia={v.apariencia} nombre={v.nombre} size={44} abriendo/>
  <div><strong>{v.nombre}{otros>0?` +${otros}`:''}</strong>
   <small>{turnoPropio?'Tu ojo está abierto':'Ojo abierto'} · {v.restantes?`${v.restantes} turno${v.restantes===1?'':'s'}`:'sin límite'} · {vistos?`${vistos} enemigo${vistos===1?'':'s'} a la vista`:'nadie a la vista'}</small></div>
  {!!vista.amenaza?.length&&<button type="button" aria-pressed={verAmenazas} onClick={onAmenazas}>{verAmenazas?'Ocultar amenazas':'Ver amenazas'}</button>}
 </div>;
}

/** Lo que el ojo revela de la unidad enfocada. */
export function PanelOcular({nombre,objetivo,origen,posicion}:{nombre:string;objetivo?:ObjetivoOcular;origen?:Posicion;posicion:Posicion}){
 if(!objetivo)return null;
 const d=objetivo.detalle,linea=lineaOcular({visiones:[],objetivos:{x:objetivo}},{id:'x',posicion},origen);
 const atributos=d?.atributos?Object.entries(d.atributos).filter(([k])=>k in ETIQUETA_ATRIBUTO||!['vida_actual','corrupto'].includes(k)).sort(([a],[b])=>Number(b in ETIQUETA_ATRIBUTO)-Number(a in ETIQUETA_ATRIBUTO)).slice(0,14):[];
 return <section className="ocular-panel" aria-label={`Lo que ve tu ojo de ${nombre}`}>
  <header><Eye size={14} aria-hidden="true"/>Tu ojo ve a {nombre}</header>
  {linea&&<p className="ocular-debil">{linea.includes(': ')&&linea.startsWith('Punto débil')?<b>{linea}</b>:linea}</p>}
  {d?.vida&&<div className="ocular-atributos"><span>Vida {Number(d.vida.actual.toFixed(1))}/{d.vida.max}</span>{d.ph&&d.ph.max>0&&<span>PH {d.ph.actual}/{d.ph.max}</span>}</div>}
  {!!atributos.length&&<div className="ocular-atributos" aria-label="Atributos">{atributos.map(([k,x])=><span key={k}>{ETIQUETA_ATRIBUTO[k]||k.replaceAll('_',' ')} {x}</span>)}</div>}
  {!!d?.estados?.length&&<ul className="ocular-lista" aria-label="Estados">{d.estados.map((e,i)=><li key={i}>{e.nombre} <small>{e.restantes?`${e.restantes} turnos`:'sin límite'}</small></li>)}</ul>}
  {!!d?.acciones?.length&&<ul className="ocular-lista" aria-label="Acciones">{d.acciones.map((a,i)=><li key={i}>{a.nombre} <small>{a.resumen}{a.coste_ph?` · ${a.coste_ph} PH`:''}</small></li>)}</ul>}
  {!!d?.pasivas?.length&&<p className="ocular-debil">Pasivas: {d.pasivas.join(', ')}</p>}
 </section>;
}
