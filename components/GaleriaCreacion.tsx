"use client";
import {duenoDe,duenosConPersonales,filtrarAmbito,type FiltroAmbito} from "../lib/creaciones-personales";
import {mensajeError} from '../lib/errores';
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, ImagePlus, Upload, Link2, Save, ImageOff, X, Swords, Shield, Users, Sparkles, Package, Crown, Shapes, Pencil, Trash2 } from "lucide-react";
import { TIPOS, EFECTOS_NOMBRE, efectosDe, formula, type TipoCreacion, type Efecto } from "../lib/creacion";
import { EVENTOS, EFECTOS_REGLA, DESTINOS, type CondicionRegla, type EfectoRegla, type ValorRegla, type Regla } from "../lib/reglas";
import { type ReglaPasiva } from "../lib/pasivas";
import { validarPortada } from "../lib/imagenes-creacion";
import { publicarArchivoImagen } from "../lib/imagenes-storage";
import IconoYugen from "./IconoYugen";
import SelectorIconoYugen from "./SelectorIconoYugen";
import {describirEfecto,describirRegla,type AyudaClara} from "../lib/descripciones";
import ContenidoAyuda from "./ContenidoAyuda";
import "./galeria-creacion.css";

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
};
type Props<T extends PiezaGaleria> = {
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
function Portada({ src, nombre, tipo, icono }: { src?: string; nombre: string; tipo: TipoCreacion; icono:string }) {
  const [fallida, setFallida] = useState("");
  const valida = src && !validarPortada(src);
  return <div className={`cg-art cg-art-${tipo}`}>
    {valida && fallida !== src ?
      // User-selected external covers and inline raster uploads require no image host configuration.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={nombre} loading="lazy" referrerPolicy="no-referrer" onError={() => setFallida(src)} /> :
      <div className="cg-placeholder"><IconoYugen id={icono} size={62}/><span>{src ? "Imagen no disponible" : "Emblema de Yugen"}</span></div>}
  </div>;
}
function atributos(item: PiezaGaleria) {
  return Object.entries(item.es_grupo ? item.stats_rango || {} : item.stats || {}).filter(([key]) => !["dados_dano", "caras_dano"].includes(key));
}
function ayudaCreacion(item:PiezaGaleria):AyudaClara {
 const efectos=efectosDe(item).slice(0,2).map(e=>describirEfecto(e));
 const reglas=(item.reglas||[]).slice(0,2).map(describirRegla);
 const resumen=item.descripcion?.trim()||efectos[0]?.resumen||reglas[0]?.resumen||"Abre esta creación para consultar sus atributos, equipo y reglas.";
 return {resumen,detalles:[...efectos.map(e=>e.resumen),...reglas.map(r=>r.resumen)].filter(r=>r!==resumen).slice(0,3)};
}
function valor(value: number | { min: number; max: number }) { return typeof value === "object" && value !== null ? `${value.min}–${value.max}` : String(value); }

export default function GaleriaCreacion<T extends PiezaGaleria>(props: Props<T>) {
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [clasificacion, setClasificacion] = useState("todos");
  const [orden, setOrden] = useState("recientes");
  // Ámbito: por defecto solo las generales; las personales se ven con su personaje.
  const [ambito, setAmbito] = useState<FiltroAmbito>("generales");
  const duenos = duenosConPersonales(props.items);
  const dueno = (i: T) => duenoDe(i, props.items);
  const [seleccion, setSeleccion] = useState<string | null>(null);
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
  if (seleccionada) return <Detalle key={seleccionada.id} item={seleccionada} props={props} volver={volver} />;
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
function Baraja<T extends PiezaGaleria>({ dueno, mazo, props, onAbrirCarta, onEntrar, children }: { dueno: T; mazo: T[]; props: Props<T>; onAbrirCarta: (id: string) => void; onEntrar: () => void; children: React.ReactNode }) {
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
    <span className="cg-baraja-pila" aria-hidden="true">{mazo.map((m, i) => <span key={m.id} className={`cg-baraja-carta cg-tipo-${props.tipoDe(m)}`} style={{ "--i": mazo.length - i } as React.CSSProperties} />)}</span>
    {children}
    <button type="button" className="cg-baraja-abrir" aria-expanded={abierta} aria-controls={id} onClick={() => (abierta ? setAbierta(false) : abrir())} aria-label={`Baraja de ${dueno.nombre}: ${mazo.length} cartas personales`}><span>Baraja</span><b>{mazo.length}</b></button>
    {abierta && <div id={id} className={`cg-abanico is-${lado}`} role="dialog" aria-label={`Baraja de ${dueno.nombre}`} onPointerEnter={() => clearTimeout(espera.current)}>
      <header><div><small>Baraja personal</small><strong>{dueno.nombre}</strong></div><span>{mazo.length === 1 ? "1 carta" : `${mazo.length} cartas`}<button type="button" className="cg-abanico-cerrar" aria-label="Cerrar la baraja" onClick={() => setAbierta(false)}><X size={16} /></button></span></header>
      <ul>{mazo.map((m, i) => { const t = props.tipoDe(m); return <li key={m.id} style={{ "--k": Math.min(i, 18) } as React.CSSProperties}>
        <button type="button" className={`cg-mini cg-tipo-${props.esMonstruo?.(m) ? "monstruo" : t}`} onClick={() => onAbrirCarta(m.id)} title={m.descripcion || m.nombre}>
          <span className="cg-mini-arte"><Portada src={m.imagen_url} nombre={m.nombre} tipo={t} icono={props.iconoDe(m)} /></span>
          <span className="cg-mini-rango">{m.clase || "D"}</span>
          <strong>{m.nombre}</strong><small>{TIPOS.find((x) => x.valor === t)?.nombre}</small>
        </button></li>; })}</ul>
      <footer><button type="button" className="cg-button" onClick={onEntrar}>Ver la baraja completa</button></footer>
    </div>}
  </div>;
}

/** Carta de La creación: proporción de naipe (63×88), marco por tipo y arte recortado para que siempre cuadre. */
function Carta<T extends PiezaGaleria>({ item, props, dueno, orden, portada, onAbrir }: { item: T; props: Props<T>; dueno: string | null; orden: number; portada?: boolean; onAbrir: () => void }) {
  const tipoItem = props.tipoDe(item), monstruo = !!props.esMonstruo?.(item);
  const chips = atributos(item).slice(0, 2);
  return <article className={`cg-carta cg-tipo-${monstruo ? "monstruo" : tipoItem} ${portada ? "is-portada" : ""}`} style={{ "--orden": Math.min(orden, 24) } as React.CSSProperties}>
    <button className="cg-open cg-carta-cara" onClick={onAbrir} aria-label={`Ver detalles de ${item.nombre}`} aria-describedby={`creacion-ayuda-${item.id}`}>
      <span className="cg-carta-cab"><span className="cg-carta-tipo">{monstruo ? "Monstruo" : TIPOS.find((t) => t.valor === tipoItem)?.nombre}</span><span className="cg-carta-rango" title="Clase">{item.clase || "D"}</span></span>
      <span className="cg-carta-arte"><Portada src={item.imagen_url} nombre={item.nombre} tipo={tipoItem} icono={props.iconoDe(item)} /></span>
      <span className="cg-carta-nombre"><strong>{item.nombre}</strong><small>{props.clasificacion(item.tipo)}</small></span>
      <span className="cg-carta-texto">{item.descripcion || "Abre esta creación para conocer sus detalles."}</span>
      <span className="cg-carta-pie">
        {dueno ? <span className="cg-carta-sello">Personal de {dueno}</span> : item.ligado_al_alma ? <span className="cg-carta-sello is-alma">{item.alma_en_uso ? "Alma única · En uso" : "Alma única"}</span> : null}
        <span className="cg-carta-chips">{chips.map(([key, value]) => <span key={key}>{props.etiqueta(item, key)} <b>{valor(value)}</b></span>)}{!chips.length && <span>{item.es_grupo ? "Malla" : "Único"}</span>}</span>
      </span>
      <span className="cg-tooltip" role="tooltip" id={`creacion-ayuda-${item.id}`}><ContenidoAyuda ayuda={ayudaCreacion(item)}/></span>
    </button>
  </article>;
}

function Detalle<T extends PiezaGaleria>({ item, props, volver }: { item: T; props: Props<T>; volver: () => void }) {
  const [indiceForma, cambiarForma] = useState(0);
  const formas = item.formas_historia || [];
  const forma = formas[indiceForma] || formas[0];
  const [imagen, setImagen] = useState(item.imagen_url || "");
  const [icono,setIcono]=useState(item.icono||"");
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState(false);
  const bloqueo = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titulo.current?.focus(); }, []);
  const dirty = imagen !== (item.imagen_url || "") || icono !== (item.icono || "");
  const ocupado = procesando || guardando;
  useEffect(() => {
    if (!dirty) return;
    const salir = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", salir);
    return () => window.removeEventListener("beforeunload", salir);
  }, [dirty]);
  function navegar(fn: () => void) { if (!ocupado && (!dirty || window.confirm("Tienes una imagen sin guardar. ¿Descartar el cambio?"))) fn(); }
  async function archivo(file?: File) {
    if (!file || bloqueo.current) return;
    bloqueo.current = true; setProcesando(true); setError(""); setAviso("");
    try { setImagen(await publicarArchivoImagen(file)); } catch (e) { setError(mensajeError(e,"No se pudo leer la imagen.")); }
    finally { bloqueo.current = false; setProcesando(false); }
  }
  async function guardar() {
    if (bloqueo.current) return;
    const value = imagen.trim(), fallo = validarPortada(value);
    if (fallo) { setError(fallo); return; }
    bloqueo.current = true; setGuardando(true); setError(""); setAviso("");
    try { await props.onImagen(item.id, value, icono); setImagen(value); setAviso("Presentación guardada en la creación."); setEditando(false); }
    catch (e) { setError(mensajeError(e,"No se pudo guardar la imagen.")); }
    finally { bloqueo.current = false; setGuardando(false); }
  }
  const tipo = props.tipoDe(item);
  const acciones = efectosDe(item);
  const relaciones = [...(item.habilidades || []), ...(item.pasivas || []), ...Object.values(item.equipamiento || {})];
  return <section className="cg-detail" aria-label={`Detalles de ${item.nombre}`}>
    <button className="cg-back" disabled={ocupado} onClick={() => navegar(volver)}><ArrowLeft size={17} />Volver a la colección</button>
    <div className="cg-detail-grid"><aside className="cg-detail-visual">
      {formas.length > 0 && <label className="grid gap-1 mb-3 font-semibold">Cambiar forma
        <select className="w-full rounded-lg border border-neutral-600 bg-neutral-900 p-3 text-white" value={forma ? formas.indexOf(forma) : 0} onChange={e=>cambiarForma(Number(e.target.value))}>
          {formas.map((f,i)=><option key={i} value={i}>{f.nombre}</option>)}
        </select>
      </label>}
      <div className="cg-detail-cover"><Portada src={editando ? imagen : forma?.imagen || imagen} nombre={editando ? item.nombre : forma?.nombre || item.nombre} tipo={tipo} icono={props.iconoDe({...item,icono})} /><span className="cg-rank">{item.clase || "D"}</span></div>
      <button className="cg-button cg-image-toggle" disabled={ocupado} onClick={() => setEditando(!editando)} aria-expanded={editando}><ImagePlus size={16} />{item.imagen_url ? "Cambiar imagen o icono" : "Elegir imagen o icono"}</button>
      {editando && <div className="cg-image-editor"><h3>Imagen o emblema</h3><p>Elige tu propia ilustración. También se mostrará en esta ficha.</p><fieldset disabled={ocupado}>
        <div className="cg-symbol-editor"><h4>Icono de Yugen</h4><p>Se usa cuando no hay imagen o no se puede cargar. Automático utiliza el símbolo de la raza o categoría.</p><SelectorIconoYugen value={icono} onChange={setIcono} automatico={props.iconoDe({...item,icono:null})} disabled={ocupado}/></div>
        <label><Link2 size={14} />URL de la imagen<input type="text" placeholder="https://…" value={imagen.startsWith("data:") ? "" : imagen} onChange={(e) => { setImagen(e.target.value); setError(""); }} /></label>
        <span className="cg-or">o selecciona un archivo</span>
        <label className="cg-upload"><Upload size={20} /><strong>Publicar imagen</strong><span>PNG, JPG o WebP · visible mediante enlace público</span><input aria-label="Insertar imagen desde archivo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { void archivo(e.target.files?.[0]); e.target.value = ""; }} /></label>
        {imagen.startsWith("data:") && <p className="cg-local-image">Imagen de archivo lista para guardar.</p>}
        <div className="cg-image-actions"><button className="cg-button" disabled={!imagen} onClick={() => { setImagen(""); setError(""); }}><ImageOff size={14} />Quitar imagen</button><button className="cg-button" onClick={() => { setImagen(item.imagen_url || ""); setIcono(item.icono||""); setError(""); setEditando(false); }}>Cancelar</button></div>
        <button className="cg-button cg-primary" disabled={!dirty} onClick={() => void guardar()}><Save size={16} />Guardar presentación</button>
      </fieldset><small>Los archivos se optimizan y publican en Storage; cualquiera con el enlace podrá verlos.</small></div>}
      {ocupado && <p role="status">{procesando ? "Preparando imagen…" : "Guardando imagen…"}</p>}{error && <p className="cg-error" role="alert">{error}</p>}{aviso && <p className="cg-success" role="status">{aviso}</p>}{dirty && <p className="cg-unsaved">Presentación sin guardar</p>}
    </aside>
    <div className="cg-detail-content"><div className="cg-detail-heading"><span className="cg-eyebrow">{TIPOS.find((t) => t.valor === tipo)?.nombre} / {props.clasificacion(item.tipo)}</span><h2 tabIndex={-1} ref={titulo}>{item.nombre}</h2><p>{item.descripcion || "Sin descripción."}</p><div className="cg-detail-tags"><span>Clase {item.clase || "D"}</span><span>{item.es_grupo ? "Malla · valores por rango" : "Único · valores fijos"}</span>{item.ligado_al_alma && <span>Ligado al alma</span>}</div></div>
      <div className="cg-detail-actions"><button className="cg-button cg-primary" disabled={ocupado} onClick={() => navegar(() => props.onEditar(item))}><Pencil size={15} />Editar ficha</button><button className="cg-button" disabled={ocupado||!!item.alma_en_uso} onClick={() => props.onEntregar(item)}>{item.ligado_al_alma?(item.alma_en_uso?"Ya entregada · Restablece para recuperar":"Entregar única al baúl"):"Entregar"}</button>{tipo === "personaje" && !item.ligado_al_alma && <button className="cg-button" disabled={ocupado} onClick={() => props.onBatalla(item)}><Swords size={15} />Preparar batalla</button>}<Link className="cg-button" href={`/dm/mercado?forja=${item.id}`} onClick={(e) => { if (ocupado || (dirty && !window.confirm("¿Salir sin guardar la imagen?"))) e.preventDefault(); }}>Publicar en tienda</Link></div>
      {!!atributos(item).length && <section className="cg-detail-section"><h3>Atributos</h3><dl className="cg-attribute-grid">{atributos(item).map(([key, value]) => <div key={key}><dt>{props.etiqueta(item, key)}</dt><dd>{valor(value)}</dd></div>)}</dl></section>}
      {!!acciones.length && <section className="cg-detail-section"><h3>Acciones y efectos</h3>{acciones.map((e) => <div className="cg-rule cg-action-help" key={e.id} tabIndex={0} aria-describedby={`efecto-ayuda-${e.id}`}><strong>{e.nombre || EFECTOS_NOMBRE[e.efecto]}</strong><p>{describirEfecto(e).resumen}</p><span className="cg-effect-tooltip" role="tooltip" id={`efecto-ayuda-${e.id}`}><ContenidoAyuda ayuda={describirEfecto(e)}/></span></div>)}</section>}
      {!!item.reglas_pasivas?.length && <section className="cg-detail-section"><h3>Pasivas</h3>{item.reglas_pasivas.map((r) => <div className="cg-rule" key={r.id}><strong>{r.nombre}</strong><p>{{ permanente: "Siempre activa", inicio_turno: "Al iniciar turno", recibir_ataque: "Al recibir ataque", recibir_impacto: "Al recibir impacto", recibir_dano: "Al recibir daño" }[r.evento]} · {{ siempre: "Siempre", vida_mitad: "Vida a la mitad", sin_arma: "Sin arma", ataque_magico: "Ataque mágico", ataque_natural: "Ataque natural", ataque_elemental: "Ataque elemental" }[r.condicion]}</p><p>{[r.reduccion_pct ? `Reduce ${r.reduccion_pct}% de daño` : "", r.curacion ? `Cura ${r.curacion}` : "", r.recuperar_ph ? `Recupera ${r.recuperar_ph} PH` : "", r.reducir_fatiga ? `Reduce ${r.reducir_fatiga} Fatiga` : "", r.represalia_dados ? `Represalia ${r.represalia_dados}d${r.represalia_caras}` : ""].filter(Boolean).join(" · ")}</p><p>{Object.entries(r.bonos || {}).filter(([, v]) => v).map(([key, v]) => `${props.etiqueta(item, key)} ${v > 0 ? "+" : ""}${v}`).join(" · ")}</p></div>)}</section>}
      {!!item.reglas?.length && <section className="cg-detail-section"><h3>Reglas de la creación</h3>{item.reglas.map((r, i) => <div className="cg-rule" key={r.id || i}><strong>{r.nombre || `Regla ${i + 1}`}</strong><p>{describirRegla(r).resumen}</p><p>{EVENTOS[r.evento]}</p><p>Si: {resumenCondicion(r.condicion)}</p><ul>{r.efectos.map((efecto, j) => <li key={j}><ResumenEfecto efecto={efecto} /></li>)}</ul><p>{r.coste_ph || 0} PH · {r.coste_fatiga || 0} Fatiga{r.enfriamiento ? ` · Enfriamiento: ${r.enfriamiento} turnos` : ""}{r.usos ? ` · ${r.usos} usos` : ""}</p></div>)}</section>}
      {!!relaciones.length && <section className="cg-detail-section"><h3>Habilidades, pasivas y equipo</h3><div className="cg-related">{[...new Set(relaciones)].map((id) => <span key={id}><Sparkles size={14} />{props.items.find((v) => v.id === id)?.nombre || "Creación no disponible"}</span>)}</div></section>}
      {forma && <section className="cg-detail-section" aria-live="polite"><h3>{forma.nombre}</h3><p className="cg-prose">{forma.historia}</p></section>}
      {[['Historia', item.historia], ['Requisitos', item.requisitos], ['Limitaciones y defectos', item.defectos]].map(([label, value]) => value ? <section className="cg-detail-section" key={label}><h3>{label}</h3><p className="cg-prose">{value}</p></section> : null)}
      {item.ligado_al_alma&&props.onRestablecer&&<aside className="yunque-resumen"><strong>Una sola pertenencia del alma</strong><p>Se entrega al baúl de una cuenta. Restablecer la retira de los jugadores y la deja únicamente en La creación. Termina cualquier encuentro activo antes de hacerlo.</p><button className="cg-button" disabled={ocupado} onClick={async()=>{setGuardando(true);try{await props.onRestablecer!(item);}finally{setGuardando(false);}}}>Restablecer y devolver a La creación</button></aside>}<footer className="cg-danger-zone"><p>Las copias existentes conservan sus valores.</p><button className="cg-button" disabled={ocupado} onClick={() => navegar(() => { void props.onEliminar(item).catch((e) => setError(mensajeError(e,"No se pudo eliminar."))); })}><Trash2 size={14} />Eliminar creación</button></footer>
    </div></div>
  </section>;
}

function resumenValor(v?: ValorRegla): string {
  if (v === undefined) return "";
  if (typeof v === "number") return String(v);
  return [v.dados ? `${v.dados}d${v.caras}` : "", v.atributo ? `${v.atributo}${v.escala ? ` × ${v.escala}` : ""}` : "", v.evento ? "valor del evento" : "", v.bono ? `${v.bono > 0 ? "+" : ""}${v.bono}` : ""].filter(Boolean).join(" ") || "0";
}
function resumenCondicion(c: CondicionRegla): string {
  switch (c.tipo) {
    case "siempre": return "Siempre";
    case "estado_terminado": return `Al terminar ${c.clave}`;
    case "todas": return c.condiciones.map(resumenCondicion).join(" y ");
    case "alguna": return c.condiciones.map(resumenCondicion).join(" o ");
    case "no": return `No (${resumenCondicion(c.condicion)})`;
    case "estado": return `${DESTINOS[c.sujeto]} tiene ${c.estado}`;
    case "comparar": return `${DESTINOS[c.sujeto]}: ${c.atributo} ${c.operador} ${c.valor}${c.porcentaje ? "%" : ""}`;
    case "elemento": return `Elemento ${c.elemento}`;
    case "probabilidad": return `Probabilidad ${c.porcentaje}%`;
  }
}
function ResumenEfecto({ efecto: e, depth = 0 }: { efecto: EfectoRegla; depth?: number }) {
  if (depth > 8) return null;
  return <div className="cg-effect-summary"><span>{EFECTOS_REGLA[e.tipo]} · {DESTINOS[e.destino]}{e.atributo ? ` · ${e.atributo}` : ""}{e.operacion ? ` · ${{ sumar: "sumar", fijar: "fijar", multiplicar: "multiplicar" }[e.operacion]}` : ""}{e.valor !== undefined ? ` ${resumenValor(e.valor)}` : ""}{e.nombre || e.clave ? ` · ${e.nombre || e.clave}` : ""}{e.cd ? ` · CD ${e.cd}` : ""}{e.permanente ? " · Permanente" : e.duracion ? ` · ${e.duracion} turnos` : ""}{e.acumular ? " · Acumulable" : ""}</span>
    {e.condicion && <p>Si: {resumenCondicion(e.condicion)}</p>}
    {e.cambios?.map((c, i) => <p key={i}>{c.atributo}: {c.operacion} {resumenValor(c.valor)}</p>)}
    {e.accion && <p>{e.accion.nombre} · {formula(e.accion)}</p>}
    {([['Éxito', e.exito], ['Fallo', e.fallo]] as const).map(([label, efectos]) => efectos?.length ? <div className="cg-effect-branch" key={label}><b>{label}</b>{efectos.map((efecto, i) => <ResumenEfecto key={i} efecto={efecto} depth={depth + 1} />)}</div> : null)}
  </div>;
}

