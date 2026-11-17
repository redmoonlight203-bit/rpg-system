'use client';
// Arena de dolls del Yunque: el doll portador lleva la creación del borrador y el saco de golpes solo recibe
// (o devuelve un golpe cuando se pulsa «Golpéame»). Todo vive en el navegador sobre `lib/yunque-arena.ts`;
// nunca guarda nada. Cada paso enciende en el lienzo los nodos que actuaron (`activados`).
import {useEffect,useMemo,useRef,useState,useSyncExternalStore,type CSSProperties} from 'react';
import Image from 'next/image';
import {RotateCcw,SkipForward,Undo2} from 'lucide-react';
import IconoYugen from '../IconoYugen';
import LogoYugen from '../LogoYugen';
import Dado3D from '../Dado3D';
import EfectosCombate from '../EfectosCombate';
import {BarraVital} from '../ui/Juego';
import {crearArena,usar,golpeame,turno,activados,lineasNuevas,DOLL_BASE,SACO_BASE,type AjustesDoll,type ContextoArena,type Golpe} from '../../lib/yunque-arena';
import {acciones,deshacer,estadisticas,maxVida,type Accion,type Combate,type Combatiente,type EventoVisual} from '../../lib/combate';
import type {Efecto} from '../../lib/creacion';
import {mensajeError} from '../../lib/errores';
import type {Grafo} from '../../lib/yunque-grafo';
import type {Borrador} from '../../lib/yunque-borrador';
import {valoresBorrador,type ContextoTaller} from './contexto';
import '../../app/ficha/jugador.css';
import './arena.css';

type Props={b:Borrador;ctx:ContextoTaller;grafo:Grafo;onEncender:(ids:string[])=>void};
type Ajustes=Partial<AjustesDoll>;
type Entrada={b:Borrador;creaciones:ContextoTaller['creaciones'];doll:Ajustes;saco:Ajustes};
type Estado=Entrada&{combate:Combate|null;error:string};
type Flotante={id:string;quien:'doll'|'saco';tipo:'dano'|'cura'|'absorbido';valor:number};
type Escena={n:number;tipo:'usar'|'golpe'|'turno';flotantes:Flotante[];dados:{caras:number;valor:number}[];evento?:EventoVisual};

const DOLL='doll',SACO='saco';
const ICONO_EFECTO:Record<Efecto['efecto'],string>={dano:'espada',curacion:'pocion',estado:'fuego',crear_arma:'arco',transformacion:'alma',recuperar_ph:'agua',reducir_fatiga:'vida'};
const ELEMENTOS_GOLPE=[{valor:'',nombre:'Sin elemento'},{valor:'fuego',nombre:'Fuego'},{valor:'agua',nombre:'Agua'},{valor:'electricidad',nombre:'Rayo'},{valor:'hielo',nombre:'Hielo'},{valor:'luz_sagrada',nombre:'Luz sagrada'}];
const CARAS=[4,6,8,10,12,20,100];
const AJUSTES:{clave:keyof AjustesDoll;nombre:string;saco:boolean}[]=[{clave:'vida',nombre:'Vida',saco:true},{clave:'ph',nombre:'PH',saco:false},{clave:'armadura',nombre:'Armadura',saco:true},{clave:'salvacion',nombre:'Salvación',saco:true}];
const REGISTRO=12;
const SIN_AJUSTES:Ajustes={};

/** Movimiento reducido del sistema, leído sin efectos (y sin animaciones si no hay navegador). */
const suscribirMovimiento=(f:()=>void)=>{const m=matchMedia('(prefers-reduced-motion: reduce)');m.addEventListener('change',f);return ()=>m.removeEventListener('change',f);};
const useReducido=()=>useSyncExternalStore(suscribirMovimiento,()=>matchMedia('(prefers-reduced-motion: reduce)').matches,()=>true);

function construir(e:Entrada,ctx:ContextoTaller):Estado{
 const arena:ContextoArena={creaciones:e.creaciones,stats:e.b.tipo==='personaje'?valoresBorrador(e.b,ctx):{}};
 const r=crearArena(e.b,arena,e.doll,e.saco);
 return 'error' in r?{...e,combate:null,error:r.error}:{...e,combate:r.combate,error:''};
}
const miembro=(c:Combate|null,id:string)=>c?.miembros.find(m=>m.id===id);
const kuroi=(e:unknown,respaldo:string)=>mensajeError(e,respaldo).replace(/\.?$/,'.');

/**
 * Lee del registro lo que pasó en un paso: daño recibido por cada uno, lo que una reacción detuvo («absorbido»),
 * la curación del doll y los dados tirados. Solo interpreta frases que escribe `lib/combate.ts`.
 */
function leerPaso(antes:Combate,despues:Combate,n:number){
 const lineas=lineasNuevas(antes,despues).slice().reverse();
 const doll=miembro(antes,DOLL),saco=miembro(antes,SACO);
 const quien=(nombre:string)=>nombre===doll?.nombre?'doll':nombre===saco?.nombre?'saco':null;
 const flotantes:Flotante[]=[],dados:{caras:number;valor:number}[]=[];
 const recibido={doll:0,saco:0};
 let total:number|null=null,reaccion=false,k=0;
 const poner=(q:Flotante['quien'],tipo:Flotante['tipo'],valor:number)=>{if(valor>0)flotantes.push({id:`${n}:${k++}`,quien:q,tipo,valor});};
 for(const l of lineas){
  const t=/^Daño: .*= (-?\d+)\.$/.exec(l);if(t){total=Number(t[1]);reaccion=false;continue;}
  if(total!==null&&/ activa .+ \(/.test(l)){reaccion=true;continue;}
  const r=/^(.+) recibe (\d+) daño; vida/.exec(l);
  if(r){
   const q=quien(r[1]),v=Number(r[2]);
   if(q){recibido[q]+=v;poner(q,'dano',v);if(reaccion&&total!==null&&total>v)poner(q,'absorbido',total-v);}
   total=null;reaccion=false;continue;
  }
  const d=/: \d+d(\d+) \[([^\]]*)\]/.exec(l);
  if(d)for(const v of d[2].split(',').map(x=>Number(x.trim())).filter(Number.isFinite))if(dados.length<8)dados.push({caras:Number(d[1]),valor:v});
 }
 const vidaAntes=miembro(antes,DOLL)?.vida??0,vidaDespues=miembro(despues,DOLL)?.vida??0;
 poner('doll','cura',vidaDespues-vidaAntes+recibido.doll);
 return {flotantes,dados};
}
/** Lleva el evento visual del motor a una rejilla de 2×1: doll a la izquierda, saco a la derecha. */
function eventoArena(ev:EventoVisual|undefined,c:Combate):EventoVisual|undefined{
 if(!ev)return undefined;
 const dx=miembro(c,DOLL)?.posicion?.x??4;
 const a=(p?:{x:number;y:number})=>p&&{x:p.x<=dx?0:1,y:0};
 return {...ev,desde:a(ev.desde),hasta:a(ev.hasta),area:ev.area?.map(p=>a(p)!),movimientos:[],transformaciones:ev.transformaciones?.map(t=>({...t,posicion:a(t.posicion)!}))};
}
const etiquetaDados=(e:Efecto)=>e.cantidad&&e.caras?`${e.cantidad}d${e.caras}${e.modificador?(e.modificador>0?'+':'')+e.modificador:''}`:'';

export default function ArenaDolls({b,ctx,grafo,onEncender}:Props){
 const [doll,setDoll]=useState<Ajustes>(SIN_AJUSTES);
 const [saco,setSaco]=useState<Ajustes>(SIN_AJUSTES);
 const [estado,setEstado]=useState<Estado>(()=>construir({b,creaciones:ctx.creaciones,doll:SIN_AJUSTES,saco:SIN_AJUSTES},ctx));
 const [golpe,setGolpe]=useState<Golpe>({cantidad:1,caras:6,naturaleza:'fisica'});
 const [escena,setEscena]=useState<Escena|null>(null);
 const [voz,setVoz]=useState('');
 const [reinicio,setReinicio]=useState<{n:number;texto:string}|null>(null);
 const contador=useRef(0);
 const reducido=useReducido();
 const ctxRef=useRef(ctx);
 useEffect(()=>{ctxRef.current=ctx;},[ctx]);

 // Cada cambio del borrador o de los ajustes reconstruye la prueba a los 300 ms.
 useEffect(()=>{
  if(estado.b===b&&estado.creaciones===ctx.creaciones&&estado.doll===doll&&estado.saco===saco)return;
  const borrador=estado.b!==b;
  const t=window.setTimeout(()=>{
   setEstado(construir({b,creaciones:ctx.creaciones,doll,saco},ctxRef.current));
   setEscena(null);setVoz('');
   const n=++contador.current;
   setReinicio({n,texto:borrador?'La prueba se reinició con los cambios':'Los dolls se ajustaron: la prueba empieza de nuevo'});
  },300);
  return ()=>window.clearTimeout(t);
 },[b,ctx.creaciones,doll,saco,estado.b,estado.creaciones,estado.doll,estado.saco]);
 useEffect(()=>{
  if(!reinicio)return;
  const t=window.setTimeout(()=>setReinicio(r=>r?.n===reinicio.n?null:r),2600);
  return ()=>window.clearTimeout(t);
 },[reinicio]);

 const c=estado.combate;
 const portador=miembro(c,DOLL),blanco=miembro(c,SACO);
 const caido=!!c&&(c.fase==='finalizado'||!portador||portador.vida<=0);
 const propias=useMemo(()=>new Set(b.efectos.map(e=>e.id)),[b.efectos]);
 const lista=useMemo<Accion[]>(()=>{
  if(!portador)return [];
  try{
   const l=acciones(portador);
   const mia=(a:Accion)=>propias.has(a.efecto.id)||a.id.startsWith('regla:')?0:1;
   return l.map((a,i)=>({a,i})).sort((x,y)=>mia(x.a)-mia(y.a)||x.i-y.i).map(x=>x.a);
  }catch{return [];}
 },[portador,propias]);
 const reaccionSinEfecto=b.tipo!=='habilidad'&&b.tipo!=='personaje'&&b.efectos.some(e=>e.reaccion||e.defensa);

 function paso(tipo:Escena['tipo'],f:(c:Combate)=>Combate,respaldo:string){
  if(!c)return;
  let n:Combate;
  try{n=f(c);}catch(e){setVoz(kuroi(e,respaldo));return;}
  setEstado(s=>({...s,combate:n}));setVoz('');
  let ids:string[]=[];try{ids=activados(c,n,grafo);}catch{/* encender es solo visual */}
  if(ids.length)onEncender(ids);
  const k=++contador.current;
  setEscena({n:k,tipo,...leerPaso(c,n,k),evento:eventoArena(n.evento_visual,c)});
 }
 function atras(){
  if(!c)return;
  try{setEstado(s=>({...s,combate:deshacer(c)}));setEscena(null);setVoz('');}
  catch(e){setVoz(kuroi(e,'No hay nada que deshacer.'));}
 }
 function reiniciar(){
  setEstado(construir({b,creaciones:ctx.creaciones,doll,saco},ctx));
  setEscena(null);setVoz('');
 }
 const ajustar=(quien:'doll'|'saco',clave:keyof AjustesDoll,valor:string)=>{
  const set=quien==='doll'?setDoll:setSaco;
  set(a=>{const n={...a};if(valor.trim()===''||!Number.isFinite(Number(valor)))delete n[clave];else n[clave]=Math.max(0,Math.round(Number(valor)));return n;});
 };
 const baseDe=(quien:'doll'|'saco',clave:keyof AjustesDoll)=>{
  if(quien==='saco')return SACO_BASE[clave];
  if(b.tipo==='personaje'){const v=valoresBorrador(b,ctx)[clave];return typeof v==='number'?v:0;}
  return DOLL_BASE[clave];
 };
 const maxPh=(m?:Combatiente)=>{if(!m)return 0;try{return Math.max(0,estadisticas(m).ph||0);}catch{return 0;}};
 const vidaMax=(m?:Combatiente)=>{if(!m)return 0;try{return maxVida(m);}catch{return 0;}};
 const flotantes=escena?.flotantes||[];
 const golpeSaco=escena?.tipo==='usar'?'is-empujado':escena?.tipo==='golpe'?'is-embiste':'';
 const movDoll=escena?.tipo==='usar'?'is-avanza':escena?.tipo==='golpe'?'is-sacude':'';
 const deshacible=!!c&&!caido&&(c.historial?.length||0)>0;

 return <div className="yq-arena-juego">
  {reinicio&&<p key={reinicio.n} role="status" className="yq-arena-reinicio">{reinicio.texto}</p>}
  {estado.error?<div className="yq-arena-kuroi" role="alert">
   <LogoYugen size={40}/>
   <p><b>Kuroi no deja entrar a los dolls.</b>{estado.error}</p>
  </div>:<>
   <div className="yq-arena-hud">
    <div className="yq-arena-ficha">
     <strong>{portador?.nombre||'Doll portador'}</strong>
     <BarraVital etiqueta="Vida del doll" valor={portador?.vida??0} max={vidaMax(portador)}/>
     {maxPh(portador)>0&&<BarraVital etiqueta="PH del doll" tipo="ph" valor={portador?.ph??0} max={maxPh(portador)}/>}
    </div>
    <div className="yq-arena-ficha">
     <strong>{blanco?.nombre||'Saco de golpes'}</strong>
     <BarraVital etiqueta="Vida del saco" valor={blanco?.vida??0} max={vidaMax(blanco)}/>
    </div>
   </div>
   <div className={`yq-escenario${caido?' is-caido':''}`}>
    <span className="yq-escenario-viga" aria-hidden="true"/>
    <span className="yq-escenario-suelo" aria-hidden="true"/>
    <div className="yq-escenario-doll">
     <span className="yq-escenario-sombra" aria-hidden="true"/>
     <div key={`d${escena?.n??0}`} className={`yq-figura ${movDoll}`}>
      <Image src="/arte/dolls/portador.webp" alt="Doll portador" width={208} height={565} sizes="82px" loading="eager"/>
     </div>
    </div>
    <div className="yq-escenario-saco">
     <span className="yq-escenario-sombra is-saco" aria-hidden="true"/>
     <div key={`s${escena?.n??0}`} className={`yq-figura yq-saco ${golpeSaco}`}>
      <Image src="/arte/dolls/saco.webp" alt="Saco de golpes" width={170} height={561} sizes="70px" loading="eager"/>
     </div>
    </div>
    {flotantes.map((f,i)=><span key={f.id} className={`yq-flotante is-${f.tipo} is-${f.quien}`} style={{'--yq-retardo':`${i*110}ms`,'--yq-fila':i%3} as CSSProperties}>
     {f.tipo==='dano'?`−${f.valor}`:f.tipo==='cura'?`+${f.valor}`:<>{f.valor}<small> absorbido</small></>}
    </span>)}
    {escena&&escena.dados.length>0&&<div key={`t${escena.n}`} className="yq-arena-dados" aria-label={`Dados: ${escena.dados.map(d=>d.valor).join(', ')}`}>
     {escena.dados.map((d,i)=><Dado3D key={i} caras={d.caras} valor={d.valor} indice={i} animar={!reducido}/>)}
    </div>}
    {!reducido&&escena?.evento&&<EfectosCombate evento={escena.evento} columnas={2} filas={1}/>}
    {caido&&<div className="yq-escenario-fin"><strong>El doll cayó</strong><span>Reinicia para seguir probando.</span></div>}
   </div>
   {voz&&<div className="yq-arena-kuroi is-breve" role="alert"><LogoYugen size={32}/><p><b>Kuroi detiene la prueba.</b>{voz}</p></div>}
   {reaccionSinEfecto&&<p className="yq-arena-pista"><IconoYugen id="escudo" size={14}/>Las reacciones solo actúan en habilidades: aquí no se dispararán.</p>}
   {caido?<button type="button" className="yq-arena-reiniciar is-grande" onClick={reiniciar}><RotateCcw size={16} aria-hidden="true"/>Reiniciar la prueba</button>:<>
    <h3>Acciones del doll</h3>
    {lista.length?<ul className="yq-arena-acciones">{lista.map(a=><li key={a.id}>
     <button type="button" data-accion={a.id} disabled={!!a.bloqueada} title={a.bloqueada||`Usar ${a.nombre} contra el saco`} className={propias.has(a.efecto.id)?'is-propia':undefined}
      onClick={()=>paso('usar',x=>usar(x,a.id),'Esa acción no se pudo usar.')}>
      <span className="yq-arena-accion-icono"><IconoYugen id={ICONO_EFECTO[a.efecto.efecto]||'espada'} size={18}/></span>
      <span className="yq-arena-accion-texto"><strong>{a.nombre.split(' · ').pop()}</strong><small>{[etiquetaDados(a.efecto),a.efecto.coste_ph?`${a.efecto.coste_ph} PH`:'',a.bloqueada||''].filter(Boolean).join(' · ')||'Sin tirada'}</small></span>
      <b>Usar</b>
     </button>
    </li>)}</ul>:<p className="yq-panel-voz">El doll no tiene acciones. Añade una al núcleo y vuelve aquí.</p>}
    <div className="yq-arena-golpe">
     <button type="button" className="yq-arena-golpeame" onClick={()=>paso('golpe',x=>golpeame(x,golpe),'El saco no pudo golpear.')}>
      <IconoYugen id="espada" size={16}/>Golpéame
     </button>
     <div className="yq-arena-golpe-dados">
      <label><span className="sr-only">Cuántos dados</span><input type="number" min={1} max={100} value={golpe.cantidad} onChange={e=>setGolpe(g=>({...g,cantidad:Math.max(1,Math.min(100,Math.round(Number(e.target.value)||1)))}))}/></label>
      <label><span className="sr-only">Caras del dado</span><select value={golpe.caras} onChange={e=>setGolpe(g=>({...g,caras:Number(e.target.value)}))}>{CARAS.map(k=><option key={k} value={k}>d{k}</option>)}</select></label>
     </div>
     <div className="yq-arena-naturaleza" role="group" aria-label="Naturaleza del golpe">
      {(['fisica','magica'] as const).map(n=><button key={n} type="button" aria-pressed={golpe.naturaleza===n} onClick={()=>setGolpe(g=>({...g,naturaleza:n}))}>{n==='fisica'?'Física':'Mágica'}</button>)}
     </div>
     <label className="yq-arena-elemento"><span className="sr-only">Elemento del golpe</span>
      <select value={golpe.elemento||''} onChange={e=>setGolpe(g=>({...g,elemento:e.target.value||undefined}))}>{ELEMENTOS_GOLPE.map(x=><option key={x.valor} value={x.valor}>{x.nombre}</option>)}</select>
     </label>
    </div>
    <div className="yq-arena-controles">
     <button type="button" onClick={()=>paso('turno',x=>turno(x),'No se pudo pasar el turno.')}><SkipForward size={15} aria-hidden="true"/>Turno</button>
     <button type="button" disabled={!deshacible} onClick={atras}><Undo2 size={15} aria-hidden="true"/>Deshacer</button>
     <button type="button" className="yq-arena-reiniciar" onClick={reiniciar}><RotateCcw size={15} aria-hidden="true"/>Reiniciar</button>
    </div>
   </>}
   <details className="yq-arena-ajustes">
    <summary>Ajustes de los dolls</summary>
    {(['doll','saco'] as const).map(q=><fieldset key={q}>
     <legend>{q==='doll'?'Doll portador':'Saco de golpes'}</legend>
     {AJUSTES.filter(a=>q==='doll'||a.saco).map(a=>{const actual=(q==='doll'?doll:saco)[a.clave];return <label key={a.clave}>
      <span>{a.nombre}</span>
      <input type="number" min={0} inputMode="numeric" value={actual??baseDe(q,a.clave)} onChange={e=>ajustar(q,a.clave,e.target.value)} aria-label={`${a.nombre} del ${q==='doll'?'doll':'saco'}`}/>
     </label>;})}
    </fieldset>)}
   </details>
   {c&&<>
    <h3>Registro</h3>
    <ol className="yq-arena-registro" aria-live="polite">{c.registro.slice(0,REGISTRO).map((l,i)=><li key={`${c.registro.length-i}`} className={i===0?'is-reciente':undefined}>{l}</li>)}</ol>
   </>}
  </>}
 </div>;
}
