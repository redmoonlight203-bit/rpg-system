"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { rangoDe } from "../../lib/cartas";
import { arcanoDe, portadoresDe, tirarPrueba, vinculosDe } from "../../lib/codices";
import { efectosDe, EFECTOS_NOMBRE, formula } from "../../lib/creacion";
import { describirEfecto } from "../../lib/descripciones";
import { Portada, type PiezaGaleria } from "../GaleriaCreacion";
import { AtributosCodice, CabeceraCodice, HistoriaCodice } from "./Comunes";
import { GrupoVinculos } from "./Miniaturas";
import { AccionesEfectos, PasivasLista, ReglasCreacion } from "./ReglasCodice";
import type { ContextoCodice } from "./tipos";

export default function Tarot<T extends PiezaGaleria>({ ctx }: { ctx: ContextoCodice<T> }) {
  const { item, props, ranuras } = ctx;
  const arcano = arcanoDe(item.id);
  const rango = rangoDe(item.clase);
  const acciones = efectosDe(item);
  const dados = acciones.filter((e) => e.cantidad > 0);
  const [volteada, setVolteada] = useState(false);
  const [eleccion, setEleccion] = useState(0);
  const [resultado, setResultado] = useState("");
  const movimiento = useRef(false);
  const cuadro = useRef<number | null>(null);
  const escena = useRef<HTMLDivElement>(null);

  function reiniciarInclinacion() {
    if (cuadro.current !== null) cancelAnimationFrame(cuadro.current);
    cuadro.current = null;
    escena.current?.style.setProperty("--rx", "0deg");
    escena.current?.style.setProperty("--ry", "0deg");
  }

  useEffect(() => {
    const puntero = window.matchMedia("(hover:hover) and (pointer:fine)");
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)");
    const actualizar = () => {
      movimiento.current = puntero.matches && !reducido.matches;
      if (!movimiento.current) reiniciarInclinacion();
    };
    actualizar();
    puntero.addEventListener("change", actualizar);
    reducido.addEventListener("change", actualizar);
    return () => {
      puntero.removeEventListener("change", actualizar);
      reducido.removeEventListener("change", actualizar);
      reiniciarInclinacion();
    };
  }, []);

  function inclinar(evento: PointerEvent<HTMLDivElement>) {
    if (!movimiento.current) return;
    const nodo = evento.currentTarget;
    const rect = nodo.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const limite = (n: number) => Math.min(6, Math.max(-6, n));
    const x = limite((0.5 - (evento.clientY - rect.top) / rect.height) * 12);
    const y = limite(((evento.clientX - rect.left) / rect.width - 0.5) * 12);
    if (cuadro.current !== null) cancelAnimationFrame(cuadro.current);
    cuadro.current = requestAnimationFrame(() => {
      cuadro.current = null;
      nodo.style.setProperty("--rx", `${x}deg`);
      nodo.style.setProperty("--ry", `${y}deg`);
    });
  }

  function lanzar() {
    const efecto = dados[eleccion] || dados[0];
    if (!efecto) return;
    const tirada = tirarPrueba(efecto);
    const mod = efecto.modificador || 0;
    const termino = mod > 0 ? ` + ${mod}` : mod < 0 ? ` − ${-mod}` : "";
    setResultado(`${tirada.dados.join(" + ")}${termino} = ${tirada.total}`);
  }

  const uso = item.requisitos_uso;
  const requisitos = [
    uso?.razas?.length ? `Razas: ${uso.razas.join(", ")}` : "",
    ...Object.entries(uso?.minimos || {}).map(([k, n]) => `${props.etiqueta(item, k)}: mínimo ${n}`),
    uso?.nivel_minimo ? `Nivel mínimo: ${uso.nivel_minimo}` : "",
  ].filter(Boolean);
  const portadores = portadoresDe(item.id, props.items).map((p) => ({ ...p, tipo: "habilidad" as const }));
  const plantilla = item.configuracion_invocacion?.plantilla;

  return (
    <div className={`cx-vista-doble cx-tarot-vista ${rango.css}`}>
      <div className="cx-tarot-panel">
        <div className="cx-tarot-escena" ref={escena} onPointerMove={inclinar} onPointerLeave={reiniciarInclinacion}>
          <div className="cx-tarot-inclinacion">
            <button type="button" className="cx-tarot" aria-pressed={volteada}
              aria-label={volteada ? "Ver el anverso de la carta" : "Voltear la carta para leerla"}
              onClick={() => setVolteada((antes) => !antes)}>
              <span className="cx-tarot-cara is-anverso" aria-hidden={volteada || undefined} inert={volteada}>
                <span className="cx-tarot-numero">{arcano.romano}</span>
                <span className="cx-tarot-arte">
                  <Portada src={ctx.imagenVisible} tipo={ctx.tipo} icono={ctx.iconoVisible} />
                </span>
                <strong className="cx-tarot-nombre">{item.nombre}</strong>
                <span className="cx-tarot-rango">{rango.clave} · {rango.nombre}</span>
              </span>
              <span className="cx-tarot-cara is-reverso" aria-hidden={!volteada || undefined} inert={!volteada}>
                <strong className="cx-tarot-numero">Lectura</strong>
                {acciones.length ? acciones.map((e) => (
                  <span key={e.id} className="cx-tarot-accion">
                    <strong>{e.nombre || EFECTOS_NOMBRE[e.efecto]} · {formula(e)}</strong>
                    <span>{e.coste_ph || 0} PH · {e.coste_fatiga || 0} Fatiga</span>
                    <span>{describirEfecto(e).resumen}</span>
                  </span>
                )) : <span>Esta carta no tiene acciones; su poder está en sus reglas.</span>}
              </span>
            </button>
          </div>
        </div>
        {!!dados.length && (
          <section className="cx-seccion cx-tirada">
            <h3>Tirada de prueba</h3>
            <div className="cx-tirada-controles">
              <select className="cx-select" aria-label="Acción para la tirada de prueba" value={eleccion}
                onChange={(evento) => {
                  setEleccion(Number(evento.target.value));
                  setResultado("");
                }}>
                {dados.map((e, i) => <option key={e.id} value={i}>{e.nombre || EFECTOS_NOMBRE[e.efecto]} · {formula(e)}</option>)}
              </select>
              <button type="button" className="cg-button" onClick={lanzar}>Lanzar</button>
            </div>
            <output aria-live="polite">{resultado}</output>
            <p>Solo es una prueba: no aplica daño ni consume PH.</p>
          </section>
        )}
        {ranuras.formas}
        {ranuras.presentacion}
        {ranuras.estado}
      </div>
      <div className="cx-lectura">
        <CabeceraCodice ctx={ctx} eyebrow={`Arcano ${arcano.romano} · ${props.clasificacion(item.tipo)}`} />
        {ranuras.acciones}
        {!!requisitos.length && <section className="cx-seccion"><h3>Requisitos de uso</h3>
          <ul>{requisitos.map((requisito) => <li key={requisito}>{requisito}</li>)}</ul>
        </section>}
        <AtributosCodice ctx={ctx} />
        <AccionesEfectos ctx={ctx} />
        <PasivasLista ctx={ctx} />
        {plantilla && <section className="cx-seccion"><h3>Invocación</h3>
          <p>{plantilla.nombre}</p>
          <ul>{Object.entries(plantilla.stats || {}).map(([clave, n]) => <li key={clave}>{props.etiqueta(item, clave)}: {n}</li>)}</ul>
        </section>}
        <ReglasCreacion ctx={ctx} />
        <HistoriaCodice ctx={ctx} />
        <GrupoVinculos ctx={ctx} vinculos={vinculosDe(item, props.items)} titulo="Habilidades, pasivas y equipo" />
        <GrupoVinculos ctx={ctx} vinculos={portadores} titulo="La portan" />
        {ranuras.peligro}
      </div>
    </div>
  );
}
