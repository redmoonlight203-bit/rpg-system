"use client";
import {useEffect,useMemo,useState,type ComponentType,type CSSProperties} from "react";
import {ArrowLeft,Settings2} from "lucide-react";
import {CODICES,arcanoDe,configuracionBase,resolverCodice,type Codice,type ConfiguracionCodices} from "../../lib/codices";
import {rangoDe} from "../../lib/cartas";
import {imagenCreacion} from "../../lib/arte-creacion";
import {useDialogo} from "../Dialogo";
import type {PiezaGaleria,PropsGaleria} from "../GaleriaCreacion";
import {AccionesCreacion,Rastro,ZonaPeligro,nombreTipo} from "./Comunes";
import {EditorPresentacion,EstadoPresentacionAvisos,usePresentacion} from "./EditorPresentacion";
import Pergamino from "./Pergamino";
import Tarot from "./Tarot";
import Bestiario from "./Bestiario";
import Reliquia from "./Reliquia";
import Sello from "./Sello";
import Edicto from "./Edicto";
import Expediente from "./Expediente";
import type {ContextoCodice,VistaProps} from "./tipos";
import "./codices.css";

/** Pieza central de cada códice. Un códice sin vista propia usa el pergamino. */
const VISTAS:Partial<Record<Codice,ComponentType<VistaProps<PiezaGaleria>>>>={pergamino:Pergamino,tarot:Tarot,bestiario:Bestiario,reliquia:Reliquia,sello:Sello,edicto:Edicto,expediente:Expediente};

export type PropsVistaCodice<T extends PiezaGaleria>={
  item:T;
  props:PropsGaleria<T>;
  volver:()=>void;
  abrir:(id:string)=>void;
  config?:ConfiguracionCodices;
  /** Fuerza un códice (vista previa del Taller). */
  codiceForzado?:Codice;
  rastro?:string[];
  irA?:(indice:number)=>void;
  /** Cambia el «Ver como» de la creación; null vuelve a la asignación automática. */
  onVerComo?:(id:string,codice:Codice|null)=>void;
  /** Abre el Taller de códices en el códice que se está leyendo. */
  onConfigurar?:(codice:Codice)=>void;
  /** Vista previa del Taller: sin acciones reales, sin editor de imagen ni volver. */
  vistaPrevia?:boolean;
};

export default function VistaCodice<T extends PiezaGaleria>({item,props,volver,abrir,config:configuracion,codiceForzado,rastro=[],irA,onVerComo,onConfigurar,vistaPrevia=false}:PropsVistaCodice<T>){
  const config=useMemo(()=>configuracion||configuracionBase(),[configuracion]);
  const {confirmar}=useDialogo();
  const presentacion=usePresentacion(item,props);
  const idTitulo=`cx-titulo-${item.id}`;
  const [indiceForma,cambiarForma]=useState(0);
  useEffect(()=>{if(!vistaPrevia)document.getElementById(idTitulo)?.focus();},[idTitulo,vistaPrevia]);
  const formas=item.formas_historia||[];
  const forma=formas[indiceForma]||formas[0];
  const tipo=props.tipoDe(item);
  const monstruo=!!props.esMonstruo?.(item);
  const codice=codiceForzado||resolverCodice(item,tipo,monstruo,config);
  const ocupado=presentacion.ocupado;
  function navegar(fn:()=>void){
    if(ocupado)return;
    if(!presentacion.dirty){fn();return;}
    void confirmar({titulo:"Imagen sin guardar",mensaje:"Tienes una imagen sin guardar. ¿Descartar el cambio?",aceptar:"Descartar",cancelar:"Seguir editando",peligro:true}).then(si=>{if(si)fn();});
  }
  const rango=rangoDe(item.clase);
  const vars={nombre:item.nombre,clasificacion:props.clasificacion(item.tipo),tipo:nombreTipo(tipo,monstruo),rango:rango.clave,rango_nombre:rango.nombre,romano:arcanoDe(item.id).romano};
  const imagenVisible=imagenCreacion(item.id,presentacion.editando?presentacion.imagen:forma?.imagen||presentacion.imagen);
  const iconoVisible=props.iconoDe({...item,icono:presentacion.icono});
  const base:ContextoCodice<T>={
    item,props,config,codice,tipo,monstruo,imagenVisible,iconoVisible,forma,presentacion,ocupado,vars,idTitulo,
    abrir:id=>navegar(()=>abrir(id)),
    navegar,
    ranuras:{acciones:null,presentacion:null,peligro:null,formas:null,estado:null,verComo:null},
  };
  const ctx:ContextoCodice<T>={...base,ranuras:{
    acciones:vistaPrevia?null:<AccionesCreacion ctx={base}/>,
    presentacion:vistaPrevia?null:<EditorPresentacion ctx={base}/>,
    peligro:vistaPrevia?null:<ZonaPeligro ctx={base}/>,
    estado:<EstadoPresentacionAvisos p={presentacion}/>,
    formas:formas.length>0?<label className="cx-campo">Cambiar forma
      <select className="cx-select" value={forma?formas.indexOf(forma):0} onChange={e=>cambiarForma(Number(e.target.value))}>
        {formas.map((f,i)=><option key={i} value={i}>{f.nombre}</option>)}
      </select>
    </label>:null,
    verComo:vistaPrevia?null:(onVerComo||onConfigurar)?<div className="cx-ajustes-codice">{onVerComo&&<label className="cx-campo cx-ver-como">Ver como
      <select className="cx-select" value={config.porCreacion[item.id]||""} disabled={ocupado} onChange={e=>onVerComo(item.id,(e.target.value||null) as Codice|null)}>
        <option value="">Automático ({config.codices[resolverCodice({...item,id:""},tipo,monstruo,config)].nombre})</option>
        {CODICES.map(c=><option key={c} value={c}>{config.codices[c].nombre}</option>)}
      </select>
    </label>}{onConfigurar&&<button type="button" className="cg-button cx-configurar" disabled={ocupado} onClick={()=>navegar(()=>onConfigurar(codice))}><Settings2 size={15} aria-hidden="true"/>Configurar «{config.codices[codice].nombre}»</button>}</div>:null,
  }};
  const Vista=(VISTAS[codice]||Pergamino) as ComponentType<VistaProps<T>>;
  const estilo={"--cx-pagina-ms":`${config.movimiento.pagina_ms}ms`,"--cx-volteo-ms":`${config.movimiento.volteo_ms}ms`} as CSSProperties;
  const nombreDe=(id:string)=>props.items.find(i=>i.id===id)?.nombre||"Creación no disponible";
  return <section className={`cg-detail cx-codice cx-codice--${codice} ${rango.css}`} data-movimiento={config.movimiento.activo?"si":"no"} style={estilo} aria-label={`Detalles de ${item.nombre}`}>
    {!vistaPrevia&&<div className="cx-barra">
      <button type="button" className="cg-back" disabled={ocupado} onClick={()=>navegar(volver)}><ArrowLeft size={17}/>Volver a la colección</button>
      {irA&&<Rastro rastro={rastro} nombreDe={nombreDe} irA={i=>navegar(()=>irA(i))} volver={()=>navegar(volver)}/>}
    </div>}
    <Vista ctx={ctx}/>
  </section>;
}
