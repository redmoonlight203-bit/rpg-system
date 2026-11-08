"use client";
import {useTiempoReal} from "../lib/useTiempoReal";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Archive,
  User,
  Trash2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import IconoYugen from "./IconoYugen";
import { describirEfecto, describirRegla } from "../lib/descripciones";
import type { Efecto } from "../lib/creacion";
import type { Regla } from "../lib/reglas";
import "./personajes.css";
type Recurso = {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  imagen_url?: string;
  clase?: string;
  stats: Record<string, number>;
  personaje_id: number | null;
  slot_equipado: string | null;
  configuracion?: {
    tipo_creacion?: string;
    efectos?: Efecto[];
    reglas?: Regla[];
    habilidades?: { nombre: string }[];
    equipamiento?: Record<string, { nombre: string }>;
  };
};
type Cuerpo = {
  id: number;
  nombre: string;
  estado_vida: string;
  estado_aprobacion: string;
};
const tipo = (r: Recurso) =>
  r.configuracion?.tipo_creacion ||
  (/habilidad|pasiva/.test(r.tipo) ? "habilidad" : "objeto");
export default function BaulAlma({
  usuarioId,
  nombreCuenta,
}: {
  usuarioId?: string;
  nombreCuenta?: string;
}) {
  const gm = !!usuarioId,
    bloqueo = useRef(false),
    solicitud = useRef({ firma: "", id: "" });
  const [items, setItems] = useState<Recurso[]>([]),
    [cuerpos, setCuerpos] = useState<Cuerpo[]>([]),
    [catalogo, setCatalogo] = useState<{ id: string; nombre: string }[]>([]),
    [creacion, setCreacion] = useState("");
  const [cargando, setCargando] = useState(true),
    [ocupado, setOcupado] = useState(false),
    [error, setError] = useState(""),
    [aviso, setAviso] = useState(""),
    [seleccion, setSeleccion] = useState(""),
    [buscar, setBuscar] = useState(""),
    [filtro, setFiltro] = useState("todos");
  const cargar = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user)
        throw Error("Inicia sesión para consultar el baúl.");
      const cuenta = usuarioId || user.id;
      const [i, p] = await Promise.all([
        supabase
          .from("inventario_jugador")
          .select("*")
          .eq("user_id", cuenta)
          .eq("ligado_al_alma", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("personajes")
          .select("id,nombre,estado_vida,estado_aprobacion")
          .eq("user_id", cuenta),
      ]);
      if (i.error || p.error) throw Error(i.error?.message || p.error?.message);
      setItems(i.data || []);
      setCuerpos(p.data || []);
      if (usuarioId) {
        const c = await supabase
          .from("forja_maestra")
          .select("id,nombre")
          .eq("estado", "aprobado")
          .eq("ligado_al_alma", true)
          .order("nombre");
        if (c.error) throw Error(c.error.message);
        setCatalogo(c.data || []);
      }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el baúl.");
    } finally {
      setCargando(false);
    }
  }, [usuarioId]);
  useTiempoReal(()=>{if(!bloqueo.current)return cargar();});
 useEffect(() => {
    setItems([]);
    setSeleccion("");
    setCargando(true);
    void cargar();

  }, [cargar]);
  async function ejecutar(fn: () => Promise<void>) {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setError("");
    setAviso("");
    try {
      await fn();
      await cargar();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la operación.",
      );
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }
  async function mover(r: Recurso, destino: number | null) {
    await ejecutar(async () => {
      const q = await supabase.rpc("alma_transferir", {
        p_item: r.id,
        p_destino: destino,
        p_origen: r.personaje_id,
      });
      if (q.error) throw Error(q.error.message);
      setAviso(
        destino === null
          ? "Devuelto al baúl de tu cuenta."
          : "Asignado al personaje. Sigue perteneciendo a tu alma.",
      );
    });
  }
  async function eliminar(r: Recurso) {
    if (
      !window.confirm(
        `¿Eliminar permanentemente «${r.nombre}» del alma de esta cuenta?`,
      )
    )
      return;
    await ejecutar(async () => {
      const q = await supabase.rpc("alma_eliminar", { p_item: r.id });
      if (q.error) throw Error(q.error.message);
      setSeleccion("");
      setAviso("Pertenencia eliminada por Kuroi.");
    });
  }
  async function entregar() {
    await ejecutar(async () => {
      const firma = usuarioId + ":" + creacion;
      if (solicitud.current.firma !== firma)
        solicitud.current = { firma, id: crypto.randomUUID() };
      const q = await supabase.rpc("alma_entregar", {
        p_usuario: usuarioId,
        p_forja: creacion,
        p_cantidad: 1,
        p_solicitud: solicitud.current.id,
      });
      if (q.error) throw Error(q.error.message);
      solicitud.current = { firma: "", id: "" };
      setAviso("Entregado directamente al baúl de la cuenta.");
    });
  }
  const visibles = items.filter(
    (r) =>
      r.nombre.toLowerCase().includes(buscar.toLowerCase()) &&
      (filtro === "todos" ||
        (filtro === "reposo" && r.personaje_id === null) ||
        (filtro === "asignados" && r.personaje_id !== null) ||
        (filtro === "objeto" &&
          !["habilidad", "pasiva", "personaje"].includes(tipo(r))) ||
        (filtro === "habilidad" && ["habilidad", "pasiva"].includes(tipo(r))) ||
        (filtro === "personaje" && tipo(r) === "personaje")),
  );
  const elegido = visibles.find((r) => r.id === seleccion) || visibles[0],
    vivos = cuerpos.filter(
      (p) => p.estado_vida === "vivo" && p.estado_aprobacion === "aprobado",
    );
  return (
    <main className="pj-page">
      <Link className="pj-button" href={gm ? "/dm/personajes" : "/ficha"}>
        <ArrowLeft size={14} />
        {gm ? "Jugadores" : "Volver a mi cuenta"}
      </Link>
      <header className="pj-head pj-section">
        <div>
          <span className="pj-eyebrow">
            {gm ? nombreCuenta : "TU CUENTA"} / PERTENENCIAS PERMANENTES
          </span>
          <h1>Baúl del alma</h1>
          <p>
            Objetos, habilidades y personajes vinculados a tu cuenta. Puedes
            prestarlos a tus cuerpos; si uno muere, todo lo ligado a su alma
            regresa aquí.
          </p>
          <p>Solo Kuroi puede eliminar estas pertenencias.</p>
        </div>
        <Archive size={44} />
      </header>
      {error && (
        <p role="alert" className="pj-notice pj-error">
          {error}
          <button onClick={() => void cargar()}>Reintentar</button>
        </p>
      )}
      {aviso && (
        <p role="status" className="pj-notice">
          {aviso}
        </p>
      )}
      {gm && (
        <section className="pj-panel">
          <h2>Entregar al alma del jugador</h2>
          <p>No requiere que la cuenta tenga un personaje vivo.</p>
          <label>
            Creación ligada al alma
            <select
              value={creacion}
              onChange={(e) => setCreacion(e.target.value)}
            >
              <option value="">Seleccionar de La creación</option>
              {catalogo.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={ocupado || !creacion}
            onClick={() => void entregar()}
          >
            Entregar al baúl
          </button>
        </section>
      )}
      <nav className="pj-tabs" aria-label="Filtrar baúl">
        {[
          ["todos", "Todo"],
          ["reposo", "En el baúl"],
          ["asignados", "En personajes"],
          ["objeto", "Objetos"],
          ["habilidad", "Habilidades y pasivas"],
          ["personaje", "Personajes"],
        ].map(([k, n]) => (
          <button
            key={k}
            aria-pressed={filtro === k}
            onClick={() => setFiltro(k)}
          >
            {n}
          </button>
        ))}
      </nav>
      <label>
        Buscar en el alma
        <input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Nombre de una pertenencia…"
        />
      </label>
      {cargando ? (
        <p className="pj-empty">Abriendo el baúl…</p>
      ) : (
        <div className="pj-layout">
          <section className="pj-grid">
            {visibles.map((r) => (
              <button
                key={r.id}
                className={`pj-card ${elegido?.id === r.id ? "pj-selected" : ""}`}
                style={{ display: "block", textAlign: "left" }}
                onClick={() => setSeleccion(r.id)}
                aria-pressed={elegido?.id === r.id}
              >
                {r.imagen_url ? (
                  <img
                    style={{ width: "100%", height: 140, objectFit: "contain" }}
                    src={r.imagen_url}
                    alt=""
                  />
                ) : (
                  <IconoYugen
                    id={
                      tipo(r) === "personaje"
                        ? "alma"
                        : tipo(r) === "habilidad"
                          ? "rayo"
                          : "anillo"
                    }
                    size={48}
                  />
                )}
                <h2>{r.nombre}</h2>
                <p>
                  {tipo(r)} · {r.clase || "Sin clase"}
                </p>
                <small>
                  {r.personaje_id === null
                    ? "En el baúl de la cuenta"
                    : `Prestado a ${cuerpos.find((p) => p.id === r.personaje_id)?.nombre || "un cuerpo"}`}
                </small>
              </button>
            ))}
            {!visibles.length && (
              <p className="pj-empty">
                {buscar
                  ? "No hay coincidencias."
                  : "No hay pertenencias en esta vista."}
              </p>
            )}
          </section>
          {elegido && (
            <aside className="pj-panel" aria-live="polite">
              <span className="pj-eyebrow">PROPIEDAD DE LA CUENTA</span>
              <h2>{elegido.nombre}</h2>
              <p>
                {elegido.descripcion || "Una pertenencia permanente del alma."}
              </p>
              <div className="pj-stats">
                {Object.entries(elegido.stats || {}).map(([k, v]) => (
                  <div className="pj-stat" key={k}>
                    <small>{k.replaceAll("_", " ")}</small>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
              {elegido.configuracion?.efectos?.map((e) => (
                <p key={e.id}>{describirEfecto(e).resumen}</p>
              ))}
              {elegido.configuracion?.reglas?.map((r) => (
                <p key={r.id}>{describirRegla(r).resumen}</p>
              ))}
              {tipo(elegido) === "personaje" && (
                <>
                  <h3>Habilidades del personaje vinculado</h3>
                  {elegido.configuracion?.habilidades?.map((h, i) => (
                    <p key={i}>{h.nombre}</p>
                  ))}
                  <h3>Equipamiento conservado</h3>
                  {Object.entries(
                    elegido.configuracion?.equipamiento || {},
                  ).map(([slot, p]) => (
                    <p key={slot}>
                      {slot}: {p.nombre}
                    </p>
                  ))}
                </>
              )}
              {!gm &&
                (elegido.personaje_id === null ? (
                  <>
                    <h3>Enviar a uno de mis personajes</h3>
                    {vivos.map((p) => (
                      <button
                        key={p.id}
                        disabled={ocupado}
                        onClick={() => void mover(elegido, p.id)}
                        style={{ margin: "8px 8px 0 0" }}
                      >
                        <User size={16} />
                        {p.nombre}
                      </button>
                    ))}
                    {!vivos.length && (
                      <p>
                        La pertenencia permanece segura aquí. Necesitas un
                        personaje vivo y aprobado para enviarla.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p>
                      Prestado a{" "}
                      {cuerpos.find((p) => p.id === elegido.personaje_id)
                        ?.nombre || "un cuerpo"}
                      . Sigue siendo propiedad de la cuenta.
                    </p>
                    <button
                      disabled={ocupado || !!elegido.slot_equipado}
                      onClick={() => void mover(elegido, null)}
                    >
                      {elegido.slot_equipado
                        ? "Desequipa antes de devolver"
                        : "Devolver al baúl"}
                    </button>
                  </>
                ))}
              {gm && (
                <button
                  disabled={ocupado}
                  onClick={() => void eliminar(elegido)}
                >
                  <Trash2 size={16} />
                  Eliminar del alma
                </button>
              )}
              <p style={{ fontSize: 12 }}>
                Los envíos y devoluciones se realizan fuera de encuentros
                activos.
              </p>
            </aside>
          )}
        </div>
      )}
    </main>
  );
}
