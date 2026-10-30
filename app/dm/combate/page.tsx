"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Swords,
  Users,
  Shield,
  Plus,
  ScrollText,
  GripVertical,
  Flame,
  Heart,
  Zap,
  Sparkles,
  Hammer,
  Trash2,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import {
  nuevoCombate,
  agregar,
  mover,
  retirar,
  iniciar,
  siguiente,
  actuar,
  acciones,
  estadisticas,
  maxVida,
  reglas,
  dadoSeguro,
  elementoDe,
  deshacer,
  finalizar,
  descansar,
  configurarParticipante,
  type Combate,
  type Combatiente,
  type Bando,
} from "../../../lib/combate";
import { formula } from "../../../lib/creacion";
import AnimacionDados, {
  type TiradaVisual,
} from "../../../components/AnimacionDados";
import "./combate.css";
type Personaje = {
  id: string;
  nombre: string;
  clase: string;
  stats: Record<string, number>;
  origen: "forja" | "jugador";
};
type Preparado = {
  id: string;
  forja_id: string | null;
  personaje_id?: string;
  nombre: string;
  stats: Record<string, number>;
  configuracion: Combatiente["configuracion"];
  requiere_configuracion?: boolean;
};
type Guardado = { id: string; nombre: string; version: number; datos: Combate };
export default function CampoCombate() {
  const [catalogo, setCatalogo] = useState<Personaje[]>([]),
    [partidas, setPartidas] = useState<Guardado[]>([]),
    [c, setC] = useState<Combate>(nuevoCombate),
    [id, setId] = useState(() => crypto.randomUUID()),
    [version, setVersion] = useState(0),
    [nombre, setNombre] = useState("Encuentro en Ambrosía"),
    [busqueda, setBusqueda] = useState(""),
    [accion, setAccion] = useState("ataque"),
    [objetivo, setObjetivo] = useState(""),
    [error, setError] = useState(""),
    [ocupado, setOcupado] = useState(false),
    [cargando, setCargando] = useState(true);
  const bloqueo = useRef(false);
  const [roll, setRoll] = useState<{
    id: string;
    nombre: string;
    dados: TiradaVisual[];
    detalle?: string;
  } | null>(null);
  const [pendiente, setPendiente] = useState<{
    f: Preparado;
    bando: Bando;
  } | null>(null);
  const [vitales, setVitales] = useState<Record<string, number>>({});
  const [resumen, setResumen] = useState("");
  const [forzar, setForzar] = useState(false);
  async function avanzar() {
    await ejecutar(async () => {
      const dados: TiradaVisual[] = [];
      const rng = (caras: number) => {
        const valor = dadoSeguro(caras);
        dados.push({ caras, valor });
        return valor;
      };
      const next =
        c.fase === "preparacion" ? iniciar(c, rng) : siguiente(c, rng);
      await guardar(next);
      setForzar(false);
      setResumen("");
      if (dados.length)
        setRoll({
          id: crypto.randomUUID(),
          nombre: "Inicio del turno · estados y salvaciones",
          dados,
        });
    });
  }
  async function deshacerUltimo() {
    await ejecutar(async () => {
      await guardar(deshacer(c));
      setRoll(null);
      setFlotante(null);
      setResumen("Última operación deshecha.");
    });
  }

  const [flotante, setFlotante] = useState<{
    texto: string;
    id: string;
  } | null>(null);
  useEffect(() => {
    if (!flotante) return;
    const t = setTimeout(() => setFlotante(null), 3400);
    return () => clearTimeout(t);
  }, [flotante]);
  useEffect(() => {
    if (!roll) return;
    const t = setTimeout(() => setRoll(null), 4200);
    return () => clearTimeout(t);
  }, [roll]);
  function mostrarIniciativa(m: Combatiente) {
    setRoll({
      id: crypto.randomUUID(),
      nombre: m.nombre,
      dados: [{ caras: 20, valor: m.dado_iniciativa }],
      detalle: `Iniciativa: ${m.dado_iniciativa} + ${m.iniciativa - m.dado_iniciativa} = ${m.iniciativa}`,
    });
  }
  async function confirmarAlta() {
    if (!pendiente) return;
    await ejecutar(async () => {
      if (
        !Number.isFinite(vitales.vida) ||
        vitales.vida < 1 ||
        Object.values(vitales).some((v) => !Number.isFinite(v) || v < 0)
      )
        throw Error(
          "Vida debe ser positiva y los valores deben ser números no negativos.",
        );
      const f = { ...pendiente.f, stats: { ...pendiente.f.stats, ...vitales } };
      if (
        c.miembros.some(
          (m) => m.personaje_id && m.personaje_id === f.personaje_id,
        )
      )
        throw Error("Este jugador ya está en el campo.");
      const next = agregar(c, f, pendiente.bando);
      await guardar(next);
      setPendiente(null);
      mostrarIniciativa(next.miembros[next.miembros.length - 1]);
    });
  }
  async function quitar(m: Combatiente) {
    if (
      !window.confirm(
        `¿Retirar a ${m.nombre} del combate? Su ficha e inventario se conservan.`,
      )
    )
      return;
    await ejecutar(() => guardar(retirar(c, m.id)));
  }
  async function resolver(objetivoId?: string) {
    if (!actor) return;
    await ejecutar(async () => {
      const dados: TiradaVisual[] = [];
      const next = actuar(
        c,
        actor.id,
        elegida,
        objetivoId || destino,
        (caras) => {
          const valor = dadoSeguro(caras);
          dados.push({ caras, valor });
          return valor;
        },
        forzar,
      );
      await guardar(next);
      if (dados.length)
        setRoll({ id: crypto.randomUUID(), nombre: actor.nombre, dados });
      if (next.resultado)
        setFlotante({ texto: next.resultado, id: crypto.randomUUID() });
      setResumen(next.registro.slice(0, 4).reverse().join(" "));
    });
  }
  async function borrarEncuentro() {
    if (
      !version ||
      !window.confirm(`¿Eliminar definitivamente el encuentro «${nombre}»?`)
    )
      return;
    await ejecutar(async () => {
      const r = await supabase.rpc("combate_eliminar", {
        p_id: id,
        p_version: version,
      });
      if (r.error) throw Error(r.error.message);
      setPartidas((prev) => prev.filter((p) => p.id !== id));
      nuevo();
    });
  }

  function abrir(p: Guardado) {
    setPendiente(null);
    setRoll(null);
    setFlotante(null);
    setResumen("");
    setId(p.id);
    setNombre(p.nombre);
    setVersion(p.version);
    setC(p.datos);
    setAccion("ataque");
    setObjetivo("");
    setError("");
  }
  async function cargar(inicial = false) {
    try {
      const [p, b, j] = await Promise.all([
        supabase
          .from("forja_maestra")
          .select("id,nombre,clase,stats")
          .eq("tipo_creacion", "personaje")
          .eq("estado", "aprobado")
          .order("nombre"),
        supabase
          .from("combates_yugen")
          .select("id,nombre,version,datos")
          .order("updated_at", { ascending: false })
          .limit(20),
        supabase
          .from("personajes")
          .select("id,nombre,atributos")
          .eq("estado_aprobacion", "aprobado")
          .eq("estado_vida", "vivo")
          .order("nombre"),
      ]);
      if (p.error || b.error || j.error)
        throw Error(p.error?.message || b.error?.message || j.error?.message);
      setCatalogo([
        ...(j.data || []).map((x) => ({
          id: String(x.id),
          nombre: x.nombre,
          clase: "Jugador",
          stats: x.atributos || {},
          origen: "jugador" as const,
        })),
        ...(p.data || []).map((x) => ({ ...x, origen: "forja" as const })),
      ]);
      setPartidas(b.data || []);
      if (inicial && b.data?.length) abrir(b.data[0] as Guardado);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar.");
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => {
    void cargar(true);
  }, []);
  async function ejecutar(fn: () => void | Promise<void>) {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }
  async function guardar(next: Combate) {
    const r = await supabase.rpc("combate_guardar", {
      p_id: id,
      p_nombre: nombre,
      p_datos: next,
      p_version: version,
    });
    if (r.error) throw Error(r.error.message);
    if (!r.data?.version) throw Error("No se confirmó el guardado.");
    setC(next);
    setVersion(r.data.version);
    setPartidas((prev) =>
      [
        { id, nombre, datos: next, version: r.data.version },
        ...prev.filter((p) => p.id !== id),
      ].slice(0, 20),
    );
  }
  function nuevo() {
    setPendiente(null);
    setRoll(null);
    setFlotante(null);
    setResumen("");
    setId(crypto.randomUUID());
    setC(nuevoCombate());
    setVersion(0);
    setNombre("Nuevo encuentro");
    setAccion("ataque");
    setObjetivo("");
    setError("");
  }
  async function incorporar(
    origenId: string,
    bando: Bando,
    origen: "forja" | "jugador" = "forja",
  ) {
    await ejecutar(async () => {
      if (c.fase !== "preparacion")
        throw Error("Añade personajes durante la preparación.");
      if (!catalogo.some((p) => p.id === origenId && p.origen === origen))
        throw Error("Solo se admiten personajes del catálogo.");
      if (c.miembros.length >= 100) throw Error("Máximo cien participantes.");
      if (
        origen === "jugador" &&
        c.miembros.some((m) => m.personaje_id === origenId)
      )
        throw Error("Este jugador ya está en el campo.");
      const r =
        origen === "jugador"
          ? await supabase.rpc("combate_preparar_jugador", {
              p_personaje: origenId,
            })
          : await supabase.rpc("combate_preparar_personaje", {
              p_forja: origenId,
            });
      if (r.error) throw Error(r.error.message);
      const f = r.data as Preparado;
      if (origen === "jugador" && f.requiere_configuracion) {
        setVitales({
          vida: Math.max(1, f.stats.vida ?? f.stats.hp ?? 1),
          armadura: f.stats.armadura || 0,
          ph: f.stats.ph || 0,
          fatiga: f.stats.fatiga || 0,
          iniciativa: f.stats.iniciativa || 0,
          bono_impacto: f.stats.bono_impacto || 0,
          dano: f.stats.dano || 0,
          salvacion: f.stats.salvacion || 0,
        });
        setPendiente({ f, bando });
        return;
      }
      const next = agregar(c, f, bando);
      await guardar(next);
      mostrarIniciativa(next.miembros[next.miembros.length - 1]);
    });
  }
  function soltar(e: React.DragEvent, bando: Bando) {
    e.preventDefault();
    if (ocupado) return;
    try {
      const d = JSON.parse(e.dataTransfer.getData("application/yugen"));
      if (d.tipo === "personaje")
        void incorporar(
          d.id,
          bando,
          d.origen === "jugador" ? "jugador" : "forja",
        );
      else if (d.tipo === "participante")
        void ejecutar(() => guardar(mover(c, d.id, bando)));
      else throw Error();
    } catch {
      setError("Solo se admiten personajes.");
    }
  }
  const actor = c.miembros.find((m) => m.id === c.actual),
    lista = actor ? acciones(actor) : [],
    elegida =
      lista.some((a) => a.id === accion) || accion === "guardia"
        ? accion
        : "ataque",
    efecto = lista.find((a) => a.id === elegida)?.efecto,
    destino = c.miembros.some((m) => m.id === objetivo)
      ? objetivo
      : c.miembros.find((m) => m.bando !== actor?.bando)?.id || actor?.id || "";
  function tarjeta(m: Combatiente) {
    const s = estadisticas(m);
    return (
      <article
        key={m.id}
        className={`battle-unit ${c.actual === m.id ? "is-current" : ""} ${m.vida <= 0 ? "is-down" : ""} ${c.actual === m.id && m.vida > 0 && m.vida / maxVida(m) <= 0.25 ? "is-critical" : ""}`}
        draggable={!ocupado && c.fase === "preparacion"}
        onDragStart={(e) =>
          e.dataTransfer.setData(
            "application/yugen",
            JSON.stringify({ tipo: "participante", id: m.id }),
          )
        }
      >
        <div className="battle-unit-head">
          <span className="battle-rank">INI {m.iniciativa}</span>
          <span className="battle-id">
            #{m.id.slice(0, 6)}
            {c.actual === m.id ? " · EN TURNO" : ""}
          </span>
          {c.fase === "preparacion" && (
            <button
              className="battle-remove"
              disabled={ocupado}
              title="Retirar del combate sin borrar su ficha"
              aria-label={`Retirar ${m.nombre}`}
              onClick={() => void quitar(m)}
            >
              <Trash2 size={13} />
              Retirar
            </button>
          )}
        </div>
        <h3>
          <button
            className={`battle-target-name ${destino === m.id ? "target-selected" : ""}`}
            disabled={
              ocupado || !actor || actor.accion_usada || c.fase !== "en_curso"
            }
            title={
              efecto?.efecto === "dano"
                ? "Atacar a " + m.nombre
                : "Seleccionar a " + m.nombre
            }
            onClick={() => {
              setObjetivo(m.id);
              if (efecto?.efecto === "dano") void resolver(m.id);
            }}
          >
            {m.nombre}
          </button>
        </h3>
        {m.personaje_id && (
          <span className="battle-owner-tag">Personaje de jugador</span>
        )}
        {c.actual === m.id && m.vida > 0 && m.vida / maxVida(m) <= 0.25 && (
          <p className="battle-danger-label">Vida crítica · Es su turno</p>
        )}
        <div className="battle-vital">
          <span>
            VIDA{" "}
            <b>
              {m.vida}/{maxVida(m)}
            </b>
          </span>
          <div>
            <i style={{ width: `${(100 * m.vida) / maxVida(m)}%` }} />
          </div>
        </div>
        <div className="battle-metrics">
          <span>
            <Shield size={13} />
            ARM <b>{s.armadura || 0}</b>
          </span>
          <span>
            PH{" "}
            <b>
              {m.ph}/{s.ph || 0}
            </b>
          </span>
          <span>
            Fatiga{" "}
            <b>
              {m.fatiga}/{s.fatiga || 0}
              {m.agotado ? " · AGOTADO" : ""}
            </b>
          </span>
        </div>
        {m.arma && (
          <p className="battle-weapon">
            <Flame size={13} />
            {m.arma.nombre} · {formula(m.arma.efecto)} · {m.arma.restantes}{" "}
            turnos
          </p>
        )}
        <details>
          <summary>Equipo y pasivas</summary>
          <div className="battle-traits">
            <label>
              Bono de salvación
              <input
                type="number"
                min="-1000"
                max="1000"
                disabled={ocupado}
                key={`${m.id}:${m.stats.salvacion || 0}`}
                defaultValue={m.stats.salvacion || 0}
                onBlur={(e) => {
                  if (Number(e.target.value) !== (m.stats.salvacion || 0))
                    void ejecutar(() =>
                      guardar(
                        configurarParticipante(c, m.id, {
                          salvacion: Number(e.target.value),
                        }),
                      ),
                    );
                }}
              />
            </label>
            <label>
              Cercanía
              <select
                disabled={ocupado}
                value={m.grupo_cercania || ""}
                onChange={(e) =>
                  void ejecutar(() =>
                    guardar(
                      configurarParticipante(c, m.id, {
                        grupo_cercania: e.target.value,
                      }),
                    ),
                  )
                }
              >
                <option value="">Separado</option>
                {["A", "B", "C", "D"].map((g) => (
                  <option key={g} value={g}>
                    Grupo {g}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                disabled={ocupado}
                checked={m.corrupto || false}
                onChange={(e) =>
                  void ejecutar(() =>
                    guardar(
                      configurarParticipante(c, m.id, {
                        corrupto: e.target.checked,
                      }),
                    ),
                  )
                }
              />{" "}
              Oscuridad / corrupción
            </label>
          </div>
          <p>
            Iniciativa d20 ({m.dado_iniciativa}) +{" "}
            {m.iniciativa - m.dado_iniciativa}. Impacto +{s.bono_impacto || 0};
            daño +{s.dano || 0}.
          </p>
          {Object.entries(m.configuracion.equipamiento || {}).map(([k, p]) => (
            <p key={k}>
              {k}: {p.nombre}
            </p>
          ))}
          {reglas(m).map((r) => (
            <p key={r.id}>
              {r.nombre} · {r.condicion} ·{" "}
              {Object.entries(r.bonos)
                .filter(([, v]) => v)
                .map(([k, v]) => `${k} ${v >= 0 ? "+" : ""}${v}`)
                .join(", ")}
            </p>
          ))}
          {m.estados.map((e) => (
            <p key={e.id}>
              {e.nombre} ·{" "}
              {e.restantes > 0
                ? `${e.restantes} turnos`
                : "hasta resolver su condición"}
            </p>
          ))}
        </details>
      </article>
    );
  }
  return (
    <main className="battle-theme">
      {roll && (
        <AnimacionDados
          key={JSON.stringify(roll)}
          nombre={roll.nombre}
          dados={roll.dados}
          detalle={roll.detalle}
          onClose={() => setRoll(null)}
        />
      )}
      {flotante && (
        <div
          key={flotante.id}
          role="status"
          className={`battle-floating-result ${flotante.texto === "Critico" ? "result-critical" : flotante.texto === "Fallo critico" ? "result-fumble" : ""}`}
        >
          {flotante.texto}
        </div>
      )}

      {pendiente && (
        <div className="battle-modal-backdrop">
          <section
            className="battle-setup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="setup-title"
          >
            <h2 id="setup-title">Preparar a {pendiente.f.nombre}</h2>
            <p>
              Esta ficha aún no define vida de combate. Confirma sus valores
              totales, incluido el equipo, para este encuentro. La ficha
              original se conserva.
            </p>
            <div>
              {Object.entries(vitales).map(([k, v]) => (
                <label key={k}>
                  {k}
                  <input
                    type="number"
                    min={k === "vida" ? 1 : 0}
                    value={v}
                    onChange={(e) =>
                      setVitales((prev) => ({
                        ...prev,
                        [k]: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            {error && <p role="alert">{error}</p>}
            <button
              autoFocus
              disabled={ocupado}
              className="battle-primary"
              onClick={() => void confirmarAlta()}
            >
              Añadir al campo
            </button>
            <button
              disabled={ocupado}
              className="battle-button"
              onClick={() => setPendiente(null)}
            >
              Cancelar
            </button>
          </section>
        </div>
      )}
      <header className="battle-header">
        <div className="battle-heading">
          <div className="battle-emblem">
            <Swords size={25} />
          </div>
          <div>
            <p>DOMINIO KUROI / COMBATE</p>
            <h1>El campo de batalla</h1>
            <span>Un personaje, una acción. El sistema lleva las cuentas.</span>
          </div>
        </div>
        <Link className="battle-button" href="/dm/forja">
          La creación
        </Link>
      </header>
      <div className="battle-toolbar">
        <input
          aria-label="Nombre del encuentro"
          disabled={ocupado}
          value={nombre}
          maxLength={120}
          onChange={(e) => setNombre(e.target.value)}
        />
        <select
          disabled={ocupado}
          aria-label="Encuentros guardados"
          value={partidas.some((p) => p.id === id) ? id : ""}
          onChange={(e) => {
            const p = partidas.find((p) => p.id === e.target.value);
            if (p) abrir(p);
          }}
        >
          <option value="">Encuentros guardados</option>
          {partidas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <button disabled={ocupado} className="battle-button" onClick={nuevo}>
          <Plus size={13} />
          Nuevo
        </button>
        <button
          disabled={ocupado}
          className="battle-button"
          onClick={() => void ejecutar(() => guardar(c))}
        >
          {ocupado ? "Guardando…" : "Guardar"}
        </button>
        <button
          disabled={ocupado}
          className="battle-button"
          onClick={() => void cargar()}
        >
          Recargar lista
        </button>
        <button
          disabled={ocupado || version === 0}
          className="battle-button battle-delete-encounter"
          onClick={() => void borrarEncuentro()}
        >
          <Trash2 size={14} />
          Borrar encuentro
        </button>
        <button
          className="battle-button"
          disabled={ocupado || !c.historial?.length}
          onClick={() => void deshacerUltimo()}
        >
          Deshacer última operación
        </button>
        {c.fase === "en_curso" && (
          <button
            className="battle-button"
            disabled={ocupado}
            onClick={() => {
              if (window.confirm("¿Terminar este combate?"))
                void ejecutar(() => guardar(finalizar(c)));
            }}
          >
            Terminar combate
          </button>
        )}
        {c.fase !== "en_curso" && (
          <button
            className="battle-button"
            disabled={ocupado || !c.miembros.length}
            onClick={() => void ejecutar(() => guardar(descansar(c)))}
          >
            Descanso fuera de combate
          </button>
        )}
      </div>
      {error && (
        <p className="battle-error" role="alert">
          {error}
        </p>
      )}
      <div className="battle-layout">
        <aside className="battle-library">
          <div className="battle-section-title">
            <Users size={15} />
            <h2>Personajes</h2>
            <span>{catalogo.length}</span>
          </div>
          <p>Arrastra a un bando o utiliza los botones J / E.</p>
          <input
            aria-label="Buscar personajes"
            placeholder="Buscar personaje…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {cargando ? (
            <p>Cargando…</p>
          ) : (
            catalogo
              .filter((p) =>
                p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
              )
              .map((p) => (
                <div
                  key={`${p.origen}:${p.id}`}
                  className="battle-source"
                  draggable={!ocupado && c.fase === "preparacion"}
                  onDragStart={(e) =>
                    e.dataTransfer.setData(
                      "application/yugen",
                      JSON.stringify({
                        tipo: "personaje",
                        id: p.id,
                        origen: p.origen,
                      }),
                    )
                  }
                >
                  <div>
                    <GripVertical size={13} />
                    <strong>{p.nombre}</strong>
                    <span>{p.clase}</span>
                  </div>
                  <p>
                    {p.origen === "jugador" ? "JUGADOR" : "LA CREACIÓN"} ·{" "}
                    {p.stats.vida ?? p.stats.hp ?? "Configurar"} vida ·{" "}
                    {p.stats.armadura || 0} ARM
                  </p>
                  <div className="battle-source-actions">
                    <button
                      disabled={ocupado || c.fase !== "preparacion"}
                      onClick={() => void incorporar(p.id, "jugador", p.origen)}
                    >
                      J · Jugador
                    </button>
                    <button
                      disabled={ocupado || c.fase !== "preparacion"}
                      onClick={() => void incorporar(p.id, "enemigo", p.origen)}
                    >
                      E · Enemigo
                    </button>
                  </div>
                </div>
              ))
          )}
        </aside>
        <section>
          <div className="battle-flow">
            <div>
              <span>RONDA</span>
              <strong>{String(c.ronda).padStart(2, "0")}</strong>
            </div>
            <div>
              <span>
                {c.fase === "preparacion"
                  ? "PREPARACIÓN"
                  : c.fase === "finalizado"
                    ? "FINALIZADO"
                    : "TURNO ACTUAL"}
              </span>
              <h2>{actor?.nombre || "Forma los bandos"}</h2>
            </div>
            <button
              disabled={
                ocupado || !c.miembros.length || c.fase === "finalizado"
              }
              className="battle-primary"
              onClick={() => void avanzar()}
            >
              {c.fase === "preparacion" ? "Iniciar combate" : "Siguiente turno"}
            </button>
          </div>
          <div className="battle-teams">
            {(["jugador", "enemigo"] as Bando[]).map((b) => (
              <section
                key={b}
                className={`battle-team team-${b}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => soltar(e, b)}
                aria-label={`Bando ${b}`}
              >
                <div className="battle-section-title">
                  <span className="battle-team-dot" />
                  <h2>Bando {b}</h2>
                  <span>{c.miembros.filter((m) => m.bando === b).length}</span>
                </div>
                {c.miembros.some((m) => m.bando === b) ? (
                  <div className="battle-team-grid">
                    {c.miembros.filter((m) => m.bando === b).map(tarjeta)}
                  </div>
                ) : (
                  <div className="battle-drop">
                    <Users size={28} />
                    <p>Arrastra un personaje aquí</p>
                    <span>Se calcularán equipo, pasivas e iniciativa.</span>
                  </div>
                )}
              </section>
            ))}
          </div>
          <section className="battle-action">
            <div className="battle-section-title">
              <Swords size={15} />
              <h2>Resolver acción</h2>
              <span>{actor?.accion_usada ? "ACCIÓN UTILIZADA" : ""}</span>
            </div>
            <div
              className="battle-action-tiles"
              role="group"
              aria-label="Acciones del personaje"
            >
              {[
                ...lista,
                {
                  id: "guardia",
                  nombre: "Guardia",
                  efecto: null,
                  enfriamiento: 0,
                },
              ].map((a) => {
                const e = a.efecto,
                  espera = actor?.cooldowns[a.id] || 0;
                const Icono = !e
                  ? Shield
                  : e.efecto === "curacion"
                    ? Heart
                    : e.efecto === "recuperar_ph"
                      ? Zap
                      : e.efecto === "crear_arma"
                        ? Hammer
                        : e.efecto === "estado"
                          ? Sparkles
                          : e.efecto === "reducir_fatiga"
                            ? Flame
                            : Swords;
                const ayuda = e
                  ? `${a.nombre}. ${e.efecto === "crear_arma" ? "Crea " + e.arma_nombre : e.efecto === "estado" ? e.estado : e.efecto}. ${formula(e)}. ${e.tipo_dano || ""}. Coste ${e.coste_ph} PH y ${e.coste_fatiga || 0} Fatiga. Elemento ${elementoDe(e)}. ${e.salvacion ? `Salvación CD ${e.salvacion.cd} + ${e.salvacion.atributo}.` : ""} Duración ${e.duracion} turnos. Enfriamiento ${a.enfriamiento} turnos.`
                  : "Guardia: +2 ARM hasta el siguiente turno propio. Consume una acción.";
                const motivo = espera
                  ? `En enfriamiento: ${espera} turnos.`
                  : e && actor && actor.ph < e.coste_ph
                    ? "PH insuficientes."
                    : e &&
                        actor &&
                        (e.coste_fatiga || 0) > 0 &&
                        (actor.agotado ||
                          actor.fatiga + (e.coste_fatiga || 0) >
                            (estadisticas(actor).fatiga || 0)) &&
                        !forzar
                      ? "Requiere Forzar natural."
                      : "";
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`battle-action-tile ${elegida === a.id ? "selected" : ""}`}
                    aria-pressed={elegida === a.id}
                    aria-disabled={
                      ocupado || !actor || actor.accion_usada || !!motivo
                    }
                    title={ayuda + " " + motivo}
                    onClick={() => {
                      if (!ocupado && actor && !actor.accion_usada && !motivo)
                        setAccion(a.id);
                    }}
                  >
                    <Icono size={22} />
                    <strong>{a.nombre}</strong>
                    <small>{e ? formula(e) : "+2 ARM"}</small>
                    <span className="battle-tooltip" role="tooltip">
                      {ayuda} {motivo}
                    </span>
                  </button>
                );
              })}
            </div>
            <label className="battle-force">
              <input
                type="checkbox"
                checked={forzar}
                onChange={(e) => setForzar(e.target.checked)}
              />{" "}
              Forzar natural con agotamiento: sufres 1d4 antes de actuar.
            </label>
            <div className="battle-action-grid">
              <label>
                Objetivo · También puedes pulsar su nombre
                <select
                  disabled={
                    ocupado ||
                    !actor ||
                    efecto?.efecto === "crear_arma" ||
                    elegida === "guardia"
                  }
                  value={destino}
                  onChange={(e) => setObjetivo(e.target.value)}
                >
                  {c.miembros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} · {m.bando} · #{m.id.slice(0, 4)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="battle-primary"
                disabled={
                  ocupado ||
                  !actor ||
                  actor.accion_usada ||
                  c.fase !== "en_curso"
                }
                onClick={() => void resolver()}
              >
                Ejecutar
              </button>
            </div>
            {resumen && (
              <p className="battle-result" role="status" key={resumen}>
                {resumen}
              </p>
            )}
            {efecto && (
              <p>
                {efecto.efecto === "crear_arma"
                  ? `Crea ${efecto.arma_nombre}: ${formula(efecto)} durante ${efecto.duracion} turnos propios.`
                  : `${formula(efecto)} · ${efecto.efecto}`}{" "}
                Coste {efecto.coste_ph} PH / {efecto.coste_fatiga || 0} Fatiga.
              </p>
            )}
            <label className="battle-rule">
              Regla de armadura
              <select
                disabled={ocupado || c.fase !== "preparacion"}
                value={c.regla}
                onChange={(e) =>
                  void ejecutar(() =>
                    guardar({
                      ...c,
                      regla: e.target.value as Combate["regla"],
                    }),
                  )
                }
              >
                <option value="impacto">Impacto: 1d20 + bono ≥ ARM</option>
                <option value="reduccion">Daño automático menos ARM</option>
                <option value="directo">Daño directo</option>
              </select>
            </label>
            <p>
              En impacto: 1 natural falla, 20 natural duplica los dados de daño.
              Sin gasto de Fatiga recuperas 1 al terminar; al máximo requiere
              descanso. Las salvaciones elementales son d20 + salvacion contra
              CD 12. Los estados narrativos se registran; los estados
              automáticos configurados sí se resuelven. Los grupos de cercanía
              determinan chispas y Superconducción.
            </p>
          </section>
        </section>
      </div>
      <section className="battle-log">
        <div className="battle-section-title">
          <ScrollText size={15} />
          <h2>Crónica del combate</h2>
          <span>{version ? "GUARDADO EN SUPABASE" : "SIN GUARDAR"}</span>
        </div>
        <div>
          {c.registro.length ? (
            c.registro.map((l, i) => <p key={i}>{l}</p>)
          ) : (
            <p>
              Aquí aparecerán las tiradas, los costes y los cambios de recursos.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
