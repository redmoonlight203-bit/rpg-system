"use client";

import type { ReactNode } from "react";
import { Pencil, Sparkles, Swords, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TIPOS } from "../../lib/creacion";
import { mensajeError } from "../../lib/errores";
import { atributos, valor, type PiezaGaleria } from "../GaleriaCreacion";
import { useDialogo } from "../Dialogo";
import { Medallon } from "../ui/Juego";
import type { ContextoCodice } from "./tipos";

type ConContexto<T extends PiezaGaleria> = { ctx: ContextoCodice<T> };

export function CabeceraCodice<T extends PiezaGaleria>({ ctx, eyebrow }: ConContexto<T> & { eyebrow?: string }) {
  const { item, props, tipo, titulo } = ctx;
  return <div className="cg-detail-heading cx-cabecera">
    <span className="cg-eyebrow">{eyebrow ?? `${TIPOS.find(t => t.valor === tipo)?.nombre ?? "Otro"} / ${props.clasificacion(item.tipo)}`}</span>
    <h2 tabIndex={-1} ref={titulo}>{item.nombre}</h2>
    <p>{item.descripcion || "Sin descripción."}</p>
    <div className="cg-detail-tags">
      <span>Clase {item.clase || "D"}</span>
      <span>{item.es_grupo ? "Malla · valores por rango" : "Único · valores fijos"}</span>
      {item.ligado_al_alma && <span>Ligado al alma</span>}
    </div>
  </div>;
}

export function AccionesCreacion<T extends PiezaGaleria>({ ctx, dirty = false }: ConContexto<T> & { dirty?: boolean }) {
  const { item, props, tipo, ocupado, navegar } = ctx;
  const { confirmar } = useDialogo();
  const router = useRouter();
  const tienda = `${tipo === "personaje" ? "/dm/tienda-almas" : "/dm/mercado"}?forja=${encodeURIComponent(item.id)}`;
  return <div className="cg-detail-actions">
    <button type="button" className="cg-button cg-primary" disabled={ocupado} onClick={() => navegar(() => props.onEditar(item))}>
      <Pencil size={15} />Editar ficha
    </button>
    <button type="button" className="cg-button" disabled={ocupado || !!item.alma_en_uso} onClick={() => props.onEntregar(item)}>
      {item.ligado_al_alma ? (item.alma_en_uso ? "Ya entregada · Restablece para recuperar" : "Entregar única al baúl") : "Entregar"}
    </button>
    {tipo === "personaje" && !item.ligado_al_alma && <button type="button" className="cg-button" disabled={ocupado} onClick={() => props.onBatalla(item)}>
      <Swords size={15} />Preparar batalla
    </button>}
    <Link className="cg-button" href={tienda} aria-disabled={ocupado || undefined} onClick={e => {
      if (!ocupado && !dirty) return;
      e.preventDefault();
      if (ocupado) return;
      void confirmar({
        titulo: "Imagen sin guardar", mensaje: "¿Salir sin guardar la imagen?", aceptar: "Salir", cancelar: "Seguir editando", peligro: true
      }).then(si => { if (si) router.push(tienda); });
    }}>Publicar en tienda</Link>
  </div>;
}

export function ZonaPeligro<T extends PiezaGaleria>({ ctx, onError, setGuardando }: ConContexto<T> & {
  onError: (texto: string) => void;
  setGuardando?: (v: boolean) => void;
}) {
  const { item, props, ocupado, navegar } = ctx;
  async function restablecer() {
    setGuardando?.(true);
    try {
      await props.onRestablecer?.(item);
    } catch (e) {
      onError(mensajeError(e, "No se pudo restablecer."));
    } finally {
      setGuardando?.(false);
    }
  }
  return <>
    {item.ligado_al_alma && props.onRestablecer && <aside className="yunque-resumen">
      <strong>Una sola pertenencia del alma</strong>
      <p>Se entrega al baúl de una cuenta. Restablecer la retira de los jugadores y la deja únicamente en La creación. Termina cualquier encuentro activo antes de hacerlo.</p>
      <button type="button" className="cg-button" disabled={ocupado} onClick={() => void restablecer()}>Restablecer y devolver a La creación</button>
    </aside>}
    <footer className="cg-danger-zone">
      <p>Las copias existentes conservan sus valores.</p>
      <button type="button" className="cg-button" disabled={ocupado} onClick={() => navegar(() => {
        void props.onEliminar(item).catch(e => onError(mensajeError(e, "No se pudo eliminar.")));
      })}><Trash2 size={14} />Eliminar creación</button>
    </footer>
  </>;
}

export function HistoriaCodice<T extends PiezaGaleria>({ ctx, forma = ctx.forma }: ConContexto<T> & { forma?: ContextoCodice<T>["forma"] }) {
  const { item } = ctx;
  return <>
    {forma?.historia && <section className="cg-detail-section" aria-live="polite">
      <h3>{forma.nombre}</h3><p className="cg-prose">{forma.historia}</p>
    </section>}
    {[["Historia", item.historia], ["Requisitos", item.requisitos], ["Limitaciones y defectos", item.defectos]].map(([label, value]) =>
      value ? <section className="cg-detail-section" key={label}>
        <h3>{label}</h3><p className="cg-prose">{value}</p>
      </section> : null
    )}
  </>;
}

export function AtributosCodice<T extends PiezaGaleria>({ ctx, variante = "rejilla", titulo = "Atributos" }: ConContexto<T> & {
  variante?: "rejilla" | "medallones" | "placa" | "heraldica";
  titulo?: string;
}) {
  const { item, props } = ctx;
  const entradas = atributos(item);
  if (!entradas.length) return null;
  const medallones = variante === "medallones" ? entradas.slice(0, 10) : [];
  const restantes = variante === "medallones" ? entradas.slice(10) : entradas;
  return <section className={`cg-detail-section cx-atributos cx-atributos-${variante}`}>
    {titulo && <h3>{titulo}</h3>}
    {!!medallones.length && <div className="cx-medallones">
      {medallones.map(([k, v]) => <Medallon key={k} etiqueta={props.etiqueta(item, k)} valor={valor(v)} />)}
    </div>}
    {!!restantes.length && <dl className="cg-attribute-grid">
      {restantes.map(([k, v]) => <div key={k}>
        <dt>{props.etiqueta(item, k)}</dt>
        <dd>{variante === "heraldica" && typeof v === "number" && v > 0 ? "+" : ""}{valor(v)}</dd>
      </div>)}
    </dl>}
  </section>;
}

export function EnlaceCreacion<T extends PiezaGaleria>({ ctx, id, className, ariaLabel, children }: ConContexto<T> & {
  id: string; className?: string; ariaLabel?: string; children?: ReactNode;
}) {
  const entrada = ctx.props.items.find(v => v.id === id);
  if (!entrada) return <span className="cx-no-disponible">Creación no disponible</span>;
  return <button type="button" className={className} aria-label={ariaLabel ?? `Abrir ${entrada.nombre}`} disabled={ctx.ocupado} onClick={() => ctx.abrir(id)}>
    {children ?? <><Sparkles size={14} />{entrada.nombre}</>}
  </button>;
}

export function Rastro({ rastro, items, irA, volver }: { rastro: string[]; items: Pick<PiezaGaleria, "id" | "nombre">[]; irA: (i: number) => void; volver: () => void }) {
  return <nav className="cx-rastro" aria-label="Rastro de creaciones"><ol>
    <li><button type="button" onClick={volver}>Colección</button></li>
    {rastro.map((id, i) => {
      const item = items.find(x => x.id === id);
      const nombre = item?.nombre ?? "Creación no disponible";
      return <li key={id}>{i === rastro.length - 1 ? <span aria-current="page">{nombre}</span> :
        item ? <button type="button" onClick={() => irA(i)}>{nombre}</button> : <span className="cx-no-disponible">{nombre}</span>}</li>;
    })}
  </ol></nav>;
}
