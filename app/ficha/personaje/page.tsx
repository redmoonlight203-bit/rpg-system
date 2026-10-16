"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  Map,
  Package,
  Sparkles,
  Shield,
  Dices,
  GitFork,
  Activity,
  ArrowLeft,
  Heart,
  Lock,
  Skull,
} from "lucide-react";

interface Personaje {
  id: string | number;
  nombre: string;
  raza: string;
  lugar_reencarnacion: string;
  estado_vida: "vivo" | "muerto" | "sellado";
  atributos: Record<string, number>;
  defecto?: string;
}

export default function HubPersonajeJugador() {
  const router = useRouter();
  const [personaje, setPersonaje] = useState<Personaje | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarPersonajeActivo = async () => {
    setCargando(true);
    const activeId = localStorage.getItem("personaje_activo_id");

    if (!activeId) {
      router.push("/ficha/personajes");
      return;
    }

    const { data, error } = await supabase
      .from("personajes")
      .select("*")
      .eq("id", activeId)
      .single();

    if (data && !error) {
      setPersonaje(data as Personaje);
    } else {
      router.push("/ficha/personajes");
    }
    setCargando(false);
  };

  useEffect(() => {
    let activo = true;

    Promise.resolve().then(() => {
      if (activo) {
        void cargarPersonajeActivo();
      }
    });

    return () => {
      activo = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono animate-pulse">
        Sincronizando la Esencia del Avatar...
      </div>
    );
  }

  if (!personaje) return null;

  const modulos = [
    {
      id: "tablero",
      titulo: "El Tablero",
      descripcion: "Explora el mapa del mundo, tokens y posición en tiempo real.",
      icon: Map,
      ruta: "/ficha/tablero",
      color: "hover:border-red-700/80 text-red-500",
    },
    {
      id: "inventario",
      titulo: "Inventario",
      descripcion: "Mochila y objetos portados en tu viaje por Yugen.",
      icon: Package,
      ruta: "/ficha/inventario",
      color: "hover:border-amber-700/80 text-amber-500",
    },
    {
      id: "habilidades",
      titulo: "Habilidades",
      descripcion: "Técnicas activas, hechizos y artes de combate.",
      icon: Sparkles,
      ruta: "/ficha/habilidades",
      color: "hover:border-cyan-700/80 text-cyan-500",
    },
    {
      id: "equipamiento",
      titulo: "Equipamiento",
      descripcion: "Casco, pechera, armas, 6 accesorios y títulos.",
      icon: Shield,
      ruta: "/ficha/equipamiento",
      color: "hover:border-purple-700/80 text-purple-500",
    },
    {
      id: "tiradas",
      titulo: "Tiradas & Dados",
      descripcion: "Lanzamiento de dados para pruebas de atributos y combate.",
      icon: Dices,
      ruta: "/ficha/tiradas",
      color: "hover:border-emerald-700/80 text-emerald-500",
    },
    {
      id: "arbol",
      titulo: "Árbol de Habilidades",
      descripcion: "Progreso de talentos y ramificaciones de poder.",
      icon: GitFork,
      ruta: "/ficha/arbol",
      color: "hover:border-indigo-700/80 text-indigo-500",
    },
    {
      id: "estadisticas",
      titulo: "Estadísticas",
      descripcion: "Detalle completo de hoja de personaje y bonos.",
      icon: Activity,
      ruta: "/ficha/estadisticas",
      color: "hover:border-rose-700/80 text-rose-500",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative overflow-x-hidden">
      
      {/* Resplandor Divino */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[300px] bg-red-950/20 blur-[170px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 pb-20">
        
        {/* ENCABEZADO DEL PERSONAJE */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-950 border border-neutral-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/ficha/personajes")}
              className="p-2.5 bg-black hover:bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-red-400 transition-colors"
              title="Cambiar de Personaje"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase text-red-500 font-bold bg-red-950/60 px-2 py-0.5 rounded border border-red-900">
                  {personaje.raza}
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {personaje.lugar_reencarnacion}
                </span>
              </div>
              <h1 className="text-3xl font-black font-mono text-neutral-100 mt-1">
                {personaje.nombre}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono px-3 py-1.5 rounded-lg border font-bold uppercase flex items-center gap-1.5 ${
              personaje.estado_vida === "vivo"
                ? "bg-red-950/80 border-red-800 text-red-300"
                : personaje.estado_vida === "muerto"
                ? "bg-neutral-900 border-neutral-800 text-neutral-500"
                : "bg-cyan-950/80 border-cyan-700 text-cyan-300 animate-pulse"
            }`}>
              {personaje.estado_vida === "vivo" && <><Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" /> VIVO</>}
              {personaje.estado_vida === "muerto" && <><Skull className="w-3.5 h-3.5" /> DIFUNTO</>}
              {personaje.estado_vida === "sellado" && <><Lock className="w-3.5 h-3.5 text-cyan-400" /> SELLADO</>}
            </span>

            <button
              onClick={() => router.push("/ficha/personajes")}
              className="text-xs font-mono text-neutral-400 hover:text-white bg-black p-2.5 rounded-xl border border-neutral-800 transition-colors"
            >
              Cambiar Avatar
            </button>
          </div>
        </header>

        {/* REJILLA DE LOS 7 MÓDULOS */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulos.map((m) => {
            const Icono = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => router.push(m.ruta)}
                className={`bg-black border border-neutral-900 p-6 rounded-2xl space-y-4 cursor-pointer transition-all duration-300 group hover:scale-[1.02] shadow-lg shadow-black/80 ${m.color}`}
              >
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl group-hover:border-neutral-700 transition-colors">
                    <Icono className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-600 uppercase">Módulo</span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-bold font-mono text-neutral-200 group-hover:text-white transition-colors">
                    {m.titulo}
                  </h3>
                  <p className="text-xs font-serif text-neutral-400 leading-relaxed">
                    {m.descripcion}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

      </div>
    </main>
  );
}