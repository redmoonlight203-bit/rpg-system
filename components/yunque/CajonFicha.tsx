'use client';
// Cajón «Ficha»: lo que no es lógica de combate (descripción, historia, formas, naturaleza adquirida, requisitos
// narrativos, defectos, tienda, ligado al alma) y la clase calculada con «Cómo se calcula». Cada cambio llega por `patch`,
// que el taller convierte en operaciones `fijar`.
import {useEffect,useRef,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import IconoYugen from '../IconoYugen';
import EvolucionLegado,{type OpcionCatalogo} from '../EvolucionLegado';
import ClaseEtapa from './ClaseEtapa';
import EditorHuella from '../EditorHuella';
import EditorMonstruo from '../EditorMonstruo';
import {Interruptor} from './Controles';
import NaturalezaAdquirida from './NaturalezaAdquirida';
import EditorArtefacto from './editores/EditorArtefacto';
import {pestanasArtefacto} from './editores/pestanas-artefacto';
import PruebaBalance, {type useBalanceBorrador} from './PruebaBalance';
import {activas,atributosVisibles,esMonstruoB,valoresBorrador,type ContextoTaller} from './contexto';
import type {FuenteMonstruo} from '../../lib/monstruos';
import type {Borrador} from '../../lib/yunque-borrador';

type Props={balance:ReturnType<typeof useBalanceBorrador>;b:Borrador;patch:(p:Partial<Borrador>)=>void;ctx:ContextoTaller;abierto:boolean;onCerrar:()=>void;
 /** Al abrir, el foco va a esta sección (id) o, sin ella, al botón de cerrar. */
 ancla?:string|null};
const NATURALEZA={seccion:'yq-ficha-seccion',titulo:'yq-ficha-titulo',ayuda:'yq-nota',etiqueta:'yq-campo',campo:'',aviso:'yq-nota is-aviso'};

export default function CajonFicha({b,patch,ctx,abierto,onCerrar,ancla,balance}:Props){
 const cerrar=useRef<HTMLButtonElement>(null);
 // Al abrirse (o cambiar de ancla), el foco entra en el cajón; tras pintar, para que ya no sea `inert`.
 useEffect(()=>{
  if(!abierto)return;
  const raf=requestAnimationFrame(()=>{
   const destino=ancla?document.getElementById(ancla):null;
   if(destino){destino.scrollIntoView({block:'start'});destino.querySelector<HTMLElement>('button,input,select,textarea')?.focus({preventScroll:true});}
   else cerrar.current?.focus();
  });
  return ()=>cancelAnimationFrame(raf);
 },[abierto,ancla]);
 // Escape lo cierra esté donde esté el foco (también en el lienzo), salvo que otro control ya lo haya usado.
 const cerrarRef=useRef(onCerrar);
 useEffect(()=>{cerrarRef.current=onCerrar;},[onCerrar]);
 useEffect(()=>{
  if(!abierto)return;
  const tecla=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();cerrarRef.current();}};
  window.addEventListener('keydown',tecla);return ()=>window.removeEventListener('keydown',tecla);
 },[abierto]);
 const monstruo=esMonstruoB(b,ctx);
 // En el cuerpo del documento: la página del taller lleva un `transform` (entrada de escena) que anclaría `position:fixed` a ella.
 const cliente=useSyncExternalStore(sinCambios,()=>true,()=>false);
 if(!cliente)return null;
 return createPortal(<aside id="yq-ficha" className={`yq-cajon${abierto?' is-abierto':''}`} aria-label="Ficha de la creación" inert={!abierto} aria-hidden={!abierto}>
  <header className="yq-cajon-cab">
   <IconoYugen id="libro" size={20}/>
   <div><small>Ficha</small><h2>{b.nombre.trim()||'Nueva creación'}</h2></div>
   <button ref={cerrar} type="button" aria-label="Cerrar la ficha" onClick={onCerrar}><X size={18}/></button>
  </header>
  <div className="yq-cajon-cuerpo yq-desplazable">
   <section className="yq-ficha-clase" aria-label="Clase calculada">
    <b>{balance.informe?.clase??(balance.error?'—':'…')}</b>
    <div>
     <strong>{balance.informe?.clase?'Clase del borrador':balance.error?'Simulación no disponible':'Calculando clase del borrador'}</strong>
    </div>
    <details className="yq-ficha-como">
     <summary>Cómo se calcula</summary>
     {abierto&&<PruebaBalance balance={balance}/>}
    </details>
   </section>
   <label className="yq-campo"><span>Descripción</span><textarea rows={3} maxLength={5000} value={b.descripcion} onChange={e=>patch({descripcion:e.target.value})} placeholder="Qué es, a simple vista."/></label>
   <label className="yq-campo"><span>Historia</span><textarea rows={5} value={b.historia} onChange={e=>patch({historia:e.target.value})} placeholder="Su origen, sus hazañas y su lugar en Yugen…"/></label>
   {b.tipo==='personaje'&&<section className="yq-ficha-seccion" id="yq-ficha-evolucion"><h3 className="yq-ficha-titulo">Evolución y legado</h3>
    <EvolucionLegado linea={b.linea??null} onChange={linea=>patch({linea})} nombre={b.nombre} formasAntiguas={b.formas}
     catalogo={activas(ctx) as OpcionCatalogo[]} atributos={atributosVisibles(b,ctx)} statsBase={valoresBorrador(b,ctx)}
     claseEtapa={(etapa,registrar)=>abierto?<ClaseEtapa b={b} ctx={ctx} etapa={etapa} registrar={registrar}/>:null}/>
    {monstruo&&<p className="yq-nota">Variante: configuración alternativa de la especie. Evolución: cambio permanente de una criatura concreta. Transformación: cambio temporal (habilidad).</p>}
   </section>}
   {b.tipo==='personaje'&&<section className="yq-ficha-seccion"><EditorHuella titulo={monstruo?'Tamaño base de la especie':'Tamaño en combate'} valor={b.huella} defecto="Normal (1 × 1)" onChange={huella=>patch({huella})}/></section>}
   {b.tipo==='personaje'&&<NaturalezaAdquirida valor={b.naturalezaVinculo} onChange={naturalezaVinculo=>patch({naturalezaVinculo})} catalogo={ctx.naturalezas??[]} clases={NATURALEZA}/>}
   {b.tipo==='objeto'&&<EditorArtefacto valor={b.artefacto} onChange={artefacto=>patch({artefacto})} atributos={atributosVisibles(b,ctx)} pestanas={pestanasArtefacto(b.id)}/>}
   {monstruo&&<section className="yq-ficha-seccion yq-ficha-especie" id="yq-ficha-especie"><EditorMonstruo value={b.monstruo} onChange={m=>patch({monstruo:m})} catalogo={activas(ctx) as FuenteMonstruo[]} atributos={atributosVisibles(b,ctx)}/></section>}
   <section className="yq-ficha-seccion">
    <h3 className="yq-ficha-titulo">Requisitos y limitaciones</h3>
    <label className="yq-campo"><span>Requisitos narrativos</span><input value={b.requisitos} onChange={e=>patch({requisitos:e.target.value})} placeholder="Solo quien juró ante la llama…"/></label>
    <label className="yq-campo"><span>Limitaciones o defectos</span><input value={b.defectos} onChange={e=>patch({defectos:e.target.value})}/></label>
   </section>
   <section className="yq-ficha-seccion">
    <h3 className="yq-ficha-titulo">Tienda</h3>
    <Interruptor etiqueta="Disponible para venta" valor={b.venta} onChange={venta=>patch({venta})}/>
    {b.venta&&<label className="yq-campo"><span>Precio sugerido</span><input value={b.precio} onChange={e=>patch({precio:e.target.value})} placeholder="120 monedas"/></label>}
    <p className="yq-nota">Las ofertas se publican desde la tienda usando una creación guardada.</p>
   </section>
   <section className={`yq-ficha-alma${b.alma?' is-ligado':''}`}>
    <IconoYugen id="alma" size={34}/>
    <div><Interruptor etiqueta={<strong>Ligado al alma</strong>} valor={b.alma} onChange={alma=>patch({alma})}/>
     <p>{b.alma?'Una sola pertenencia para todo Yugen. Se entrega a una cuenta; el jugador decide a qué personaje prestarla.':'Puede generar copias independientes.'}</p></div>
   </section>
  </div>
 </aside>,document.body);
}
const sinCambios=()=>()=>{};
