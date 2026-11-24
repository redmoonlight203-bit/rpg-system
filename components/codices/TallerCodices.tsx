"use client";
import {useMemo,useRef,useState,type ReactNode} from "react";
import {ChevronDown,Download,Plus,RotateCcw,Save,Trash2,Upload,X} from "lucide-react";
import {TIPOS} from "../../lib/creacion";
import {
  CATALOGO_SECCIONES,CODICES,arcanoDe,configuracionBase,exportarConfiguracion,importarConfiguracion,
  nuevaAsignacion,plantilla,resolverCodice,resumenAsignacion,seccionesDisponibles,
  type AjustesCodice,type Codice,type ConfiguracionCodices,type OrigenConfiguracion,type ReglaAsignacion,type SeccionConfig,
} from "../../lib/codices";
import {rangoDe} from "../../lib/cartas";
import {useDialogo} from "../Dialogo";
import ListaArrastrable from "../ListaArrastrable";
import type {PiezaGaleria,PropsGaleria} from "../GaleriaCreacion";
import {nombreTipo} from "./Comunes";
import VistaCodice from "./VistaCodice";
import "./codices.css";

type Pestana="asignacion"|"codices"|"movimiento"|"archivo";
const PESTANAS:{clave:Pestana;nombre:string}[]=[
  {clave:"asignacion",nombre:"Asignación"},
  {clave:"codices",nombre:"Códices"},
  {clave:"movimiento",nombre:"Movimiento"},
  {clave:"archivo",nombre:"Archivo"},
];
const MARCADORES=["nombre","clasificacion","tipo","rango","rango_nombre","romano"];
const ORIGEN:Record<OrigenConfiguracion,string>={
  servidor:"Guardada en el servidor: la ven todos los dispositivos del GM.",
  local:"Solo en este navegador: el servidor aún no tiene la configuración.",
  base:"Valores por defecto: aún no se ha guardado ninguna configuración.",
};

export type PropsTaller<T extends PiezaGaleria>={
  config:ConfiguracionCodices;
  origen:OrigenConfiguracion;
  error:string;
  guardando:boolean;
  props:PropsGaleria<T>;
  codiceInicial?:Codice;
  onGuardar:(config:ConfiguracionCodices)=>Promise<boolean>;
  onCerrar:()=>void;
};

/** Taller de códices: el GM decide qué códice lee cada creación, qué secciones muestra y cómo se mueve. */
export default function TallerCodices<T extends PiezaGaleria>({config,origen,error,guardando,props,codiceInicial,onGuardar,onCerrar}:PropsTaller<T>){
  const {confirmar}=useDialogo();
  const [borrador,setBorrador]=useState<ConfiguracionCodices>(()=>structuredClone(config));
  const [pestana,setPestana]=useState<Pestana>(codiceInicial?"codices":"asignacion");
  const [codice,setCodice]=useState<Codice>(codiceInicial||"tarot");
  const [previaId,setPreviaId]=useState<string>(()=>props.items[0]?.id||"");
  const [importado,setImportado]=useState<{config:ConfiguracionCodices;avisos:string[];nombre:string}|null>(null);
  const [mensaje,setMensaje]=useState("");
  // Reglas desplegadas para editar; las demás se ven como una línea de resumen.
  const [abiertas,setAbiertas]=useState<Set<string>>(()=>new Set());
  const alternar=(id:string)=>setAbiertas(a=>{const n=new Set(a);if(n.has(id))n.delete(id);else n.add(id);return n;});
  const archivo=useRef<HTMLInputElement>(null);
  const sucio=useMemo(()=>JSON.stringify(borrador)!==JSON.stringify(config),[borrador,config]);
  const previa=props.items.find(i=>i.id===previaId)||props.items[0];
  const cambiar=(fn:(c:ConfiguracionCodices)=>ConfiguracionCodices)=>{setBorrador(c=>fn(structuredClone(c)));setMensaje("");};
  const ajustes=borrador.codices[codice];
  const cambiarAjustes=(fn:(a:AjustesCodice)=>void)=>cambiar(c=>{fn(c.codices[codice]);return c;});

  async function guardar(){
    if(await onGuardar(borrador))setMensaje("Configuración guardada.");
  }
  function cerrar(){
    if(!sucio){onCerrar();return;}
    void confirmar({titulo:"Cambios sin guardar",mensaje:"Tienes cambios en el Taller de códices. ¿Salir sin guardarlos?",aceptar:"Salir",cancelar:"Seguir editando",peligro:true}).then(si=>{if(si)onCerrar();});
  }
  async function leerArchivo(f?:File){
    if(!f)return;
    if(f.size>500000){setMensaje("El archivo supera los 500 KB.");return;}
    const r=importarConfiguracion(await f.text());
    if(r.error!==undefined){setMensaje(r.error);setImportado(null);return;}
    setImportado({config:r.config,avisos:r.avisos,nombre:f.name});
  }
  function descargar(){
    const url=URL.createObjectURL(new Blob([exportarConfiguracion(borrador)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="codices-yugen.json";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  // Marcadores de ejemplo para la plantilla del eyebrow, tomados de la creación de la vista previa.
  const ejemplo=previa?(()=>{
    const r=rangoDe(previa.clase),tipo=props.tipoDe(previa),monstruo=!!props.esMonstruo?.(previa);
    return {nombre:previa.nombre,clasificacion:props.clasificacion(previa.tipo),tipo:nombreTipo(tipo,monstruo),rango:r.clave,rango_nombre:r.nombre,romano:arcanoDe(previa.id).romano};
  })():{nombre:"Creación",clasificacion:"General",tipo:"Objeto",rango:"D",rango_nombre:"Bronce",romano:"IV"};
  const codicePrevia=previa?resolverCodice(previa,props.tipoDe(previa),!!props.esMonstruo?.(previa),borrador):"pergamino";

  const paneles:Record<Pestana,ReactNode>={
    asignacion:<div className="cx-taller-panel">
      <p className="cx-ayuda">Cada creación se lee con el códice de la <b>primera</b> regla que coincide. «Ver como» en una creación concreta tiene prioridad. Sin ninguna regla, se usa el pergamino.</p>
      <ListaArrastrable<ReglaAsignacion> items={borrador.asignaciones} nombre="reglas de asignación" onChange={lista=>cambiar(c=>({...c,asignaciones:lista}))}
        render={(a,i)=><div className={`cx-regla-plegable ${abiertas.has(a.id)?"is-abierta":""}`}>
          <button type="button" className="cx-regla-resumen" aria-expanded={abiertas.has(a.id)} aria-controls={`cx-regla-${a.id}`} onClick={()=>alternar(a.id)}>
            <span>{resumenAsignacion(a,k=>borrador.codices[k].nombre,k=>props.clasificaciones.find(x=>x.clave===k)?.nombre||k)}</span>
            <ChevronDown size={15} aria-hidden="true"/>
          </button>
          {abiertas.has(a.id)&&<div className="cx-regla" id={`cx-regla-${a.id}`}>
          <label>Tipo<select className="cx-select" value={a.tipo} onChange={e=>cambiar(c=>{c.asignaciones[i].tipo=e.target.value;return c;})}>
            <option value="*">Cualquiera</option>{TIPOS.map(t=><option key={t.valor} value={t.valor}>{t.nombre}</option>)}
          </select></label>
          <label>Monstruo<select className="cx-select" value={a.monstruo} onChange={e=>cambiar(c=>{c.asignaciones[i].monstruo=e.target.value as ReglaAsignacion["monstruo"];return c;})}>
            <option value="*">Indiferente</option><option value="si">Solo monstruos</option><option value="no">Sin monstruos</option>
          </select></label>
          <label>Clasificación<select className="cx-select" value={a.clasificacion} onChange={e=>cambiar(c=>{c.asignaciones[i].clasificacion=e.target.value;return c;})}>
            <option value="">Cualquiera</option>{props.clasificaciones.map(k=><option key={k.clave} value={k.clave}>{k.nombre}</option>)}
          </select></label>
          <label>Códice<select className="cx-select" value={a.codice} onChange={e=>cambiar(c=>{c.asignaciones[i].codice=e.target.value as Codice;return c;})}>
            {CODICES.map(k=><option key={k} value={k}>{borrador.codices[k].nombre}</option>)}
          </select></label>
          <button type="button" className="cg-button cx-quitar" aria-label={`Quitar la regla ${i+1}`} onClick={()=>cambiar(c=>{c.asignaciones.splice(i,1);return c;})}><Trash2 size={14}/></button>
        </div>}
        </div>}/>
      <button type="button" className="cg-button" disabled={borrador.asignaciones.length>=50} onClick={()=>{const nueva=nuevaAsignacion(borrador.asignaciones);cambiar(c=>{c.asignaciones.push(nueva);return c;});setAbiertas(a=>new Set(a).add(nueva.id));}}><Plus size={15}/>Añadir regla</button>
      {Object.keys(borrador.porCreacion).length>0&&<div className="cx-taller-bloque"><h4>«Ver como» de creaciones concretas</h4>
        <ul className="cx-propias">{Object.entries(borrador.porCreacion).map(([id,k])=><li key={id}>
          <span>{props.items.find(i=>i.id===id)?.nombre||"Creación no disponible"}</span>
          <select className="cx-select" aria-label={`Códice de ${props.items.find(i=>i.id===id)?.nombre||id}`} value={k} onChange={e=>cambiar(c=>{c.porCreacion[id]=e.target.value as Codice;return c;})}>{CODICES.map(x=><option key={x} value={x}>{borrador.codices[x].nombre}</option>)}</select>
          <button type="button" className="cg-button cx-quitar" aria-label="Volver a automático" onClick={()=>cambiar(c=>{delete c.porCreacion[id];return c;})}><X size={14}/></button>
        </li>)}</ul>
      </div>}
    </div>,
    codices:<div className="cx-taller-panel">
      <div className="cx-codices-selector" role="group" aria-label="Códice que editas">{CODICES.map(k=><button key={k} type="button" aria-pressed={codice===k} onClick={()=>setCodice(k)}>{borrador.codices[k].nombre}</button>)}</div>
      <label className="cx-campo">Nombre del códice<input className="cx-select" maxLength={60} value={ajustes.nombre} onChange={e=>cambiarAjustes(a=>{a.nombre=e.target.value;})}/></label>
      <label className="cx-campo">Texto sobre el nombre<input className="cx-select" maxLength={120} value={ajustes.eyebrow} onChange={e=>cambiarAjustes(a=>{a.eyebrow=e.target.value;})}/></label>
      <div className="cx-marcadores" role="group" aria-label="Insertar marcador">{MARCADORES.map(m=><button key={m} type="button" onClick={()=>cambiarAjustes(a=>{a.eyebrow=`${a.eyebrow}{${m}}`.slice(0,120);})}>{`{${m}}`}</button>)}</div>
      <p className="cx-ayuda">Ejemplo: <b>{plantilla(ajustes.eyebrow,ejemplo)||"(sin texto)"}</b></p>
      <h4>Secciones</h4>
      <p className="cx-ayuda">Ordénalas, renómbralas u ocúltalas. Una sección sin datos nunca se muestra.{codice==="bestiario"?" En el bestiario cada sección es una página; las variantes ocupan una página cada una.":""}</p>
      <ListaArrastrable<SeccionConfig> items={ajustes.secciones} nombre={`secciones de ${ajustes.nombre}`} onChange={lista=>cambiarAjustes(a=>{a.secciones=lista;})}
        render={(s,i)=><div className={`cx-seccion-config ${s.visible?"":"is-oculta"}`}>
          <label className="cx-check"><input type="checkbox" checked={s.visible} onChange={e=>cambiarAjustes(a=>{a.secciones[i].visible=e.target.checked;})}/>Mostrar</label>
          <input className="cx-select" aria-label={`Título de ${CATALOGO_SECCIONES[s.clave].titulo}`} maxLength={60} value={s.titulo} onChange={e=>cambiarAjustes(a=>{a.secciones[i].titulo=e.target.value;})} onBlur={()=>cambiarAjustes(a=>{if(!a.secciones[i].titulo.trim())a.secciones[i].titulo=CATALOGO_SECCIONES[s.clave].titulo;})}/>
          <small>{CATALOGO_SECCIONES[s.clave].ayuda}</small>
          <button type="button" className="cg-button cx-quitar" aria-label={`Quitar ${s.titulo}`} onClick={()=>cambiarAjustes(a=>{a.secciones.splice(i,1);})}><Trash2 size={14}/></button>
        </div>}/>
      {seccionesDisponibles(ajustes).length>0&&<label className="cx-campo">Añadir sección<select className="cx-select" value="" onChange={e=>{const k=e.target.value as SeccionConfig["clave"];if(k)cambiarAjustes(a=>{a.secciones.push({clave:k,visible:true,titulo:CATALOGO_SECCIONES[k].titulo});});}}>
        <option value="">Elige una sección…</option>{seccionesDisponibles(ajustes).map(k=><option key={k} value={k}>{CATALOGO_SECCIONES[k].titulo} — {CATALOGO_SECCIONES[k].ayuda}</option>)}
      </select></label>}
      <button type="button" className="cg-button" onClick={()=>cambiarAjustes(a=>{Object.assign(a,configuracionBase().codices[codice]);})}><RotateCcw size={14}/>Restablecer este códice</button>
    </div>,
    movimiento:<div className="cx-taller-panel">
      <label className="cx-check"><input type="checkbox" checked={borrador.movimiento.activo} onChange={e=>cambiar(c=>{c.movimiento.activo=e.target.checked;return c;})}/>Animaciones activas (el movimiento reducido del sistema siempre las detiene)</label>
      <Rango etiqueta="Pasar página" unidad="ms" min={0} max={2000} paso={50} valor={borrador.movimiento.pagina_ms} cambiar={v=>cambiar(c=>{c.movimiento.pagina_ms=v;return c;})}/>
      <Rango etiqueta="Voltear carta" unidad="ms" min={0} max={2000} paso={50} valor={borrador.movimiento.volteo_ms} cambiar={v=>cambiar(c=>{c.movimiento.volteo_ms=v;return c;})}/>
      <Rango etiqueta="Inclinación de la carta" unidad="°" min={0} max={15} paso={1} valor={borrador.movimiento.inclinacion_max} cambiar={v=>cambiar(c=>{c.movimiento.inclinacion_max=v;return c;})}/>
      <Rango etiqueta="Dos páginas en el libro desde" unidad="px" min={480} max={1600} paso={20} valor={borrador.libro.dos_paginas_desde} cambiar={v=>cambiar(c=>{c.libro.dos_paginas_desde=v;return c;})}/>
      <Rango etiqueta="Longitud del rastro" unidad="" min={2} max={20} paso={1} valor={borrador.rastro.max} cambiar={v=>cambiar(c=>{c.rastro.max=v;return c;})}/>
      <label className="cx-check"><input type="checkbox" checked={borrador.tarot.tirada} onChange={e=>cambiar(c=>{c.tarot.tirada=e.target.checked;return c;})}/>Permitir la tirada de prueba</label>
    </div>,
    archivo:<div className="cx-taller-panel">
      <p className="cx-ayuda">Guarda la configuración en un archivo para reutilizarla en otra campaña o compartirla. Al abrir un archivo se valida y se muestra qué se corrige antes de reemplazar el borrador.</p>
      <div className="cx-fila-botones">
        <button type="button" className="cg-button" onClick={descargar}><Download size={15}/>Exportar a archivo</button>
        <button type="button" className="cg-button" onClick={()=>archivo.current?.click()}><Upload size={15}/>Abrir archivo…</button>
        <input ref={archivo} type="file" accept="application/json,.json" hidden aria-label="Abrir archivo de códices" onChange={e=>{void leerArchivo(e.target.files?.[0]);e.target.value="";}}/>
      </div>
      {importado&&<div className="cx-taller-bloque" role="region" aria-label="Vista previa del archivo">
        <h4>{importado.nombre}</h4>
        {importado.avisos.length?<ul className="cx-avisos">{importado.avisos.map(a=><li key={a}>{a}</li>)}</ul>:<p className="cx-ayuda">El archivo es válido y no necesita correcciones.</p>}
        <div className="cx-fila-botones">
          <button type="button" className="cg-button cg-primary" onClick={()=>{setBorrador(importado.config);setImportado(null);setMensaje("Archivo aplicado al borrador. Revisa la vista previa y guarda.");}}>Aplicar al borrador</button>
          <button type="button" className="cg-button" onClick={()=>setImportado(null)}>Descartar</button>
        </div>
      </div>}
      <button type="button" className="cg-button" onClick={()=>void confirmar({titulo:"Restablecer los códices",mensaje:"El borrador volverá a los valores por defecto (no se guarda hasta que pulses Guardar).",aceptar:"Restablecer",cancelar:"Cancelar",peligro:true}).then(si=>{if(si){setBorrador(configuracionBase());setMensaje("Borrador restablecido.");}})}><RotateCcw size={15}/>Restablecer todos los valores</button>
    </div>,
  };

  return <section className="cx-taller" aria-labelledby="cx-taller-titulo">
    <header className="cx-taller-cab">
      <div><span className="cg-eyebrow">Forja · presentación</span><h2 id="cx-taller-titulo">Taller de códices</h2><p>Decide cómo se lee cada creación: qué códice usa, qué secciones muestra y cómo se mueve.</p></div>
      <button type="button" className="cg-button" onClick={cerrar}><X size={15}/>Cerrar</button>
    </header>
    <div className="cx-taller-cuerpo">
      <div className="cx-taller-ajustes">
        <div role="tablist" aria-label="Apartados del taller" className="cx-pestanas">
          {PESTANAS.map(p=><button key={p.clave} type="button" role="tab" id={`cx-tab-${p.clave}`} aria-selected={pestana===p.clave} aria-controls={`cx-panel-${p.clave}`} tabIndex={pestana===p.clave?0:-1}
            onClick={()=>setPestana(p.clave)}
            onKeyDown={e=>{
              const i=PESTANAS.findIndex(x=>x.clave===pestana);
              const n=e.key==="ArrowRight"?(i+1)%PESTANAS.length:e.key==="ArrowLeft"?(i+PESTANAS.length-1)%PESTANAS.length:-1;
              if(n>=0){e.preventDefault();setPestana(PESTANAS[n].clave);document.getElementById(`cx-tab-${PESTANAS[n].clave}`)?.focus();}
            }}>{p.nombre}</button>)}
        </div>
        <div role="tabpanel" id={`cx-panel-${pestana}`} aria-labelledby={`cx-tab-${pestana}`}>{paneles[pestana]}</div>
        <footer className="cx-taller-pie">
          <p className={`cx-origen is-${origen}`}>{ORIGEN[origen]}</p>
          {error&&<p className="cg-error" role="alert">{error}</p>}
          {mensaje&&<p className="cg-success" role="status">{mensaje}</p>}
          {sucio&&<p className="cg-unsaved">Cambios sin guardar</p>}
          <div className="cx-fila-botones">
            <button type="button" className="cg-button" disabled={!sucio||guardando} onClick={()=>setBorrador(structuredClone(config))}>Deshacer cambios</button>
            <button type="button" className="cg-button cg-primary" disabled={!sucio||guardando} onClick={()=>void guardar()}><Save size={15}/>{guardando?"Guardando…":"Guardar configuración"}</button>
          </div>
        </footer>
      </div>
      <div className="cx-taller-previa">
        <div className="cx-taller-previa-cab">
          <h3>Vista previa</h3>
          <label className="cx-campo">Creación<select className="cx-select" value={previa?.id||""} onChange={e=>setPreviaId(e.target.value)}>
            {props.items.map(i=><option key={i.id} value={i.id}>{i.nombre} · {nombreTipo(props.tipoDe(i),!!props.esMonstruo?.(i))}</option>)}
          </select></label>
          {previa&&<p className="cx-ayuda">Se lee como <b>{borrador.codices[codicePrevia].nombre}</b>.</p>}
        </div>
        {previa?<div className="cx-taller-escenario"><VistaCodice key={previa.id} item={previa} props={props} config={borrador} vistaPrevia volver={()=>{}} abrir={setPreviaId}/></div>
          :<p className="cx-ayuda">Aún no hay creaciones. Crea algo en el Yunque para verlo aquí.</p>}
      </div>
    </div>
  </section>;
}

function Rango({etiqueta,unidad,min,max,paso,valor,cambiar}:{etiqueta:string;unidad:string;min:number;max:number;paso:number;valor:number;cambiar:(v:number)=>void}){
  return <label className="cx-rango">
    <span>{etiqueta}<b>{valor}{unidad&&` ${unidad}`}</b></span>
    <input type="range" min={min} max={max} step={paso} value={valor} onChange={e=>cambiar(Number(e.target.value))}/>
  </label>;
}
