"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { rangoDe } from "../../lib/cartas";
import { paginasBestiario, variantesBestiario, vinculosDe } from "../../lib/codices";
import type { PaginaBestiario } from "../../lib/codices";
import { SLOTS } from "../../lib/creacion";
import { atributos, Portada } from "../GaleriaCreacion";
import type { PiezaGaleria } from "../GaleriaCreacion";
import { Sello } from "../ui/Juego";
import { AtributosCodice, CabeceraCodice, HistoriaCodice } from "./Comunes";
import { GrupoVinculos } from "./Miniaturas";
import { AccionesEfectos, PasivasLista, ReglasCreacion } from "./ReglasCodice";
import type { ContextoCodice } from "./tipos";

type Giro = { indice: number; direccion: "adelante" | "atras" };
type AnchoPliego = 1 | 2;

function alinear(indice: number, total: number, porVista: AnchoPliego) {
  return Math.floor(Math.min(Math.max(indice, 0), Math.max(total - 1, 0)) / porVista) * porVista;
}

export function usePaginasLibro(total: number) {
  const [pagina, setPagina] = useState(0);
  const [porVista, setPorVista] = useState<AnchoPliego>(1);
  const [giro, setGiro] = useState<Giro | null>(null);
  const pendiente = useRef<Giro | null>(null);
  const reducido = useRef(false);
  const indice = alinear(pagina, total, porVista);

  const terminar = useCallback(() => {
    const destino = pendiente.current;
    if (!destino) return;
    pendiente.current = null;
    setPagina(destino.indice);
    setGiro(null);
  }, []);

  useEffect(() => {
    const pantalla = window.matchMedia("(min-width: 900px)");
    const movimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cambiarPantalla = () => {
      terminar();
      setPorVista(pantalla.matches ? 2 : 1);
    };
    const cambiarMovimiento = () => {
      reducido.current = movimiento.matches;
      if (movimiento.matches) terminar();
    };
    cambiarPantalla();
    cambiarMovimiento();
    pantalla.addEventListener("change", cambiarPantalla);
    movimiento.addEventListener("change", cambiarMovimiento);
    return () => {
      pantalla.removeEventListener("change", cambiarPantalla);
      movimiento.removeEventListener("change", cambiarMovimiento);
    };
  }, [terminar]);

  useEffect(() => {
    if (!giro) return;
    const seguridad = window.setTimeout(terminar, 800);
    return () => window.clearTimeout(seguridad);
  }, [giro, terminar]);

  function ir(n: number) {
    if (pendiente.current) return;
    const destino = alinear(n, total, porVista);
    if (destino === indice) return;
    if (reducido.current) {
      setPagina(destino);
      return;
    }
    const cambio: Giro = { indice: destino, direccion: destino > indice ? "adelante" : "atras" };
    pendiente.current = cambio;
    setGiro(cambio);
  }

  return {
    indice,
    porVista,
    ir,
    siguiente: () => ir(indice + porVista),
    anterior: () => ir(indice - porVista),
    girando: giro?.direccion ?? null,
    destino: giro?.indice ?? null,
    terminar,
  };
}

const MARCAS: Record<PaginaBestiario["clave"], string> = {
  lamina: "Lámina",
  anatomia: "Anatomía",
  variante: "Variantes",
  cronica: "Crónica",
  ficha: "Ficha",
};

export default function Bestiario<T extends PiezaGaleria>({ ctx }: { ctx: ContextoCodice<T> }) {
  const { item, props, ranuras } = ctx;
  const variantes = variantesBestiario(item.configuracion_monstruo, id => props.items.find(c => c.id === id)?.nombre ?? null);
  const base = vinculosDe({ ...item, configuracion_monstruo: null }, props.items);
  const paginas = paginasBestiario({
    stats: atributos(item).length,
    habilidades: base.filter(v => v.tipo === "habilidad").length,
    pasivas: base.filter(v => v.tipo === "pasiva").length,
    equipo: base.filter(v => v.tipo === "equipo").length,
    variantes,
    cronica: !!(item.historia?.trim() || item.formas_historia?.length || item.requisitos?.trim() || item.defectos?.trim() || item.reglas?.length),
  });
  const rango = rangoDe(item.clase);
  const libro = usePaginasLibro(paginas.length);
  const gesto = useRef<{ id: number; x: number; y: number } | null>(null);

  function teclado(e: KeyboardEvent<HTMLElement>) {
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      if (e.key === "ArrowLeft") libro.anterior();
      else libro.siguiente();
    }
  }

  function empezarGesto(e: PointerEvent<HTMLElement>) {
    if (e.pointerType !== "touch" || (e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    gesto.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  function terminarGesto(e: PointerEvent<HTMLElement>) {
    const inicio = gesto.current;
    gesto.current = null;
    if (!inicio || inicio.id !== e.pointerId) return;
    const desplazamiento = e.clientX - inicio.x;
    if (Math.abs(desplazamiento) <= 50 || Math.abs(e.clientY - inicio.y) >= 30) return;
    if (desplazamiento < 0) libro.siguiente();
    else libro.anterior();
  }

  function pagina(p: PaginaBestiario, copia = false): ReactNode {
    switch (p.clave) {
      case "lamina":
        return <>
          {copia ? <h3>{item.nombre}</h3> : <CabeceraCodice ctx={ctx} eyebrow={`Especie · ${props.clasificacion(item.tipo)}`} />}
          <div className="cx-bestiario-ilustracion"><Portada src={ctx.imagenVisible} tipo={ctx.tipo} icono={ctx.iconoVisible} /></div>
          <Sello texto={`${rango.clave} · ${rango.nombre}`} />
          <AtributosCodice ctx={ctx} variante="rejilla" titulo="Ficha de campo" />
        </>;
      case "anatomia":
        return <>
          <h3>Anatomía</h3>
          <GrupoVinculos ctx={ctx} titulo="Habilidades" vinculos={base.filter(v => v.tipo === "habilidad")} />
          <GrupoVinculos ctx={ctx} titulo="Pasivas" vinculos={base.filter(v => v.tipo === "pasiva")} />
          <GrupoVinculos ctx={ctx} titulo="Equipo" vinculos={base.filter(v => v.tipo === "equipo")} />
        </>;
      case "variante": {
        const variante = variantes.find(v => v.id === p.varianteId);
        const origen = item.configuracion_monstruo?.variantes.find(v => v.id === p.varianteId);
        if (!variante || !origen) return null;
        const enlaces = vinculosDe({ id: item.id, nombre: variante.nombre, habilidades: variante.habilidades, pasivas: variante.pasivas }, props.items);
        return <>
          <h3>{variante.nombre}</h3>
          <p>Aparece {variante.probabilidad.toFixed(1)}% de las veces</p>
          {!!variante.bonos.length && <ul>{variante.bonos.map(([clave, valor]) => <li key={clave}>{props.etiqueta(item, clave)} {valor > 0 ? "+" : ""}{valor}</li>)}</ul>}
          <GrupoVinculos ctx={ctx} titulo="Habilidades" vinculos={enlaces.filter(v => v.tipo === "habilidad")} />
          <GrupoVinculos ctx={ctx} titulo="Pasivas" vinculos={enlaces.filter(v => v.tipo === "pasiva")} />
          {Object.entries(origen.equipamiento).map(([slot, equipo], index) => {
            const espacio = SLOTS.find(s => s.clave === slot)?.nombre ?? slot;
            if (equipo.modo === "generado") return <p key={slot}>{espacio}: {variante.equipo[index]?.texto}</p>;
            return <GrupoVinculos key={slot} ctx={ctx} titulo={espacio} vinculos={equipo.opciones.map(id => ({
              id,
              tipo: "equipo" as const,
              nombre: props.items.find(c => c.id === id)?.nombre ?? null,
              espacio,
            }))} />;
          })}
        </>;
      }
      case "cronica":
        return <><h3>Crónica</h3><HistoriaCodice ctx={ctx} /><ReglasCreacion ctx={ctx} /></>;
      case "ficha":
        return <>
          <h3>Ficha · {item.nombre}</h3>
          {copia ? null : <>
            {ranuras.acciones}
            <AccionesEfectos ctx={ctx} />
            <PasivasLista ctx={ctx} />
            {ranuras.formas}
            {ranuras.presentacion}
            {ranuras.estado}
            {ranuras.peligro}
          </>}
        </>;
    }
  }

  const visibles = paginas.slice(libro.indice, libro.indice + libro.porVista);
  const origenGiro = libro.porVista === 2 && libro.girando === "adelante" ? libro.indice + 1 : libro.indice;
  const destinoGiro = libro.destino === null ? null : libro.destino + (libro.porVista === 2 && libro.girando === "atras" ? 1 : 0);
  return <section className={`cx-libro cx-libro-${libro.porVista}`} role="region" aria-roledescription="libro" aria-label={`Bestiario: ${item.nombre}`} tabIndex={0}
    onKeyDown={teclado} onPointerDown={empezarGesto} onPointerUp={terminarGesto} onPointerCancel={() => { gesto.current = null; }}>
    <div className="cx-marcapaginas" role="group" aria-label="Marcapáginas">
      {paginas.map((p, i) => paginas.findIndex(m => m.clave === p.clave) === i && <button key={p.clave} type="button"
        aria-current={visibles.some(v => v.clave === p.clave) ? "true" : undefined}
        disabled={!!libro.girando} onClick={() => libro.ir(i)}>{MARCAS[p.clave]}</button>)}
    </div>
    <div className="cx-pliego">
      {visibles.map(p => <article className="cx-pagina" key={p.varianteId ?? p.clave}>{pagina(p)}</article>)}
      {libro.porVista === 2 && visibles.length === 1 && <span className="cx-pagina cx-pagina-vacia" aria-hidden="true" inert />}
      {libro.girando && destinoGiro !== null && <div className={`cx-hoja is-${libro.girando}`} aria-hidden="true" inert
        onAnimationEnd={e => { if (e.target === e.currentTarget) libro.terminar(); }}>
        <div className="cx-pagina cx-cara-hoja">{paginas[origenGiro] && pagina(paginas[origenGiro], true)}</div>
        <div className="cx-pagina cx-cara-hoja cx-cara-hoja-detras">{paginas[destinoGiro] && pagina(paginas[destinoGiro], true)}</div>
      </div>}
    </div>
    <div className="cx-libro-pie">
      <button type="button" disabled={libro.indice === 0 || !!libro.girando} onClick={libro.anterior}>Anterior</button>
      <span aria-live="polite">Página {libro.indice + 1}{libro.porVista === 2 && libro.indice + 2 <= paginas.length ? `–${libro.indice + 2}` : ""} de {paginas.length}</span>
      <button type="button" disabled={libro.indice + libro.porVista >= paginas.length || !!libro.girando} onClick={libro.siguiente}>Siguiente</button>
    </div>
  </section>;
}
