"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { 
  Hammer, ImageIcon, BookOpen, Shield, Sparkles, User, Skull, 
  Tag, Activity, Star, Eye, Filter, Package, Flame, XCircle, Users, Sparkle, Edit3, Save, Layers, RotateCcw, MapPin, Crosshair
} from "lucide-react";

interface CategoriaForja {
  id: string;
  clave: string;
  nombre: string;
}

interface EntidadForja {
  id: string;
  tipo: string;
  slot_tipo: string;
  nombre: string;
  descripcion: string;
  historia: string;
  requisitos: string;
  defectos: string;
  imagen_url: string;
  clase: string;
  stats: Record<string, number>;
  stats_rango?: Record<string, { min: number; max: number }>;
  es_grupo: boolean;
  ligado_al_alma: boolean;
  es_vendible: boolean;
  precio_sugerido: string;
  ubicacion: string;
  estado: string;
  created_at: string;
}

interface StatConfig {
  id: string;
  categoria: string;
  clave: string;
  etiqueta: string;
}

interface PeticionJugador {
  id: string;
  user_id: string;
  nombre: string;
  descripcion: string;
  clase_calculada: string;
  estado: string;
  created_at: string;
  personaje_nombre: string;
}

export default function ForjaMaestraKuroi() {
  const [pestana, setPestana] = useState<"galeria" | "yunque" | "peticiones">("galeria");
  
  const [categorias, setCategorias] = useState<CategoriaForja[]>([]);
  const [entidades, setEntidades] = useState<EntidadForja[]>([]);
  const [statsGlobales, setStatsGlobales] = useState<StatConfig[]>([]);
  const [peticiones, setPeticiones] = useState<PeticionJugador[]>([]);
  
  const [cargando, setCargando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  const [entidadEditandoId, setEntidadEditandoId] = useState<string | null>(null);
  const [peticionEnYunque, setPeticionEnYunque] = useState<string | null>(null);

  // FORMULARIO DEL YUNQUE
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [nuevoSlotTipo, setNuevoSlotTipo] = useState("ninguno");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaDesc, setNuevaDesc] = useState("");
  const [nuevaHistoria, setNuevaHistoria] = useState("");
  const [nuevoRequisito, setNuevoRequisito] = useState("");
  const [nuevoDefecto, setNuevoDefecto] = useState("");
  const [nuevaImagenUrl, setNuevaImagenUrl] = useState("");
  const [nuevaClase, setNuevaClase] = useState("D");
  
  const [esGrupo, setEsGrupo] = useState(false);
  const [nuevosStats, setNuevosStats] = useState<Record<string, number>>({});
  const [nuevosStatsRango, setNuevosStatsRango] = useState<Record<string, { min: number; max: number }>>({});
  
  const [ligadoAlma, setLigadoAlma] = useState(false);
  const [esVendible, setEsVendible] = useState(false);
  const [precioSugerido, setPrecioSugerido] = useState("");

  const cargarDatos = async () => {
    setCargando(true);
    
    const { data: catData } = await supabase.from("categorias_forja").select("*").order("created_at", { ascending: true });
    if (catData && catData.length > 0) {
      setCategorias(catData as CategoriaForja[]);
      if (!nuevoTipo) setNuevoTipo(catData[0].clave);
    }

    const { data: statsData } = await supabase.from("config_estadisticas").select("*");
    if (statsData) setStatsGlobales(statsData as StatConfig[]);

    const { data: forjaData } = await supabase.from("forja_maestra").select("*").order("created_at", { ascending: false });
    if (forjaData) setEntidades(forjaData as EntidadForja[]);

    const { data: petData } = await supabase.from("creaciones_forja").select("*").eq("estado", "pendiente").order("created_at", { ascending: false });
    if (petData) {
      const peticionesMapeadas = await Promise.all(
        petData.map(async (p: any) => {
          const { data: pjData } = await supabase.from("personajes").select("nombre").eq("user_id", p.user_id).single();
          return {
            id: p.id,
            user_id: p.user_id,
            nombre: p.nombre,
            descripcion: p.descripcion,
            clase_calculada: p.clase_calculada || "D",
            estado: p.estado,
            created_at: p.created_at,
            personaje_nombre: pjData?.nombre || "Reencarnado Desconocido"
          };
        })
      );
      setPeticiones(peticionesMapeadas as PeticionJugador[]);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const formatearUrlImagen = (url: string) => {
    if (!url) return "";
    let limpia = url.trim();
    if (limpia.includes("imgur.com/") && !limpia.includes("i.imgur.com")) {
      const id = limpia.split("imgur.com/")[1]?.split("/")[0]?.split(".")[0];
      if (id) return `https://i.imgur.com/${id}.jpeg`;
    }
    return limpia;
  };

  const cancelarEdicion = () => {
    setEntidadEditandoId(null);
    setPeticionEnYunque(null);
    setNuevoNombre(""); setNuevaDesc(""); setNuevaHistoria("");
    setNuevoRequisito(""); setNuevoDefecto(""); setNuevaImagenUrl("");
    setLigadoAlma(false); setEsVendible(false); setPrecioSugerido("");
    setNuevosStats({}); setNuevosStatsRango({}); setEsGrupo(false);
    setNuevoSlotTipo("ninguno");
    if (categorias.length > 0) setNuevoTipo(categorias[0].clave);
    setNuevaClase("D");
  };

  const cargarParaEditar = (ent: EntidadForja) => {
    setEntidadEditandoId(ent.id);
    setPeticionEnYunque(null);
    setNuevoTipo(ent.tipo);
    setNuevoSlotTipo(ent.slot_tipo || "ninguno");
    setNuevoNombre(ent.nombre);
    setNuevaDesc(ent.descripcion || "");
    setNuevaHistoria(ent.historia || "");
    setNuevoRequisito(ent.requisitos || "");
    setNuevoDefecto(ent.defectos || "");
    setNuevaImagenUrl(ent.imagen_url || "");
    setNuevaClase(ent.clase || "D");
    setEsGrupo(ent.es_grupo || false);
    setNuevosStats(ent.stats || {});
    setNuevosStatsRango(ent.stats_rango || {});
    setLigadoAlma(ent.ligado_al_alma || false);
    setEsVendible(ent.es_vendible || false);
    setPrecioSugerido(ent.precio_sugerido || "");
    setPestana("yunque");
  };

  const forjarEntidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoTipo) return;

    const statsA_Guardar = Object.fromEntries(Object.entries(nuevosStats).filter(([_, v]) => v !== 0 && v !== null && !isNaN(v)));
    const rangosA_Guardar = Object.fromEntries(
      Object.entries(nuevosStatsRango).filter(([_, range]) => range && (range.min !== 0 || range.max !== 0))
    );

    const payload = {
      tipo: nuevoTipo,
      slot_tipo: nuevoSlotTipo,
      nombre: nuevoNombre,
      descripcion: nuevaDesc,
      historia: nuevaHistoria,
      requisitos: nuevoRequisito,
      defectos: nuevoDefecto,
      imagen_url: formatearUrlImagen(nuevaImagenUrl),
      clase: nuevaClase,
      es_grupo: esGrupo,
      stats: esGrupo ? {} : statsA_Guardar,
      stats_rango: esGrupo ? rangosA_Guardar : {},
      ligado_al_alma: ligadoAlma,
      es_vendible: esVendible,
      precio_sugerido: esVendible ? precioSugerido : null,
      ubicacion: esVendible ? "mercado" : "forja"
    };

    let error;

    if (entidadEditandoId) {
      const { error: updateError } = await supabase.from("forja_maestra").update(payload).eq("id", entidadEditandoId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("forja_maestra").insert([{
        ...payload,
        creador_id: peticionEnYunque ? peticiones.find(p => p.id === peticionEnYunque)?.user_id : null,
        estado: "aprobado"
      }]);
      error = insertError;
    }

    if (!error) {
      if (peticionEnYunque) {
        await supabase.from("creaciones_forja").update({ estado: "aprobada" }).eq("id", peticionEnYunque);
      }

      alert(entidadEditandoId ? "¡Entidad actualizada con éxito!" : "¡Entidad forjada con éxito en Yugen!");
      cancelarEdicion();
      setPestana("galeria");
      cargarDatos();
    } else {
      alert("Error al procesar la entidad en la forja.");
    }
  };

  const llevarAlYunque = (pet: PeticionJugador) => {
    cancelarEdicion();
    setNuevoNombre(pet.nombre);
    setNuevaDesc(pet.descripcion);
    setNuevaClase(pet.clase_calculada || "D");
    if (categorias.length > 0) setNuevoTipo(categorias[0].clave);
    setPeticionEnYunque(pet.id);
    setPestana("yunque");
  };

  const rechazarPeticion = async (id: string) => {
    if (!window.confirm("¿Rechazar definitivamente la idea de este jugador?")) return;
    await supabase.from("creaciones_forja").update({ estado: "rechazada" }).eq("id", id);
    cargarDatos();
  };

  const reclamarAForja = async (forjaId: string) => {
    if (!window.confirm("¿Seguro que deseas reclamar esta entidad única? Se retirará del jugador, del mercado o del tablero y volverá a estar libre en La Forja.")) return;

    await supabase.from("inventario_jugador").delete().eq("forja_id", forjaId);
    await supabase.from("negociaciones_tienda").delete().eq("item_id", forjaId);
    await supabase.from("forja_maestra").update({
      ubicacion: "forja",
      es_vendible: false,
      poseedor_id: null
    }).eq("id", forjaId);

    cargarDatos();
  };

  const alternarVenta = async (ent: EntidadForja) => {
    if (!ent.es_grupo && ent.ubicacion === "jugador") {
      alert("No puedes poner en venta este objeto porque actualmente pertenece al inventario de un jugador. Reclámalo primero.");
      return;
    }

    const nuevoVendible = !ent.es_vendible;
    await supabase.from("forja_maestra").update({ 
      es_vendible: nuevoVendible,
      ubicacion: nuevoVendible ? "mercado" : "forja"
    }).eq("id", ent.id);
    cargarDatos();
  };

  const eliminarEntidad = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas erradicar esto de Yugen?")) return;
    await supabase.from("inventario_jugador").delete().eq("forja_id", id);
    await supabase.from("forja_maestra").delete().eq("id", id);
    cargarDatos();
  };

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-orange-500 font-mono animate-pulse">Encendiendo el Yunque de la Creación...</div>;

  const galeria = entidades.filter(e => e.estado === "aprobado" && (filtroTipo === "todos" || e.tipo === filtroTipo));
  const statsRelevantes = statsGlobales.filter(s => s.categoria === nuevoTipo);

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative overflow-x-hidden">
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-orange-950/20 blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10 pb-20">
        
        {/* CABECERA */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-orange-900/50 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-950/40 border border-orange-800 rounded-lg shadow-[0_0_20px_rgba(249,115,22,0.2)] text-orange-500">
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono">
                La Forja Maestra
              </h1>
              <p className="text-orange-700/80 text-xs font-mono tracking-widest uppercase">
                [ MOTOR DE CREACIÓN Y TRAZABILIDAD MAESTRA DE YUGEN ]
              </p>
            </div>
          </div>
        </header>

        {/* PESTAÑAS */}
        <nav className="flex flex-wrap gap-2 border-b border-neutral-900 pb-4">
          {[
            { id: "galeria", label: `Galería Yugen (${galeria.length})`, icon: Eye },
            { id: "yunque", label: entidadEditandoId ? "Editar Entidad" : "El Yunque (Crear)", icon: Hammer },
            { id: "peticiones", label: `Ideas de Jugadores (${peticiones.length})`, icon: Star },
          ].map((tab) => {
            const Icono = tab.icon;
            const activa = pestana === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPestana(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                  activa
                    ? "bg-orange-950/80 border border-orange-800 text-orange-200 font-bold shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                    : "bg-neutral-950 border border-neutral-900 text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Icono className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* PESTAÑA 1: LA GALERÍA */}
        {pestana === "galeria" && (
          <section className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-2 text-[10px] font-mono text-neutral-500 uppercase mr-2"><Filter className="w-3 h-3"/> Filtro:</span>
              <button
                onClick={() => setFiltroTipo("todos")}
                className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase transition-colors ${
                  filtroTipo === "todos" ? "bg-orange-950 border border-orange-800 text-orange-300" : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                todos
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat.clave}
                  onClick={() => setFiltroTipo(cat.clave)}
                  className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase transition-colors ${
                    filtroTipo === cat.clave ? "bg-orange-950 border border-orange-800 text-orange-300" : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {cat.nombre.split(' ')[0]}
                </button>
              ))}
            </div>

            {galeria.length === 0 ? (
              <div className="bg-neutral-950 border border-neutral-900 p-12 text-center rounded-xl text-neutral-500 font-mono text-sm">
                No hay creaciones en esta categoría. Ve a forjar algo.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {galeria.map((ent) => (
                  <div key={ent.id} className="bg-black border border-neutral-900 hover:border-orange-900/60 transition-colors rounded-xl overflow-hidden flex flex-col group shadow-lg">
                    {ent.imagen_url ? (
                      <div className="w-full h-48 bg-neutral-900 relative">
                        <img src={ent.imagen_url} alt={ent.nombre} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                      </div>
                    ) : (
                      <div className="w-full h-20 bg-neutral-900 relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                      </div>
                    )}

                    <div className="p-5 flex-1 flex flex-col -mt-10 relative z-10 space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-black/80 backdrop-blur-sm border border-neutral-800 text-orange-400 uppercase">
                            RANGO {ent.clase}
                          </span>
                          
                          <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-purple-950/80 backdrop-blur-sm border border-purple-800 text-purple-300 uppercase">
                            SLOT: {ent.slot_tipo || "NINGUNO"}
                          </span>

                          <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border backdrop-blur-sm flex items-center gap-1 uppercase ${
                            ent.es_grupo ? "bg-amber-950/80 border-amber-800 text-amber-300" : "bg-cyan-950/80 border-cyan-800 text-cyan-300"
                          }`}>
                            {ent.es_grupo ? <Users className="w-3 h-3"/> : <Sparkle className="w-3 h-3"/>}
                            {ent.es_grupo ? "Malla" : "Único"}
                          </span>

                          <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border backdrop-blur-sm flex items-center gap-1 uppercase ${
                            ent.ubicacion === "jugador" ? "bg-purple-950 border-purple-800 text-purple-300" :
                            ent.ubicacion === "mercado" ? "bg-amber-950 border-amber-800 text-amber-300" :
                            "bg-emerald-950 border-emerald-800 text-emerald-300"
                          }`}>
                            <MapPin className="w-3 h-3" />
                            {ent.ubicacion === "jugador" ? "En Alma Jugador" : ent.ubicacion === "mercado" ? "En Mercado" : "En Forja"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-neutral-100 font-mono">{ent.nombre}</h3>
                        <p className="text-xs text-neutral-400 font-serif leading-relaxed line-clamp-2 mt-1">"{ent.descripcion}"</p>
                      </div>

                      {/* STATS FIJAS */}
                      {!ent.es_grupo && ent.stats && Object.keys(ent.stats).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-900">
                          {Object.entries(ent.stats).map(([clave, valor]) => {
                            const statRef = statsGlobales.find(s => s.clave === clave);
                            return (
                              <span key={clave} className="text-[9px] font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded text-neutral-400 flex items-center gap-1">
                                {statRef ? statRef.etiqueta : clave}: <strong className="text-emerald-400">{valor > 0 ? `+${valor}` : valor}</strong>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* STATS EN RANGO */}
                      {ent.es_grupo && ent.stats_rango && Object.keys(ent.stats_rango).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-900">
                          {Object.entries(ent.stats_rango).map(([clave, range]) => {
                            const statRef = statsGlobales.find(s => s.clave === clave);
                            return (
                              <span key={clave} className="text-[9px] font-mono bg-amber-950/30 border border-amber-900/50 px-1.5 py-0.5 rounded text-amber-300 flex items-center gap-1">
                                {statRef ? statRef.etiqueta : clave}: <strong className="text-amber-400">{range.min} ~ {range.max}</strong>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="pt-4 mt-auto border-t border-neutral-900 flex justify-between items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer group/toggle">
                          <input 
                            type="checkbox" 
                            checked={ent.es_vendible}
                            disabled={!ent.es_grupo && ent.ubicacion === "jugador"}
                            onChange={() => alternarVenta(ent)}
                            className="sr-only"
                          />
                          <div className={`w-8 h-4 rounded-full transition-colors relative ${ent.es_vendible ? "bg-emerald-600" : "bg-neutral-800"}`}>
                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${ent.es_vendible ? "translate-x-4" : ""}`} />
                          </div>
                          <span className={`text-[10px] font-mono uppercase font-bold ${ent.es_vendible ? "text-emerald-400" : "text-neutral-500"}`}>
                            {ent.es_vendible ? "En Venta" : "Oculto"}
                          </span>
                        </label>

                        <div className="flex items-center gap-2">
                          {!ent.es_grupo && ent.ubicacion !== "forja" && (
                            <button
                              onClick={() => reclamarAForja(ent.id)}
                              className="p-1.5 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 rounded text-[10px] font-mono flex items-center gap-1 uppercase"
                              title="Reclamar / Restablecer a La Forja"
                            >
                              <RotateCcw className="w-3 h-3" /> Reclamar
                            </button>
                          )}

                          <button 
                            onClick={() => cargarParaEditar(ent)} 
                            className="p-1.5 bg-neutral-900 hover:bg-orange-950 border border-neutral-800 hover:border-orange-800 text-neutral-400 hover:text-orange-400 rounded transition-colors"
                            title="Editar Entidad"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button 
                            onClick={() => eliminarEntidad(ent.id)} 
                            className="text-[10px] font-mono text-neutral-500 hover:text-red-500 uppercase transition-colors"
                          >
                            Destruir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* PESTAÑA 2: EL YUNQUE (FORMULARIO CON SELECCIÓN DE SLOT) */}
        {pestana === "yunque" && (
          <section className="bg-neutral-950 border border-orange-900/40 rounded-xl p-6 md:p-8 space-y-8 relative overflow-hidden shadow-2xl shadow-orange-950/10">
            
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-900/10 blur-[100px] pointer-events-none" />

            <div className="border-b border-orange-900/40 pb-4 flex justify-between items-end">
              <div>
                <h2 className="text-lg font-bold text-neutral-100 font-mono uppercase flex items-center gap-2">
                  <Hammer className="w-5 h-5 text-orange-500" /> {entidadEditandoId ? "Modificar Entidad" : "Forjar Entidad"}
                </h2>
                <p className="text-xs font-mono text-neutral-500 mt-1">
                  {entidadEditandoId ? "Estás editando un elemento existente del universo Yugen." : "Crea un elemento nuevo para la base de datos central."}
                </p>
              </div>

              <div className="flex gap-2">
                {entidadEditandoId && (
                  <button onClick={cancelarEdicion} className="bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white px-3 py-1.5 rounded text-xs font-mono uppercase">
                    Cancelar Edición
                  </button>
                )}

                {peticionEnYunque && (
                  <div className="bg-amber-950/60 border border-amber-800 text-amber-300 px-4 py-2 rounded-lg text-[10px] font-mono flex items-center gap-2 animate-pulse">
                    <Star className="w-4 h-4" /> BASADO EN IDEA DE JUGADOR
                    <button onClick={cancelarEdicion} className="ml-2 bg-neutral-900 text-neutral-400 hover:text-red-400 px-2 py-1 rounded">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={forjarEntidad} className="space-y-6 relative z-10">
              
              {/* BLOQUE 1: IDENTIFICACIÓN Y CLASIFICACIÓN TÁCTICA */}
              <div className="bg-black border border-neutral-900 p-5 rounded-lg space-y-4">
                <span className="text-[10px] font-mono text-orange-500 font-bold uppercase tracking-widest block mb-2">1. Identificación y Slot Táctico</span>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase flex items-center gap-1">
                      <Layers className="w-3 h-3 text-orange-500" /> Clasificación
                    </label>
                    <select 
                      value={nuevoTipo} 
                      onChange={(e) => setNuevoTipo(e.target.value)} 
                      className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-neutral-200 rounded font-mono outline-none focus:border-orange-800 font-bold"
                    >
                      {categorias.map((cat) => (
                        <option key={cat.clave} value={cat.clave}>{cat.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-1">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase flex items-center gap-1">
                      <Crosshair className="w-3 h-3 text-purple-400" /> Slot Corporal
                    </label>
                    <select 
                      value={nuevoSlotTipo} 
                      onChange={(e) => setNuevoSlotTipo(e.target.value)} 
                      className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-purple-300 rounded font-mono outline-none focus:border-purple-800 font-bold"
                    >
                      <option value="ninguno">Sin Slot (Mochila / Consumible)</option>
                      <option value="casco">Casco / Cabeza</option>
                      <option value="pechera">Pechera / Torso</option>
                      <option value="pantalones">Pantalones / Piernas</option>
                      <option value="zapatos">Zapatos / Pies</option>
                      <option value="mano">Arma 1 Mano (Empuñadura)</option>
                      <option value="dos_manos">Arma 2 Manos (Ocupa ambas)</option>
                      <option value="accesorio">Accesorio Místico (6 Slots)</option>
                      <option value="titulo">Título Nobiliario / Hazaña</option>
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase">Nombre / Título Oficial</label>
                    <input required value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Ej. Espada del Alba Caída / Cota de Sombras" className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-neutral-200 rounded font-mono outline-none focus:border-orange-800" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase">Rango de Poder (Clase)</label>
                    <select value={nuevaClase} onChange={(e) => setNuevaClase(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-neutral-200 rounded font-mono outline-none focus:border-orange-800">
                      <option value="F">Rango F (Común / Débil)</option>
                      <option value="D">Rango D</option>
                      <option value="C">Rango C</option>
                      <option value="B">Rango B</option>
                      <option value="A">Rango A (Épico)</option>
                      <option value="S">Rango S (Legendario)</option>
                      <option value="Z">Rango Z (Mítico / Jefe)</option>
                      <option value="KUROI">Rango KUROI (Dios)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase">URL de Referencia Visual</label>
                    <div className="flex gap-2">
                      <input value={nuevaImagenUrl} onChange={(e) => setNuevaImagenUrl(e.target.value)} placeholder="Ej. https://imgur.com/..." className="flex-1 bg-neutral-950 border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono outline-none focus:border-orange-800" />
                      <div className="p-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-500"><ImageIcon className="w-4 h-4" /></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOQUE 2: ESTADÍSTICAS */}
              <div className="bg-black border border-neutral-900 p-5 rounded-lg space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-900 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-orange-500 font-bold uppercase tracking-widest block">
                      2. Atributos para [{categorias.find(c => c.clave === nuevoTipo)?.nombre || nuevoTipo}]
                    </span>
                    <p className="text-[9px] font-mono text-neutral-500">Variables configuradas en Reglas para esta categoría.</p>
                  </div>

                  <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setEsGrupo(false)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase rounded transition-colors ${
                        !esGrupo ? "bg-cyan-950 border border-cyan-800 text-cyan-200 font-bold" : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      <Sparkle className="w-3.5 h-3.5" /> Estáticas (Único)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEsGrupo(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase rounded transition-colors ${
                        esGrupo ? "bg-amber-950 border border-amber-800 text-amber-200 font-bold" : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" /> Rango Variable (Malla)
                    </button>
                  </div>
                </div>
                
                {statsRelevantes.length === 0 ? (
                  <p className="text-xs font-mono text-neutral-600 italic py-2">
                    No hay atributos vinculados a esta categoría en la pantalla de Reglas.
                  </p>
                ) : (
                  <>
                    {!esGrupo && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {statsRelevantes.map((stat) => (
                          <div key={stat.clave} className="space-y-1 bg-neutral-950 p-2 rounded border border-neutral-900">
                            <label className="text-[9px] font-mono text-neutral-400 uppercase flex items-center gap-1">
                              <Activity className="w-3 h-3 text-neutral-600"/> {stat.etiqueta}
                            </label>
                            <input 
                              type="number"
                              value={nuevosStats[stat.clave] !== undefined ? nuevosStats[stat.clave] : ""}
                              onChange={(e) => setNuevosStats({ ...nuevosStats, [stat.clave]: Number(e.target.value) })}
                              placeholder="0"
                              className="w-full bg-black border border-neutral-800 p-1.5 text-xs text-emerald-400 font-bold rounded font-mono outline-none focus:border-emerald-800 text-center" 
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {esGrupo && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {statsRelevantes.map((stat) => (
                          <div key={stat.clave} className="space-y-1 bg-neutral-950 p-2.5 rounded border border-amber-900/40">
                            <label className="text-[9px] font-mono text-amber-400 uppercase flex items-center gap-1">
                              <Activity className="w-3 h-3 text-amber-600"/> {stat.etiqueta} (Mín ~ Máx)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <input 
                                type="number"
                                value={nuevosStatsRango[stat.clave]?.min !== undefined ? nuevosStatsRango[stat.clave]?.min : ""}
                                onChange={(e) => setNuevosStatsRango({
                                  ...nuevosStatsRango,
                                  [stat.clave]: { min: Number(e.target.value), max: nuevosStatsRango[stat.clave]?.max || 0 }
                                })}
                                placeholder="Mín"
                                className="w-full bg-black border border-neutral-800 p-1.5 text-xs text-amber-300 font-bold rounded font-mono outline-none focus:border-amber-800 text-center" 
                              />
                              <input 
                                type="number"
                                value={nuevosStatsRango[stat.clave]?.max !== undefined ? nuevosStatsRango[stat.clave]?.max : ""}
                                onChange={(e) => setNuevosStatsRango({
                                  ...nuevosStatsRango,
                                  [stat.clave]: { min: nuevosStatsRango[stat.clave]?.min || 0, max: Number(e.target.value) }
                                })}
                                placeholder="Máx"
                                className="w-full bg-black border border-neutral-800 p-1.5 text-xs text-amber-300 font-bold rounded font-mono outline-none focus:border-amber-800 text-center" 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* BLOQUE 3: TRASFONDO */}
              <div className="bg-black border border-neutral-900 p-5 rounded-lg space-y-4">
                <span className="text-[10px] font-mono text-orange-500 font-bold uppercase tracking-widest block mb-2">3. Trasfondo y Funcionamiento</span>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase flex items-center gap-1"><BookOpen className="w-3 h-3" /> Descripción y Efectos</label>
                  <textarea required rows={2} value={nuevaDesc} onChange={(e) => setNuevaDesc(e.target.value)} placeholder="¿Qué hace mecánicamente en el juego?" className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-neutral-200 rounded font-serif outline-none focus:border-orange-800 resize-none leading-relaxed" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase flex items-center gap-1"><BookOpen className="w-3 h-3" /> Historia / Lore (Opcional)</label>
                  <textarea rows={2} value={nuevaHistoria} onChange={(e) => setNuevaHistoria(e.target.value)} placeholder="¿Quién lo creó? ¿De dónde viene?" className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-neutral-200 rounded font-serif outline-none focus:border-orange-800 resize-none leading-relaxed italic text-neutral-400" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase">Requisitos de Uso (Opcional)</label>
                    <input value={nuevoRequisito} onChange={(e) => setNuevoRequisito(e.target.value)} placeholder="Ej. Ser Nivel 5, Fuerza > 20..." className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono outline-none focus:border-orange-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase">Defectos / Maldiciones (Opcional)</label>
                    <input value={nuevoDefecto} onChange={(e) => setNuevoDefecto(e.target.value)} placeholder="Ej. Consume 10 HP por turno..." className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs text-red-400 rounded font-mono outline-none focus:border-red-800" />
                  </div>
                </div>
              </div>

              {/* BLOQUE 4: MERCADO */}
              <div className="bg-black border border-neutral-900 p-5 rounded-lg space-y-4">
                <span className="text-[10px] font-mono text-orange-500 font-bold uppercase tracking-widest block mb-2">4. Mecánicas del Motor Yugen</span>
                
                <div className="flex flex-col sm:flex-row gap-6">
                  <label className="flex items-center gap-3 cursor-pointer group p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex-1 hover:border-indigo-800 transition-colors">
                    <input type="checkbox" checked={ligadoAlma} onChange={(e) => setLigadoAlma(e.target.checked)} className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                    <div>
                      <span className="text-[11px] font-mono uppercase text-indigo-400 font-bold block">Ligado al Alma</span>
                      <span className="text-[9px] font-mono text-neutral-500 leading-tight">Si el personaje muere, el objeto NO cae al mundo.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex-1 hover:border-emerald-800 transition-colors">
                    <input type="checkbox" checked={esVendible} onChange={(e) => setEsVendible(e.target.checked)} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                    <div className="flex-1">
                      <span className="text-[11px] font-mono uppercase text-emerald-400 font-bold block">Vender en Mercado Clandestino</span>
                      {esVendible && (
                        <input 
                          type="text" 
                          required 
                          value={precioSugerido} 
                          onChange={(e) => setPrecioSugerido(e.target.value)} 
                          placeholder="Precio (Ej. 500 Oro)" 
                          className="w-full bg-black border border-emerald-900/50 p-1.5 mt-1 text-[10px] text-emerald-300 rounded font-mono outline-none focus:border-emerald-500" 
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-orange-900/40">
                <button type="submit" className="w-full bg-gradient-to-r from-orange-950 to-red-950 hover:from-orange-900 hover:to-red-900 border border-orange-800 text-orange-200 py-4 rounded-lg text-sm font-mono font-bold uppercase transition-all shadow-lg hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2">
                  {entidadEditandoId ? <Save className="w-5 h-5" /> : <Hammer className="w-5 h-5" />} 
                  {entidadEditandoId ? "Guardar Cambios en la Entidad" : (peticionEnYunque ? "Aprobar Creación Oficialmente" : "Insuflar Vida en Yugen")}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* PESTAÑA 3: PETICIONES */}
        {pestana === "peticiones" && (
          <section className="space-y-6">
            <h2 className="text-sm font-bold text-neutral-300 font-mono uppercase tracking-widest border-b border-neutral-900 pb-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" /> Ideas Esperando Juicio Divino
            </h2>

            {peticiones.length === 0 ? (
              <div className="bg-neutral-950 border border-neutral-900 p-12 text-center rounded-xl text-neutral-500 font-mono text-sm">
                No hay plegarias ni peticiones nuevas de los reencarnados.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {peticiones.map((pet) => (
                  <div key={pet.id} className="bg-black border border-amber-900/30 p-5 rounded-xl space-y-4 flex flex-col justify-between shadow-lg">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono text-amber-500 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900">
                          NUEVA IDEA
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">{new Date(pet.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-neutral-100 font-mono">{pet.nombre}</h3>
                      <p className="text-xs text-neutral-400 font-serif leading-relaxed line-clamp-4">"{pet.descripcion}"</p>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-neutral-900">
                      <button 
                        onClick={() => llevarAlYunque(pet)}
                        className="flex-1 bg-orange-950 hover:bg-orange-900 border border-orange-800 text-orange-200 text-[10px] font-mono py-2 rounded font-bold uppercase transition-colors flex items-center justify-center gap-1"
                      >
                        <Hammer className="w-3.5 h-3.5" /> Evaluar en Yunque
                      </button>
                      <button 
                        onClick={() => rechazarPeticion(pet.id)}
                        className="p-2 bg-neutral-900 hover:bg-red-950 border border-neutral-800 hover:border-red-800 text-neutral-500 hover:text-red-400 rounded transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      </div>
    </main>
  );
}