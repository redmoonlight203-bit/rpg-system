"use client";
import {useTiempoReal} from "../../../lib/useTiempoReal";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, User, ArrowLeft, Check, Heart } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import {
  definiciones,
  razasVivas,
  valoresIniciales,
  type Personaje,
  type Raza,
  type Atributo,
} from "../../../lib/personajes";
import { linaje } from "../../../lib/estadisticas";
import IconoYugen from "../../../components/IconoYugen";
import FichaVital from "../../../components/FichaVital";
import "../../../components/personajes.css";
export default function PersonajesJugador() {
  const router = useRouter(),
    bloqueo = useRef(false);
  const [personajes, setPersonajes] = useState<Personaje[]>([]),
    [categorias, setCategorias] = useState<Raza[]>([]),
    [atributos, setAtributos] = useState<Atributo[]>([]),
    [lugares, setLugares] = useState<string[]>([]),
    [colmena, setColmena] = useState(false);
  const [cargando, setCargando] = useState(true),
    [error, setError] = useState(""),
    [aviso, setAviso] = useState(""),
    [editando, setEditando] = useState<number | null>(null),
    [creando, setCreando] = useState(false),
    [paso, setPaso] = useState(1),
    [ocupado, setOcupado] = useState(false);
  const [razaId, setRazaId] = useState(""),
    [nombre, setNombre] = useState(""),
    [historia, setHistoria] = useState(""),
    [defecto, setDefecto] = useState(""),
    [lugar, setLugar] = useState(""),
    [stats, setStats] = useState<Record<string, number>>({}),
    [buscar, setBuscar] = useState("");
  const cargar = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const [p, c, a, u] = await Promise.all([
        supabase
          .from("personajes")
          .select("*")
          .eq("user_id", user.id)
          .eq("es_companero", false)
          .neq("estado_vida", "muerto")
          .order("created_at", { ascending: false }),
        supabase.from("categorias_forja").select("*").order("nombre"),
        supabase.from("config_estadisticas").select("*"),
        supabase
          .from("perfiles")
          .select("mente_colmena,lugares_conocidos")
          .eq("id", user.id)
          .single(),
      ]);
      for (const r of [p, c, a, u]) if (r.error) throw Error(r.error.message);
      setPersonajes(p.data || []);
      setCategorias(c.data || []);
      setAtributos(a.data || []);
      setColmena(!!u.data?.mente_colmena);
      const ls = [
        ...new Set<string>([
          "Montaña Shiro (Prueba de vida)",
          ...(u.data?.lugares_conocidos || []),
        ]),
      ];
      setLugares(ls);
      setLugar((v) => v || ls[0]);
      const activo = localStorage.getItem("personaje_activo_id");
      if (activo && !p.data?.some((x) => String(x.id) === activo))
        localStorage.removeItem("personaje_activo_id");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudieron cargar tus personajes.",
      );
    } finally {
      setCargando(false);
    }
  }, [router]);
  useTiempoReal(cargar);
 useEffect(() => {
    void cargar();

  }, [cargar]);
  const raza = categorias.find((c) => c.id === razaId),
    defs = definiciones(categorias, atributos, razaId),
    vivas = razasVivas(categorias),
    pasivas = raza
      ? linaje(categorias, raza.clave)
          .map((c) => categorias.find((x) => x.id === c.id)!)
          .filter((c) => c.pasiva_racial)
      : [];
  const puedeCrear =
    colmena || !personajes.some((p) => p.estado_aprobacion !== "rechazado");
  async function enviar() {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setError("");
    try {
      const { error } = await supabase.rpc("personaje_solicitar", {
        p_categoria: razaId,
        p_nombre: nombre,
        p_historia: historia,
        p_defecto: defecto,
        p_lugar: lugar,
        p_atributos: stats,
        p_personaje: editando,
      });
      if (error) throw Error(error.message);
      setCreando(false);
      setEditando(null);
      setNombre("");
      setHistoria("");
      setDefecto("");
      setRazaId("");
      setPaso(1);
      setAviso(
        "Personaje enviado. El GM revisará tu ficha antes de entrar al mundo.",
      );
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar.");
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }
  return (
    <main className="pj-page">
      <header className="pj-head">
        <div>
          <span className="pj-eyebrow">EL REENCARNADO / TUS PERSONAJES</span>
          <h1>Cuerpos con historia.</h1>
          <p>
            Prepara tu próxima vida. Las heridas permanecen hasta que el GM te
            cure o te permita descansar.
          </p>
        </div>
        {!creando && (
          <button
            disabled={cargando || !puedeCrear}
            onClick={() => {
              setEditando(null);
              setNombre("");
              setHistoria("");
              setDefecto("");
              setRazaId("");
              setCreando(true);
              setPaso(1);
              setError("");
            }}
          >
            <Plus size={17} />
            Crear personaje
          </button>
        )}
      </header>
      {error && (
        <p role="alert" className="pj-notice pj-error">
          {error}{" "}
          <button
            onClick={() => {
              setError("");
              void cargar();
            }}
          >
            Reintentar
          </button>
        </p>
      )}
      {aviso && (
        <p role="status" className="pj-notice">
          {aviso}
        </p>
      )}
      {cargando ? (
        <p className="pj-empty">
          Reuniendo tus personajes y las reglas del mundo…
        </p>
      ) : creando ? (
        <>
          <button onClick={() => setCreando(false)} disabled={ocupado}>
            <ArrowLeft size={15} />
            Volver a mis personajes
          </button>
          <nav className="pj-tabs" aria-label="Pasos de creación">
            {["Elegir raza", "Dar identidad", "Revisar ficha"].map((s, i) => (
              <button
                key={s}
                disabled={
                  ocupado || (i > 0 && !raza) || (i === 2 && !nombre.trim())
                }
                aria-pressed={paso === i + 1}
                onClick={() => setPaso(i + 1)}
              >
                {i + 1}. {s}
              </button>
            ))}
          </nav>
          <div className="pj-layout">
            <section className="pj-panel">
              {paso === 1 ? (
                <>
                  <span className="pj-eyebrow">01 / TU NATURALEZA</span>
                  <h2>Escoge un ser vivo</h2>
                  <p>
                    Las razas y sus descendientes provienen de Reglas y
                    estadísticas.
                  </p>
                  <label>
                    Buscar raza
                    <input
                      value={buscar}
                      onChange={(e) => setBuscar(e.target.value)}
                      placeholder="Humanos, Kuro, dragones…"
                    />
                  </label>
                  <div className="pj-grid">
                    {vivas
                      .filter((c) =>
                        c.nombre.toLowerCase().includes(buscar.toLowerCase()),
                      )
                      .map((c) => (
                        <button
                          key={c.id}
                          className={`pj-race ${razaId === c.id ? "pj-selected" : ""}`}
                          aria-pressed={razaId === c.id}
                          onClick={() => {
                            setRazaId(c.id);
                            setStats(
                              valoresIniciales(
                                definiciones(categorias, atributos, c.id),
                              ),
                            );
                          }}
                        >
                          <IconoYugen id={c.icono} size={32} />
                          <span>
                            {c.nombre}
                            <small>
                              {linaje(categorias, c.clave)
                                .map((x) => x.nombre)
                                .join(" / ")}
                            </small>
                          </span>
                          {razaId === c.id && <Check size={18} />}
                        </button>
                      ))}
                  </div>
                  {!vivas.length && (
                    <p className="pj-notice">
                      El GM debe configurar seres vivos en Reglas y
                      estadísticas.
                    </p>
                  )}
                  <div className="pj-actions">
                    <button
                      disabled={!raza || !defs.length}
                      onClick={() => setPaso(2)}
                    >
                      Continuar
                    </button>
                  </div>
                </>
              ) : paso === 2 ? (
                <>
                  <span className="pj-eyebrow">02 / IDENTIDAD Y ATRIBUTOS</span>
                  <h2>¿Quién vas a ser?</h2>
                  <label>
                    Nombre
                    <input
                      maxLength={100}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Lugar de aparición
                    <select
                      value={lugar}
                      onChange={(e) => setLugar(e.target.value)}
                    >
                      {lugares.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Historia
                    <textarea
                      maxLength={10000}
                      rows={4}
                      value={historia}
                      onChange={(e) => setHistoria(e.target.value)}
                    />
                  </label>
                  <label>
                    Rasgo especial o defecto
                    <textarea
                      maxLength={2000}
                      rows={2}
                      value={defecto}
                      onChange={(e) => setDefecto(e.target.value)}
                    />
                  </label>
                  <h2>Atributos de {raza?.nombre}</h2>
                  <p>
                    Parten de los valores de tu raza. Cada límite lo define el
                    GM; tu propuesta requiere su aprobación.
                  </p>
                  <div className="pj-stats">
                    {defs.map((s) => (
                      <label className="pj-stat" key={s.clave}>
                        {s.etiqueta}
                        <input
                          type="number"
                          step="any"
                          max={
                            s.limite_jugador == null
                              ? undefined
                              : Math.max(
                                  Number(s.valor_defecto),
                                  Number(s.limite_jugador),
                                )
                          }
                          min={Math.min(0, Number(s.valor_defecto))}
                          value={stats[s.clave] ?? 0}
                          onChange={(e) =>
                            setStats({
                              ...stats,
                              [s.clave]: Number(e.target.value),
                            })
                          }
                        />
                        <small>
                          {s.descripcion}
                          {s.limite_jugador != null
                            ? ` · Máximo ${Math.max(Number(s.valor_defecto), Number(s.limite_jugador))}`
                            : ""}
                        </small>
                      </label>
                    ))}
                  </div>
                  <button
                    disabled={
                      !nombre.trim() || !(stats.vida > 0 || stats.hp > 0)
                    }
                    onClick={() => setPaso(3)}
                  >
                    Revisar personaje
                  </button>
                </>
              ) : (
                <>
                  <span className="pj-eyebrow">03 / TU PRIMER PASO</span>
                  <h2>{nombre}</h2>
                  <p>
                    {raza?.nombre} · {lugar}
                  </p>
                  <p>{historia || "Tu historia empieza aquí."}</p>
                  {defecto && <p>Rasgo especial: {defecto}</p>}
                  <div className="pj-stats">
                    {defs.map((s) => (
                      <div className="pj-stat" key={s.clave}>
                        <small>{s.etiqueta}</small>
                        <strong>{stats[s.clave]}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="pj-notice">
                    El GM aprobará tu ficha. Al llegar a 0 de vida en combate,
                    este cuerpo abandona tu gestión y pasa al cementerio.
                  </p>
                  <button disabled={ocupado} onClick={() => void enviar()}>
                    {ocupado ? "Enviando…" : "Solicitar personaje"}
                  </button>
                </>
              )}
            </section>
            <aside className="pj-panel">
              <IconoYugen id={raza?.icono || "alma"} size={65} />
              <h2>{raza?.nombre || "Tu linaje"}</h2>
              <p>
                {raza?.descripcion ||
                  "Elige tu naturaleza para conocer sus atributos y pasivas."}
              </p>
              {pasivas.map((c) => (
                <section className="pj-section" key={c.id}>
                  <span className="pj-eyebrow">HERENCIA DE {c.nombre}</span>
                  <h3>{c.pasiva_racial?.nombre}</h3>
                  <p>{c.pasiva_racial?.descripcion}</p>
                </section>
              ))}
              {raza && !pasivas.length && (
                <p>Sin pasivas raciales configuradas.</p>
              )}
            </aside>
          </div>
        </>
      ) : (
        <>
          {!puedeCrear && (
            <p className="pj-notice">
              Ya tienes un cuerpo o una solicitud en revisión. Mente colmena
              permite gestionar varios personajes.
            </p>
          )}
          <div className="pj-grid">
            {personajes.map((p) => (
              <article key={p.id} className="pj-card">
                <User size={30} />
                <span className="pj-eyebrow">
                  {" "}
                  {p.estado_aprobacion} · {p.estado_vida}
                </span>
                <h2>{p.nombre}</h2>
                <p>
                  {categorias.find((c) => c.id === p.categoria_id)?.nombre ||
                    categorias.find((c) => c.clave === p.raza)?.nombre ||
                    p.raza}{" "}
                  · Nivel {p.nivel || 1}
                </p>
                <FichaVital personaje={p} />
                <p>{p.historia || "Una historia por escribir."}</p>
                {p.comentarios_kuroi && (
                  <p className="pj-notice">GM: {p.comentarios_kuroi}</p>
                )}
                <button
                  disabled={
                    p.estado_aprobacion !== "aprobado" ||
                    p.estado_vida !== "vivo"
                  }
                  onClick={() => {
                    localStorage.setItem("personaje_activo_id", String(p.id));
                    router.push("/ficha/personaje");
                  }}
                >
                  <Heart size={16} />
                  Gestionar personaje
                </button>
                {p.estado_aprobacion !== "aprobado" &&
                  p.estado_vida === "vivo" && (
                    <button
                      onClick={() => {
                        setEditando(p.id);
                        setNombre(p.nombre);
                        setHistoria(p.historia || "");
                        setDefecto(p.defecto || "");
                        setLugar(p.lugar_reencarnacion || lugares[0]);
                        setRazaId(p.categoria_id || "");
                        setStats(p.atributos || {});
                        setPaso(p.categoria_id ? 2 : 1);
                        setCreando(true);
                      }}
                    >
                      Editar solicitud
                    </button>
                  )}
              </article>
            ))}
          </div>
          {!personajes.length && (
            <div className="pj-empty">
              <User size={35} style={{ margin: "auto" }} />
              <h2>Tu próxima historia comienza aquí.</h2>
              <p>Crea un personaje a partir de los seres vivos del mundo.</p>
              <button onClick={() => setCreando(true)}>
                <Plus size={16} />
                Crear mi personaje
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
