"use client";
import {useState} from "react";
import {Dices} from "lucide-react";
import {SLOTS,efectosDe,formula,EFECTOS_NOMBRE} from "../../lib/creacion";
import {portadoresDe,tirarPrueba,variantesBestiario,vinculosDe,type ClaveSeccion,type SeccionConfig} from "../../lib/codices";
import {Medallon} from "../ui/Juego";
import {atributos,valor,type PiezaGaleria} from "../GaleriaCreacion";
import {EnlaceCreacion} from "./Comunes";
import {GrupoVinculos,Miniatura,MiniReliquia,MiniSello,MiniTarot} from "./Miniaturas";
import {ListaAcciones,ListaPasivas,ListaReglas,Ritual} from "./ReglasCodice";
import type {ContextoCodice} from "./tipos";
import type {CSSProperties} from "react";

const conDados=<T extends PiezaGaleria>(ctx:ContextoCodice<T>)=>efectosDe(ctx.item).filter(e=>e.cantidad>0&&e.caras>0);
const requisitosUso=<T extends PiezaGaleria>(ctx:ContextoCodice<T>)=>{
  const r=ctx.item.requisitos_uso||{};
  return !!(r.razas?.length||Object.keys(r.minimos||{}).length||r.nivel_minimo||r.habilidades?.length||r.clanes?.length);
};
const naturaleza=<T extends PiezaGaleria>(ctx:ContextoCodice<T>)=>{
  const n=ctx.item.naturaleza_vinculo;
  return !!(n&&(n.bestia||n.sello||n.origen||n.notas));
};

/** ¿Tiene la creación algo que mostrar en esta sección? Una sección sin datos nunca se dibuja. */
export function tieneDatos<T extends PiezaGaleria>(ctx:ContextoCodice<T>,clave:ClaveSeccion):boolean{
  const {item}=ctx;
  switch(clave){
    case "atributos":case "heraldica":return atributos(item).length>0;
    case "acciones":return efectosDe(item).length>0;
    case "dados":return conDados(ctx).some(e=>e.efecto==="dano");
    case "tirada":return ctx.config.tarot.tirada&&conDados(ctx).length>0;
    case "pasivas":case "ritual":return !!item.reglas_pasivas?.length;
    case "reglas":return !!item.reglas?.length;
    case "grimorio":return !!item.habilidades?.length;
    case "arsenal":return Object.values(item.equipamiento||{}).some(Boolean);
    case "talismanes":return !!item.pasivas?.length;
    case "vinculos":return vinculosDe(item,ctx.props.items).length>0;
    case "variantes":return !!item.configuracion_monstruo?.variantes?.length;
    case "artefacto":return !!item.configuracion_artefacto?.niveles?.length;
    case "requisitos":return requisitosUso(ctx)||!!item.requisitos?.trim()||!!item.defectos?.trim();
    case "naturaleza":return naturaleza(ctx);
    case "invocacion":return !!item.configuracion_invocacion?.plantilla;
    case "historia":return !!item.historia?.trim()||!!ctx.forma;
    case "portadores":return portadoresDe(item.id,ctx.props.items).length>0;
  }
}

function Atributos<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  const lista=atributos(ctx.item);
  if(ctx.codice==="expediente")return <div className="cx-medallones">{lista.map(([k,v])=><Medallon key={k} etiqueta={ctx.props.etiqueta(ctx.item,k)} valor={valor(v)}/>)}</div>;
  return <dl className={`cg-attribute-grid cx-atributos is-${ctx.codice}`}>{lista.map(([k,v])=><div key={k}><dt>{ctx.props.etiqueta(ctx.item,k)}</dt><dd>{valor(v)}</dd></div>)}</dl>;
}

function Heraldica<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  return <ul className="cx-heraldica">{atributos(ctx.item).map(([k,v])=><li key={k}>
    <span className="cx-escudo">{typeof v==="number"?`${v>0?"+":""}${v}`:valor(v)}</span>
    <span>{ctx.props.etiqueta(ctx.item,k)}</span>
  </li>)}</ul>;
}

function Dados<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  return <ul className="cx-dados">{conDados(ctx).filter(e=>e.efecto==="dano").map(e=><li key={e.id}><Dices size={15} aria-hidden="true"/><strong>{formula(e)}</strong><span>{e.nombre||EFECTOS_NOMBRE[e.efecto]}{e.tipo_dano?` · ${e.tipo_dano}`:""}</span></li>)}</ul>;
}

function Tirada<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  const lista=conDados(ctx);
  const [elegida,setElegida]=useState(lista[0]?.id||"");
  const [resultado,setResultado]=useState<{dados:number[];total:number;mod:number}|null>(null);
  const accion=lista.find(e=>e.id===elegida)||lista[0];
  return <div className="cx-tirada">
    <label>Acción<select className="cx-select" value={accion?.id} onChange={e=>{setElegida(e.target.value);setResultado(null);}}>{lista.map(e=><option key={e.id} value={e.id}>{e.nombre||EFECTOS_NOMBRE[e.efecto]} · {formula(e)}</option>)}</select></label>
    <button type="button" className="cg-button" onClick={()=>accion&&setResultado({...tirarPrueba(accion),mod:Number(accion.modificador)||0})}><Dices size={15} aria-hidden="true"/>Lanzar</button>
    <output aria-live="polite" className="cx-tirada-resultado">{resultado?`${resultado.dados.join(" + ")||"0"}${resultado.mod?` ${resultado.mod>0?"+":"−"} ${Math.abs(resultado.mod)}`:""} = ${resultado.total}`:""}</output>
    <small>Solo es una prueba: no aplica daño ni consume PH.</small>
  </div>;
}

const FILAS_ARSENAL=[["casco","capa"],["mano_der","pechera","mano_izq"],["pantalones"],["zapatos"]];
function Arsenal<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  const equipo=ctx.item.equipamiento||{};
  const dosManos=equipo.mano_der&&ctx.props.items.find(i=>i.id===equipo.mano_der)?.slot_tipo==="dos_manos";
  const hueco=(clave:string)=>{
    const slot=SLOTS.find(s=>s.clave===clave)!;
    if(clave==="mano_izq"&&dosManos)return <li key={clave} className="cx-hueco is-ocupado-por-dos"><small>{slot.nombre}</small><span>Dos manos</span></li>;
    const id=equipo[clave];
    return <li key={clave} className={`cx-hueco ${id?"is-lleno":""}`} aria-label={id?undefined:`${slot.nombre}: vacío`}>
      <small aria-hidden={!id}>{slot.nombre}</small>
      {id?<MiniReliquia ctx={ctx} id={id}/>:<span aria-hidden="true">—</span>}
    </li>;
  };
  const accesorios=SLOTS.filter(s=>s.clave.startsWith("acc_")&&equipo[s.clave]);
  return <div className="cx-arsenal">
    {FILAS_ARSENAL.map((fila,i)=><ul key={i} className="cx-arsenal-fila">{fila.map(hueco)}</ul>)}
    {accesorios.length>0&&<ul className="cx-arsenal-fila is-accesorios">{accesorios.map(s=>hueco(s.clave))}</ul>}
  </div>;
}

function Variantes<T extends PiezaGaleria>({ctx,soloId}:{ctx:ContextoCodice<T>;soloId?:string}){
  const nombreDe=(id:string)=>ctx.props.items.find(i=>i.id===id)?.nombre??null;
  const lista=variantesBestiario(ctx.item.configuracion_monstruo,nombreDe).filter(v=>!soloId||v.id===soloId);
  return <div className="cx-variantes">{lista.map(v=><article key={v.id} className="cx-variante">
    {!soloId&&<h4>{v.nombre}</h4>}
    <p className="cx-probabilidad"><span className="cx-probabilidad-barra" style={{"--p":`${v.probabilidad}%`} as CSSProperties} aria-hidden="true"/>Aparece {v.probabilidad}% de las veces</p>
    {v.bonos.length>0&&<ul className="cx-bonos">{v.bonos.map(([k,n])=><li key={k}>{ctx.props.etiqueta(ctx.item,k)} <b>{n>0?"+":""}{n}</b></li>)}</ul>}
    {(v.habilidades.length>0||v.pasivas.length>0)&&<div className="cx-minis">{[...v.habilidades,...v.pasivas].map((id,i)=><Miniatura key={id} ctx={ctx} id={id} indice={i}/>)}</div>}
    {v.equipo.length>0&&<ul className="cx-equipo-variante">{v.equipo.map(e=><li key={e.espacio}><small>{e.espacio}</small>{e.texto}</li>)}</ul>}
  </article>)}</div>;
}

function Artefacto<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  const niveles=[...(ctx.item.configuracion_artefacto?.niveles||[])].sort((a,b)=>a.nivel-b.nivel);
  return <ol className="cx-niveles">{niveles.map(n=>{
    const c=n.condicion_subida;
    const condicion=!c?"Inicial":c.tipo==="contador"?`${c.meta} ${c.contador}`:`Al ocurrir: ${c.evento}`;
    const cambios=Object.entries(n.cambios?.stats||{}).filter(([,v])=>v);
    return <li key={n.nivel}>
      <span className="cx-nivel-numero">{n.nivel}</span>
      <div><strong>{n.nombre}</strong><small>{condicion}</small>
        {cambios.length>0&&<p>{cambios.map(([k,v])=>`${ctx.props.etiqueta(ctx.item,k)} ${v>0?"+":""}${v}`).join(" · ")}</p>}
        {n.cambios?.descripcion&&<p>{n.cambios.descripcion}</p>}
      </div>
    </li>;
  })}</ol>;
}

function Requisitos<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  const r=ctx.item.requisitos_uso||{};
  const lineas=[
    r.razas?.length?`Razas: ${r.razas.join(", ")}`:"",
    ...Object.entries(r.minimos||{}).map(([k,v])=>`${ctx.props.etiqueta(ctx.item,k)} mínimo ${v}`),
    r.nivel_minimo?`Nivel mínimo ${r.nivel_minimo}`:"",
    r.clanes?.length?`Clanes: ${r.clanes.join(", ")}`:"",
  ].filter(Boolean);
  return <>
    {(lineas.length>0||!!r.habilidades?.length)&&<div className="cx-requisitos-uso"><h4>Requisitos de uso</h4>
      {lineas.length>0&&<ul>{lineas.map(l=><li key={l}>{l}</li>)}</ul>}
      {!!r.habilidades?.length&&<div className="cx-minis">{r.habilidades.map((id,i)=><Miniatura key={id} ctx={ctx} id={id} indice={i}/>)}</div>}
    </div>}
    {ctx.item.requisitos?.trim()&&<><h4>Requisitos</h4><p className="cg-prose">{ctx.item.requisitos}</p></>}
    {ctx.item.defectos?.trim()&&<><h4>Limitaciones y defectos</h4><p className="cg-prose">{ctx.item.defectos}</p></>}
  </>;
}

function Contenido<T extends PiezaGaleria>({ctx,clave,varianteId}:{ctx:ContextoCodice<T>;clave:ClaveSeccion;varianteId?:string}){
  const {item}=ctx;
  switch(clave){
    case "atributos":return <Atributos ctx={ctx}/>;
    case "heraldica":return <Heraldica ctx={ctx}/>;
    case "acciones":return <ListaAcciones ctx={ctx}/>;
    case "dados":return <Dados ctx={ctx}/>;
    case "tirada":return <Tirada ctx={ctx}/>;
    case "pasivas":return <ListaPasivas ctx={ctx}/>;
    case "ritual":return <Ritual ctx={ctx}/>;
    case "reglas":return <ListaReglas ctx={ctx}/>;
    case "grimorio":return <div className="cx-abanico">{item.habilidades.map((id,i)=><MiniTarot key={id} ctx={ctx} id={id} indice={i-(item.habilidades.length-1)/2}/>)}</div>;
    case "arsenal":return <Arsenal ctx={ctx}/>;
    case "talismanes":return <div className="cx-minis">{item.pasivas.map(id=><MiniSello key={id} ctx={ctx} id={id}/>)}</div>;
    case "vinculos":return <GrupoVinculos ctx={ctx} vinculos={vinculosDe(item,ctx.props.items)}/>;
    case "variantes":return <Variantes ctx={ctx} soloId={varianteId}/>;
    case "artefacto":return <Artefacto ctx={ctx}/>;
    case "requisitos":return <Requisitos ctx={ctx}/>;
    case "naturaleza":{
      const n=item.naturaleza_vinculo!;
      return <dl className="cx-ficha-lista">{([["Bestia",n.bestia],["Sello",n.sello],["Origen",n.origen],["Notas",n.notas]] as const).filter(([,v])=>v).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
    }
    case "invocacion":{
      const p=item.configuracion_invocacion!.plantilla!;
      return <div><strong className="cx-subtitulo">{p.nombre}</strong><dl className="cx-ficha-lista">{Object.entries(p.stats||{}).map(([k,v])=><div key={k}><dt>{ctx.props.etiqueta(item,k)}</dt><dd>{v}</dd></div>)}</dl></div>;
    }
    case "historia":return <>
      {ctx.forma&&<div aria-live="polite"><h4>{ctx.forma.nombre}</h4><p className="cg-prose">{ctx.forma.historia}</p></div>}
      {item.historia?.trim()&&<p className="cg-prose cx-capitular">{item.historia}</p>}
    </>;
    case "portadores":return <div className="cx-minis">{portadoresDe(item.id,ctx.props.items).map((p,i)=><Miniatura key={p.id} ctx={ctx} id={p.id} indice={i}/>)}</div>;
  }
}

/** Una sección configurable: título del GM y contenido común a todos los códices. */
export function SeccionCodice<T extends PiezaGaleria>({ctx,seccion,varianteId,sinTitulo}:{ctx:ContextoCodice<T>;seccion:SeccionConfig;varianteId?:string;sinTitulo?:boolean}){
  if(!seccion.visible||!tieneDatos(ctx,seccion.clave))return null;
  return <section className={`cx-seccion cx-seccion-${seccion.clave}`} aria-label={sinTitulo?seccion.titulo:undefined}>
    {!sinTitulo&&<h3>{seccion.titulo}</h3>}
    <Contenido ctx={ctx} clave={seccion.clave} varianteId={varianteId}/>
  </section>;
}

/** Todas las secciones visibles del códice, en el orden configurado. */
export function SeccionesCodice<T extends PiezaGaleria>({ctx}:{ctx:ContextoCodice<T>}){
  return <>{ctx.config.codices[ctx.codice].secciones.map(s=><SeccionCodice key={s.clave} ctx={ctx} seccion={s}/>)}</>;
}

export {EnlaceCreacion};
