"use client";
import {marcoDe,rangoDe} from "../lib/cartas";
import {duenoDe,duenosConPersonales,filtrarAmbito,type FiltroAmbito} from "../lib/creaciones-personales";
import {mensajeError} from '../lib/errores';
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, ImagePlus, Upload, Link2, Save, ImageOff, X, Swords, Shield, Users, Sparkles, Package, Crown, Shapes, Pencil, Trash2 } from "lucide-react";
import { TIPOS, EFECTOS_NOMBRE, efectosDe, formula, type TipoCreacion, type Efecto } from "../lib/creacion";
import { EVENTOS, EFECTOS_REGLA, DESTINOS, type CondicionRegla, type EfectoRegla, type ValorRegla, type Regla } from "../lib/reglas";
import { type ReglaPasiva } from "../lib/pasivas";
import { validarPortada } from "../lib/imagenes-creacion";
import { imagenCreacion } from "../lib/arte-creacion";
import { publicarArchivoImagen } from "../lib/imagenes-storage";
import FotoEncuadrada from "./FotoEncuadrada";
import IconoYugen from "./IconoYugen";
import SelectorIconoYugen from "./SelectorIconoYugen";
import {describirEfecto,describirRegla,type AyudaClara} from "../lib/descripciones";
import ContenidoAyuda from "./ContenidoAyuda";
import "./galeria-creacion.css";
import VistaCodice from "./codices/VistaCodice";
import {useConfigCodices} from "./codices/useConfigCodices";
import {useDialogo} from "./Dialogo";
import {useRouter} from "next/navigation";
import type {ConfiguracionMonstruo} from "../lib/monstruos";
import type {ConfiguracionArtefacto} from "../lib/artefactos";
import type {RequisitosUso} from "../lib/combate";
import type {VinculoNaturaleza} from "../lib/yunque-borrador";
import type {InvocacionEditor} from "./EditorInvocacion";

export type PiezaGaleria = {
  formas_historia?: import("./FormasHistoria").FormaHistoria[];
  personal_de?: string | null;
  alma_en_uso?:boolean;icono?: string | null; id: string; nombre: string; tipo: string; tipo_creacion?: TipoCreacion;
  descripcion: string; historia: string; requisitos: string; defectos: string;
  imagen_url: string; clase: string; es_grupo: boolean; slot_tipo: string;
  ligado_al_alma: boolean; stats: Record<string, number>;
  stats_rango: Record<string, { min: number; max: number }>;
  habilidades: string[]; pasivas: string[]; equipamiento: Record<string, string>;
  configuracion_dados: Efecto[]; reglas_pasivas: ReglaPasiva[]; reglas: Regla[];
  configuracion_monstruo?: ConfiguracionMonstruo | null;
  configuracion_artefacto?: ConfiguracionArtefacto | null;
  configuracion_invocacion?: InvocacionEditor | null;
  requisitos_uso?: RequisitosUso;
  naturaleza_vinculo?: VinculoNaturaleza;
  consumible?: boolean;
  nivel_maximo?: number;
};
export type PropsGaleria<T extends PiezaGaleria> = {
  esMonstruo?:(item:T)=>boolean;
  items: T[]; cargando: boolean; iconoDe: (item:T)=>string;
  tipoDe: (item: T) => TipoCreacion; clasificacion: (clave: string) => string;
  clasificaciones: { clave: string; nombre: string }[];
  etiqueta: (item: T, clave: string) => string;
  onEditar: (item: T) => void; onEntregar: (item: T) => void;
  onRestablecer?: (item:T)=>Promise<void>;
  onBatalla: (item: T) => void; onEliminar: (item: T) => Promise<void>;
  onNueva: () => void; onImagen: (id: string, value: string, icono: string) => Promise<void>;
};
const iconos = { personaje: Users, habilidad: Swords, pasiva: Shield, objeto: Package, titulo: Crown, otro: Shapes };
export function Portada({ src, tipo, icono, circular }: { src?: string; tipo: TipoCreacion; icono: string; circular?: boolean }) {
  return <span className={`cg-art cg-art-${tipo}`}>
    <FotoEncuadrada src={src && !validarPortada(src) ? src : undefined} circular={circular}
      fallback={<span className="cg-placeholder"><IconoYugen id={icono} size={62}/><span>{src ? "Imagen no disponible" : "Emblema de Yugen"}</span></span>} />
  </span>;
}
export function atributos(item: PiezaGaleria) {
  return Object.entries(item.es_grupo ? item.stats_rango || {} : item.stats || {}).filter(([key]) => !["dados_dano", "caras_dano"].includes(key));
}
function ayudaCreacion(item:PiezaGaleria):AyudaClara {
 const efectos=efectosDe(item).slice(0,2).map(e=>describirEfecto(e));
 const reglas=(item.reglas||[]).slice(0,2).map(describirRegla);
 const resumen=item.descripcion?.trim()||efectos[0]?.resumen||reglas[0]?.resumen||"Abre esta creación para consultar sus atributos, equipo y reglas.";
 return {resumen,detalles:[...efectos.map(e=>e.resumen),...reglas.map(r=>r.resumen)].filter(r=>r!==resumen).slice(0,3)};
}
export function valor(value: number | { min: number; max: number }) { return typeof value === "object" && value !== null ? `${value.min}–${value.max}` : String(value); }

export default function GaleriaCreacion<T extends PiezaGaleria>(props: PropsGaleria<T>) {
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [clasificacion, setClasificacion] = useState("todos");
  const [orden, setOrden] = useState("recientes");
  // Ámbito: por defecto solo las generales; las personales se ven con su personaje.
  const [ambito, setAmbito] = useState<FiltroAmbito>("generales");
  const duenos = duenosConPersonales(props.items);
  const dueno = (i: T) => duenoDe(i, props.items);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const codices = useConfigCodices();
  const volverRef = useRef<HTMLButtonElement>(null);
  const seleccionada = props.items.find((i) => i.id === seleccion);
  const abrir = (id: string) => { setSeleccion(id); };
  const volver = () => { setSeleccion(null); requestAnimationFrame(() => volverRef.current?.focus()); };
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const coincide = (i: T) => (tipo === "todos" || (tipo === "monstruo" ? props.esMonstruo?.(i) : props.tipoDe(i) === tipo && (tipo!=="personaje"||!props.esMonstruo?.(i)))) && (clasificacion === "todos" || i.tipo === clasificacion) && norm(`${i.nombre} ${i.descripcion || ""} ${props.clasificacion(i.tipo)} ${dueno(i) || ""}`).includes(norm(busqueda));
  const enAmbito = filtrarAmbito(props.items, ambito);
  const visibles = enAmbito.filter(coincide).sort((a, b) => orden === "nombre" ? a.nombre.localeCompare(b.nombre, "es") : 0);
  // Vista de baraja: el filtro de ámbito es el id de un personaje con creaciones personales.
  const baraja = duenos.find((d) => d.id === ambito) || null;
  const personalesOcultas = ambito === "generales" && busqueda.trim() ? props.items.filter((i) => i.personal_de && coincide(i)).length : 0;
  if (seleccionada) return <VistaCodice key={seleccionada.id} item={seleccionada} props={props} volver={volver} abrir={abrir} config={codices.config} onVerComo={(id, codice) => { void codices.verComo(id, codice); }} />;
  return <section className="cg-gallery" aria-label="Galería de La creación">
    <header className="cg-gallery-head"><div><span className="cg-eyebrow">TU COLECCIÓN</span><h2>La creación</h2><p>Personajes, objetos y todo lo que da vida a tu mundo.</p></div><button className="cg-button cg-primary" onClick={props.onNueva}><ImagePlus size={17} />Nueva creación</button></header>
    <div className="cg-search"><Search size={19} /><input aria-label="Buscar creaciones" placeholder="Busca una creación por nombre o descripción…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></div>
    <div className="cg-types" role="group" aria-label="Filtrar por tipo"><button ref={volverRef} onClick={() => setTipo("todos")} aria-pressed={tipo === "todos"}>Todo <span>{enAmbito.length}</span></button>{TIPOS.map((t) => { const Icono = iconos[t.valor] || Shapes; return <button key={t.valor} aria-pressed={tipo === t.valor} onClick={() => setTipo(t.valor)}><Icono size={15} />{t.nombre}<span>{enAmbito.filter((i) => props.tipoDe(i) === t.valor && (t.valor!=="personaje"||!props.esMonstruo?.(i))).length}</span></button>; })}{props.esMonstruo&&<button aria-pressed={tipo==="monstruo"} onClick={()=>setTipo("monstruo")}>Monstruos <span>{enAmbito.filter(i=>props.esMonstruo?.(i)).length}</span></button>}</div>
    <div className="cg-filter-row"><label>Ámbito<select aria-label="Ámbito" value={ambito} onChange={(e) => setAmbito(e.target.value)}><option value="generales">Generales</option><option value="personales">Personales ({props.items.filter((i) => i.personal_de).length})</option>{duenos.map((d) => <option key={d.id} value={d.id}>Personales de {d.nombre} ({d.cantidad})</option>)}<option value="todas">Todas</option></select></label><label>Clasificación<select value={clasificacion} onChange={(e) => setClasificacion(e.target.value)}><option value="todos">Todas</option>{props.clasificaciones.map((c) => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}</select></label><label>Ordenar<select value={orden} onChange={(e) => setOrden(e.target.value)}><option value="recientes">Más recientes</option><option value="nombre">Nombre A–Z</option></select></label><span aria-live="polite">{visibles.length} creaciones</span></div>
    {personalesOcultas > 0 && <p className="cg-personales-aviso">También {personalesOcultas === 1 ? "hay 1 creación personal que coincide" : `hay ${personalesOcultas} creaciones personales que coinciden`}. <button type="button" onClick={() => setAmbito("todas")}>Verlas</button></p>}
    {baraja && <header className="cg-baraja-cab"><div><span className="cg-eyebrow">BARAJA PERSONAL</span><h3>{baraja.nombre}</h3><p>{baraja.cantidad === 1 ? "1 carta" : `${baraja.cantidad} cartas`} que solo lleva su personaje. Otros pueden aprenderlas si cumplen sus requisitos.</p></div><button type="button" className="cg-button" onClick={() => setAmbito("generales")}><ArrowLeft size={16} />Volver a la colección</button></header>}
    {props.cargando ? <div className="cg-empty" role="status">Cargando tu colección…</div> : <div className={`cg-mesa ${baraja ? "is-baraja" : ""}`}>{(baraja ? [...props.items.filter((i) => i.id === ambito), ...visibles] : visibles).map((item, orden) => {
      const mazo = baraja ? [] : props.items.filter((i) => i.personal_de === item.id);
      const carta = <Carta key={item.id} item={item} props={props} dueno={baraja ? null : dueno(item)} orden={orden} portada={!!baraja && item.id === ambito} onAbrir={() => abrir(item.id)} />;
      if (!mazo.length) return carta;
      return <Baraja key={item.id} dueno={item} mazo={mazo} props={props} onAbrirCarta={abrir} onEntrar={() => { setAmbito(item.id); setTipo("todos"); setClasificacion("todos"); }}>{carta}</Baraja>;
    })}</div>}
    {!props.cargando && !visibles.length && <div className="cg-empty"><Shapes size={30} /><h3>No hay creaciones con estos filtros</h3><p>Prueba otro nombre o muestra toda tu colección.</p><button className="cg-button" onClick={() => { setBusqueda(""); setTipo("todos"); setClasificacion("todos"); setAmbito("todas"); }}>Limpiar filtros</button></div>}
  </section>;
}

/**
 * Baraja de un personaje: tantos dorsos detrás como cartas tiene (el grosor nunca invade la carta vecina).
 * Al pasar el ratón (o al pulsar «Baraja» en pantallas táctiles) se abre en abanico con las cartas boca arriba,
 * y cada una se puede abrir sin entrar en la baraja.
 */
function Baraja<T extends PiezaGaleria>({ dueno, mazo, props, onAbrirCarta, onEntrar, children }: { dueno: T; mazo: T[]; props: PropsGaleria<T>; onAbrirCarta: (id: string) => void; onEntrar: () => void; children: React.ReactNode }) {
  const [abierta, setAbierta] = useState(false), [lado, setLado] = useState<"derecha" | "izquierda">("derecha");
  const caja = useRef<HTMLDivElement>(null), espera = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Grosor total de la baraja: 18 px como máximo, repartidos entre todas sus cartas (cabe en el hueco entre cartas).
  const paso = Math.min(3, 18 / mazo.length);
  function abrir() {
    clearTimeout(espera.current);
    const r = caja.current?.getBoundingClientRect();
    if (r) setLado(r.right + Math.min(560, innerWidth * .9) + 24 > innerWidth && r.left > innerWidth - r.right ? "izquierda" : "derecha");
    setAbierta(true);
  }
  const intencion = () => { clearTimeout(espera.current); espera.current = setTimeout(abrir, 220); };
  const cerrar = (demora = 180) => { clearTimeout(espera.current); espera.current = setTimeout(() => setAbierta(false), demora); };
  useEffect(() => () => clearTimeout(espera.current), []);
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierta(false); };
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierta(false); };
    addEventListener("keydown", tecla); addEventListener("pointerdown", fuera);
    return () => { removeEventListener("keydown", tecla); removeEventListener("pointerdown", fuera); };
  }, [abierta]);
  const id = `baraja-${dueno.id}`;
  return <div ref={caja} className={`cg-baraja ${abierta ? "is-abierta" : ""}`} style={{ "--paso": `${paso}px`, "--grosor": `${paso * mazo.length}px` } as React.CSSProperties}
    onPointerEnter={(e) => { if (e.pointerType === "mouse") intencion(); }} onPointerLeave={(e) => { if (e.pointerType === "mouse") cerrar(); }}
    onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) cerrar(0); }}>
    <span className="cg-baraja-pila" aria-hidden="true">{mazo.map((m, i) => <span key={m.id} className={`cg-baraja-carta ${rangoDe(m.clase).css}`} style={{ "--i": mazo.length - i } as React.CSSProperties} />)}</span>
    {children}
    <button type="button" className="cg-baraja-abrir" aria-expanded={abierta} aria-controls={id} onClick={() => (abierta ? setAbierta(false) : abrir())} aria-label={`Baraja de ${dueno.nombre}: ${mazo.length} cartas personales`}><span>Baraja</span><b>{mazo.length}</b></button>
    {abierta && <div id={id} className={`cg-abanico is-${lado}`} role="dialog" aria-label={`Baraja de ${dueno.nombre}`} onPointerEnter={() => clearTimeout(espera.current)}>
      <header><div><small>Baraja personal</small><strong>{dueno.nombre}</strong></div><span>{mazo.length === 1 ? "1 carta" : `${mazo.length} cartas`}<button type="button" className="cg-abanico-cerrar" aria-label="Cerrar la baraja" onClick={() => setAbierta(false)}><X size={16} /></button></span></header>
      <ul>{mazo.map((m, i) => <li key={m.id} style={{ "--k": Math.min(i, 18) } as React.CSSProperties}><Carta item={m} props={props} dueno={null} orden={0} mini onAbrir={() => onAbrirCarta(m.id)} /></li>)}</ul>
      <footer><button type="button" className="cg-button" onClick={onEntrar}>Ver la baraja completa</button></footer>
    </div>}
  </div>;
}

/** Carta de La creación: marco propio de su tipo, teñido según su rango. */
export function Carta<T extends PiezaGaleria>({ item, props, dueno, orden, portada, onAbrir, mini }: { item: T; props: PropsGaleria<T>; dueno: string | null; orden: number; portada?: boolean; onAbrir?: () => void; mini?: boolean }) {
  const tipoItem = props.tipoDe(item), monstruo = !!props.esMonstruo?.(item), rango = rangoDe(item.clase);
  const tipoCarta = monstruo ? "monstruo" : tipoItem;
  const chips = atributos(item).slice(0, 2);
  const nombreTipo = monstruo ? "Monstruo" : TIPOS.find((t) => t.valor === tipoItem)?.nombre;
  const Etiqueta = mini || !onAbrir ? "div" : "article";
  const Cara = onAbrir ? "button" : "span";
  return <Etiqueta className={`cg-carta cg-tipo-${tipoCarta} ${rango.css} ${portada ? "is-portada" : ""} ${mini ? "is-mini" : ""}`} style={{ "--orden": Math.min(orden, 24) } as React.CSSProperties}>
    <Cara type={onAbrir ? "button" : undefined} className={onAbrir ? "cg-open cg-carta-cara" : "cg-carta-cara"} onClick={onAbrir} aria-label={onAbrir ? `Ver detalles de ${item.nombre}${mini ? "" : `, ${nombreTipo}, rango ${rango.clave}`}` : undefined} aria-describedby={onAbrir && !mini ? `creacion-ayuda-${item.id}` : undefined} title={onAbrir && mini ? item.descripcion || item.nombre : undefined}>
      <span className="cg-carta-arte"><Portada src={imagenCreacion(item.id, item.imagen_url)} tipo={tipoItem} icono={props.iconoDe(item)} /></span>
      <span className="cg-carta-velo" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element -- marco decorativo local, sin optimización de Next */}
      <img className="cg-carta-marco" src={marcoDe(tipoItem, monstruo)} alt="" aria-hidden="true" decoding="async" loading="lazy" draggable={false} />
      <span className="cg-carta-cab"><span className="cg-carta-tipo">{nombreTipo}</span><span className="cg-carta-rango" title={`Rango ${rango.clave} · ${rango.nombre}`}>{rango.clave === "KUROI" ? "K" : rango.clave}</span></span>
      <span className="cg-carta-info">
        <strong className="cg-carta-nombre">{item.nombre}</strong>
        {!mini && <><small className="cg-carta-clasif">{props.clasificacion(item.tipo)}</small>
        <span className="cg-carta-texto">{item.descripcion || "Abre esta creación para conocer sus detalles."}</span>
        <span className="cg-carta-pie">
          {dueno ? <span className="cg-carta-sello">Personal de {dueno}</span> : item.ligado_al_alma ? <span className="cg-carta-sello is-alma">{item.alma_en_uso ? "Alma única · En uso" : "Alma única"}</span> : null}
          <span className="cg-carta-chips">{chips.map(([key, value]) => <span key={key}>{props.etiqueta(item, key)} <b>{valor(value)}</b></span>)}{!chips.length && <span>{item.es_grupo ? "Malla" : "Único"}</span>}</span>
        </span></>}
      </span>
      {onAbrir && !mini && <span className="cg-tooltip" role="tooltip" id={`creacion-ayuda-${item.id}`}><ContenidoAyuda ayuda={ayudaCreacion(item)}/></span>}
    </Cara>
  </Etiqueta>;
}
