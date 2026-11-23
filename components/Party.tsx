"use client";
import {Cabecera} from "./layout/Cabecera";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Shield,
  Swords,
  GitBranch,
  ArrowLeft,
  UserMinus,
  Heart,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { mensajeError } from "../lib/errores";
import FichaVital from "./FichaVital";
import {
  EditorEquipoCombate,
  consultarEquipo,
  type ContextoEquipo,
} from "./EditorEquipoCombate";
import IconoYugen from "./IconoYugen";
import { destinosPersonaje, type DestinoPersonaje, type Personaje } from "../lib/personajes";
import "./personajes.css";
import "./party.css";
import {useDialogo} from "./Dialogo";
type Cuenta = { id: string; email: string };
type Fuente = {
  id: string;
  nombre: string;
  descripcion: string;
  imagen_url: string | null;
  nivel: number;
  nivel_maximo: number;
  es_grupo: boolean;
};
export default function Party({ gm = false }: { gm?: boolean }) {
  const {confirmar}=useDialogo();
  const router = useRouter(),
    bloqueo = useRef(false),
    vigente = useRef("");
  const solicitud = useRef<{ firma: string; id: string } | null>(null);
  const [editor, setEditor] = useState<{
    personaje: Personaje;
    contexto: ContextoEquipo;
    revision: number;
  } | null>(null);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]),
    [usuario, setUsuario] = useState(""),
    [integrantes, setIntegrantes] = useState<Personaje[]>([]),
    [fuentes, setFuentes] = useState<Fuente[]>([]),
    [retirados, setRetirados] = useState<Personaje[]>([]);
  const [origen, setOrigen] = useState("forja"),
    [destino, setDestino] = useState<DestinoPersonaje>("npc"),
    [fuente, setFuente] = useState(""),
    [nombre, setNombre] = useState(""),
    [nivel, setNivel] = useState("1"),
    [buscar, setBuscar] = useState(""),
    [error, setError] = useState(""),
    [intento, setIntento] = useState(0),
    [aviso, setAviso] = useState(""),
    [cargando, setCargando] = useState(true),
    [ocupado, setOcupado] = useState(false);
  vigente.current = usuario;
  useEffect(() => {
    let vivo = true;
    async function iniciar() {
      try {
        const {
          data: { user },
          error: e,
        } = await supabase.auth.getUser();
        if (e || !user) throw Error("Inicia sesión.");
        if (gm) {
          const [u, f] = await Promise.all([
            supabase
              .from("perfiles")
              .select("id,email")
              .eq("rol", "REENCARNADO")
              .eq("estado", "aprobado")
              .order("email"),
            supabase
              .from("forja_maestra")
              .select(
                "id,nombre,descripcion,imagen_url,nivel,nivel_maximo,es_grupo",
              )
              .eq("tipo_creacion", "personaje")
              .eq("estado", "aprobado")
              .not("ligado_al_alma", "is", true)
              .order("nombre"),
          ]);
          if (u.error || f.error) throw u.error || f.error;
          if (vivo) {
            setCuentas(u.data || []);
            setFuentes(f.data || []);
            const elegido = new URLSearchParams(window.location.search).get(
              "usuario",
            );
            setUsuario(
              u.data?.some((u) => u.id === elegido)
                ? elegido!
                : u.data?.[0]?.id || "",
            );
          }
        } else if (vivo) setUsuario(user.id);
      } catch (e) {
        if (vivo) setError(mensajeError(e));
      } finally {
        if (vivo) setCargando(false);
      }
    }
    void iniciar();
    return () => {
      vivo = false;
    };
  }, [gm, intento]);
  const cargar = useCallback(async () => {
    if (!usuario) return;
    try {
      const q = await supabase
        .from("personajes")
        .select("*")
        .eq("user_id", usuario)
        .eq("estado_vida", "vivo")
        .eq("estado_aprobacion", "aprobado")
        .or("es_companero.eq.false,party_activo.eq.true")
        .order("nombre");
      if (q.error) throw q.error;
      if (vigente.current === usuario) setIntegrantes(q.data || []);
      if (gm) {
        const r = await supabase
          .from("personajes")
          .select("*")
          .eq("es_companero", true)
          .eq("party_activo", false)
          .eq("estado_vida", "vivo")
          .eq("estado_aprobacion", "aprobado")
          .order("nombre");
        if (r.error) throw r.error;
        setRetirados(r.data || []);
      }
    } catch (e) {
      if (vigente.current === usuario) setError(mensajeError(e));
    }
  }, [usuario, gm]);
  useEffect(() => {
    if (!usuario) return;
    void cargar();
    const canal = supabase
      .channel(`party-${gm ? "gm" : "pj"}-${usuario}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "personajes",
          filter: `user_id=eq.${usuario}`,
        },
        () => void cargar(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "party_companeros",
          filter: `user_id=eq.${usuario}`,
        },
        () => void cargar(),
      )
      .subscribe();
    const actualizar = () => {
      if (!document.hidden) void cargar();
    };
    const t = setInterval(actualizar, 5000);
    window.addEventListener("focus", actualizar);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", actualizar);
      void supabase.removeChannel(canal);
    };
  }, [usuario, gm, cargar]);
  async function operar(
    rpc: string,
    args: Record<string, unknown>,
    mensaje: string,
  ) {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setError("");
    setAviso("");
    try {
      const r = await supabase.rpc(rpc, args);
      if (r.error) throw r.error;
      solicitud.current = null;
      setAviso(mensaje);
      setFuente("");
      setNombre("");
      await cargar();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }
  function agregar(e: FormEvent) {
    e.preventDefault();
    if (bloqueo.current) return;
    if (origen === "forja") {
      const entrega = {
        p_usuario: usuario,
        p_forja: fuente,
        p_destino: destino,
        p_nombre: nombre.trim() || null,
        p_nivel: Number(nivel),
      };
      const firma = JSON.stringify(entrega);
      if (solicitud.current?.firma !== firma) {
        solicitud.current = { firma, id: crypto.randomUUID() };
      }
      void operar(
        "personaje_entregar",
        { ...entrega, p_solicitud: solicitud.current.id },
        destino === "cuerpo"
          ? "Cuerpo principal entregado. El jugador ya puede usarlo desde Personajes."
          : "Compañero añadido. El jugador ya puede gestionarlo y controlarlo en combate.",
      );
      return;
    }
    void operar(
      "party_asignar",
      { p_usuario: usuario, p_personaje: Number(fuente) },
      "Compañero añadido. El jugador ya puede gestionarlo y controlarlo en combate.",
    );
  }
  async function abrirEquipo(p: Personaje) {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setError("");
    try {
      const contexto = await consultarEquipo({
        personaje_id: String(p.id),
        consultar: true,
      });
      setEditor({ personaje: p, contexto, revision: 0 });
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }
  function abrir(p: Personaje, ruta: string) {
    localStorage.setItem("personaje_activo_id", String(p.id));
    router.push(ruta);
  }
  const heroes = integrantes.filter((p) => !p.es_companero),
    companeros = integrantes.filter((p) => p.es_companero),
    plantilla = fuentes.find((f) => f.id === fuente);
  function tarjeta(p: Personaje) {
    return (
      <article key={p.id} className="party-card">
        <header>
          <div className="party-portrait">
            <IconoYugen id={p.es_companero ? "escudo" : "humano"} size={38} />
          </div>
          <div>
            <small>
              {p.es_companero ? "COMPAÑERO NPC" : "PERSONAJE DE JUGADOR"} · #
              {p.id}
            </small>
            <h3>{p.nombre}</h3>
            <p>
              {p.raza} · Nivel {p.nivel} · {p.exp_total.toLocaleString("es-DO")}{" "}
              XP
            </p>
          </div>
        </header>
        <FichaVital personaje={p} />
        <div className="party-card-actions">
          {gm ? (
            <>
              <button
                className="pj-button"
                disabled={ocupado}
                onClick={() => void abrirEquipo(p)}
              >
                <Shield size={15} />
                Editar equipamiento
              </button>
              <Link className="pj-button" href={`/dm/arbol?personaje=${p.id}`}>
                <GitBranch size={15} />
                Preparar árbol
              </Link>
              <Link className="pj-button" href="/dm/personajes">
                Gestión GM
              </Link>
              {p.es_companero && (
                <button
                  className="pj-button"
                  disabled={ocupado}
                  onClick={() => void (async () => {
                    if (
                      await confirmar({titulo:"Retirar de la party",mensaje:`¿Retirar a ${p.nombre} de esta party? Volverá al control del GM y las pertenencias del alma regresarán al baúl de su dueño.`,aceptar:"Retirar",peligro:true})
                    )
                      void operar(
                        "party_retirar",
                        { p_personaje: p.id },
                        "NPC retirado. Conserva su ficha y progreso bajo control del GM.",
                      );
                  })()}
                >
                  <UserMinus size={15} />
                  Retirar de la party
                </button>
              )}
            </>
          ) : (
            <>
              <button
                className="pj-button"
                onClick={() => abrir(p, "/ficha/personaje")}
              >
                <Users size={15} />
                Gestionar
              </button>
              <button
                className="pj-button"
                disabled={ocupado}
                onClick={() => void abrirEquipo(p)}
              >
                <Shield size={15} />
                Editar equipamiento
              </button>
              <button
                className="pj-button"
                onClick={() => abrir(p, "/ficha/inventario")}
              >
                Inventario
              </button>
              <button
                className="pj-button"
                onClick={() => abrir(p, "/ficha/habilidades")}
              >
                Habilidades y pasivas
              </button>
              <button
                className="pj-button"
                onClick={() => abrir(p, "/ficha/experiencia")}
              >
                <GitBranch size={15} />
                Árbol
              </button>
              <Link className="pj-button" href="/ficha/combate">
                <Swords size={15} />
                Combate
              </Link>
            </>
          )}
        </div>
      </article>
    );
  }
  if (editor)
    return (
      <main className="pj-page party-page">
        <button className="pj-button" onClick={() => setEditor(null)}>
          <ArrowLeft size={15} />
          Volver a la party
        </button>
        <p className="party-note">
          Equipo de {editor.personaje.nombre}. En combate, cambiar el equipo
          consume su acción y requiere su turno.
        </p>
        <EditorEquipoCombate
          key={`${editor.personaje.id}:${editor.revision}`}
          contexto={editor.contexto}
          solicitud={{ personaje_id: String(editor.personaje.id) }}
          onCerrar={() => setEditor(null)}
          onGuardado={async () => {
            const contexto = await consultarEquipo({
              personaje_id: String(editor.personaje.id),
              consultar: true,
            });
            setEditor({ ...editor, contexto, revision: editor.revision + 1 });
            await cargar();
          }}
        />
      </main>
    );
  return (
    <main className="pj-page party-page">
      {!gm && (
        <Link className="pj-button" href="/ficha">
          <ArrowLeft size={15} />
          Volver al Nexo
        </Link>
      )}
      <Cabecera
        kanji="絆"
        migas={gm ? "Kuroi · Preparar a los jugadores" : "Reencarnado · Compañeros de viaje"}
        titulo={gm ? "Parties de jugadores" : "Mi party"}
        subtitulo={gm
          ? "Entrega cuerpos principales o compañeros NPC a una cuenta. Los compañeros activos entran juntos al añadir al personaje al combate."
          : "Gestiona a tus personajes y compañeros: equipamiento, inventario, habilidades y árbol. Cuando el GM añada a tu personaje al combate, sus compañeros activos entrarán con él."}
      />
      {error && (
        <p role="alert" className="pj-notice pj-error">
          {error}{" "}
          <button
            type="button"
            className="party-reintentar"
            disabled={ocupado}
            onClick={() => {
              setError("");
              if (usuario) void cargar();
              else setIntento((i) => i + 1);
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
      {gm && (
        <label className="party-account">
          Cuenta del jugador
          <select
            disabled={ocupado}
            value={usuario}
            onChange={(e) => {
              setUsuario(e.target.value);
              setIntegrantes([]);
              setAviso("");
              setError("");
            }}
          >
            <option value="" disabled>
              Seleccionar jugador
            </option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.email}
              </option>
            ))}
          </select>
        </label>
      )}
      {cargando ? (
        <p className="pj-empty">Cargando party…</p>
      ) : !usuario ? (
        <p className="pj-empty">No hay cuentas de jugador aprobadas.</p>
      ) : (
        <>
          <section className="party-roster">
            <header>
              <h2>
                <Heart size={21} />
                Personajes del jugador
              </h2>
              <span>{heroes.length}</span>
            </header>
            <div className="party-grid">{heroes.map(tarjeta)}</div>
            {!heroes.length && (
              <p className="pj-empty">
                Esta cuenta todavía no tiene personajes vivos y aprobados.
              </p>
            )}
          </section>
          <section className="party-roster">
            <header>
              <h2>
                <Users size={21} />
                Compañeros NPC
              </h2>
              <span>{companeros.length}</span>
            </header>
            <div className="party-grid">{companeros.map(tarjeta)}</div>
            {!companeros.length && (
              <p className="pj-empty">
                {gm
                  ? "Añade el primer compañero desde el Yunque o recupera uno retirado."
                  : "El GM aún no ha añadido compañeros a tu party."}
              </p>
            )}
          </section>
          {gm && (
            <section className="pj-panel party-editor">
              <h2>
                <Plus size={22} />
                Entregar un personaje
              </h2>
              <p>
                Cada ficha conserva su equipo y habilidades. Los NPC se añaden a la party sin ocupar un cupo de cuerpo.
              </p>
              <form onSubmit={agregar}>
                <label>
                  Origen
                  <select
                    disabled={ocupado}
                    value={origen}
                    onChange={(e) => {
                      setOrigen(e.target.value);
                      setFuente("");
                    }}
                  >
                    <option value="forja">Crear desde el Yunque</option>
                    <option value="retirado">
                      Reasignar un compañero retirado
                    </option>
                  </select>
                </label>
                {origen === "forja" && (
                  <label>
                    Buscar creación
                    <input
                      value={buscar}
                      onChange={(e) => setBuscar(e.target.value)}
                      placeholder="Nombre del personaje…"
                    />
                  </label>
                )}
                <label>
                  {origen === "forja" ? "Creación del Yunque" : "NPC sin party"}
                  <select
                    required
                    disabled={ocupado}
                    value={fuente}
                    onChange={(e) => {
                      setFuente(e.target.value);
                      const f = fuentes.find((f) => f.id === e.target.value);
                      if (f) setNivel(String(f.nivel || 1));
                    }}
                  >
                    <option value="">Seleccionar</option>
                    {origen === "forja"
                      ? fuentes
                          .filter(
                            (f) =>
                              f.id === fuente ||
                              f.nombre
                                .toLowerCase()
                                .includes(buscar.toLowerCase()),
                          )
                          .map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.nombre}
                              {f.es_grupo ? " · Especie / malla" : ""}
                            </option>
                          ))
                      : retirados.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} · Nivel {p.nivel} · #{p.id}
                          </option>
                        ))}
                  </select>
                </label>
                {origen === "forja" && (
                  <>
                    <label>
                      Entregar como
                      <select
                        disabled={ocupado}
                        value={destino}
                        onChange={(e) => setDestino(e.target.value as DestinoPersonaje)}
                      >
                        <option value="npc">{destinosPersonaje.npc}</option>
                        <option value="cuerpo">{destinosPersonaje.cuerpo}</option>
                      </select>
                    </label>
                    <label>
                      Nombre del personaje (opcional)
                      <input
                        maxLength={100}
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder={
                          plantilla?.nombre || "Conservar nombre de la creación"
                        }
                      />
                    </label>
                    <label>
                      Nivel inicial
                      <input
                        required
                        disabled={ocupado}
                        type="number"
                        min="1"
                        max={plantilla?.es_grupo ? plantilla.nivel_maximo : 100}
                        step="1"
                        value={nivel}
                        onChange={(e) => setNivel(e.target.value)}
                      />
                    </label>
                    {plantilla && (
                      <p className="party-source-description">
                        {plantilla.descripcion ||
                          "El personaje conservará las habilidades y el equipamiento de esta creación."}
                      </p>
                    )}
                    <p>
                      Empieza con la experiencia y los puntos de árbol
                      correspondientes a su nivel. Después progresa de forma
                      independiente.
                    </p>
                  </>
                )}
                <button className="pj-button" disabled={ocupado || !fuente}>
                  <Plus size={16} />
                  {origen === "forja"
                    ? "Entregar personaje"
                    : "Asignar a esta party"}
                </button>
              </form>
            </section>
          )}
          <footer className="party-note">
            Cada integrante conserva su propia vida, inventario, nivel y árbol.
            El GM elige quién forma parte de la party. Los compañeros caídos
            pasan al cementerio.
          </footer>
        </>
      )}
    </main>
  );
}
