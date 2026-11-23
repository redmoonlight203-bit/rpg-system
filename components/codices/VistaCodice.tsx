"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { rangoDe } from "../../lib/cartas";
import { codiceDe } from "../../lib/codices";
import { imagenCreacion } from "../../lib/arte-creacion";
import type { PiezaGaleria, PropsGaleria } from "../GaleriaCreacion";
import { useDialogo } from "../Dialogo";
import { AccionesCreacion, ZonaPeligro } from "./Comunes";
import { EditorPresentacion, EstadoPresentacion, usePresentacion } from "./EditorPresentacion";
import { AtributosCodice, CabeceraCodice, EnlaceCreacion, HistoriaCodice } from "./Comunes";
import { AccionesEfectos, PasivasLista, ReglasCreacion } from "./ReglasCodice";
import { Portada } from "../GaleriaCreacion";
import { vinculosDe } from "../../lib/codices";
import type { ContextoCodice } from "./tipos";
import "./codices.css";

export default function VistaCodice<T extends PiezaGaleria>({ item, props, volver, abrir }: {
  item: T; props: PropsGaleria<T>; volver: () => void; abrir: (id: string) => void;
}) {
  const { confirmar } = useDialogo();
  const [indiceForma, cambiarForma] = useState(0);
  const formas = item.formas_historia || [];
  const forma = formas[indiceForma] || formas[0];
  const estado = usePresentacion(item, props);
  const titulo = useRef<HTMLHeadingElement>(null);
  const raiz = useRef<HTMLElement>(null);
  const tipo = props.tipoDe(item);
  const monstruo = tipo === "personaje" && !!props.esMonstruo?.(item);
  const codice = codiceDe(tipo, monstruo);
  const rango = rangoDe(item.clase);

  useEffect(() => {
    titulo.current?.focus({ preventScroll: true });
    const rect = raiz.current?.getBoundingClientRect();
    if (rect) {
      const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: Math.max(0, rect.top + window.scrollY), behavior: reducido ? "auto" : "smooth" });
    }
  }, [item.id]);

  function navegar(fn: () => void) {
    if (estado.ocupado) return;
    if (!estado.dirty) {
      fn();
      return;
    }
    void confirmar({
      titulo: "Imagen sin guardar", mensaje: "Tienes una imagen sin guardar. ¿Descartar el cambio?",
      aceptar: "Descartar", cancelar: "Seguir editando", peligro: true
    }).then(si => { if (si) fn(); });
  }

  const ctx: ContextoCodice<T> = {
    item, props, tipo, monstruo, codice, forma, titulo, navegar, ocupado: estado.ocupado,
    abrir: id => navegar(() => abrir(id)),
    imagenVisible: imagenCreacion(item.id, estado.editando ? estado.imagen : forma?.imagen || estado.imagen),
    iconoVisible: props.iconoDe({ ...item, icono: estado.icono }),
    ranuras: { acciones: null, presentacion: null, peligro: null, formas: null, estado: null }
  };
  const contenido = { ...ctx };
  ctx.ranuras = {
    acciones: <AccionesCreacion ctx={contenido} dirty={estado.dirty} />,
    presentacion: <EditorPresentacion ctx={contenido} estado={estado} />,
    peligro: <ZonaPeligro ctx={contenido} onError={estado.setError} setGuardando={estado.setGuardando} />,
    formas: formas.length > 0 && <label className="cx-forma">Cambiar forma
      <select className="cx-select" value={forma ? formas.indexOf(forma) : 0} onChange={e => cambiarForma(Number(e.target.value))}>
        {formas.map((f, i) => <option key={i} value={i}>{f.nombre}</option>)}
      </select>
    </label>,
    estado: <EstadoPresentacion estado={estado} />
  };

  return <section ref={raiz} className={`cg-detail ${rango.css}`} aria-label={`Detalles de ${item.nombre}`}>
    <button type="button" className="cg-back" disabled={estado.ocupado} onClick={() => navegar(volver)}>
      <ArrowLeft size={17} />Volver a la colección
    </button>
    <Clasica ctx={ctx} />
  </section>;
}


function Clasica<T extends PiezaGaleria>({ ctx }: { ctx: ContextoCodice<T> }) {
  const vinculos = vinculosDe(ctx.item, ctx.props.items);
  return <div className="cg-detail-grid">
    <aside className="cg-detail-visual">
      {ctx.ranuras.formas}
      <div className="cg-detail-cover">
        <Portada src={ctx.imagenVisible} tipo={ctx.tipo} icono={ctx.iconoVisible} />
        <span className="cg-rank">{ctx.item.clase || "D"}</span>
      </div>
      {ctx.ranuras.presentacion}{ctx.ranuras.estado}
    </aside>
    <div className="cg-detail-content">
      <CabeceraCodice ctx={ctx} />
      {ctx.ranuras.acciones}
      <AtributosCodice ctx={ctx} />
      <AccionesEfectos ctx={ctx} />
      <PasivasLista ctx={ctx} />
      <ReglasCreacion ctx={ctx} />
      {!!vinculos.length && <section className="cg-detail-section">
        <h3>Habilidades, pasivas y equipo</h3>
        <div className="cg-related">{vinculos.map(x => <EnlaceCreacion key={x.id} ctx={ctx} id={x.id} />)}</div>
      </section>}
      <HistoriaCodice ctx={ctx} />
      {ctx.ranuras.peligro}
    </div>
  </div>;
}
