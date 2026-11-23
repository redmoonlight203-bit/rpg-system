"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { rangoDe } from "../../lib/cartas";
import { codiceDe } from "../../lib/codices";
import { imagenCreacion } from "../../lib/arte-creacion";
import type { PiezaGaleria, PropsGaleria } from "../GaleriaCreacion";
import { useDialogo } from "../Dialogo";
import { AccionesCreacion, Rastro, ZonaPeligro } from "./Comunes";
import { EditorPresentacion, EstadoPresentacion, usePresentacion } from "./EditorPresentacion";
import Bestiario from "./Bestiario";
import Edicto from "./Edicto";
import Expediente from "./Expediente";
import Pergamino from "./Pergamino";
import Reliquia from "./Reliquia";
import Sello from "./Sello";
import Tarot from "./Tarot";
import type { ContextoCodice } from "./tipos";
import "./codices.css";

const vistas = { bestiario: Bestiario, edicto: Edicto, expediente: Expediente, pergamino: Pergamino, reliquia: Reliquia, sello: Sello, tarot: Tarot };

export default function VistaCodice<T extends PiezaGaleria>({ item, props, volver, abrir, rastro, irA }: {
  item: T; props: PropsGaleria<T>; volver: () => void; abrir: (id: string) => void; rastro?: string[]; irA?: (i: number) => void;
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

  const contenido: ContextoCodice<T> = {
    item, props, tipo, monstruo, codice, forma, titulo, navegar, ocupado: estado.ocupado,
    abrir: id => navegar(() => abrir(id)),
    imagenVisible: imagenCreacion(item.id, estado.editando ? estado.imagen : forma?.imagen || estado.imagen),
    iconoVisible: props.iconoDe({ ...item, icono: estado.icono }),
    ranuras: { acciones: null, presentacion: null, peligro: null, formas: null, estado: null }
  };
  const ranuras: ContextoCodice<T>["ranuras"] = {
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

  const Vista = vistas[codice];
  return <section ref={raiz} className={`cx-codice cg-rango-${rango.clave.toLowerCase()}`} aria-label={`Detalles de ${item.nombre}`}>
    <button type="button" className="cg-back" disabled={estado.ocupado} onClick={() => navegar(volver)}>
      <ArrowLeft size={17} />Volver a la colección
    </button>
    {rastro?.length && irA ? <Rastro rastro={rastro} items={props.items} volver={() => navegar(volver)} irA={i => navegar(() => irA(i))} /> : null}
    <Vista ctx={{ ...contenido, ranuras }} />
  </section>;
}
