"use client";
import {useRef, useState} from "react";
import {Check, X} from "lucide-react";
import {mensajeError} from "../lib/errores";
import {supabase} from "../lib/supabase";
import {atributosBaseRaza, type Atributo, type PropuestaRaza} from "../lib/personajes";
import IconoYugen from "./IconoYugen";

/** Revisión del GM: aprobar publica la raza en Reglas y estadísticas; rechazar la borra sin rastro. */
export default function RevisionRazasUnicas({
  propuestas,
  atributos,
  cuentas,
  onResuelta,
}: {
  propuestas: PropuestaRaza[];
  atributos: Atributo[];
  cuentas: {id: string; email: string}[];
  onResuelta: (mensaje: string) => void;
}) {
  const [comentarios, setComentarios] = useState<Record<string, string>>({}),
    [ocupado, setOcupado] = useState(false),
    [error, setError] = useState("");
  const bloqueo = useRef(false);
  const base = atributosBaseRaza(atributos);
  async function resolver(p: PropuestaRaza, aprobar: boolean) {
    if (bloqueo.current) return;
    const comentario = (comentarios[p.id] || "").trim();
    if (
      !window.confirm(
        aprobar
          ? `¿Aprobar «${p.nombre}»? Se publicará como raza en Reglas y estadísticas y solo su autor podrá elegirla.`
          : `¿Rechazar «${p.nombre}»? La raza se borrará y el jugador solo verá tu comentario.`,
      )
    )
      return;
    bloqueo.current = true;
    setOcupado(true);
    setError("");
    try {
      const r = await supabase.rpc("raza_propuesta_resolver", {p_id: p.id, p_aprobar: aprobar, p_comentario: comentario});
      if (r.error) throw Error(r.error.message);
      onResuelta(aprobar ? `«${p.nombre}» publicada en Reglas y estadísticas.` : `«${p.nombre}» rechazada y borrada del catálogo.`);
    } catch (e) {
      setError(mensajeError(e, "No se pudo resolver la propuesta."));
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }
  if (!propuestas.length) return <p className="pj-empty">No hay razas únicas pendientes de revisión.</p>;
  return (
    <div className="pj-grid">
      {error && (
        <p role="alert" className="pj-notice pj-error">
          {error}
        </p>
      )}
      {propuestas.map((p) => (
        <article key={p.id} className="pj-card pj-gm-propuesta">
          <span className="pj-eyebrow">RAZA ÚNICA · {cuentas.find((c) => c.id === p.user_id)?.email || "Reencarnado"}</span>
          {p.imagen_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL pública de Storage validada por la base de datos
            <img src={p.imagen_url} alt={`Imagen propuesta para ${p.nombre}`} decoding="async" loading="lazy" />
          ) : (
            <IconoYugen id={p.icono || "alma"} size={60} />
          )}
          <h2>{p.nombre}</h2>
          <p>{p.descripcion || "Sin descripción."}</p>
          <div className="pj-stats">
            {Object.entries(p.atributos).map(([k, v]) => {
              const b = base.find((s) => s.clave === k);
              return (
                <div className="pj-stat" key={k}>
                  <small>{b?.etiqueta || k}</small>
                  <strong>{v.valor_defecto}</strong>
                  <small>
                    Límite {v.limite_jugador ?? "libre"}
                    {b ? ` · base del mundo ${b.valor_defecto}${b.limite_jugador != null ? `/${b.limite_jugador}` : ""}` : ""}
                  </small>
                </div>
              );
            })}
          </div>
          {p.pasiva_racial ? (
            <section className="pj-section">
              <span className="pj-eyebrow">PASIVA RACIAL</span>
              <h3>{p.pasiva_racial.nombre}</h3>
              <p>{p.pasiva_racial.descripcion}</p>
              <small>
                {p.pasiva_racial.reglas_pasivas.length} efectos pasivos · {p.pasiva_racial.reglas.length} reglas del motor
              </small>
            </section>
          ) : (
            <p>Sin pasiva racial.</p>
          )}
          <label>
            Comentario para el jugador
            <textarea
              maxLength={2000}
              rows={3}
              value={comentarios[p.id] || ""}
              onChange={(e) => setComentarios({...comentarios, [p.id]: e.target.value})}
            />
          </label>
          <div className="pj-actions">
            <button type="button" disabled={ocupado} onClick={() => void resolver(p, true)}>
              <Check size={16} />
              Aprobar y publicar
            </button>
            <button type="button" disabled={ocupado} onClick={() => void resolver(p, false)}>
              <X size={16} />
              Rechazar
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
