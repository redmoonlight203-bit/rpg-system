'use client';
// Editor de formas y transiciones de una transformación, por nodos. Cada forma es un nodo; cada conexión es
// una transición: «cambio libre» (en ambos sentidos) o «solo hacia delante» (cadena). La forma base (realidad)
// siempre está y desde cualquier forma se puede volver a ella sin dibujar nada: es una regla del motor.
import {useState} from 'react';
import LienzoNodos,{type CableLienzo,type NodoLienzo} from './LienzoNodos';
import {Fichas,Rueda} from '../Controles';
import {actualizarTransicion,conectar,crearForma,disposicion,formasHuerfanas,quitarTransicion,validarGrafo,type Grafo,type SentidoTransicion} from '../../../lib/transformaciones-grafo';

export const MAX_FORMAS=12;
const plural=(n:number,palabra:string)=>`${n} ${palabra}${n===1?'':'es'.slice(palabra.endsWith('r')?0:1)}`;
const SENTIDOS=[
 {valor:'ambos' as SentidoTransicion,nombre:'Cambio libre ↔',ayuda:'Se cambia en cualquier momento, en los dos sentidos'},
 {valor:'uno' as SentidoTransicion,nombre:'Solo hacia delante →',ayuda:'Paso de una cadena: no se puede volver por aquí (la vuelta a la realidad sigue disponible)'},
];

type Props={grafo:Grafo;onCambiar:(g:Grafo)=>void;
 /** Forma seleccionada (controlada desde fuera, para abrir su editor). */
 seleccionada?:string|null;onSeleccionar?:(id:string)=>void;
 /** Estadísticas con las que nace una forma nueva (p. ej. vida en una transformación de tipo forma). */
 plantilla?:Record<string,number>};

export function EditorFormas({grafo,onCambiar,seleccionada,onSeleccionar,plantilla}:Props){
 const [cable,setCable]=useState<string|null>(null);
 const [aviso,setAviso]=useState('');
 const celdas=disposicion(grafo);
 const error=validarGrafo(grafo);
 const huerfanas=new Set(formasHuerfanas(grafo));
 const nodos:NodoLienzo[]=grafo.formas.map(f=>({id:f.id,titulo:f.nombre,columna:celdas[f.id].columna,fila:celdas[f.id].fila,
  subtitulo:f.es_realidad?'Realidad':f.control?'Toma el control':`${plural(Object.keys(f.estadisticas).length,'atributo')} · ${plural(f.poderes.length,'poder')}`,
  icono:f.es_realidad?'yugen':f.control?'fuego':'alma',tono:f.es_realidad?'oro':f.control?'carmesi':'arcano',error:huerfanas.has(f.id)}));
 const nombre=(id:string)=>grafo.formas.find(f=>f.id===id)?.nombre||id;
 const cables:CableLienzo[]=grafo.transiciones.map(t=>({id:t.id,desde:t.desde,hasta:t.hasta,sentido:t.sentido,
  etiqueta:`${nombre(t.desde)} ${t.sentido==='ambos'?'↔':'→'} ${nombre(t.hasta)}`}));
 const aplicar=(r:{ok:true;grafo:Grafo}|{ok:false;error:string})=>{if(r.ok){setAviso('');onCambiar(r.grafo);}else setAviso(r.error);return r.ok;};
 const formas=grafo.formas.filter(f=>!f.es_realidad).length;
 const nueva=()=>{
  const r=crearForma(grafo,{nombre:`Forma ${formas+1}`,estadisticas:plantilla});
  if(aplicar(r)&&r.ok)onSeleccionar?.(r.id);
 };
 const t=grafo.transiciones.find(x=>x.id===cable);
 return <div className="ln-formas">
  <div className="ln-barra">
   <button type="button" className="ln-boton" disabled={formas>=MAX_FORMAS} onClick={nueva}>+ Nueva forma</button>
   <span className="ln-nota">Arrastra el ◆ de una forma hasta otra para conectarlas. Pulsa una conexión para cambiar su sentido o su coste.</span>
  </div>
  <LienzoNodos etiqueta="Formas de la transformación" nodos={nodos} cables={cables} seleccionado={seleccionada} cableSeleccionado={cable}
   onSeleccionar={id=>{setCable(null);onSeleccionar?.(id);}} onSeleccionarCable={setCable}
   onConectar={(desde,hasta)=>{const r=conectar(grafo,desde,hasta,'ambos');if(aplicar(r)&&r.ok)setCable(r.id);}}/>
  {aviso&&<p className="ln-error" role="alert">{aviso}</p>}
  {error&&<p className="ln-error" role="alert">{error}</p>}
  {t&&<section className="ln-panel" aria-label="Transición seleccionada">
   <h4>{nombre(t.desde)} {t.sentido==='ambos'?'↔':'→'} {nombre(t.hasta)}</h4>
   <Fichas etiqueta="Sentido" opciones={SENTIDOS} valor={t.sentido} onChange={sentido=>aplicar(actualizarTransicion(grafo,t.id,{sentido}))}/>
   <div className="yq-costes">
    <label><span>Coste en PH</span><Rueda nombre="coste_ph" etiqueta="PH que cuesta esta transición" valor={t.coste?.ph||0} min={0} max={1000} onChange={ph=>aplicar(actualizarTransicion(grafo,t.id,{coste:{...t.coste,ph:Math.round(ph)}}))} compacta/></label>
    <label><span>Coste en Fatiga</span><Rueda nombre="coste_fatiga" etiqueta="Fatiga que cuesta esta transición" valor={t.coste?.fatiga||0} min={0} max={1000} onChange={fatiga=>aplicar(actualizarTransicion(grafo,t.id,{coste:{...t.coste,fatiga:Math.round(fatiga)}}))} compacta/></label>
   </div>
   <p className="ln-nota">Sin coste, la transición es gratuita. Entrar desde la realidad cuesta además lo que indique la acción. Cambiar de forma gasta la acción del turno.</p>
   <button type="button" className="ln-boton is-peligro" onClick={()=>{if(aplicar(quitarTransicion(grafo,t.id)))setCable(null);}}>Quitar conexión</button>
  </section>}
  <p className="ln-nota">Desde cualquier forma se puede volver siempre a la forma base, aunque no haya una conexión dibujada.</p>
 </div>;
}
