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
  X,
  BookOpen,
  Crosshair,
  Dices,
  Save,
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
  reglasMotor,
  dadoSeguro,
  elementoDe,
  deshacer,
  finalizar,
  descansar,
  configurarParticipante,
  type Combate,
  type Combatiente,
  type Bando,
  type Fuente,
} from "../../../lib/combate";
import {EditorEquipoCombate,consultarEquipo,type ContextoEquipo} from "../../../components/EditorEquipoCombate";
import { formula } from "../../../lib/creacion";
import AnimacionDados, {
  type TiradaVisual,
} from "../../../components/AnimacionDados";
import RetratoCombate from "../../../components/RetratoCombate";
import { retratosCombate } from "../../../lib/retratos-combate";
import {describirEfecto,describirRegla,ayudaGuardia} from "../../../lib/descripciones";
import ContenidoAyuda from "../../../components/ContenidoAyuda";
import "./combate.css";
import "./diseno.css";
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
  const [objetosMochila,setObjetosMochila]=useState<{id:string;nombre:string}[]>([]);
  const [editorEquipo,setEditorEquipo]=useState<{actor:string;contexto:ContextoEquipo}|null>(null);
  async function refrescarEncuentro(){const r=await supabase.from('combates_yugen').select('version,datos').eq('id',id).maybeSingle();if(r.error)throw Error(r.error.message);if(r.data){setC(r.data.datos as Combate);setVersion(r.data.version);}}
  async function abrirEquipoActual(participante:Combatiente|undefined=actor){if(!participante)return;await ejecutar(async()=>{if(c.fase==='preparacion'&&!participante.personaje_id){const r=await supabase.from('forja_maestra').select('id,nombre').eq('tipo_creacion','objeto').eq('estado','aprobado').order('nombre');if(r.error)throw Error(r.error.message);setObjetosMochila(r.data||[]);}const contexto=await consultarEquipo({combate_id:id,actor_id:participante.id,consultar:true});setEditorEquipo({actor:participante.id,contexto});});}
  async function agregarObjetoMochila(objetoId:string){
    if(!editorEquipo||c.fase!=='preparacion')throw Error('Prepara la mochila antes de iniciar el combate.');
    const participante=c.miembros.find(m=>m.id===editorEquipo.actor);if(!participante||participante.personaje_id)throw Error('Los jugadores utilizan las copias de su inventario.');
    const r=await supabase.rpc('combate_preparar_objeto',{p_id:objetoId});if(r.error)throw Error(r.error.message);
    const next=structuredClone(c),m=next.miembros.find(m=>m.id===participante.id)!;
    (m.configuracion.reserva||=[]).push(r.data as Fuente);await guardar(next);
    const contexto=await consultarEquipo({combate_id:id,actor_id:m.id,consultar:true});setEditorEquipo({actor:m.id,contexto});
  }
  useEffect(()=>{if(c.fase!=='en_curso')return;let vivo=true,leyendo=false;const t=setInterval(()=>{if(bloqueo.current||leyendo||document.hidden)return;leyendo=true;void(async()=>{try{const r=await supabase.from('combates_yugen').select('version,datos').eq('id',id).maybeSingle();if(vivo&&r.data&&r.data.version>version){setC(r.data.datos as Combate);setVersion(r.data.version);}}catch{/* Se reintentará en la próxima consulta. */}finally{leyendo=false;}})();},3000);return()=>{vivo=false;clearInterval(t);};},[id,version,c.fase]);
  const buscarRef = useRef<HTMLInputElement>(null);
  const [biblioteca, setBiblioteca] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [retratos, setRetratos] = useState<Record<string, string>>(retratosCombate);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("yugen:retratos-combate") || "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved))
        setRetratos({ ...retratosCombate, ...Object.fromEntries(Object.entries(saved).filter(([, v]) => typeof v === "string")) } as Record<string, string>);
    } catch { /* El combate funciona aunque el almacenamiento esté desactivado. */ }
  }, []);
  function claveRetrato(m: Combatiente) {
    return m.personaje_id ? `jugador:${m.personaje_id}` : `forja:${m.forja_id || m.id}`;
  }
  function configurarRetrato(m: Combatiente, value: string) {
    const url = value.trim();
    if (url && !/^https?:\/\//i.test(url) && !/^\/(?!\/)/.test(url)) {
      setError("Usa una URL http/https o una ruta de imagen que comience por /.");
      return;
    }
    const next = { ...retratos, [claveRetrato(m)]: url };
    setRetratos(next);
    try { localStorage.setItem("yugen:retratos-combate", JSON.stringify(next)); }
    catch { setError("El retrato se aplicó, pero este navegador no permite recordar la configuración."); }
  }
  function abrirBiblioteca() {
    setBiblioteca(true);
    requestAnimationFrame(() => buscarRef.current?.focus());
  }
  useEffect(() => {
    if (!biblioteca) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setBiblioteca(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [biblioteca]);
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
        objetivoId || (elegida === "guardia" || efecto?.efecto === "crear_arma" ? actor.id : destino),
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
  async function confirmarProgreso() {
    await ejecutar(async()=>{
      const r=await supabase.rpc('combate_confirmar_progreso',{p_id:id,p_version:version});
      if(r.error)throw Error(r.error.message);
      setC(r.data.datos as Combate);setVersion(r.data.version);
      setResumen('Progreso permanente aplicado a las fichas de jugadores. Este encuentro queda cerrado.');
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
    setArrastrando(false);
    setBiblioteca(false);
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
        : lista[0]?.id || "ataque",
    efecto = lista.find((a) => a.id === elegida)?.efecto,
    destino = c.miembros.some((m) => m.id === objetivo)
      ? objetivo
      : "";
  const opciones = [...lista, { id: "guardia", nombre: "Guardia", efecto: null, enfriamiento: 0, regla: undefined }];
  useEffect(() => {
    const atajo = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || ocupado || biblioteca || pendiente || !actor || actor.accion_usada || c.fase !== "en_curso") return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input,select,textarea,button,summary"))) return;
      const index = "qwer".indexOf(event.key.toLowerCase());
      const a = index >= 0 ? opciones[index] : undefined;
      if (!a || actor.cooldowns[a.id]) return;
      const e = a.efecto;
      if (e && (actor.ph < e.coste_ph || (!forzar && (e.coste_fatiga || 0) > 0 && (actor.agotado || actor.fatiga + (e.coste_fatiga || 0) > (estadisticas(actor).fatiga || 0))))) return;
      event.preventDefault();
      setAccion(a.id);
    };
    window.addEventListener("keydown", atajo);
    return () => window.removeEventListener("keydown", atajo);
  }, [actor, opciones, ocupado, biblioteca, pendiente, c.fase, forzar]);
  function tarjeta(m: Combatiente) {
    const s = estadisticas(m);
    return (
      <article
        key={m.id}
        className={`battle-unit ${actor && destino === m.id ? "is-target" : ""} ${c.actual === m.id ? "is-current" : ""} ${m.vida <= 0 ? "is-down" : ""} ${c.actual === m.id && m.vida > 0 && m.vida / maxVida(m) <= 0.25 ? "is-critical" : ""}`}
        onClick={(e) => {if(c.fase==='en_curso'&&!ocupado&&actor&&!actor.accion_usada&&!(e.target as HTMLElement).closest('button,input,select,textarea,a,summary'))setObjetivo(m.id);}}
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
        <div className="battle-identity">
        <RetratoCombate nombre={m.nombre} src={retratos[claveRetrato(m)]} />
        <div><h3>
          <button
            className={`battle-target-name ${destino === m.id ? "target-selected" : ""}`}
            disabled={
              ocupado || !actor || actor.accion_usada || c.fase !== "en_curso"
            }
            title={
              efecto?.efecto === "dano"
                ? "Seleccionar objetivo: " + m.nombre
                : "Seleccionar a " + m.nombre
            }
            onClick={() => {
              setObjetivo(m.id);
            }}
          >
            {m.nombre}
          </button>
        </h3>
        <span className="battle-owner-tag">{c.actual === m.id ? "En turno" : m.bando === "jugador" ? "Aliado" : "Adversario"}</span>
        </div></div>
        {actor && destino === m.id && <span className="battle-state target"><Crosshair size={12} /> Objetivo</span>}
        <button className="battle-button battle-inventory-open" disabled={ocupado} onClick={()=>void abrirEquipoActual(m)}>Inventario y equipo</button>
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
        {!!m.motor?.modificadores.length && <div className="battle-metrics">{m.motor.modificadores.map((x,i)=><span key={i} title={x.cambios.map(v=>`${v.atributo}: ${v.operacion} ${v.valor}`).join(' · ')}>{x.nombre} · {x.duracion?`${x.duracion} turnos`:'combate'}</span>)}</div>}
        {!!m.motor?.progreso.length && <p className="text-xs text-amber-300">Progreso permanente: {m.motor.progreso.map(x=>`${x.atributo} ${x.delta>0?'+':''}${x.delta}`).join(' · ')}</p>}
        {(s.fatiga || 0) > 0 && <div className="battle-fatigue-pips" aria-hidden="true">{Array.from({ length: Math.min(12, Math.max(0, Math.floor(s.fatiga || 0))) }, (_, i) => <i className={i < m.fatiga ? "filled" : ""} key={i} />)}</div>}
        {m.arma && (
          <p className="battle-weapon">
            <Flame size={13} />
            {m.arma.nombre} · {formula(m.arma.efecto)} · {m.arma.restantes}{" "}
            turnos
          </p>
        )}
        <div className="battle-states" aria-label="Estados activos">
          {m.vida <= 0 && <span className="battle-state">Fuera de combate</span>}
          {m.agotado && <span className="battle-state">Agotado</span>}
          {m.estados.map((e) => <span className="battle-state" key={e.id} title={e.restantes > 0 ? `${e.restantes} turnos` : "Hasta resolver su condición"}>{e.nombre}{e.restantes > 0 ? ` · ${e.restantes}` : ""}</span>)}
          {!m.estados.length && !m.agotado && m.vida > 0 && <span className="battle-no-state">Sin estados</span>}
        </div>
        <details>
          <summary>Equipo, pasivas y configuración</summary>
          <label className="battle-portrait-setting">
            Imagen del personaje (opcional)
            <input type="text" placeholder="https://… o /personajes/axel.webp" defaultValue={retratos[claveRetrato(m)] || ""} key={`${claveRetrato(m)}:${retratos[claveRetrato(m)] || ""}`} onBlur={(e) => configurarRetrato(m, e.target.value)} />
            <small>Se recuerda en este navegador. Vacío: mostrar iniciales.</small>
          </label>
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
            <h1>Campo de batalla</h1>
            <span>Un personaje, una acción. El sistema lleva las cuentas.</span>
          </div>
        </div>
        <div className="battle-header-actions">
        <button className="battle-button" onClick={abrirBiblioteca} aria-expanded={biblioteca} aria-controls="battle-library"><BookOpen size={16} />Personajes</button>
        <Link className="battle-button" href="/dm/forja">
          La creación
        </Link></div>
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
          <Save size={15} />{ocupado ? "Guardando…" : "Guardar"}
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
          disabled={ocupado || !!c.progreso_confirmado || !c.historial?.length}
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
      {c.fase==='finalizado'&&c.miembros.some(m=>m.personaje_id&&m.motor?.progreso.length)&&<section className="rounded-xl border border-amber-800 p-4"><h2 className="font-semibold">Progreso permanente de jugadores</h2><p className="my-2 text-sm text-neutral-400">Hasta confirmarlo, los cambios viven en este encuentro y puedes deshacerlos. Al aplicarlos se actualizan las fichas reales una sola vez y el encuentro queda cerrado. Las plantillas de la Forja conservan sus valores originales.</p><button className="battle-button" disabled={ocupado||!!c.progreso_confirmado} onClick={()=>void confirmarProgreso()}>{c.progreso_confirmado?'Progreso aplicado':'Aplicar progreso a las fichas'}</button></section>}
      {editorEquipo&&<EditorEquipoCombate key={`${editorEquipo.actor}:${editorEquipo.contexto.version}`} catalogo={c.fase==='preparacion'&&!c.miembros.find(m=>m.id===editorEquipo.actor)?.personaje_id?objetosMochila:undefined} onAgregar={agregarObjetoMochila} contexto={editorEquipo.contexto} solicitud={{combate_id:id,actor_id:editorEquipo.actor}} onCerrar={()=>setEditorEquipo(null)} onGuardado={async()=>{await refrescarEncuentro();setEditorEquipo(null);}}/>}
      {error && (
        <p className="battle-error" role="alert">
          {error}
        </p>
      )}
      <div className="battle-layout">
        {biblioteca && <div className={`battle-library-backdrop ${arrastrando ? "is-dragging" : ""}`} onClick={() => setBiblioteca(false)} />}
        {biblioteca && <aside className="battle-library" id="battle-library" aria-label="Biblioteca de personajes" onDragStartCapture={() => setArrastrando(true)} onDragEndCapture={() => setArrastrando(false)}>
          <button className="battle-library-close battle-button" onClick={() => setBiblioteca(false)} aria-label="Cerrar biblioteca"><X size={18} /></button>
          <div className="battle-section-title">
            <Users size={15} />
            <h2>Personajes</h2>
            <span>{catalogo.length}</span>
          </div>
          <p>Arrastra a un bando o utiliza los botones J / E.</p>
          <input
            ref={buscarRef}
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
          {!cargando && !catalogo.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).length && <p>No se encontraron personajes.</p>}
        </aside>}
        <section className="battle-arena">
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
              <h2>{actor?.nombre || (c.fase === "finalizado" ? "Encuentro finalizado" : "Forma los bandos")}</h2>
            </div>
            <div className="battle-initiative" aria-label="Orden de iniciativa">
              <span>INICIATIVA · D20</span>
              <div>{[...c.miembros].sort((a, b) => b.iniciativa - a.iniciativa).map((m) => (
                <button key={m.id} className={`battle-initiative-token ${c.actual === m.id ? "active" : ""} ${m.vida <= 0 ? "is-down" : ""}`} onClick={() => mostrarIniciativa(m)} aria-current={c.actual === m.id ? "step" : undefined} title={`Ver tirada de iniciativa de ${m.nombre}`}>
                  <RetratoCombate nombre={m.nombre} src={retratos[claveRetrato(m)]} compacto />
                  <span>{m.nombre}<b><Dices size={13} />{m.iniciativa}</b></span>
                </button>
              ))}{!c.miembros.length && <p>Añade personajes para ordenar sus turnos.</p>}</div>
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
                  {c.fase === "preparacion" && <button className="battle-button battle-add" disabled={ocupado} onClick={abrirBiblioteca}><Plus size={14} /> Añadir</button>}
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
                    <button className="battle-button" disabled={ocupado || c.fase !== "preparacion"} onClick={abrirBiblioteca}>Elegir personaje</button>
                  </div>
                )}
              </section>
            ))}
          </div>
          <>{c.fase === "en_curso" && <section className="battle-action">
            <div className="battle-section-title">
              <Swords size={15} />
              <h2>{actor ? `Turno de ${actor.nombre}` : "Selecciona un participante"}</h2>
              <span className="battle-action-status">{actor ? actor.accion_usada ? "ACCIÓN UTILIZADA" : "1 ACCIÓN DISPONIBLE" : ""}</span>
            </div>
            {actor && <div className="battle-actor-resources"><Shield size={15} /> ARM {estadisticas(actor).armadura || 0}<Zap size={15} /> PH {actor.ph}/{estadisticas(actor).ph || 0}<Flame size={15} /> Fatiga {actor.fatiga}/{estadisticas(actor).fatiga || 0}</div>}
            
            {actor&&<button className="battle-button" disabled={ocupado} onClick={()=>void abrirEquipoActual()}>Inventario y equipo</button>}
            <div
              className="battle-action-tiles"
              role="group"
              aria-label="Acciones del personaje"
            >
              {opciones.filter(() => !!actor).map((a, indice) => {
                const e = a.efecto,
                  espera = a.regla ? Math.max(0,(actor?.motor?.proximos[a.regla]||0)-(actor?.turnos||0)) : actor?.cooldowns[a.id] || 0;
                const Icono = !e
                  ? Shield
                  : elementoDe(e) === "fuego"
                    ? Flame
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
                const reglaActiva = a.regla && actor ? reglasMotor(actor).find(r=>r.clave===a.regla)?.regla : undefined;
                const sinUsos = !!(reglaActiva?.usos && actor && (actor.motor?.usos[a.regla!]||0)>=reglaActiva.usos);
                const ayuda = reglaActiva ? describirRegla(reglaActiva) : e ? describirEfecto(e,a.nombre) : ayudaGuardia;
                if(e && !reglaActiva) ayuda.detalles.push("Consume tu acción.");
                if(!reglaActiva && a.enfriamiento) ayuda.detalles.push(`Debes esperar ${a.enfriamiento} turnos antes de volver a usarla.`);
                const motivo = sinUsos ? "Sin usos restantes." : espera
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
                      ? "No tienes resistencia suficiente. Activa «Forzar natural» para usarla a costa de tu vida."
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
                    aria-describedby={`ayuda-${a.id}`}
                    onClick={() => {
                      if (!ocupado && actor && !actor.accion_usada && !motivo)
                        setAccion(a.id);
                    }}
                  >
                    <Icono size={22} />
                    {indice < 4 && <kbd className="battle-shortcut">{"QWER"[indice]}</kbd>}
                    <strong>{a.nombre}</strong>
                    <small>{a.regla ? "Regla activa" : e ? formula(e) : "+2 ARM"}</small>
                    {e && !!(e.coste_ph || e.coste_fatiga) && <small className="battle-cost">{e.coste_ph ? `${e.coste_ph} PH` : "Sin PH"} · {e.coste_fatiga || 0} Fatiga{espera ? ` · Espera ${espera}` : ""}</small>}
                    {motivo && <small className="battle-disabled-reason">{motivo}</small>}
                    <span id={`ayuda-${a.id}`} className="battle-tooltip" role="tooltip">
                      <ContenidoAyuda ayuda={ayuda}/>{motivo && <span className="help-warning">{motivo}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            {!!efecto?.coste_fatiga && <label className="battle-force">
              <input
                type="checkbox"
                checked={forzar}
                onChange={(e) => setForzar(e.target.checked)}
              />{" "}
              Forzar natural con agotamiento: sufres 1d4 antes de actuar.
            </label>}
            <div className="battle-action-grid">
              <div className="battle-target-choice"><span className="battle-target-preview"><Crosshair size={16}/>{elegida === "guardia" || efecto?.efecto === "crear_arma" ? actor?.nombre : c.miembros.find(m=>m.id===destino)?.nombre || "Pulsa la tarjeta de un objetivo"}</span><small>Elige una acción y selecciona a quién va dirigida pulsando su tarjeta o su nombre.</small></div>
              <button
                className="battle-primary"
                disabled={
                  ocupado ||
                  !actor ||
                  actor.accion_usada ||
                  (!destino && elegida !== "guardia" && efecto?.efecto !== "crear_arma") ||
                  c.fase !== "en_curso"
                }
                onClick={() => void resolver()}
              >
                <Swords size={17} /> Lanzar y resolver
              </button>
              {c.fase === "en_curso" && <button className="battle-button" disabled={ocupado} onClick={() => void avanzar()}>{actor?.accion_usada ? "Siguiente turno" : "Pasar turno"}</button>}
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
          </section>}
          {c.fase === "preparacion" && <details className="battle-action battle-options"><summary>Opciones del encuentro</summary>            <label className="battle-rule">
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
          </details>}</>

        </section>
      <section className="battle-log">
        <div className="battle-section-title">
          <ScrollText size={15} />
          <h2>Registro</h2>
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
      </div>
    </main>
  );
}


