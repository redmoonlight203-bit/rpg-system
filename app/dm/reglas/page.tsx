"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { 
  Sliders, Plus, Trash2, Activity, Tag, Shield, FolderPlus, Layers
} from "lucide-react";

interface CategoriaForja {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string;
}

interface StatConfig {
  id: string;
  categoria: string; // Guarda la 'clave' de la categoría
  clave: string;
  etiqueta: string;
  valor_defecto: number;
}

export default function ReglasYStatsKuroi() {
  const [categorias, setCategorias] = useState<CategoriaForja[]>([]);
  const [stats, setStats] = useState<StatConfig[]>([]);
  const [cargando, setCargando] = useState(true);

  // Formulario Nueva Categoría
  const [nuevaCatNombre, setNuevaCatNombre] = useState("");
  const [nuevaCatClave, setNuevaCatClave] = useState("");
  const [nuevaCatDesc, setNuevaCatDesc] = useState("");

  // Formulario Nueva Stat
  const [statCategoria, setStatCategoria] = useState("");
  const [statEtiqueta, setStatEtiqueta] = useState("");
  const [statClave, setStatClave] = useState("");
  const [statDefecto, setStatDefecto] = useState(0);

  const cargarDatos = async () => {
    setCargando(true);
    
    // Cargar Categorías
    const { data: catData } = await supabase.from("categorias_forja").select("*").order("created_at", { ascending: true });
    if (catData) {
      setCategorias(catData as CategoriaForja[]);
      if (catData.length > 0 && !statCategoria) {
        setStatCategoria(catData[0].clave);
      }
    }

    // Cargar Stats
    const { data: statsData } = await supabase.from("config_estadisticas").select("*").order("created_at", { ascending: true });
    if (statsData) setStats(statsData as StatConfig[]);

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // CREAR NUEVA CATEGORÍA DE ARTÍCULO
  const crearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCatNombre) return;

    const claveLimpia = (nuevaCatClave || nuevaCatNombre)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    const { error } = await supabase.from("categorias_forja").insert([{
      clave: claveLimpia,
      nombre: nuevaCatNombre,
      descripcion: nuevaCatDesc
    }]);

    if (!error) {
      setNuevaCatNombre("");
      setNuevaCatClave("");
      setNuevaCatDesc("");
      cargarDatos();
    } else {
      alert("Error al crear la categoría. Asegúrate de que la clave no esté repetida.");
    }
  };

  // ELIMINAR CATEGORÍA
  const eliminarCategoria = async (id: string, clave: string) => {
    if (!window.confirm(`¿Eliminar la categoría "${clave}"? Los stats asociados seguirán en la BD pero no se mostrarán.`)) return;
    await supabase.from("categorias_forja").delete().eq("id", id);
    cargarDatos();
  };

  // CREAR NUEVA STAT
  const crearStat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statEtiqueta || !statCategoria) return;

    const claveLimpia = (statClave || statEtiqueta)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    const { error } = await supabase.from("config_estadisticas").insert([{
      categoria: statCategoria,
      clave: claveLimpia,
      etiqueta: statEtiqueta,
      valor_defecto: Number(statDefecto) || 0
    }]);

    if (!error) {
      setStatEtiqueta("");
      setStatClave("");
      setStatDefecto(0);
      cargarDatos();
    } else {
      alert("Error al crear el atributo.");
    }
  };

  // ELIMINAR STAT
  const eliminarStat = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas borrar este atributo global?")) return;
    await supabase.from("config_estadisticas").delete().eq("id", id);
    cargarDatos();
  };

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-emerald-500 font-mono animate-pulse">Cargando las Leyes del Universo...</div>;

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative overflow-x-hidden">
      
      <div className="max-w-7xl mx-auto space-y-10 relative z-10 pb-20">
        
        {/* CABECERA */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-900/50 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.2)] text-emerald-500">
              <Sliders className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono">
                Reglas y Sistema de Stats
              </h1>
              <p className="text-emerald-700/80 text-xs font-mono tracking-widest uppercase">
                [ CONFIGURACIÓN DE TIPOS DE ENTIDAD Y ATRIBUTOS GLOBALES ]
              </p>
            </div>
          </div>
        </header>

        {/* SECCIÓN 1: TIPOS / CATEGORÍAS DE ARTÍCULOS */}
        <section className="bg-neutral-950 border border-neutral-900 rounded-xl p-6 space-y-6">
          <div className="border-b border-neutral-900 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-neutral-100 font-mono uppercase tracking-wide flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-500" /> Categorías de la Forja ({categorias.length})
              </h2>
              <p className="text-xs font-mono text-neutral-500 mt-1">
                Define qué tipos de entidades existen en Yugen (ej: Vehículos, Mascotas, Runas).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Formulario Crear Categoría */}
            <form onSubmit={crearCategoria} className="bg-black border border-neutral-900 p-4 rounded-lg space-y-4">
              <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-widest block flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4" /> Nueva Categoría
              </span>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">Nombre Visible</label>
                <input 
                  required 
                  value={nuevaCatNombre} 
                  onChange={(e) => setNuevaCatNombre(e.target.value)} 
                  placeholder="Ej. Vehículo / Montura" 
                  className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono outline-none focus:border-emerald-800" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">Clave Única (Opcional)</label>
                <input 
                  value={nuevaCatClave} 
                  onChange={(e) => setNuevaCatClave(e.target.value)} 
                  placeholder="Ej. vehiculo" 
                  className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono outline-none focus:border-emerald-800" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">Descripción / Uso</label>
                <input 
                  value={nuevaCatDesc} 
                  onChange={(e) => setNuevaCatDesc(e.target.value)} 
                  placeholder="Para carrozas, dragones montables..." 
                  className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-serif outline-none focus:border-emerald-800" 
                />
              </div>

              <button type="submit" className="w-full bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 py-2 rounded text-xs font-mono font-bold uppercase transition-colors flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" /> Añadir Categoría
              </button>
            </form>

            {/* Lista de Categorías Existentes */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categorias.map((cat) => (
                <div key={cat.id} className="bg-black border border-neutral-900 p-4 rounded-lg flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-bold text-neutral-200 font-mono">{cat.nombre}</h3>
                      <button onClick={() => eliminarCategoria(cat.id, cat.clave)} className="text-neutral-600 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-500 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/50 inline-block">
                      clave: {cat.clave}
                    </span>
                    <p className="text-[10px] text-neutral-500 italic font-serif leading-relaxed line-clamp-2 mt-1">"{cat.descripcion || 'Sin descripción'}"</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* SECCIÓN 2: ATRIBUTOS Y ESTADÍSTICAS GLOBALES */}
        <section className="bg-neutral-950 border border-neutral-900 rounded-xl p-6 space-y-6">
          <div className="border-b border-neutral-900 pb-3">
            <h2 className="text-base font-bold text-neutral-100 font-mono uppercase tracking-wide flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" /> Atributos y Estadísticas por Categoría ({stats.length})
            </h2>
            <p className="text-xs font-mono text-neutral-500 mt-1">
              Agrega variables numéricas (Velocidad, Blindaje, Fuerza) a cualquiera de tus categorías.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Formulario Crear Stat */}
            <form onSubmit={crearStat} className="bg-black border border-neutral-900 p-4 rounded-lg space-y-4">
              <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-widest block flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Registrar Nuevo Atributo
              </span>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">Categoría Pertinente</label>
                <select 
                  value={statCategoria} 
                  onChange={(e) => setStatCategoria(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono outline-none focus:border-emerald-800"
                >
                  {categorias.map((c) => (
                    <option key={c.clave} value={c.clave}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">Nombre Visible (Etiqueta)</label>
                <input 
                  required 
                  value={statEtiqueta} 
                  onChange={(e) => setStatEtiqueta(e.target.value)} 
                  placeholder="Ej. Blindaje / Velocidad Máxima" 
                  className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono outline-none focus:border-emerald-800" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">Clave BD (Opcional)</label>
                  <input 
                    value={statClave} 
                    onChange={(e) => setStatClave(e.target.value)} 
                    placeholder="blindaje" 
                    className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono outline-none focus:border-emerald-800" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">Valor Defecto</label>
                  <input 
                    type="number"
                    value={statDefecto} 
                    onChange={(e) => setStatDefecto(Number(e.target.value))} 
                    className="w-full bg-neutral-950 border border-neutral-800 p-2 text-xs text-emerald-400 font-bold rounded font-mono outline-none focus:border-emerald-800 text-center" 
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 py-2 rounded text-xs font-mono font-bold uppercase transition-colors flex items-center justify-center gap-1.5">
                <Activity className="w-4 h-4" /> Vincular Atributo
              </button>
            </form>

            {/* Atributos Agrupados por Categoría */}
            <div className="lg:col-span-2 space-y-6">
              {categorias.map((cat) => {
                const statsDeEstaCat = stats.filter(s => s.categoria === cat.clave);
                return (
                  <div key={cat.clave} className="bg-black border border-neutral-900 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                      <h3 className="text-xs font-bold font-mono text-emerald-400 uppercase flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> {cat.nombre}
                      </h3>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {statsDeEstaCat.length} atributos
                      </span>
                    </div>

                    {statsDeEstaCat.length === 0 ? (
                      <p className="text-[10px] font-mono text-neutral-600 italic">No hay atributos definidos para esta categoría.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {statsDeEstaCat.map((s) => (
                          <div key={s.id} className="bg-neutral-950 border border-neutral-800 p-2 rounded flex justify-between items-center">
                            <div>
                              <p className="text-xs font-bold font-mono text-neutral-300">{s.etiqueta}</p>
                              <p className="text-[9px] font-mono text-neutral-600">clave: {s.clave}</p>
                            </div>
                            <button onClick={() => eliminarStat(s.id)} className="text-neutral-600 hover:text-red-500 transition-colors p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </section>

      </div>
    </main>
  );
}