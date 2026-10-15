"use client";

import React, { useEffect, useState } from "react";

import { supabase } from "../../../lib/supabase";
import { 
  Skull, User, ShieldAlert, Edit3, Activity, X, Heart, Lock,
  Shield, Sparkles, Crown, PackageCheck, Eye, Search, Flame, Key
} from "lucide-react";

interface Perfil {
  id: string;
  email: string;
  rol: string;
  estado: string;
  created_at: string;
}

interface Personaje {
  id: string;
  user_id: string;
  nombre: string;
  raza: string;
  historia: string;
  defecto: string;
  lugar_reencarnacion: string;
  atributos: {
    fisico: number;
    magico: number;
    resistencia: number;
    inteligencia: number;
    agilidad: number;
  };
  estado_aprobacion: string;
  estado_vida: "vivo" | "muerto" | "sellado";
  comentarios_kuroi?: string;
  created_at: string;
}

interface ItemInventario {
  id: string;
  user_id: string;
  forja_id?: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  imagen_url?: string;
  clase: string;
  stats: Record<string, number>;
  ligado_al_alma: boolean;
  personaje_id: string | number | null;
  slot_equipado: string | null;
  created_at: string;
}

export default function GestionPersonajesKuroi() {


  // PESTAÑAS DE NAVEGACIÓN
  const [pestana, setPestana] = useState<"avatares" | "cuentas" | "juicios">("avatares");

  // DATOS
  const [todasLasCuentas, setTodasLasCuentas] = useState<Perfil[]>([]);
  const [cuentasPendientes, setCuentasPendientes] = useState<Perfil[]>([]);
  const [personajesPendientes, setPersonajesPendientes] = useState<Personaje[]>([]);
  const [todosLosPersonajes, setTodosLosPersonajes] = useState<Personaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // MODALES Y SOBRECAPAS
  const [personajeEditando, setPersonajeEditando] = useState<Personaje | null>(null);
  const [comentarioKuroi, setComentarioKuroi] = useState("");
  const [personajeEnInspeccion, setPersonajeEnInspeccion] = useState<Personaje | null>(null);
  const [verBovedaUserId, setVerBovedaUserId] = useState<string | null>(null);
  const [itemsSujeto, setItemsSujeto] = useState<ItemInventario[]>([]);

  const cargarDatos = async () => {
    setCargando(true);

    // 1. Cargar Cuentas / Perfiles (Filtrando la cuenta de Kuroi / Admin)
    const { data: perfiles } = await supabase
      .from("perfiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (perfiles) {
      // Excluir la cuenta de Kuroi / DM de los listados de jugadores
      const cuentasJugadores = perfiles.filter(
        (p: Perfil) =>
          !["admin", "dm", "kuroi"].includes(
            (p.rol ?? "").toLowerCase()
          )
      );
      
      setTodasLasCuentas(cuentasJugadores as Perfil[]);
      setCuentasPendientes(cuentasJugadores.filter((p: Perfil) => p.estado === "pendiente"));
    }

    // 2. Personajes Pendientes de Aprobación
    const { data: charsPendientes } = await supabase
      .from("personajes")
      .select("*")
      .in("estado_aprobacion", ["pendiente", "editado"])
      .order("created_at", { ascending: false });
    if (charsPendientes) setPersonajesPendientes(charsPendientes as Personaje[]);

    // 3. Registro Histórico de Todos los Personajes Aprobados
    const { data: todos } = await supabase
      .from("personajes")
      .select("*")
      .eq("estado_aprobacion", "aprobado")
      .order("created_at", { ascending: false });
    if (todos) setTodosLosPersonajes(todos as Personaje[]);

    setCargando(false);
  };

  useEffect(() => {
    let activo = true;

    Promise.resolve().then(() => {
      if (activo) {
        void cargarDatos();
      }
    });

    return () => {
      activo = false;
    };
  }, []);

  // OBTENER EMAIL DE CUENTA ASOCIADA AL USER_ID
  const getEmailCuenta = (userId: string) => {
    const cuenta = todasLasCuentas.find(c => c.id === userId);
    return cuenta ? cuenta.email : "Reencarnado";
  };

  // CARGAR INVENTARIO COMPLETO PARA INSPECCIONAR EQUIPAMIENTO O BÓVEDA
  const abrirInspeccionPersonaje = async (pj: Personaje) => {
    setPersonajeEnInspeccion(pj);
    const { data } = await supabase
      .from("inventario_jugador")
      .select("*")
      .eq("user_id", pj.user_id);
    if (data) setItemsSujeto(data as ItemInventario[]);
  };

  const abrirBovedaAlma = async (userId: string) => {
    setVerBovedaUserId(userId);
    const { data } = await supabase
      .from("inventario_jugador")
      .select("*")
      .eq("user_id", userId);
    if (data) setItemsSujeto(data as ItemInventario[]);
  };

  // FUNCIONES DE EDICIÓN DIVINA
  const cambiarAtributoKuroi = (attr: string, delta: number) => {
    if (!personajeEditando) return;
    const actual = personajeEditando.atributos[attr as keyof typeof personajeEditando.atributos] || 0;
    setPersonajeEditando({
      ...personajeEditando,
      atributos: { ...personajeEditando.atributos, [attr]: Math.max(0, actual + delta) }
    });
  };

  const resolverPersonaje = async (nuevoEstado: "aprobado" | "editado" | "rechazado") => {
    if (!personajeEditando) return;
    const { error } = await supabase
      .from("personajes")
      .update({
        nombre: personajeEditando.nombre,
        raza: personajeEditando.raza,
        historia: personajeEditando.historia,
        defecto: personajeEditando.defecto,
        lugar_reencarnacion: personajeEditando.lugar_reencarnacion,
        atributos: personajeEditando.atributos,
        estado_aprobacion: nuevoEstado,
        estado_vida: personajeEditando.estado_vida || "vivo",
        comentarios_kuroi: comentarioKuroi
      })
      .eq("id", personajeEditando.id);

    if (!error) {
      alert(`Avatar "${personajeEditando.nombre}" marcado como [${nuevoEstado.toUpperCase()}].`);
      setPersonajeEditando(null);
      setComentarioKuroi("");
      cargarDatos();
    }
  };

  const cambiarEstadoCuenta = async (perfilId: string, nuevoEstado: string) => {
    await supabase.from("perfiles").update({ estado: nuevoEstado }).eq("id", perfilId);
    cargarDatos();
  };

  const rotarEstadoVida = async (charId: string, estadoActual: string) => {
    let siguienteEstado: "vivo" | "muerto" | "sellado" = "vivo";
    if (estadoActual === "vivo") siguienteEstado = "muerto";
    else if (estadoActual === "muerto") siguienteEstado = "sellado";
    else siguienteEstado = "vivo";

    const { error } = await supabase
      .from("personajes")
      .update({ estado_vida: siguienteEstado })
      .eq("id", charId);

    if (!error) {
      cargarDatos();
    }
  };

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono animate-pulse">Abriendo el Registro de Almas...</div>;

  // FILTROS DE BÚSQUEDA
  const personajesFiltrados = todosLosPersonajes.filter(p => {
    const emailPj = getEmailCuenta(p.user_id).toLowerCase();
    return (
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.raza.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.lugar_reencarnacion.toLowerCase().includes(busqueda.toLowerCase()) ||
      emailPj.includes(busqueda.toLowerCase())
    );
  });

  const cuentasFiltradas = todasLasCuentas.filter(c =>
    c.email.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.rol.toLowerCase().includes(busqueda.toLowerCase())
  );

  // FILTROS DE EQUIPAMIENTO DEL PERSONAJE SELECCIONADO
  const itemsPj = itemsSujeto.filter(i => i.personaje_id && String(i.personaje_id) === String(personajeEnInspeccion?.id));
  const itemsAlma = itemsSujeto.filter(i => i.personaje_id === null);

  const getItemEnSlot = (slot: string) => itemsPj.find(i => i.slot_equipado === slot);
  
  const casco = getItemEnSlot("casco");
  const pechera = getItemEnSlot("pechera");
  const pantalones = getItemEnSlot("pantalones");
  const zapatos = getItemEnSlot("zapatos");
  const manoDer = getItemEnSlot("mano_der");
  const manoIzq = getItemEnSlot("mano_izq");

  const accesorios = [
    getItemEnSlot("acc_1"), getItemEnSlot("acc_2"), getItemEnSlot("acc_3"),
    getItemEnSlot("acc_4"), getItemEnSlot("acc_5"), getItemEnSlot("acc_6"),
  ];

  const tituloEquipado = getItemEnSlot("titulo") || itemsPj.find(i => i.tipo === "titulo" && i.slot_equipado === "titulo");
  const habilidades = itemsPj.filter(i => i.tipo === "habilidad");
  const mochilaGeneral = itemsPj.filter(i => !i.slot_equipado && i.tipo !== "habilidad" && i.tipo !== "titulo");

  const calcularStatTotal = (claveAttr: string, valorBase: number = 0) => {
    let bono = 0;
    itemsPj.filter(i => i.slot_equipado).forEach(item => {
      if (item.stats && item.stats[claveAttr]) {
        bono += item.stats[claveAttr];
      }
    });
    return { total: valorBase + bono, bono };
  };

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative overflow-x-hidden">
      
      {/* Resplandor Divino de Fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-red-950/20 blur-[180px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10 pb-20">
        
        {/* CABECERA DIVINA */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-red-900/50 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.2)] text-red-500">
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono">
                Gestión de Almas y Reencarnados
              </h1>
              <p className="text-red-700/80 text-xs font-mono tracking-widest uppercase mt-0.5">
                [ REGISTRO DIVINO DE CUENTAS, AVATARES Y TÁCTICA ]
              </p>
            </div>
          </div>

          {/* BUSCADOR INTEGRADO (Sin botones de menú redundantes) */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar avatar, raza o cuenta..."
              className="w-full bg-neutral-950 border border-neutral-800 pl-9 pr-3 py-2 text-xs font-mono text-neutral-200 rounded-lg outline-none focus:border-red-800 transition-colors"
            />
          </div>
        </header>

        {/* BARRA DE NAVEGACIÓN POR PESTAÑAS */}
        <nav className="flex flex-wrap gap-2 border-b border-neutral-900 pb-4">
          {[
            { id: "avatares", label: `Avatares en El Mundo (${todosLosPersonajes.length})`, icon: User },
            { id: "cuentas", label: `Cuentas de Reencarnados (${todasLasCuentas.length})`, icon: Key },
            { id: "juicios", label: `Juicios Pendientes (${cuentasPendientes.length + personajesPendientes.length})`, icon: ShieldAlert, badge: cuentasPendientes.length + personajesPendientes.length },
          ].map((tab) => {
            const Icono = tab.icon;
            const activa = pestana === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() =>
                  setPestana(tab.id as "avatares" | "cuentas" | "juicios")
                }
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all relative ${
                  activa
                    ? "bg-red-950/80 border border-red-800 text-red-200 font-bold shadow-[0_0_15px_rgba(220,38,38,0.25)]"
                    : "bg-neutral-950 border border-neutral-900 text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Icono className="w-4 h-4" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-black text-[9px] font-bold rounded-full animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* PESTAÑA 1: REGISTRO DE AVATARES DEL MUNDO */}
        {pestana === "avatares" && (
          <section className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-950 border border-neutral-900 p-4 rounded-xl text-xs font-mono">
              <span className="text-neutral-400">
                Haz clic en la insignia vital para alternar: <strong className="text-red-400">VIVO</strong> $\rightarrow$ <strong className="text-neutral-500">DIFUNTO</strong> $\rightarrow$ <strong className="text-cyan-400">SELLADO</strong>.
              </span>
              <div className="flex gap-3 text-[11px]">
                <span className="text-red-400">Vivos: {todosLosPersonajes.filter(p => (p.estado_vida || "vivo") === "vivo").length}</span>
                <span className="text-neutral-500">Muertos: {todosLosPersonajes.filter(p => p.estado_vida === "muerto").length}</span>
                <span className="text-cyan-400">Sellados: {todosLosPersonajes.filter(p => p.estado_vida === "sellado").length}</span>
              </div>
            </div>

            {personajesFiltrados.length === 0 ? (
              <div className="bg-neutral-950 border border-neutral-900 p-12 text-center rounded-xl text-neutral-500 font-mono text-sm">
                No hay avatares registrados que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {personajesFiltrados.map((char) => {
                  const estado = char.estado_vida || "vivo";
                  const emailAsociado = getEmailCuenta(char.user_id);

                  return (
                    <div
                      key={char.id}
                      className={`p-5 rounded-xl border transition-all space-y-4 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-black/80 ${
                        estado === "muerto"
                          ? "bg-neutral-950/40 border-neutral-900 text-neutral-500"
                          : estado === "sellado"
                          ? "bg-cyan-950/20 border-cyan-800/80 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                          : "bg-black border-neutral-800 text-neutral-200 hover:border-red-900/60"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3 className={`text-lg font-bold font-mono ${estado === "muerto" ? "line-through text-neutral-600" : "text-neutral-100"}`}>
                              {char.nombre}
                            </h3>
                            <p className={`text-xs font-mono mt-0.5 ${
                              estado === "muerto" ? "text-neutral-600" : estado === "sellado" ? "text-cyan-400" : "text-red-500"
                            }`}>
                              {char.raza} • {char.lugar_reencarnacion}
                            </p>

                            {/* MUESTRA LA CUENTA ASOCIADA AL AVATAR */}
                            <div className="mt-2 flex items-center gap-1.5 bg-neutral-950 px-2 py-1 rounded border border-neutral-900 text-[10px] font-mono text-purple-400">
                              <Key className="w-3 h-3 text-purple-500 shrink-0" />
                              <span className="truncate">Cuenta: {emailAsociado}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => rotarEstadoVida(char.id, estado)}
                            className={`text-[10px] font-mono px-2.5 py-1 rounded-md border font-bold uppercase flex items-center gap-1 transition-all shadow-md shrink-0 ${
                              estado === "vivo"
                                ? "bg-red-950/80 border-red-800 text-red-300"
                                : estado === "muerto"
                                ? "bg-neutral-900 border-neutral-800 text-neutral-500"
                                : "bg-cyan-950/80 border-cyan-700 text-cyan-300 animate-pulse"
                            }`}
                            title="Haz clic para cambiar estado de vida"
                          >
                            {estado === "vivo" && <><Heart className="w-3 h-3 fill-red-500 text-red-500" /> VIVO</>}
                            {estado === "muerto" && <><Skull className="w-3 h-3" /> DIFUNTO</>}
                            {estado === "sellado" && <><Lock className="w-3 h-3 text-cyan-400" /> SELLADO</>}
                          </button>
                        </div>

                        {/* Atributos Base */}
                        <div className={`grid grid-cols-5 gap-1 text-[10px] font-mono text-center p-2 rounded-lg border ${
                          estado === "muerto" ? "bg-neutral-900/30 border-neutral-900" : estado === "sellado" ? "bg-cyan-950/40 border-cyan-900" : "bg-neutral-900/60 border-neutral-800"
                        }`}>
                          {Object.entries(char.atributos || {}).map(([k, v]) => (
                            <div key={k}>
                              <span className="uppercase block text-[8px] text-neutral-500">{k.slice(0, 3)}</span>
                              <span className="font-bold">{v}</span>
                            </div>
                          ))}
                        </div>

                        <p className="text-xs font-serif italic text-neutral-400 line-clamp-2">
                          <strong className="text-neutral-500 font-mono text-[10px] uppercase">Defecto:</strong> {char.defecto || "Ninguno"}
                        </p>
                      </div>

                      {/* BOTONES DE INSPECCIÓN Y EDICIÓN */}
                      <div className="pt-3 border-t border-neutral-900 space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => abrirInspeccionPersonaje(char)}
                            className="flex-1 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800 text-purple-200 text-[10px] font-mono py-2 rounded-lg font-bold uppercase flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Equipamiento y Stats
                          </button>
                          <button
                            onClick={() => abrirBovedaAlma(char.user_id)}
                            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-purple-300 px-3 py-2 rounded-lg text-[10px] font-mono transition-colors"
                            title="Ver Bóveda del Alma del Jugador"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => { setPersonajeEditando(char); setComentarioKuroi(char.comentarios_kuroi || ""); }}
                          className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-mono py-2 rounded-lg font-bold uppercase flex items-center justify-center gap-2 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-500" /> Modificar Avatar (Dios)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* PESTAÑA 2: REGISTRO GENERAL DE CUENTAS DE REENCARNADOS (Sin Kuroi) */}
        {pestana === "cuentas" && (
          <section className="space-y-6">
            <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-xl flex items-center gap-3">
              <Key className="w-5 h-5 text-red-500" />
              <div>
                <h2 className="text-sm font-bold text-neutral-200 font-mono uppercase tracking-widest">
                  Directorio Global de Usuarios
                </h2>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">
                  Cuentas de usuario registradas en Yugen con sus avatares vinculados.
                </p>
              </div>
            </div>

            {cuentasFiltradas.length === 0 ? (
              <div className="bg-neutral-950 border border-neutral-900 p-12 text-center rounded-xl text-neutral-500 font-mono text-sm">
                No hay cuentas de jugadores registradas.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cuentasFiltradas.map((cuenta) => {
                  const personajesDeCuenta = todosLosPersonajes.filter(p => p.user_id === cuenta.id);
                  return (
                    <div key={cuenta.id} className="bg-black border border-neutral-800 p-5 rounded-xl space-y-4 flex flex-col justify-between hover:border-red-900/50 transition-colors shadow-lg">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start border-b border-neutral-900 pb-3">
                          <div>
                            <span className="text-[10px] font-mono text-red-500 uppercase font-bold block">CUENTA / REENCARNADO</span>
                            <h3 className="text-base font-bold text-neutral-100 font-mono">{cuenta.email}</h3>
                          </div>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                            cuenta.estado === "aprobado" ? "bg-emerald-950 border-emerald-800 text-emerald-300" :
                            cuenta.estado === "pendiente" ? "bg-amber-950 border-amber-800 text-amber-300 animate-pulse" :
                            "bg-red-950 border-red-800 text-red-400"
                          }`}>
                            {cuenta.estado}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] font-mono text-neutral-500 uppercase block">Avatares del Usuario ({personajesDeCuenta.length}):</span>
                          {personajesDeCuenta.length === 0 ? (
                            <p className="text-[10px] font-mono text-neutral-600 italic">Sin avatares aprobados aún.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {personajesDeCuenta.map(pj => (
                                <div key={pj.id} className="bg-neutral-950 p-2 rounded border border-neutral-900 flex justify-between items-center">
                                  <div>
                                    <span className="text-xs font-mono font-bold text-neutral-200 block">{pj.nombre}</span>
                                    <span className="text-[9px] font-mono text-neutral-500">{pj.raza}</span>
                                  </div>
                                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                                    pj.estado_vida === "vivo" ? "text-red-400 bg-red-950/40" : "text-neutral-500 bg-neutral-900"
                                  }`}>
                                    {pj.estado_vida || "vivo"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-neutral-900 flex gap-2">
                        <button
                          onClick={() => abrirBovedaAlma(cuenta.id)}
                          className="flex-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-200 text-[10px] font-mono py-2 rounded-lg font-bold uppercase flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Lock className="w-3.5 h-3.5" /> Ver Bóveda del Alma
                        </button>

                        {cuenta.estado === "aprobado" ? (
                          <button
                            onClick={() => cambiarEstadoCuenta(cuenta.id, "rechazado")}
                            className="px-3 bg-neutral-900 hover:bg-red-950 border border-neutral-800 hover:border-red-800 text-neutral-500 hover:text-red-400 text-[10px] font-mono rounded-lg transition-colors"
                            title="Bloquear Acceso a esta Cuenta"
                          >
                            Bloquear
                          </button>
                        ) : (
                          <button
                            onClick={() => cambiarEstadoCuenta(cuenta.id, "aprobado")}
                            className="px-3 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 text-[10px] font-mono rounded-lg font-bold uppercase transition-colors"
                          >
                            Aprobar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* PESTAÑA 3: JUICIOS PENDIENTES */}
        {pestana === "juicios" && (
          <section className="space-y-8">
            {/* CUENTAS EN EL LIMBO */}
            <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-amber-500 font-mono uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> 1. Invocaciones en el Limbo (Cuentas por Aprobar)
              </h2>
              {cuentasPendientes.length === 0 ? (
                <p className="text-neutral-600 font-mono text-xs italic">No hay cuentas de usuario esperando ingreso.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cuentasPendientes.map((cuenta) => (
                    <div key={cuenta.id} className="bg-black border border-neutral-800 p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-neutral-200 font-mono">{cuenta.email}</p>
                        <p className="text-[10px] font-mono text-neutral-500">{new Date(cuenta.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => cambiarEstadoCuenta(cuenta.id, "aprobado")} className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 rounded text-xs font-mono uppercase font-bold transition-colors">Aprobar</button>
                        <button onClick={() => cambiarEstadoCuenta(cuenta.id, "rechazado")} className="px-3 py-1.5 bg-neutral-900 hover:bg-red-950 border border-neutral-800 text-neutral-400 rounded text-xs font-mono uppercase transition-colors">Rechazar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SOLICITUDES DE AVATAR */}
            <div className="bg-neutral-950 border border-red-900/40 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-red-500 font-mono uppercase tracking-widest flex items-center gap-2">
                <Skull className="w-5 h-5" /> 2. Solicitudes de Reencarnación (Avatares por Juicio)
              </h2>
              {personajesPendientes.length === 0 ? (
                <p className="text-neutral-600 font-mono text-xs italic">No hay avatares pendientes de revisión.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {personajesPendientes.map((char) => (
                    <div key={char.id} className="bg-black border border-neutral-800 p-5 rounded-xl space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-bold text-neutral-100 font-mono">{char.nombre}</h3>
                            <p className="text-xs text-red-500 font-mono">{char.raza} • {char.lugar_reencarnacion}</p>
                            <p className="text-[10px] font-mono text-neutral-500 mt-1">Cuenta: {getEmailCuenta(char.user_id)}</p>
                          </div>
                          <span className="text-[10px] font-mono text-amber-500 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded uppercase">{char.estado_aprobacion}</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center bg-neutral-900/60 p-2 rounded border border-neutral-800">
                          {Object.entries(char.atributos || {}).map(([k, v]) => (
                            <div key={k}><span className="text-neutral-500 uppercase block">{k.slice(0, 3)}</span><span className="font-bold text-neutral-200">{v}</span></div>
                          ))}
                        </div>
                        <p className="text-xs text-neutral-300 italic"><strong className="text-neutral-500">Defecto:</strong> {char.defecto || "Ninguno"}</p>
                      </div>
                      <button onClick={() => { setPersonajeEditando(char); setComentarioKuroi(char.comentarios_kuroi || ""); }} className="w-full bg-red-950 border border-red-800 text-neutral-100 text-xs font-mono py-2.5 rounded font-bold uppercase flex items-center justify-center gap-2">
                        <Edit3 className="w-3.5 h-3.5 text-amber-500" /> Juzgar / Editar Avatar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* MODAL 1: INSPECCIÓN TÁCTICA COMPLETA DEL PERSONAJE */}
        {personajeEnInspeccion && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-neutral-950 border border-purple-900/80 p-6 md:p-8 rounded-2xl max-w-4xl w-full relative space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
              <button onClick={() => setPersonajeEnInspeccion(null)} className="absolute top-4 right-4 text-neutral-500 hover:text-purple-400">
                <X className="w-6 h-6" />
              </button>

              <div className="border-b border-neutral-900 pb-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800 font-bold uppercase">
                      AVATAR MANIFESTADO
                    </span>
                    {tituloEquipado && (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800 font-bold flex items-center gap-1">
                        <Crown className="w-3 h-3" /> {tituloEquipado.nombre}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black font-mono text-neutral-100 mt-1">{personajeEnInspeccion.nombre}</h2>
                  <p className="text-xs font-mono text-neutral-500 mt-0.5">Perteneciente a: {getEmailCuenta(personajeEnInspeccion.user_id)}</p>
                </div>
              </div>

              {/* GRID PRINCIPAL DE INSPECCIÓN */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* SILUETA DE EQUIPAMIENTO */}
                <div className="md:col-span-2 bg-black border border-purple-900/40 p-5 rounded-xl space-y-5">
                  <h3 className="text-xs font-bold font-mono text-purple-400 uppercase tracking-widest border-b border-neutral-900 pb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Matriz de Equipamiento Táctico
                  </h3>

                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                    {/* CASCO */}
                    <div className="col-start-2">
                      <div className={`p-2.5 rounded-lg border flex flex-col items-center text-center ${casco ? "bg-purple-950/40 border-purple-700 text-purple-200" : "bg-neutral-950 border-neutral-900 text-neutral-600"}`}>
                        <span className="text-[8px] font-mono uppercase block mb-1">CASCO</span>
                        <strong className="text-[11px] font-mono line-clamp-1">{casco ? casco.nombre : "Vacío"}</strong>
                      </div>
                    </div>

                    {/* MANO IZQ | PECHERA | MANO DER */}
                    <div className="col-start-1">
                      <div className={`p-2.5 rounded-lg border flex flex-col items-center text-center ${manoIzq ? "bg-purple-950/40 border-purple-700 text-purple-200" : "bg-neutral-950 border-neutral-900 text-neutral-600"}`}>
                        <span className="text-[8px] font-mono uppercase block mb-1">MANO IZQUIERDA</span>
                        <strong className="text-[11px] font-mono line-clamp-1">{manoIzq ? manoIzq.nombre : "Vacío"}</strong>
                      </div>
                    </div>

                    <div className="col-start-2">
                      <div className={`p-2.5 rounded-lg border flex flex-col items-center text-center ${pechera ? "bg-purple-950/40 border-purple-700 text-purple-200" : "bg-neutral-950 border-neutral-900 text-neutral-600"}`}>
                        <span className="text-[8px] font-mono uppercase block mb-1">PECHERA</span>
                        <strong className="text-[11px] font-mono line-clamp-1">{pechera ? pechera.nombre : "Vacío"}</strong>
                      </div>
                    </div>

                    <div className="col-start-3">
                      <div className={`p-2.5 rounded-lg border flex flex-col items-center text-center ${manoDer ? "bg-purple-950/40 border-purple-700 text-purple-200" : "bg-neutral-950 border-neutral-900 text-neutral-600"}`}>
                        <span className="text-[8px] font-mono uppercase block mb-1">MANO DERECHA</span>
                        <strong className="text-[11px] font-mono line-clamp-1">{manoDer ? manoDer.nombre : "Vacío"}</strong>
                      </div>
                    </div>

                    {/* PANTALONES */}
                    <div className="col-start-2">
                      <div className={`p-2.5 rounded-lg border flex flex-col items-center text-center ${pantalones ? "bg-purple-950/40 border-purple-700 text-purple-200" : "bg-neutral-950 border-neutral-900 text-neutral-600"}`}>
                        <span className="text-[8px] font-mono uppercase block mb-1">PANTALONES</span>
                        <strong className="text-[11px] font-mono line-clamp-1">{pantalones ? pantalones.nombre : "Vacío"}</strong>
                      </div>
                    </div>

                    {/* ZAPATOS */}
                    <div className="col-start-2">
                      <div className={`p-2.5 rounded-lg border flex flex-col items-center text-center ${zapatos ? "bg-purple-950/40 border-purple-700 text-purple-200" : "bg-neutral-950 border-neutral-900 text-neutral-600"}`}>
                        <span className="text-[8px] font-mono uppercase block mb-1">ZAPATOS</span>
                        <strong className="text-[11px] font-mono line-clamp-1">{zapatos ? zapatos.nombre : "Vacío"}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 6 ACCESORIOS */}
                  <div className="pt-3 border-t border-neutral-900 space-y-2">
                    <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold block">Bandeja de 6 Accesorios:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {accesorios.map((acc, index) => (
                        <div key={index} className={`p-2 rounded border ${acc ? "bg-purple-950/30 border-purple-800 text-purple-200" : "bg-neutral-950 border-neutral-900 text-neutral-600"}`}>
                          <span className="text-[7px] font-mono uppercase block">ACCESORIO {index + 1}</span>
                          <strong className="text-[10px] font-mono line-clamp-1">{acc ? acc.nombre : "Vacío"}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* STATS CALCULADOS & HABILIDADES */}
                <div className="space-y-4">
                  <div className="bg-black border border-neutral-800 p-4 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold font-mono text-purple-400 uppercase tracking-wider border-b border-neutral-900 pb-1.5 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Estadísticas Totales
                    </h4>
                    {Object.entries(personajeEnInspeccion.atributos || {}).map(([key, val]) => {
                      const calc = calcularStatTotal(key, val);
                      return (
                        <div key={key} className="bg-neutral-950 p-2 rounded border border-neutral-900 flex justify-between items-center text-xs font-mono">
                          <span className="text-neutral-400 uppercase">{key}:</span>
                          <div className="flex items-center gap-1">
                            <strong className="text-neutral-100">{calc.total}</strong>
                            {calc.bono > 0 && <span className="text-[9px] text-emerald-400">(+{calc.bono})</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-black border border-neutral-800 p-4 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider border-b border-neutral-900 pb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Habilidades ({habilidades.length})
                    </h4>
                    {habilidades.length === 0 ? (
                      <p className="text-[9px] font-mono text-neutral-600 italic">Sin habilidades asignadas.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {habilidades.map(h => (
                          <div key={h.id} className="bg-neutral-950 p-2 rounded border border-neutral-900">
                            <span className="text-xs font-mono font-bold text-cyan-300 block">{h.nombre}</span>
                            <p className="text-[9px] text-neutral-400 font-serif italic line-clamp-1">{h.descripcion}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-black border border-neutral-800 p-4 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold font-mono text-neutral-400 uppercase tracking-wider border-b border-neutral-900 pb-1.5 flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 text-purple-400" /> Mochila del Avatar ({mochilaGeneral.length})
                    </h4>
                    {mochilaGeneral.length === 0 ? (
                      <p className="text-[9px] font-mono text-neutral-600 italic">Bolsa vacía.</p>
                    ) : (
                      <div className="space-y-1">
                        {mochilaGeneral.map(item => (
                          <div key={item.id} className="bg-neutral-950 p-1.5 rounded text-[10px] font-mono text-neutral-300 flex justify-between">
                            <span>{item.nombre}</span>
                            <span className="text-orange-400">RANGO {item.clase}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: BÓVEDA DEL ALMA DEL REENCARNADO */}
        {verBovedaUserId && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-purple-900/80 p-6 rounded-xl max-w-2xl w-full relative space-y-5 max-h-[85vh] overflow-y-auto">
              <button onClick={() => setVerBovedaUserId(null)} className="absolute top-4 right-4 text-neutral-500 hover:text-purple-400">
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-neutral-900 pb-3">
                <span className="text-[10px] font-mono uppercase text-purple-500 font-bold">Resguardo del Alma</span>
                <h3 className="text-lg font-bold text-neutral-100 font-mono">Bóveda Espiritual de {getEmailCuenta(verBovedaUserId)}</h3>
              </div>

              {itemsAlma.length === 0 ? (
                <div className="bg-black border border-neutral-900 p-8 text-center rounded text-neutral-500 font-mono text-xs">
                  Esta cuenta no posee objetos resguardados en su Alma actualmente.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {itemsAlma.map(item => (
                    <div key={item.id} className="bg-black border border-purple-900/40 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-purple-900 bg-purple-950 text-purple-300 uppercase">
                          {item.tipo} • RANGO {item.clase}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold font-mono text-neutral-200">{item.nombre}</h4>
                      <p className="text-[10px] font-serif text-neutral-400 italic leading-relaxed">
                        &ldquo;{item.descripcion}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 3: EDITOR DIVINO DE PERSONAJE */}
        {personajeEditando && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-red-900/80 p-6 md:p-8 rounded-xl max-w-2xl w-full relative space-y-6 max-h-[90vh] overflow-y-auto">
              <button onClick={() => setPersonajeEditando(null)} className="absolute top-4 right-4 text-neutral-500 hover:text-red-400"><X className="w-6 h-6" /></button>
              <div className="border-b border-neutral-900 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-mono text-red-500 uppercase font-bold">[ EDITAR AVATAR - KUROI ]</span>
                  <h2 className="text-xl font-bold text-neutral-100 font-mono">{personajeEditando.nombre}</h2>
                </div>

                <select
                  value={personajeEditando.estado_vida || "vivo"}
                  onChange={(e) => {
                    const estado = e.target.value;

                    if (
                      estado !== "vivo" &&
                      estado !== "muerto" &&
                      estado !== "sellado"
                    ) {
                      return;
                    }

                    setPersonajeEditando({
                      ...personajeEditando,
                      estado_vida: estado,
                    });
                  }}
                  className="bg-black border border-neutral-800 text-xs font-mono text-neutral-200 px-3 py-1.5 rounded outline-none"
                >
                  <option value="vivo">Estado: VIVO</option>
                  <option value="muerto">Estado: DIFUNTO / MUERTO</option>
                  <option value="sellado">Estado: SELLADO</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input value={personajeEditando.nombre} onChange={(e) => setPersonajeEditando({ ...personajeEditando, nombre: e.target.value })} className="bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono" />
                  <input value={personajeEditando.raza} onChange={(e) => setPersonajeEditando({ ...personajeEditando, raza: e.target.value })} className="bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono" />
                </div>
                <div className="bg-black/60 border border-neutral-900 p-3 rounded-lg space-y-2">
                  <span className="text-xs font-mono text-amber-500 uppercase font-bold">Atributos del Avatar (Sin límite)</span>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(personajeEditando.atributos || {}).map(([key, val]) => (
                      <div key={key} className="bg-neutral-900 p-2 rounded text-center">
                        <span className="text-[10px] font-mono text-neutral-500 uppercase block">{key}</span>
                        <div className="flex items-center justify-center gap-1.5 mt-1">
                          <button onClick={() => cambiarAtributoKuroi(key, -1)} className="w-4 h-4 bg-black text-red-500 font-bold text-xs">-</button>
                          <span className="text-xs font-mono font-bold text-neutral-100">{val}</span>
                          <button onClick={() => cambiarAtributoKuroi(key, 1)} className="w-4 h-4 bg-black text-emerald-500 font-bold text-xs">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <input value={personajeEditando.defecto} onChange={(e) => setPersonajeEditando({ ...personajeEditando, defecto: e.target.value })} placeholder="Defecto / Maldición" className="w-full bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono" />
                <textarea value={personajeEditando.historia} onChange={(e) => setPersonajeEditando({ ...personajeEditando, historia: e.target.value })} rows={3} placeholder="Pasado / Lore" className="w-full bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-serif" />
                <input value={comentarioKuroi} onChange={(e) => setComentarioKuroi(e.target.value)} placeholder="Dictamen de Kuroi para el Jugador..." className="w-full bg-black border border-amber-900/60 p-2 text-xs text-amber-200 rounded font-mono" />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-neutral-900">
                <button onClick={() => resolverPersonaje("aprobado")} className="bg-emerald-950 border border-emerald-800 text-emerald-200 text-xs py-2.5 rounded font-bold font-mono uppercase">Guardar / Aprobar</button>
                <button onClick={() => resolverPersonaje("editado")} className="bg-cyan-950 border border-cyan-800 text-cyan-200 text-xs py-2.5 rounded font-bold font-mono uppercase">Devolver Editado</button>
                <button onClick={() => resolverPersonaje("rechazado")} className="bg-red-950 border border-red-800 text-red-200 text-xs py-2.5 rounded font-bold font-mono uppercase">Rechazar Avatar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}