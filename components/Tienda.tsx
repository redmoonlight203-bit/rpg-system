"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Hammer, ShoppingBag, RefreshCw, Handshake, Plus, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import {Billetera,type Moneda} from "./Billetera";
import "./tienda.css";

type Plantilla = { id:string; nombre:string; descripcion:string; tipo_creacion?:string; clase:string };
type Oferta = { id:string; forja_id:string|null; nombre:string; descripcion:string; tipo:string; clase:string; estado:"disponible"|"negociando"|"aceptada"|"retirada"; negociador_nombre:string|null;propuesta:string|null;modo_precio:"presencial"|"monedas";moneda_id:string|null;precio:number|null };
const estados = {disponible:"Disponible",negociando:"Negociación privada",aceptada:"Aceptada",retirada:"Retirada"};

export function Tienda({gm=false,almas=false}:{gm?:boolean;almas?:boolean}) {
 const [ofertas,setOfertas]=useState<Oferta[]>([]),[plantillas,setPlantillas]=useState<Plantilla[]>([]);
 const [elegida,setElegida]=useState<Plantilla|null>(null),[descripcion,setDescripcion]=useState("");
 const [error,setError]=useState(""),[aviso,setAviso]=useState(""),[cargando,setCargando]=useState(true),[ocupado,setOcupado]=useState(false);
 const [busqueda,setBusqueda]=useState(""),[vista,setVista]=useState("activas"),[arrastrando,setArrastrando]=useState(false),[permitido,setPermitido]=useState(false);
 const [monedas,setMonedas]=useState<Moneda[]>([]),[modo,setModo]=useState("presencial"),[moneda,setMoneda]=useState(""),[precio,setPrecio]=useState(""),[colmena,setColmena]=useState(false);
 const [trato,setTrato]=useState<string|null>(null),[propuesta,setPropuesta]=useState("");
 const bloqueo=useRef(false);
 const cargar=useCallback(async(inicial=false)=>{
  if(inicial)setCargando(true);
  try {
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user)throw new Error("Inicia sesión para abrir la tienda.");
   const perfil=await supabase.from("perfiles").select("rol,estado,mente_colmena").eq("id",user.id).single();
   if(perfil.error)throw perfil.error;
   if(gm&&perfil.data?.rol!=="KUROI")throw new Error("Esta vista es exclusiva del GM.");
   if(perfil.data?.rol!=="KUROI"&&perfil.data?.estado!=="aprobado")throw new Error("Tu cuenta está pendiente de aprobación.");
   setColmena(!!perfil.data?.mente_colmena);
   if(almas&&!gm&&!perfil.data?.mente_colmena){setOfertas([]);setPermitido(false);return;}
   setPermitido(true);
   const m=await supabase.from("monedas").select("id,nombre,simbolo").order("created_at");if(m.error)throw m.error;setMonedas(m.data||[]);
   const r=await supabase.from("tienda_ofertas").select("id,forja_id,nombre,descripcion,tipo,clase,estado,negociador_nombre,propuesta,modo_precio,moneda_id,precio").eq("tienda",almas?"almas":"general").order("created_at",{ascending:false});
   if(r.error)throw r.error;
   setOfertas(r.data as Oferta[]);
   if(gm){let consulta=supabase.from("forja_maestra").select("id,nombre,descripcion,tipo_creacion,clase").eq("estado","aprobado").order("nombre");if(almas)consulta=consulta.eq("tipo_creacion","personaje");const f=await consulta;if(f.error)throw f.error;setPlantillas(f.data||[]);if(inicial){const id=new URLSearchParams(window.location.search).get("forja");const p=(f.data||[]).find(p=>p.id===id);if(p){setElegida(p);setDescripcion(p.descripcion||"");}}}
  }catch(e){setOfertas([]);setPermitido(false);setError(e instanceof Error?e.message:(e as {message?:string}).message||"No se pudo cargar la tienda.");}
  finally{if(inicial)setCargando(false);}
 },[gm,almas]);
 useEffect(()=>{void cargar(true);const reloj=setInterval(()=>{if(!document.hidden)void cargar();},5000);const enfocar=()=>void cargar();window.addEventListener("focus",enfocar);return()=>{clearInterval(reloj);window.removeEventListener("focus",enfocar);};},[cargar]);
 function elegir(p:Plantilla){setElegida(p);setDescripcion(p.descripcion||"");setAviso("");setError("");}
 async function operar(accion:string,id?:string){
  if(bloqueo.current)return;bloqueo.current=true;setOcupado(true);setError("");setAviso("");
  try {
   const r=await supabase.rpc("tienda_operar_v3",{p_propuesta:["negociar","proponer"].includes(accion)?propuesta.trim():null,p_accion:accion,p_id:id||null,p_forja:accion==="publicar"?elegida?.id:null,p_descripcion:accion==="publicar"?descripcion:null,p_tienda:almas?"almas":"general",p_modo:modo,p_moneda:accion==="publicar"&&modo==="monedas"?moneda:null,p_precio:accion==="publicar"&&modo==="monedas"?Number(precio):null});
   if(r.error)throw r.error;
   if(accion==="publicar"){setElegida(null);setDescripcion("");}
   if(accion==="cancelar"){setTrato(null);setPropuesta("");setVista("activas");}
   if(["negociar","proponer"].includes(accion)){setTrato(null);setPropuesta("");setVista("negociaciones");}
   setAviso(accion==="cancelar"?"Negociación cancelada. El objeto vuelve al escaparate sin generar cobros.":accion==="proponer"?"Propuesta actualizada. Solo tú y el GM pueden verla.":accion==="publicar"?"Oferta publicada para todos.":accion==="negociar"?"Oferta reservada para ti. El GM confirmará el acuerdo.":accion==="rechazar"?"Negociación rechazada. La oferta vuelve al escaparate.":accion==="aceptar"?"Acuerdo aceptado. La compra se entregó al jugador y el precio fijo, si existe, ya fue descontado.":"Oferta retirada.");
  }catch(e){setError((e as {message?:string}).message||"No se pudo completar la operación.");}
  finally{await cargar();bloqueo.current=false;setOcupado(false);}
 }
 function publicar(e:FormEvent){e.preventDefault();if(modo==="monedas"&&(!moneda||!Number.isSafeInteger(Number(precio))||Number(precio)<1)){setError("Selecciona moneda y precio entero positivo.");return;}if(elegida&&descripcion.trim())void operar("publicar");}
 const visibles=ofertas.filter(o=>vista==="historial"?["aceptada","retirada"].includes(o.estado):vista==="negociaciones"?o.estado==="negociando":["disponible","negociando"].includes(o.estado));
 if(!cargando&&almas&&!gm&&!permitido&&!error)return <main className="tienda"><h1>Tienda no disponible</h1><Link href="/ficha">Volver a mi ficha</Link></main>;
 return <main className="tienda"><header className="tienda-header"><div><p className="tienda-kicker">YUGEN · CREACIONES EN CIRCULACIÓN</p><h1><ShoppingBag size={27}/>{almas?"Tienda de almas":"La tienda"}</h1><p>Creaciones con precio en monedas o acuerdos presenciales.</p></div><div className="tienda-actions"><Link href={gm?"/dm/forja":"/ficha"}>{gm?"Volver a la Forja":"Volver a mi ficha"}</Link><button disabled={ocupado} onClick={()=>{setError("");void cargar(true);}} aria-label="Actualizar tienda"><RefreshCw size={16}/></button></div></header>
 {error&&<p role="alert" className="tienda-error">{error}</p>}{aviso&&<p role="status" className="tienda-aviso">{aviso}</p>}
 {!gm&&permitido&&<Billetera/>}
 {(gm||colmena)&&<div className="tienda-access">{almas?"Escaparate exclusivo de Mentes colmena":"Escaparate general"}<Link href={gm?(almas?"/dm/mercado":"/dm/tienda-almas"):(almas?"/ficha/tienda":"/ficha/tienda-almas")}>{almas?"Ir a tienda general":"Ir a Tienda de almas"}</Link></div>}
 <div className={gm?"tienda-workspace":""}>
 {gm&&permitido&&<aside className="tienda-forja"><h2><Hammer size={17}/>Desde el Yunque</h2><p>{almas?"Solo personajes. Arrastra uno al escaparate o pulsa + para publicarlo.":"Arrastra una creación al escaparate o pulsa + para publicarla."}</p><input aria-label="Buscar en la Forja" placeholder="Buscar una creación…" value={busqueda} onChange={e=>setBusqueda(e.target.value)}/><div className="tienda-source-list">{plantillas.filter(p=>p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p=><div key={p.id} draggable={!ocupado} onDragStart={e=>{e.dataTransfer.setData("application/x-yugen-forja",p.id);e.dataTransfer.effectAllowed="copy";}} className="tienda-source"><div><strong>{p.nombre}</strong><small>{p.tipo_creacion||"Creación"} · {p.clase}</small></div><button disabled={ocupado} onClick={()=>elegir(p)} aria-label={`Publicar ${p.nombre}`}><Plus size={17}/></button></div>)}{!cargando&&!plantillas.length&&<p>Aún no hay creaciones aprobadas. <Link href="/dm/forja">Abrir la Forja</Link></p>}</div></aside>}
 <section className="tienda-showcase">
 {gm&&permitido&&<div className={`tienda-drop ${arrastrando?"is-over":""}`} onDragOver={e=>{if(e.dataTransfer.types.includes("application/x-yugen-forja")){e.preventDefault();e.dataTransfer.dropEffect="copy";setArrastrando(true);}}} onDragLeave={()=>setArrastrando(false)} onDrop={e=>{e.preventDefault();setArrastrando(false);if(ocupado)return;const p=plantillas.find(p=>p.id===e.dataTransfer.getData("application/x-yugen-forja"));if(p)elegir(p);}}>
 {!elegida?<div className="tienda-drop-hint"><Plus size={24}/><h2>Publicar una creación</h2><p>Arrástrala aquí desde el Yunque.</p></div>:<form onSubmit={publicar}><div className="tienda-actions"><h2>{elegida.nombre}</h2><button type="button" disabled={ocupado} onClick={()=>setElegida(null)} aria-label="Cancelar publicación"><X size={16}/></button></div><label>Descripción de la oferta<textarea autoFocus required maxLength={5000} rows={3} value={descripcion} onChange={e=>setDescripcion(e.target.value)} placeholder="Describe qué se ofrece y sus condiciones…"/></label><p>Esta descripción pertenece a la oferta; la creación original se conserva.</p><div className="precio-form"><label>Forma de pago<select value={modo} onChange={e=>setModo(e.target.value)}><option value="presencial">Discutir en persona</option><option value="monedas">Precio en monedas / puntos</option></select></label>{modo==="monedas"&&<><label>Moneda<select required value={moneda} onChange={e=>setMoneda(e.target.value)}><option value="">Seleccionar moneda</option>{monedas.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label><label>Precio<input required type="number" min="1" max="1000000000000" step="1" value={precio} onChange={e=>setPrecio(e.target.value)}/></label></>}</div><button className="tienda-primary" disabled={ocupado||!descripcion.trim()}>Publicar en el escaparate</button></form>}
 </div>}
 <nav className="tienda-tabs" aria-label="Ofertas"><button aria-pressed={vista==="activas"} onClick={()=>setVista("activas")}>Escaparate</button><button aria-pressed={vista==="negociaciones"} onClick={()=>setVista("negociaciones")}>{gm?"Negociaciones":"Mis negociaciones"}</button><button aria-pressed={vista==="historial"} onClick={()=>setVista("historial")}>Cerradas</button></nav>
 {cargando?<p role="status">Cargando tienda…</p>:<div className="tienda-grid">{visibles.map(o=><article key={o.id} className="tienda-card"><div className="tienda-meta"><span>{o.tipo} · {o.clase}</span><span data-estado={o.estado}>{estados[o.estado]}</span></div><h2>{o.nombre}</h2><p className="tienda-description">{o.descripcion}</p><p className="tienda-precio">{o.modo_precio==="monedas"?`${Number(o.precio).toLocaleString("es-DO")} ${monedas.find(m=>m.id===o.moneda_id)?.nombre||"monedas"}`:"A discutir en persona"}</p>{o.estado==="negociando"&&<p className="tienda-private"><Handshake size={15}/>{gm?`Negociando con ${o.negociador_nombre||"un jugador"}`:"Reservada para ti y el GM"}</p>}
 {o.propuesta&&o.estado!=="disponible"&&<blockquote className="tienda-propuesta"><strong>Propuesta del jugador</strong>{o.propuesta}</blockquote>}
 <div className="tienda-card-actions">{o.estado==="disponible"&&(gm?<button disabled={ocupado} onClick={()=>{if(window.confirm(`¿Retirar «${o.nombre}» del escaparate?`))void operar("retirar",o.id);}}>Retirar oferta</button>:<button className="tienda-primary" disabled={ocupado} onClick={()=>{setTrato(o.id);setPropuesta("");}}>{o.modo_precio==="monedas"?"Solicitar compra":"Negociar"}</button>)}{gm&&o.estado==="negociando"&&<><button className="tienda-primary" disabled={ocupado} onClick={()=>{if(o.modo_precio!=="monedas"||window.confirm(`¿Aceptar y descontar ${o.precio} ${monedas.find(m=>m.id===o.moneda_id)?.nombre||"monedas"} al jugador?`))void operar("aceptar",o.id);}}>{o.modo_precio==="monedas"?"Aceptar y cobrar":"Aceptar"}</button><button disabled={ocupado} onClick={()=>void operar("rechazar",o.id)}>Rechazar</button></>}{!gm&&o.estado==="negociando"&&<><button disabled={ocupado} onClick={()=>{setTrato(o.id);setPropuesta(o.propuesta||"");}}>Editar propuesta</button><button disabled={ocupado} onClick={()=>void operar("cancelar",o.id)}>Cancelar negociación</button></>}{gm&&o.estado==="aceptada"&&<span>Acuerdo aceptado</span>}{!gm&&o.estado==="aceptada"&&<p>El GM aceptó el acuerdo.</p>}</div>
 {!gm&&trato===o.id&&["disponible","negociando"].includes(o.estado)&&<form className="tienda-trato" onSubmit={e=>{e.preventDefault();void operar(o.estado==="negociando"?"proponer":"negociar",o.id);}}><label htmlFor={`propuesta-${o.id}`}>Tu propuesta para el GM<textarea id={`propuesta-${o.id}`} autoFocus rows={4} maxLength={2000} disabled={ocupado} value={propuesta} onChange={e=>setPropuesta(e.target.value)} placeholder="Por ejemplo: ofrezco 20 de oro y completar una misión…"/></label><small>Solo tú y el GM verán este mensaje. {o.modo_precio==="monedas"?"La propuesta no cambia el precio publicado: se cobra al aceptar el GM.":"El acuerdo se confirma en persona; escribirlo no genera cobros."}</small><div className="tienda-card-actions"><button className="tienda-primary" disabled={ocupado} type="submit">{o.estado==="negociando"?"Guardar propuesta":"Enviar solicitud"}</button><button type="button" disabled={ocupado} onClick={()=>setTrato(null)}>Volver</button></div></form>}
 </article>)}</div>}{!cargando&&!visibles.length&&<div className="tienda-empty"><ShoppingBag size={28}/><h2>{vista==="negociaciones"?"Sin negociaciones pendientes":"No hay ofertas en esta sección"}</h2><p>{gm?"Publica creaciones del Yunque para dar vida al escaparate.":"Las ofertas disponibles aparecerán aquí cuando el GM las publique."}</p></div>}
 </section></div><footer className="tienda-note">El GM confirma cada acuerdo. Los precios fijos se descuentan al aceptar; los acuerdos presenciales no generan cobros automáticos. Las nuevas compras se entregan al aceptar: lo asociado al alma queda en la cuenta y los personajes aparecen en su gestión.</footer></main>;
}
