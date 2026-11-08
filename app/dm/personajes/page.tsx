"use client";
import {useTiempoReal} from "../../../lib/useTiempoReal";
import { useCallback, useEffect, useRef, useState } from "react";
import { Users, Heart, Skull, Check, Search, Moon, Shield } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import {
  definiciones,
  razasVivas,
  type Personaje,
  type Raza,
  type Atributo,
} from "../../../lib/personajes";
import BaulAlma from "../../../components/BaulAlma";
import NaturalezasYugen from "../../../components/NaturalezasYugen";
import FichaVital from "../../../components/FichaVital";
import "../../../components/personajes.css";
type Cuenta = {
  id: string;
  email: string;
  estado: string;
  mente_colmena: boolean;
  lugares_conocidos: string[];
};
type Tumba = {
  id: string;
  personaje_id: number;
  nombre: string;
  user_id: string;
  fallecido_at: string;
  combate_id: string | null;
  snapshot: {
    personaje: Personaje;
    inventario: Item[];
    combatiente?: Record<string, unknown>;
  };
};
type Item = {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  slot_equipado?: string;
  ligado_al_alma: boolean;
  stats: Record<string, number>;
  configuracion?: Record<string, unknown>;
};
export default function GestionPersonajes() {
  const [tab, setTab] = useState("vivos"),
    [personajes, setPersonajes] = useState<Personaje[]>([]),
    [cuentas, setCuentas] = useState<Cuenta[]>([]),
    [tumbas, setTumbas] = useState<Tumba[]>([]),
    [categorias, setCategorias] = useState<Raza[]>([]),
    [atributos, setAtributos] = useState<Atributo[]>([]);
  const [error, setError] = useState(""),
    [aviso, setAviso] = useState(""),
    [cargando, setCargando] = useState(true),
    [ocupado, setOcupado] = useState(false),
    [buscar, setBuscar] = useState(""),
    [seleccion, setSeleccion] = useState<Personaje | null>(null),
    [tumba, setTumba] = useState<Tumba | null>(null),
    [items, setItems] = useState<Item[]>([]),
    [cura, setCura] = useState(1);
  const [baul, setBaul] = useState<Cuenta | null>(null);
  const bloqueo = useRef(false);
  const cargar = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw Error("Inicia sesión como GM.");
      const rol = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", user.id)
        .single();
      if (rol.error || rol.data?.rol !== "KUROI")
        throw Error("Esta gestión está reservada al GM.");
      const [p, u, t, c, a] = await Promise.all([
        supabase
          .from("personajes")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("perfiles")
          .select("id,email,estado,mente_colmena,lugares_conocidos")
          .eq("rol", "REENCARNADO"),
        supabase
          .from("cementerio_personajes")
          .select("*")
          .order("fallecido_at", { ascending: false }),
        supabase.from("categorias_forja").select("*"),
        supabase.from("config_estadisticas").select("*"),
      ]);
      for (const x of [p, u, t, c, a])
        if (x.error) throw Error(x.error.message);
      setPersonajes(p.data || []);
      setCuentas(u.data || []);
      setTumbas(t.data || []);
      setCategorias(c.data || []);
      setAtributos(a.data || []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar la gestión.",
      );
    } finally {
      setCargando(false);
    }
  }, []);
  useTiempoReal(()=>{if(!ocupado)return cargar();});
 useEffect(() => {
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
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }
  async function inspeccionar(p: Personaje) {
    setSeleccion(structuredClone(p));
    setTumba(null);
    setItems([]);
    const r = await supabase
      .from("inventario_jugador")
      .select("*")
      .eq("personaje_id", p.id)
      .eq("user_id", p.user_id);
    if (r.error) setError(r.error.message);
    else setItems(r.data || []);
  }
  async function recuperar(p: Personaje, tipo: string) {
    await ejecutar(async () => {
      const r = await supabase.rpc("personaje_recuperar", {
        p_personaje: p.id,
        p_tipo: tipo,
        p_cantidad: cura,
      });
      if (r.error) throw Error(r.error.message);
      setSeleccion(null);
      setAviso(
        tipo === "descanso"
          ? "Descanso completo aplicado: vida y PH recuperados; fatiga eliminada."
          : "Curación aplicada a la ficha permanente.",
      );
    });
  }
  async function borrar(p: Personaje) {
    if (
      !window.confirm(
        `¿Borrar definitivamente a «${p.nombre}» de esta cuenta? Se eliminarán su ficha, árbol, naturalezas y pertenencias exclusivas. Todo lo ligado al alma volverá al baúl de la cuenta.`,
      )
    )
      return;
    await ejecutar(async () => {
      const r = await supabase.rpc("personaje_borrar", {
        p_personaje: p.id,
        p_usuario: p.user_id,
      });
      if (r.error) throw Error(r.error.message);
      setSeleccion(null);
      setItems([]);
      setAviso(
        `Personaje «${p.nombre}» eliminado. Sus pertenencias del alma están en el baúl de la cuenta.`,
      );
    });
  }
  async function guardar(estado: string) {
    if (!seleccion) return;
    await ejecutar(async () => {
      const r = await supabase
        .from("personajes")
        .update({
          nombre: seleccion.nombre,
          raza: seleccion.raza,
          categoria_id: seleccion.categoria_id,
          atributos: seleccion.atributos,
          historia: seleccion.historia,
          defecto: seleccion.defecto,
          lugar_reencarnacion: seleccion.lugar_reencarnacion,
          comentarios_kuroi: seleccion.comentarios_kuroi,
          estado_aprobacion: estado,
        })
        .eq("id", seleccion.id)
        .select("id")
        .single();
      if (r.error) throw Error(r.error.message);
      setSeleccion(null);
      setAviso("Ficha actualizada.");
    });
  }
  async function cuenta(c: Cuenta, cambio: Record<string, unknown>) {
    await ejecutar(async () => {
      const r = await supabase
        .from("perfiles")
        .update(cambio)
        .eq("id", c.id)
        .select("id")
        .single();
      if (r.error) throw Error(r.error.message);
    });
  }
  const pendientes = personajes.filter(
    (p) =>
      ["pendiente", "editado"].includes(p.estado_aprobacion) &&
      p.estado_vida !== "muerto",
  );
  const lista = (
    tab === "solicitudes"
      ? pendientes
      : personajes.filter(
          (p) =>
            p.estado_vida !== "muerto" && p.estado_aprobacion === "aprobado",
        )
  ).filter((p) =>
    (
      p.nombre +
      " " +
      p.raza +
      " " +
      cuentas.find((u) => u.id === p.user_id)?.email
    )
      .toLowerCase()
      .includes(buscar.toLowerCase()),
  );
  const ficha = seleccion || tumba?.snapshot.personaje,
    pertenencias = tumba ? tumba.snapshot.inventario : items,
    defs = ficha
      ? definiciones(
          categorias,
          atributos,
          ficha.categoria_id ||
            categorias.find((c) => c.clave === ficha.raza)?.id ||
            "",
        )
      : [];
  if (baul)
    return (
      <>
        <button
          className="pj-button"
          style={{ margin: 20 }}
          onClick={() => setBaul(null)}
        >
          Cerrar baúl de la cuenta
        </button>
        <BaulAlma usuarioId={baul.id} nombreCuenta={baul.email} />
      </>
    );
  return (
    <main className="pj-page">
      <header className="pj-head">
        <div>
          <span className="pj-eyebrow">GM / CONTINUIDAD DE CAMPAÑA</span>
          <h1>Jugadores y personajes</h1>
          <p>
            Revisa nuevas vidas, atiende las heridas y conserva la historia de
            quienes cayeron.
          </p>
        </div>
        <button disabled={ocupado} onClick={() => void cargar()}>
          Actualizar
        </button>
      </header>
      <nav className="pj-tabs" aria-label="Gestión de jugadores">
        {[
          ["vivos", "Personajes", Heart],
          ["solicitudes", `Solicitudes (${pendientes.length})`, Check],
          ["cementerio", `Cementerio (${tumbas.length})`, Skull],
          ["cuentas", "Jugadores", Users],
        ].map(([id, label, Icon]) => {
          const I = Icon as typeof Heart;
          return (
            <button
              key={String(id)}
              aria-pressed={tab === id}
              onClick={() => {
                setTab(String(id));
                setSeleccion(null);
                setTumba(null);
              }}
            >
              <I size={16} />
              {String(label)}
            </button>
          );
        })}
      </nav>
      {error && (
        <p role="alert" className="pj-notice pj-error">
          {error}
        </p>
      )}
      {aviso && (
        <p role="status" className="pj-notice">
          {aviso}
        </p>
      )}
      <label>
        <Search size={14} />
        Buscar
        <input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Nombre, raza o jugador"
        />
      </label>
      {cargando ? (
        <p className="pj-empty">Cargando campaña…</p>
      ) : (
        <>
          {tab === "cuentas" ? (
            <div className="pj-grid">
              {cuentas
                .filter((c) =>
                  c.email.toLowerCase().includes(buscar.toLowerCase()),
                )
                .map((c) => (
                  <article className="pj-card" key={c.id}>
                    <Users />
                    <h2 style={{ fontSize: 18, overflowWrap: "anywhere" }}>
                      {c.email}
                    </h2>
                    <p>
                      {c.estado} ·{" "}
                      {
                        personajes.filter(
                          (p) => p.user_id === c.id && p.estado_vida === "vivo",
                        ).length
                      }{" "}
                      personajes vivos
                    </p>
                    <div className="pj-actions">
                      <button onClick={() => setBaul(c)}>
                        Abrir baúl del alma
                      </button>
                      {c.estado !== "aprobado" && (
                        <button
                          disabled={ocupado}
                          onClick={() => void cuenta(c, { estado: "aprobado" })}
                        >
                          Aprobar cuenta
                        </button>
                      )}
                      <button
                        disabled={ocupado}
                        aria-pressed={c.mente_colmena}
                        onClick={() =>
                          void cuenta(c, { mente_colmena: !c.mente_colmena })
                        }
                      >
                        Mente colmena: {c.mente_colmena ? "sí" : "no"}
                      </button>
                      {c.estado !== "rechazado" && (
                        <button
                          disabled={ocupado}
                          onClick={() =>
                            void cuenta(c, { estado: "rechazado" })
                          }
                        >
                          Rechazar acceso
                        </button>
                      )}
                    </div>
                    <details>
                      <summary>Personajes de esta cuenta</summary>
                      {personajes
                        .filter((p) => p.user_id === c.id)
                        .map((p) => (
                          <div key={p.id} className="pj-actions">
                            <span>
                              {p.nombre} · {p.estado_aprobacion} ·{" "}
                              {p.estado_vida}
                            </span>
                            <button
                              disabled={ocupado}
                              onClick={() => void borrar(p)}
                            >
                              Borrar personaje
                            </button>
                          </div>
                        ))}
                    </details>
                    <details>
                      <summary>Lugares conocidos</summary>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const d = new FormData(e.currentTarget);
                          void cuenta(c, {
                            lugares_conocidos: String(d.get("lugares") || "")
                              .split("\n")
                              .map((x) => x.trim())
                              .filter(Boolean),
                          });
                        }}
                      >
                        <textarea
                          name="lugares"
                          rows={4}
                          defaultValue={(c.lugares_conocidos || []).join("\n")}
                          aria-label={`Lugares de ${c.email}`}
                        />
                        <button disabled={ocupado}>Guardar lugares</button>
                      </form>
                    </details>
                  </article>
                ))}
            </div>
          ) : tab === "cementerio" ? (
            <>
              <p className="pj-notice">
                Copias preservadas al morir. Incluyen ficha, nivel, habilidades,
                inventario, equipamiento y estado final del combate. Solo el GM
                tiene acceso.
              </p>
              <div className="pj-grid">
                {tumbas
                  .filter((t) =>
                    t.nombre.toLowerCase().includes(buscar.toLowerCase()),
                  )
                  .map((t) => (
                    <article className="pj-card" key={t.id}>
                      <Skull />
                      <h2>{t.nombre}</h2>
                      <p>
                        {new Date(t.fallecido_at).toLocaleString("es-DO")} ·{" "}
                        {cuentas.find((c) => c.id === t.user_id)?.email}
                      </p>
                      <p>
                        {t.snapshot.inventario.length} pertenencias conservadas
                      </p>
                      <button
                        onClick={() => {
                          setTumba(t);
                          setSeleccion(null);
                        }}
                      >
                        Abrir recuerdo
                      </button>
                    </article>
                  ))}
              </div>
              {!tumbas.length && (
                <p className="pj-empty">El cementerio está vacío.</p>
              )}
            </>
          ) : (
            <div className="pj-grid">
              {lista.map((p) => (
                <article key={p.id} className="pj-card">
                  <Shield />
                  <span className="pj-eyebrow">
                    {" "}
                    {p.estado_aprobacion} · {p.estado_vida}
                  </span>
                  <h2>{p.nombre}</h2>
                  <p>
                    {categorias.find((c) => c.id === p.categoria_id)?.nombre ||
                      p.raza}{" "}
                    · Nivel {p.nivel || 1}
                  </p>
                  <p style={{ fontSize: 12, overflowWrap: "anywhere" }}>
                    {cuentas.find((c) => c.id === p.user_id)?.email}
                  </p>
                  <FichaVital personaje={p} />
                  <button
                    disabled={ocupado}
                    onClick={() => void inspeccionar(p)}
                  >
                    Abrir ficha
                  </button>
                  <button disabled={ocupado} onClick={() => void borrar(p)}>
                    Borrar personaje
                  </button>
                  {p.estado_aprobacion === "aprobado" &&
                    p.estado_vida === "vivo" && (
                      <button
                        disabled={ocupado}
                        onClick={() => void recuperar(p, "descanso")}
                      >
                        <Moon size={15} />
                        Descanso completo
                      </button>
                    )}
                </article>
              ))}
              {!lista.length && (
                <p className="pj-empty">No hay personajes en esta vista.</p>
              )}
            </div>
          )}
          {ficha && (
            <section
              className="pj-panel pj-section"
              aria-label={
                tumba ? "Recuerdo del cementerio" : "Editor de personaje"
              }
            >
              <div className="pj-head">
                <div>
                  <span className="pj-eyebrow">
                    {tumba
                      ? "CEMENTERIO / RECUERDO CONSERVADO"
                      : "FICHA DEL PERSONAJE"}
                  </span>
                  <h2>{ficha.nombre}</h2>
                </div>
                <button
                  onClick={() => {
                    setSeleccion(null);
                    setTumba(null);
                  }}
                >
                  Cerrar ficha
                </button>
              </div>
              {!tumba && seleccion && (
                <NaturalezasYugen
                  personajeId={seleccion.id}
                  onCambio={() => void cargar()}
                />
              )}
              {tumba ? (
                <>
                  <p>
                    {ficha.raza} · Nivel {ficha.nivel || 1} ·{" "}
                    {ficha.exp_total || 0} XP
                  </p>
                  <p>{ficha.historia}</p>
                  <p>{ficha.defecto}</p>
                  <div className="pj-stats">
                    {Object.entries(ficha.atributos || {}).map(([k, v]) => (
                      <div className="pj-stat" key={k}>
                        <small>{k}</small>
                        <strong>{v}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                seleccion && (
                  <fieldset disabled={ocupado}>
                    <label>
                      Nombre
                      <input
                        value={seleccion.nombre}
                        onChange={(e) =>
                          setSeleccion({ ...seleccion, nombre: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Raza de Reglas y estadísticas
                      <select
                        value={seleccion.categoria_id || ""}
                        onChange={(e) => {
                          const r = categorias.find(
                            (c) => c.id === e.target.value,
                          );
                          if (r)
                            setSeleccion({
                              ...seleccion,
                              categoria_id: r.id,
                              raza: r.clave,
                            });
                        }}
                      >
                        <option value="">
                          Seleccionar raza ({seleccion.raza})
                        </option>
                        {razasVivas(categorias).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="pj-stats">
                      {[
                        ...new Set([
                          ...defs.map((s) => s.clave),
                          ...Object.keys(seleccion.atributos || {}),
                        ]),
                      ].map((k) => (
                        <label key={k}>
                          {defs.find((s) => s.clave === k)?.etiqueta || k}
                          <input
                            type="number"
                            step="any"
                            value={seleccion.atributos[k] ?? 0}
                            onChange={(e) =>
                              setSeleccion({
                                ...seleccion,
                                atributos: {
                                  ...seleccion.atributos,
                                  [k]: Number(e.target.value),
                                },
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <label>
                      Historia
                      <textarea
                        value={seleccion.historia || ""}
                        onChange={(e) =>
                          setSeleccion({
                            ...seleccion,
                            historia: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Rasgo especial
                      <textarea
                        value={seleccion.defecto || ""}
                        onChange={(e) =>
                          setSeleccion({
                            ...seleccion,
                            defecto: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Comentario del GM
                      <textarea
                        value={seleccion.comentarios_kuroi || ""}
                        onChange={(e) =>
                          setSeleccion({
                            ...seleccion,
                            comentarios_kuroi: e.target.value,
                          })
                        }
                      />
                    </label>
                    <div className="pj-actions">
                      <button onClick={() => void borrar(seleccion)}>
                        Borrar personaje de la cuenta
                      </button>
                      <button onClick={() => void guardar("aprobado")}>
                        <Check size={16} />
                        {seleccion.estado_aprobacion === "aprobado"
                          ? "Guardar ficha"
                          : "Aprobar personaje"}
                      </button>
                      <button onClick={() => void guardar("editado")}>
                        Pedir revisión
                      </button>
                      <button onClick={() => void guardar("rechazado")}>
                        Rechazar
                      </button>
                    </div>
                    {seleccion.estado_aprobacion === "aprobado" &&
                      seleccion.estado_vida === "vivo" && (
                        <>
                          <FichaVital personaje={seleccion} />
                          <label>
                            Cantidad de vida a curar
                            <input
                              min={1}
                              type="number"
                              value={cura}
                              onChange={(e) => setCura(Number(e.target.value))}
                            />
                          </label>
                          <div className="pj-actions">
                            <button
                              onClick={() => void recuperar(seleccion, "curar")}
                            >
                              <Heart size={15} />
                              Curar
                            </button>
                            <button
                              onClick={() =>
                                void recuperar(seleccion, "descanso")
                              }
                            >
                              <Moon size={15} />
                              Descanso completo
                            </button>
                          </div>
                          <p>
                            La recuperación se aplica fuera de encuentros
                            activos.
                          </p>
                        </>
                      )}
                  </fieldset>
                )
              )}
              <h2 className="pj-section">
                Pertenencias {tumba ? "al morir" : ""}
              </h2>
              <div className="pj-grid">
                {pertenencias.map((i) => (
                  <article key={i.id} className="pj-card">
                    <h3>{i.nombre}</h3>
                    <p>
                      {i.tipo}
                      {i.slot_equipado ? ` · Equipado: ${i.slot_equipado}` : ""}
                      {i.ligado_al_alma ? " · Ligado al alma" : ""}
                    </p>
                    <p>{i.descripcion}</p>
                    <details>
                      <summary>Estadísticas y habilidades</summary>
                      <pre className="pj-snapshot">
                        {JSON.stringify(
                          { stats: i.stats, configuracion: i.configuracion },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </article>
                ))}
              </div>
              {!pertenencias.length && <p>Sin pertenencias registradas.</p>}
              {tumba && (
                <details>
                  <summary>Registro completo de la muerte</summary>
                  <pre className="pj-snapshot">
                    {JSON.stringify(tumba.snapshot, null, 2)}
                  </pre>
                </details>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
