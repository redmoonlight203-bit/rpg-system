"use client";
import MetricasCombate from "../../../components/MetricasCombate";
import EstadoAccionCombate from "../../../components/EstadoAccionCombate";
import {useAccionSegura} from "../../../lib/useAccionSegura";
import {errorDeServidor} from "../../../lib/accion-segura";
import {registrarMetrica} from "../../../lib/metricas-combate";
import {cambiosCombate,recibirEvento} from "../../../lib/combate-transferencia";
import EditorMapaCombate from "../../../components/EditorMapaCombate";
import {ConfigurarCiclo,ResumenEncuentro} from "../../../components/CicloEncuentro";
import {useSincronizacionCombate} from "../../../lib/useSincronizacionCombate";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {elegirVariante,prepararVariante,type ConfiguracionMonstruo,type FuenteMonstruo} from "../../../lib/monstruos";
import InvocarCombate from "../../../components/InvocarCombate";
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
import {escalarMalla,type RangoNivel} from "../../../lib/progresion";
import {
  nuevoCombate,
  posicionesTablero, dimensionesTablero, casillasAlcanzables, movimientoRestante, desplazar, levantarse, phDisponibles, registrarCambiosVida,
  agregar, agregarParty,
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
import {TableroCombate,BarraCombate} from "../../../components/TableroCombate";
import {tipoAnimacionArma} from "../../../lib/animaciones-armas";
import RetratoCombate from "../../../components/RetratoCombate";
import { retratosCombate } from "../../../lib/retratos-combate";
import {describirEfecto,describirRegla,ayudaGuardia} from "../../../lib/descripciones";
import ContenidoAyuda from "../../../components/ContenidoAyuda";
import "./combate.css";
import "./diseno.css";
type Personaje = {
  imagen_url?:string;
  configuracion_monstruo?:ConfiguracionMonstruo|null;
  id: string;
  nombre: string;
  clase: string;
  stats: Record<string, number>;
  origen: "forja" | "jugador";
  es_grupo?:boolean;
  nivel?:number;
  nivel_maximo?:number;
  stats_rango?:Record<string,RangoNivel>;
};
type Preparado = {
  id: string;
  forja_id: string | null;
  personaje_id?: string;
  nombre: string;
  nivel?: number;
  stats: Record<string, number>;
  configuracion: Combatiente["configuracion"];
  vida_actual?: number;
  ph_actual?: number;
  fatiga_actual?: number;
  requiere_configuracion?: boolean;
};
type RespuestaAccion={id:string;version:number;datos?:Combate;pasos_deshacer?:number;repetida?:boolean;sql_ms?:number};
type Guardado = { id: string; nombre: string; version: number };
export default function CampoCombate() {
  const [centro,setCentro]=useState<import("../../../lib/combate").Posicion|null>(null);
  const [modoMovimiento,setModoMovimiento]=useState(false);
  const [invocar,setInvocar]=useState<Fuente|null>(null);
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
  const [variantesSeleccionadas,setVariantesSeleccionadas]=useState<Record<string,string>>({});
  const [cantidadesSeleccionadas,setCantidadesSeleccionadas]=useState<Record<string,number>>({});
  const [nivelesSeleccionados,setNivelesSeleccionados] = useState<Record<string,number>>({});
  const bloqueo = useRef(false),ejecucion=useRef(0);
  const [conexion,setConexion]=useState('conectando');
  async function recuperarAccionGM():Promise<RespuestaAccion>{
    const r=await supabase.rpc('combate_consultar_ligero',{p_id:id,p_version:null}).abortSignal(AbortSignal.timeout(10000));
    if(r.error)throw errorDeServidor(r.error);if(!r.data)throw Error('El encuentro ya no está disponible.');
    return {...r.data,pasos_deshacer:r.data.datos?.pasos_deshacer};
  }
  const segura=useAccionSegura<RespuestaAccion>({clave:'gm:'+id,
    enviar:async comando=>{const {action_id,...args}=comando;const r=await supabase.rpc('combate_guardar_accion',{...args,p_action_id:action_id}).abortSignal(AbortSignal.timeout(15000));if(r.error)throw errorDeServidor(r.error);if(r.data?.repetida)return recuperarAccionGM();if(typeof r.data?.sql_ms==='number')registrarMetrica('sql.commit',r.data.sql_ms);return r.data;},
    consultar:async action_id=>{const r=await supabase.rpc('combate_accion_estado',{p_id:id,p_action_id:action_id}).abortSignal(AbortSignal.timeout(10000));if(r.error)throw errorDeServidor(r.error);return r.data;},
    descartar:async action_id=>{const r=await supabase.rpc('combate_descartar_accion',{p_id:id,p_action_id:action_id}).abortSignal(AbortSignal.timeout(10000));if(r.error)throw errorDeServidor(r.error);return r.data;},
    recuperar:recuperarAccionGM,
    onRecuperado:r=>{if(revisionRemota.current.id!==id||r.version<revisionRemota.current.version||!r.datos)return;revisionRemota.current={id,version:r.version};setC(recibirEvento({...r.datos,historial:[],pasos_deshacer:r.pasos_deshacer}));setVersion(r.version);setError('');++ejecucion.current;bloqueo.current=false;setOcupado(false);}
  });
  const bloqueado=ocupado||segura.pendiente;

  const [objetosMochila,setObjetosMochila]=useState<{id:string;nombre:string}[]>([]);
  const [editorEquipo,setEditorEquipo]=useState<{actor:string;contexto:ContextoEquipo}|null>(null);
  async function refrescarEncuentro(){const r=await supabase.rpc('combate_consultar_ligero',{p_id:id,p_version:null});if(r.error)throw Error(r.error.message);if(r.data){setC(recibirEvento(r.data.datos as Combate));setVersion(r.data.version);}}
  async function abrirEquipoActual(participante:Combatiente|undefined=actor){if(!participante)return;await ejecutar(async()=>{if(c.fase==='preparacion'&&!participante.personaje_id){const r=await supabase.from('forja_maestra').select('id,nombre').eq('tipo_creacion','objeto').eq('estado','aprobado').order('nombre');if(r.error)throw Error(r.error.message);setObjetosMochila(r.data||[]);}const contexto=await consultarEquipo({combate_id:id,actor_id:participante.id,consultar:true});setEditorEquipo({actor:participante.id,contexto});});}
  async function agregarObjetoMochila(objetoId:string){
    if(!editorEquipo||c.fase!=='preparacion')throw Error('Prepara la mochila antes de iniciar el combate.');
    const participante=c.miembros.find(m=>m.id===editorEquipo.actor);if(!participante||participante.personaje_id)throw Error('Los jugadores utilizan las copias de su inventario.');
    const r=await supabase.rpc('combate_preparar_objeto',{p_id:objetoId});if(r.error)throw Error(r.error.message);
    const next=structuredClone(c),m=next.miembros.find(m=>m.id===participante.id)!;
    (m.configuracion.reserva||=[]).push(r.data as Fuente);await guardar(next);
    const contexto=await consultarEquipo({combate_id:id,actor_id:m.id,consultar:true});setEditorEquipo({actor:m.id,contexto});
  }
  const revisionRemota=useRef({id,version});
  revisionRemota.current={id,version};
  useSincronizacionCombate(async(recuperar=false)=>{
    if(bloqueo.current)return false;
    const solicitud={id,version};
    const r=await supabase.rpc('combate_consultar_ligero',{p_id:id,p_version:recuperar?null:version}).abortSignal(AbortSignal.timeout(10000));
    if(r.error)throw Error(r.error.message);
    if(bloqueo.current)return false;
    if(revisionRemota.current.id!==solicitud.id)return;
    if(r.data&&!r.data.sin_cambios&&r.data.version>revisionRemota.current.version){setC(recibirEvento(r.data.datos as Combate));setVersion(r.data.version);}
  },id,true,setConexion);
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
      next.evento_visual={...next.evento_visual,id:crypto.randomUUID(),nombre:"Inicio del turno",dados};
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
      await guardar(c,true);
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
        objetivoId || (elegida === "guardia" || ["crear_arma","transformacion"].includes(efecto?.efecto||"")||efecto?.tablero?.origen_area==='lanzador' ? actor.id : destino),
        (caras) => {
          const valor = dadoSeguro(caras);
          dados.push({ caras, valor });
          return valor;
        },
        forzar,
        (objetivoId?posicionesTablero(c)[objetivoId]:centro)||undefined,
      );
      next.evento_visual={...next.evento_visual,id:crypto.randomUUID(),nombre:actor.nombre,dados,resultado:next.resultado,
        arma_visual:efecto?.efecto==='dano'?tipoAnimacionArma({accionId:elegida,nombreAccion:lista.find(a=>a.id===elegida)?.nombre,nombreEfecto:efecto.nombre,nombreArma:actor.arma?.nombre,nombreArmaEfecto:efecto.arma_nombre,naturaleza:efecto.naturaleza,costePh:efecto.coste_ph}):undefined};
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
      setC(recibirEvento(r.data.datos as Combate));setVersion(r.data.version);
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

  async function abrir(p: Guardado) {
    await ejecutar(async()=>{
      // La lista contiene solo nombres. Al abrir siempre se obtiene la revisión actual.
      const r=await supabase.rpc('combate_consultar_ligero',{p_id:p.id,p_version:null});
      if(r.error)throw Error(r.error.message);
      if(!r.data?.datos)throw Error('El encuentro ya no está disponible.');
      setPendiente(null);setRoll(null);setFlotante(null);setResumen('');
      setId(p.id);setNombre(p.nombre);setVersion(r.data.version);setC(r.data.datos as Combate);
      setAccion('ataque');setObjetivo('');setCentro(null);setModoMovimiento(false);setEditorEquipo(null);
    });
  }
  async function cargar(inicial = false) {
    try {
      const [p, b, j] = await Promise.all([
        supabase
          .from("forja_maestra")
          .select("id,nombre,imagen_url,clase,stats,es_grupo,stats_rango,nivel_maximo,nivel,configuracion_monstruo")
          .eq("tipo_creacion", "personaje")
          .eq("estado", "aprobado")
          .order("nombre"),
        supabase
          .from("combates_yugen")
          .select("id,nombre,version")
          .order("updated_at", { ascending: false })
          .limit(20),
        supabase
          .from("personajes")
          .select("id,nombre,atributos,nivel,es_companero,party_activo")
          .eq("estado_aprobacion", "aprobado")
          .eq("estado_vida", "vivo")
          .or("es_companero.eq.false,party_activo.eq.true")
          .order("nombre"),
      ]);
      if (p.error || b.error || j.error)
        throw Error(p.error?.message || b.error?.message || j.error?.message);
      setCatalogo([
        ...(j.data || []).map((x) => ({
          id: String(x.id),
          nombre: x.nombre,
          clase: x.es_companero ? "Compañero NPC" : "Jugador",
          nivel: x.nivel || 1,
          stats: x.atributos || {},
          origen: "jugador" as const,
        })),
        ...(p.data || []).map((x) => ({ ...x, origen: "forja" as const })),
      ]);
      setPartidas(b.data || []);
      if (inicial && b.data?.length) await abrir(b.data[0] as Guardado);
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
    const turnoEjecucion=++ejecucion.current;
    bloqueo.current = true;
    setOcupado(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      if(turnoEjecucion===ejecucion.current)setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      if(turnoEjecucion===ejecucion.current){bloqueo.current = false;setOcupado(false);}
    }
  }
  async function guardar(next: Combate, deshacer=false) {
    if(!next.evento_visual||next.evento_visual.id===c.evento_visual?.id)next=registrarCambiosVida(c,next);
    next = {...next, miembros: next.miembros.map(m=>({...m, configuracion:{...m.configuracion, imagen_url:retratos[claveRetrato(m)] || m.configuracion.imagen_url || catalogo.find(p=>p.id===m.forja_id)?.imagen_url}}))};
    const r = {data:await segura.ejecutar({
      p_id: id,
      p_nombre: nombre,
      p_cambios: cambiosCombate(version===0?undefined:c,next),
      p_deshacer: deshacer,
      p_version: version,
    },deshacer?"deshacer":next.evento_visual?.movimientos?.length?"movimiento":"acción")};
    if(revisionRemota.current.id!==id||r.data.version<revisionRemota.current.version)return;
    if (!r.data?.version) throw Error("No se confirmó el guardado.");
    revisionRemota.current={id,version:r.data.version};
    setC(recibirEvento({...((r.data.datos||next) as Combate),historial:[],pasos_deshacer:r.data.pasos_deshacer}));
    setVersion(r.data.version);
    setPartidas((prev) =>
      [
        { id, nombre, version: r.data.version },
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
    nivelSolicitado?:number,
  ) {
    await ejecutar(async () => {
      if (c.fase !== "preparacion")
        throw Error("Añade personajes durante la preparación.");
      if (!catalogo.some((p) => p.id === origenId && p.origen === origen))
        throw Error("Solo se admiten personajes del catálogo.");
      if(origen==='jugador'){
        const r=await supabase.rpc('combate_preparar_party',{p_personaje:origenId});
        if(r.error)throw Error(r.error.message);
        const fuentes=r.data as Preparado[];
        if(!Array.isArray(fuentes))throw Error('No se pudo preparar la party.');
        const next=agregarParty(c,fuentes,bando);
        if(next===c){setResumen('Todos los integrantes de esta party ya están en el campo.');return;}
        await guardar(next);
        const nuevos=next.miembros.filter(m=>!c.miembros.some(x=>x.id===m.id));
        mostrarIniciativa(nuevos[0]);
        setResumen(`Entran juntos: ${nuevos.map(m=>m.nombre).join(', ')}.`);
        return;
      }
      if(c.miembros.length>=100)throw Error('Máximo cien participantes.');
      const plantilla=catalogo.find(p=>p.id===origenId&&p.origen===origen);
      if(!plantilla)throw Error("No se encontró la plantilla.");
      const nivel=Math.max(1,Math.min(plantilla.nivel_maximo||100,Math.floor(nivelSolicitado??nivelesSeleccionados[origenId]??plantilla.nivel??1)));
      if(!Number.isFinite(nivel))throw Error("Selecciona un nivel válido.");
      const r = await supabase.rpc('combate_preparar_personaje',{p_forja:origenId});
      if (r.error) throw Error(r.error.message);
      let f = r.data as Preparado;
      if(plantilla.imagen_url)f={...f,configuracion:{...f.configuracion,imagen_url:plantilla.imagen_url}};
      if(plantilla.es_grupo&&plantilla.stats_rango&&Object.keys(plantilla.stats_rango).length){
        const escaladas=escalarMalla(plantilla.stats_rango,nivel,plantilla.nivel_maximo||20);
        const bonos=f.configuracion.bonos_equipamiento||{};
        const actualizadas=Object.fromEntries(Object.entries(escaladas).map(([k,v])=>[k,v+(bonos[k]||0)]));
        f={...f,nivel,stats:{...f.stats,...actualizadas,nivel},configuracion:{...f.configuracion,stats_base:{...(f.configuracion.stats_base||{}),...escaladas,nivel}}};
      }else{
        f={...f,nivel,stats:{...f.stats,nivel},configuracion:{...f.configuracion,stats_base:{...(f.configuracion.stats_base||{}),nivel}}};
      }
      const config=plantilla.configuracion_monstruo;
      const seleccion=variantesSeleccionadas[origenId]||'aleatorio';
      const perfiles=config?.variantes?.length?(seleccion==='una_de_cada'?config.variantes.map(v=>v.id):Array.from({length:cantidadesSeleccionadas[origenId]||1},()=>seleccion)):[''];
      if(c.miembros.length+perfiles.length>100)throw Error('Máximo cien participantes.');
      const catalogoVariantes=config?.variantes?.length?await supabase.from('forja_maestra').select('*').eq('estado','aprobado'):null;
      if(catalogoVariantes?.error)throw Error(catalogoVariantes.error.message);
      let next=c;
      for(const perfil of perfiles){
       let copia={...f,id:crypto.randomUUID()};
       if(plantilla.es_grupo&&plantilla.stats_rango){const base={...escalarMalla(plantilla.stats_rango,nivel,plantilla.nivel_maximo||20),nivel};const stats:Record<string,number>={...base};for(const [k,v] of Object.entries(f.configuracion.bonos_equipamiento||{}))stats[k]=(stats[k]||0)+v;copia={...copia,stats,configuracion:{...f.configuracion,stats_base:base}};}
       if(config?.variantes?.length)copia=prepararVariante(copia,elegirVariante(config,perfil),catalogoVariantes!.data as FuenteMonstruo[]);
       next=agregar(next,copia,bando);
      }
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
          d.nivel,
        );
      else if (d.tipo === "participante")
        void ejecutar(() => guardar(mover(c, d.id, bando)));
      else throw Error();
    } catch {
      setError("Solo se admiten personajes.");
    }
  }
  const actor = c.miembros.find((m) => m.id === c.actual),
    lista = useMemo(()=>actor ? acciones(actor) : [],[actor]),
    elegida =
      lista.some((a) => a.id === accion) || accion === "guardia"
        ? accion
        : lista[0]?.id || "ataque",
    efecto = lista.find((a) => a.id === elegida)?.efecto,
    destino = c.miembros.some((m) => m.id === objetivo)
      ? objetivo
      : "";
  const fichasTablero=useMemo(()=>{
    const posiciones=posicionesTablero(c);
    return c.miembros.map(m=>({vfx:m.transformacion?.vfx,id:m.id,nombre:m.nombre,bando:m.bando,vida:m.vida,max_vida:maxVida(m),imagen_url:m.transformacion?.imagen_etapa||retratos[m.personaje_id?`jugador:${m.personaje_id}`:`forja:${m.forja_id||m.id}`]||m.configuracion.imagen_url,estados:m.estados.map(e=>e.nombre),posicion:posiciones[m.id]}));
  },[c,retratos]);
  const alcanzablesTablero=useMemo(()=>actor&&c.fase==='en_curso'?casillasAlcanzables(c,actor.id):{},[c,actor]);
  useEffect(()=>{setModoMovimiento(false);setCentro(null);},[c.actual]);
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
      if (e && (phDisponibles(actor) < e.coste_ph || (!forzar && (e.coste_fatiga || 0) > 0 && (actor.agotado || actor.fatiga + (e.coste_fatiga || 0) > (estadisticas(actor).fatiga || 0))))) return;
      event.preventDefault();
      setAccion(a.id);setCentro(null);setModoMovimiento(false);
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
              disabled={bloqueado}
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
        <button className="battle-button battle-inventory-open" disabled={bloqueado} onClick={()=>void abrirEquipoActual(m)}>Inventario y equipo</button>
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
                disabled={bloqueado}
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
                disabled={bloqueado}
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
                disabled={bloqueado}
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
      {roll && c.fase !== "en_curso" && (
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
              disabled={bloqueado}
              className="battle-primary"
              onClick={() => void confirmarAlta()}
            >
              Añadir al campo
            </button>
            <button
              disabled={bloqueado}
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
          disabled={bloqueado}
          value={nombre}
          maxLength={120}
          onChange={(e) => setNombre(e.target.value)}
        />
        <select
          disabled={bloqueado}
          aria-label="Encuentros guardados"
          value={partidas.some((p) => p.id === id) ? id : ""}
          onChange={(e) => {
            const p = partidas.find((p) => p.id === e.target.value);
            if (p) void abrir(p);
          }}
        >
          <option value="">Encuentros guardados</option>
          {partidas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <button disabled={bloqueado} className="battle-button" onClick={nuevo}>
          <Plus size={13} />
          Nuevo
        </button>
        <button
          disabled={bloqueado}
          className="battle-button"
          onClick={() => void ejecutar(() => guardar(c))}
        >
          <Save size={15} />{ocupado ? "Guardando…" : "Guardar"}
        </button>
        <button
          disabled={bloqueado}
          className="battle-button"
          onClick={() => void cargar()}
        >
          Recargar lista
        </button>
        <button
          disabled={bloqueado || version === 0}
          className="battle-button battle-delete-encounter"
          onClick={() => void borrarEncuentro()}
        >
          <Trash2 size={14} />
          Borrar encuentro
        </button>
        <button
          className="battle-button"
          disabled={bloqueado || c.fase==='finalizado' || !!c.progreso_confirmado || !(c.pasos_deshacer??c.historial?.length)}
          onClick={() => void deshacerUltimo()}
        >
          Deshacer última operación
        </button>
        {c.fase === "en_curso" && (
          <button
            className="battle-button"
            disabled={bloqueado}
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
            disabled={bloqueado || !c.miembros.length}
            onClick={() => void ejecutar(() => guardar(descansar(c)))}
          >
            Descanso fuera de combate
          </button>
        )}
      </div>
      <EditorMapaCombate combate={c} ocupado={bloqueado} onGuardar={next=>ejecutar(()=>guardar(next))}/>
      <ConfigurarCiclo combate={c} ocupado={bloqueado} onGuardar={next=>ejecutar(()=>guardar(next))}/>
      {c.fase==='finalizado'&&<ResumenEncuentro onRecargar={refrescarEncuentro} id={id} version={version} combate={c} ocupado={bloqueado}/>}
      {c.politica?.modo!=='entrenamiento'&&c.fase==='finalizado'&&c.miembros.some(m=>m.personaje_id&&m.motor?.progreso.length)&&<section className="rounded-xl border border-amber-800 p-4"><h2 className="font-semibold">Progreso permanente de jugadores</h2><p className="my-2 text-sm text-neutral-400">El crecimiento de reglas se confirma junto con las recompensas. También puedes aplicarlo aquí; después el resultado queda cerrado para revisiones. Las plantillas de la Forja conservan sus valores originales.</p><button className="battle-button" disabled={bloqueado||!!c.progreso_confirmado} onClick={()=>void confirmarProgreso()}>{c.progreso_confirmado?'Progreso aplicado':'Aplicar progreso a las fichas'}</button></section>}
      {invocar&&actor&&<InvocarCombate combate={c} actorId={actor.id} habilidad={invocar} onCerrar={()=>setInvocar(null)} onConfirmar={async next=>{await guardar(next);}}/>}
      {editorEquipo&&<EditorEquipoCombate key={`${editorEquipo.actor}:${editorEquipo.contexto.version}`} catalogo={c.fase==='preparacion'&&!c.miembros.find(m=>m.id===editorEquipo.actor)?.personaje_id?objetosMochila:undefined} onAgregar={agregarObjetoMochila} contexto={editorEquipo.contexto} solicitud={{combate_id:id,actor_id:editorEquipo.actor}} onCerrar={()=>setEditorEquipo(null)} onGuardado={async()=>{await refrescarEncuentro();setEditorEquipo(null);}}/>}
      <MetricasCombate/>
      <EstadoAccionCombate estado={segura.estado} revisando={segura.revisando} onComprobar={segura.comprobar} onReintentar={segura.reintentar} onDescartar={segura.descartar} conexion={conexion}/>
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
                        nivel: nivelesSeleccionados[p.id]??p.nivel??1,
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
                    {p.origen === "jugador" ? (p.clase === "Compañero NPC" ? "COMPAÑERO NPC" : "JUGADOR") : "LA CREACIÓN"} · Nv. {nivelesSeleccionados[p.id]??p.nivel??1} ·{" "}
                    {p.stats.vida ?? p.stats.hp ?? "Configurar"} vida ·{" "}
                    {p.stats.armadura || 0} ARM
                  </p>
                  {p.origen==="forja"&&<label className="flex items-center gap-2 text-xs text-neutral-300">Nivel al entrar al combate<input type="number" min={1} max={p.nivel_maximo||100} step={1} value={nivelesSeleccionados[p.id]??p.nivel??1} onChange={e=>setNivelesSeleccionados(prev=>({...prev,[p.id]:Math.max(1,Math.min(p.nivel_maximo||100,Number(e.target.value)||1))}))} onClick={e=>e.stopPropagation()} className="w-20 rounded border border-neutral-700 bg-well p-1 text-white" /></label>}
                  {!!p.configuracion_monstruo?.variantes?.length&&<div className="space-y-2 text-xs"><label>Variante<select aria-label={`Variante de ${p.nombre}`} className="w-full rounded border border-neutral-700 bg-well p-2" value={variantesSeleccionadas[p.id]||'aleatorio'} onChange={e=>setVariantesSeleccionadas({...variantesSeleccionadas,[p.id]:e.target.value})}><option value="aleatorio">Sortear variante por aparición</option><option value="una_de_cada">Una de cada variante</option>{p.configuracion_monstruo.variantes.map(v=><option key={v.id} value={v.id}>{v.nombre}</option>)}</select></label>{variantesSeleccionadas[p.id]!=='una_de_cada'&&<label>Cantidad<input type="number" min={1} max={20} value={cantidadesSeleccionadas[p.id]||1} onChange={e=>setCantidadesSeleccionadas({...cantidadesSeleccionadas,[p.id]:Math.max(1,Math.min(20,Math.floor(Number(e.target.value)||1)))})} className="ml-2 w-16 rounded bg-well p-1"/></label>}</div>}
                  <div className="battle-source-actions">
                    <button
                      disabled={bloqueado || c.fase !== "preparacion"}
                      onClick={() => void incorporar(p.id, "jugador", p.origen)}
                    >
                      J · Jugador
                    </button>
                    <button
                      disabled={bloqueado || c.fase !== "preparacion"}
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
          {c.miembros.length>0&&<TableroCombate mapa={c.mapa} key={id} habilidad={c.fase==='en_curso'?efecto:undefined} lanzador={actor?.id} centro={centro} puedeApuntar={!!actor&&!actor.accion_usada&&c.fase==='en_curso'} onApuntar={(p,id)=>{setCentro(p);setObjetivo(id||'');}} evento={c.evento_visual} fichas={fichasTablero} {...dimensionesTablero(c)} actual={c.actual} objetivo={destino} moviendo={modoMovimiento&&c.fase==='en_curso'} alcanzables={alcanzablesTablero} ocupado={bloqueado} onObjetivo={setObjetivo} onMover={p=>{if(actor)void ejecutar(()=>guardar(desplazar(c,actor.id,p)));}}/>}
          <details className="battle-team-details" open={c.fase==='preparacion'}><summary>Participantes, equipo y ajustes</summary>
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
                  {c.fase === "preparacion" && <button className="battle-button battle-add" disabled={bloqueado} onClick={abrirBiblioteca}><Plus size={14} /> Añadir</button>}
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
                    <button className="battle-button" disabled={bloqueado || c.fase !== "preparacion"} onClick={abrirBiblioteca}>Elegir personaje</button>
                  </div>
                )}
              </section>
            ))}
          </div>
          </details>
          <>{c.fase==='en_curso'&&actor&&<BarraCombate onLevantarse={()=>void ejecutar(()=>guardar(levantarse(c,actor.id)))} actor={{...actor,ph:phDisponibles(actor),derribado:actor.estados.some(e=>e.tipo==='derribado'),stats:estadisticas(actor),max_vida:maxVida(actor),imagen_url:actor.transformacion?.imagen_etapa||retratos[claveRetrato(actor)]||actor.configuracion.imagen_url}} acciones={lista.map(a=>({...a,enfriamiento:a.regla?Math.max(0,(actor.motor?.proximos[a.regla]||0)-actor.turnos):actor.cooldowns[a.id]||0}))} seleccion={elegida} onSeleccion={id=>{setAccion(id);setCentro(null);setModoMovimiento(false);}} onResolver={()=>void resolver()} onPasar={()=>{setModoMovimiento(false);void avanzar();}} onInventario={()=>void abrirEquipoActual()} objetivo={efecto?.tablero?(centro?`Casilla ${centro.x+1}, ${centro.y+1}`:undefined):c.miembros.find(m=>m.id===destino)?.nombre} puede={actor.vida>0} ocupado={bloqueado} moviendo={modoMovimiento} onMovimiento={()=>setModoMovimiento(v=>!v)} movimiento={movimientoRestante(actor)} forzar={forzar} onForzar={setForzar} dados={c.evento_visual?.dados||roll?.dados} resultado={c.evento_visual?.resultado||flotante?.texto} extras={actor.configuracion.habilidades?.filter(h=>h.configuracion_invocacion).map(h=><button key={h.id} disabled={bloqueado||actor.accion_usada||phDisponibles(actor)<(h.configuracion_invocacion?.costePh||0)} onClick={()=>setInvocar(h)}><Sparkles/><strong>Invocar</strong><small>{h.nombre}</small></button>)}/>}
          {c.fase === "preparacion" && <details className="battle-action battle-options"><summary>Opciones del encuentro</summary>            <label className="battle-rule">
              Regla de armadura
              <select
                disabled={bloqueado || c.fase !== "preparacion"}
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


