"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Search, ImagePlus, Upload, Link2, Save, ImageOff, Swords, Shield, Users, Sparkles, Package, Crown, Shapes, Pencil, Trash2 } from "lucide-react";
import { TIPOS, EFECTOS_NOMBRE, efectosDe, formula, type TipoCreacion, type Efecto } from "../lib/creacion";
import { EVENTOS, EFECTOS_REGLA, DESTINOS, type CondicionRegla, type EfectoRegla, type ValorRegla, type Regla } from "../lib/reglas";
import { type ReglaPasiva } from "../lib/pasivas";
import { prepararPortada, validarPortada } from "../lib/imagenes-creacion";
import IconoYugen from "./IconoYugen";
import SelectorIconoYugen from "./SelectorIconoYugen";
import "./galeria-creacion.css";

export type PiezaGaleria = {
  icono?: string | null; id: string; nombre: string; tipo: string; tipo_creacion?: TipoCreacion;
  descripcion: string; historia: string; requisitos: string; defectos: string;
  imagen_url: string; clase: string; es_grupo: boolean; slot_tipo: string;
  ligado_al_alma: boolean; stats: Record<string, number>;
  stats_rango: Record<string, { min: number; max: number }>;
  habilidades: string[]; pasivas: string[]; equipamiento: Record<string, string>;
  configuracion_dados: Efecto[]; reglas_pasivas: ReglaPasiva[]; reglas: Regla[];
};
type Props<T extends PiezaGaleria> = {
  items: T[]; cargando: boolean; iconoDe: (item:T)=>string;
  tipoDe: (item: T) => TipoCreacion; clasificacion: (clave: string) => string;
  clasificaciones: { clave: string; nombre: string }[];
  etiqueta: (item: T, clave: string) => string;
  onEditar: (item: T) => void; onEntregar: (item: T) => void;
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
function valor(value: number | { min: number; max: number }) { return typeof value === "object" && value !== null ? `${value.min}–${value.max}` : String(value); }

export default function GaleriaCreacion<T extends PiezaGaleria>(props: Props<T>) {
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [clasificacion, setClasificacion] = useState("todos");
  const [orden, setOrden] = useState("recientes");
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const volverRef = useRef<HTMLButtonElement>(null);
  const seleccionada = props.items.find((i) => i.id === seleccion);
  const abrir = (id: string) => { setSeleccion(id); };
  const volver = () => { setSeleccion(null); requestAnimationFrame(() => volverRef.current?.focus()); };
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visibles = props.items.filter((i) => (tipo === "todos" || props.tipoDe(i) === tipo) && (clasificacion === "todos" || i.tipo === clasificacion) && norm(`${i.nombre} ${i.descripcion || ""} ${props.clasificacion(i.tipo)}`).includes(norm(busqueda))).sort((a, b) => orden === "nombre" ? a.nombre.localeCompare(b.nombre, "es") : 0);
  if (seleccionada) return <Detalle key={seleccionada.id} item={seleccionada} props={props} volver={volver} />;
  return <section className="cg-gallery" aria-label="Galería de La creación">
    <header className="cg-gallery-head"><div><span className="cg-eyebrow">TU COLECCIÓN</span><h2>La creación</h2><p>Personajes, objetos y todo lo que da vida a tu mundo.</p></div><button className="cg-button cg-primary" onClick={props.onNueva}><ImagePlus size={17} />Nueva creación</button></header>
    <div className="cg-search"><Search size={19} /><input aria-label="Buscar creaciones" placeholder="Busca una creación por nombre o descripción…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></div>
    <div className="cg-types" role="group" aria-label="Filtrar por tipo"><button ref={volverRef} onClick={() => setTipo("todos")} aria-pressed={tipo === "todos"}>Todo <span>{props.items.length}</span></button>{TIPOS.map((t) => { const Icono = iconos[t.valor] || Shapes; return <button key={t.valor} aria-pressed={tipo === t.valor} onClick={() => setTipo(t.valor)}><Icono size={15} />{t.nombre}<span>{props.items.filter((i) => props.tipoDe(i) === t.valor).length}</span></button>; })}</div>
    <div className="cg-filter-row"><label>Clasificación<select value={clasificacion} onChange={(e) => setClasificacion(e.target.value)}><option value="todos">Todas</option>{props.clasificaciones.map((c) => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}</select></label><label>Ordenar<select value={orden} onChange={(e) => setOrden(e.target.value)}><option value="recientes">Más recientes</option><option value="nombre">Nombre A–Z</option></select></label><span aria-live="polite">{visibles.length} creaciones</span></div>
    {props.cargando ? <div className="cg-empty" role="status">Cargando tu colección…</div> : <div className="cg-grid">{visibles.map((item) => { const tipoItem = props.tipoDe(item); return <article className={`cg-card cg-type-${tipoItem}`} key={item.id}>
      <button className="cg-open" onClick={() => abrir(item.id)} aria-label={`Ver detalles de ${item.nombre}`}>
        <div className="cg-cover"><Portada src={item.imagen_url} nombre={item.nombre} tipo={tipoItem} icono={props.iconoDe(item)} /><span className="cg-rank">{item.clase || "D"}</span><span className="cg-cover-action">Ver creación <ArrowUpRight size={15} /></span></div>
        <div className="cg-card-body"><span className="cg-card-type">{TIPOS.find((t) => t.valor === tipoItem)?.nombre} · {props.clasificacion(item.tipo)}</span><h3>{item.nombre}</h3><p>{item.descripcion || "Abre esta creación para conocer sus detalles."}</p><div className="cg-stat-chips">{atributos(item).slice(0, 3).map(([key, value]) => <span key={key}>{props.etiqueta(item, key)} <b>{valor(value)}</b></span>)}{!atributos(item).length && <span>{item.es_grupo ? "Malla · valores por rango" : "Único · valores fijos"}</span>}</div></div>
      </button>
    </article>; })}</div>}
    {!props.cargando && !visibles.length && <div className="cg-empty"><Shapes size={30} /><h3>No hay creaciones con estos filtros</h3><p>Prueba otro nombre o muestra toda tu colección.</p><button className="cg-button" onClick={() => { setBusqueda(""); setTipo("todos"); setClasificacion("todos"); }}>Limpiar filtros</button></div>}
  </section>;
}

function Detalle<T extends PiezaGaleria>({ item, props, volver }: { item: T; props: Props<T>; volver: () => void }) {
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
    try { setImagen(await prepararPortada(file)); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo leer la imagen."); }
    finally { bloqueo.current = false; setProcesando(false); }
  }
  async function guardar() {
    if (bloqueo.current) return;
    const value = imagen.trim(), fallo = validarPortada(value);
    if (fallo) { setError(fallo); return; }
    bloqueo.current = true; setGuardando(true); setError(""); setAviso("");
    try { await props.onImagen(item.id, value, icono); setImagen(value); setAviso("Presentación guardada en la creación."); setEditando(false); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la imagen."); }
    finally { bloqueo.current = false; setGuardando(false); }
  }
  const tipo = props.tipoDe(item);
  const acciones = efectosDe(item);
  const relaciones = [...(item.habilidades || []), ...(item.pasivas || []), ...Object.values(item.equipamiento || {})];
  return <section className="cg-detail" aria-label={`Detalles de ${item.nombre}`}>
    <button className="cg-back" disabled={ocupado} onClick={() => navegar(volver)}><ArrowLeft size={17} />Volver a la colección</button>
    <div className="cg-detail-grid"><aside className="cg-detail-visual">
      <div className="cg-detail-cover"><Portada src={imagen} nombre={item.nombre} tipo={tipo} icono={props.iconoDe({...item,icono})} /><span className="cg-rank">{item.clase || "D"}</span></div>
      <button className="cg-button cg-image-toggle" disabled={ocupado} onClick={() => setEditando(!editando)} aria-expanded={editando}><ImagePlus size={16} />{item.imagen_url ? "Cambiar imagen o icono" : "Elegir imagen o icono"}</button>
      {editando && <div className="cg-image-editor"><h3>Imagen o emblema</h3><p>Elige tu propia ilustración. También se mostrará en esta ficha.</p><fieldset disabled={ocupado}>
        <div className="cg-symbol-editor"><h4>Icono de Yugen</h4><p>Se usa cuando no hay imagen o no se puede cargar. Automático utiliza el símbolo de la raza o categoría.</p><SelectorIconoYugen value={icono} onChange={setIcono} automatico={props.iconoDe({...item,icono:null})} disabled={ocupado}/></div>
        <label><Link2 size={14} />URL de la imagen<input type="text" placeholder="https://…" value={imagen.startsWith("data:") ? "" : imagen} onChange={(e) => { setImagen(e.target.value); setError(""); }} /></label>
        <span className="cg-or">o selecciona un archivo</span>
        <label className="cg-upload"><Upload size={20} /><strong>Insertar imagen</strong><span>PNG, JPG o WebP · hasta 10 MB</span><input aria-label="Insertar imagen desde archivo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { void archivo(e.target.files?.[0]); e.target.value = ""; }} /></label>
        {imagen.startsWith("data:") && <p className="cg-local-image">Imagen de archivo lista para guardar.</p>}
        <div className="cg-image-actions"><button className="cg-button" disabled={!imagen} onClick={() => { setImagen(""); setError(""); }}><ImageOff size={14} />Quitar imagen</button><button className="cg-button" onClick={() => { setImagen(item.imagen_url || ""); setIcono(item.icono||""); setError(""); setEditando(false); }}>Cancelar</button></div>
        <button className="cg-button cg-primary" disabled={!dirty} onClick={() => void guardar()}><Save size={16} />Guardar presentación</button>
      </fieldset><small>Los archivos se optimizan antes de guardarse. La imagen se comparte con la creación.</small></div>}
      {ocupado && <p role="status">{procesando ? "Preparando imagen…" : "Guardando imagen…"}</p>}{error && <p className="cg-error" role="alert">{error}</p>}{aviso && <p className="cg-success" role="status">{aviso}</p>}{dirty && <p className="cg-unsaved">Presentación sin guardar</p>}
    </aside>
    <div className="cg-detail-content"><div className="cg-detail-heading"><span className="cg-eyebrow">{TIPOS.find((t) => t.valor === tipo)?.nombre} / {props.clasificacion(item.tipo)}</span><h2 tabIndex={-1} ref={titulo}>{item.nombre}</h2><p>{item.descripcion || "Sin descripción."}</p><div className="cg-detail-tags"><span>Clase {item.clase || "D"}</span><span>{item.es_grupo ? "Malla · valores por rango" : "Único · valores fijos"}</span>{item.ligado_al_alma && <span>Ligado al alma</span>}</div></div>
      <div className="cg-detail-actions"><button className="cg-button cg-primary" disabled={ocupado} onClick={() => navegar(() => props.onEditar(item))}><Pencil size={15} />Editar ficha</button><button className="cg-button" disabled={ocupado} onClick={() => props.onEntregar(item)}>Entregar</button>{tipo === "personaje" && <button className="cg-button" disabled={ocupado} onClick={() => props.onBatalla(item)}><Swords size={15} />Preparar batalla</button>}<Link className="cg-button" href={`/dm/mercado?forja=${item.id}`} onClick={(e) => { if (ocupado || (dirty && !window.confirm("¿Salir sin guardar la imagen?"))) e.preventDefault(); }}>Publicar en tienda</Link></div>
      {!!atributos(item).length && <section className="cg-detail-section"><h3>Atributos</h3><dl className="cg-attribute-grid">{atributos(item).map(([key, value]) => <div key={key}><dt>{props.etiqueta(item, key)}</dt><dd>{valor(value)}</dd></div>)}</dl></section>}
      {!!acciones.length && <section className="cg-detail-section"><h3>Acciones y efectos</h3>{acciones.map((e) => <div className="cg-rule" key={e.id}><strong>{e.nombre || EFECTOS_NOMBRE[e.efecto]}</strong><p>{e.efecto === "estado" ? e.estado : formula(e)} · {EFECTOS_NOMBRE[e.efecto]} · {e.coste_ph || 0} PH · {e.coste_fatiga || 0} Fatiga</p></div>)}</section>}
      {!!item.reglas_pasivas?.length && <section className="cg-detail-section"><h3>Pasivas</h3>{item.reglas_pasivas.map((r) => <div className="cg-rule" key={r.id}><strong>{r.nombre}</strong><p>{{ permanente: "Siempre activa", inicio_turno: "Al iniciar turno", recibir_ataque: "Al recibir ataque", recibir_impacto: "Al recibir impacto", recibir_dano: "Al recibir daño" }[r.evento]} · {{ siempre: "Siempre", vida_mitad: "Vida a la mitad", sin_arma: "Sin arma", ataque_magico: "Ataque mágico", ataque_natural: "Ataque natural", ataque_elemental: "Ataque elemental" }[r.condicion]}</p><p>{[r.reduccion_pct ? `Reduce ${r.reduccion_pct}% de daño` : "", r.curacion ? `Cura ${r.curacion}` : "", r.recuperar_ph ? `Recupera ${r.recuperar_ph} PH` : "", r.reducir_fatiga ? `Reduce ${r.reducir_fatiga} Fatiga` : "", r.represalia_dados ? `Represalia ${r.represalia_dados}d${r.represalia_caras}` : ""].filter(Boolean).join(" · ")}</p><p>{Object.entries(r.bonos || {}).filter(([, v]) => v).map(([key, v]) => `${props.etiqueta(item, key)} ${v > 0 ? "+" : ""}${v}`).join(" · ")}</p></div>)}</section>}
      {!!item.reglas?.length && <section className="cg-detail-section"><h3>Reglas de la creación</h3>{item.reglas.map((r, i) => <div className="cg-rule" key={r.id || i}><strong>{r.nombre || `Regla ${i + 1}`}</strong><p>{EVENTOS[r.evento]}</p><p>Si: {resumenCondicion(r.condicion)}</p><ul>{r.efectos.map((efecto, j) => <li key={j}><ResumenEfecto efecto={efecto} /></li>)}</ul><p>{r.coste_ph || 0} PH · {r.coste_fatiga || 0} Fatiga{r.enfriamiento ? ` · Enfriamiento: ${r.enfriamiento} turnos` : ""}{r.usos ? ` · ${r.usos} usos` : ""}</p></div>)}</section>}
      {!!relaciones.length && <section className="cg-detail-section"><h3>Habilidades, pasivas y equipo</h3><div className="cg-related">{[...new Set(relaciones)].map((id) => <span key={id}><Sparkles size={14} />{props.items.find((v) => v.id === id)?.nombre || "Creación no disponible"}</span>)}</div></section>}
      {[['Historia', item.historia], ['Requisitos', item.requisitos], ['Limitaciones y defectos', item.defectos]].map(([label, value]) => value ? <section className="cg-detail-section" key={label}><h3>{label}</h3><p className="cg-prose">{value}</p></section> : null)}
      <footer className="cg-danger-zone"><p>Las copias existentes conservan sus valores.</p><button className="cg-button" disabled={ocupado} onClick={() => navegar(() => { void props.onEliminar(item).catch((e) => setError(e instanceof Error ? e.message : "No se pudo eliminar.")); })}><Trash2 size={14} />Eliminar creación</button></footer>
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
