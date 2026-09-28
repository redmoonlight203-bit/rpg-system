"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { 
  ArrowLeft, Heart, Zap, Shield, User, MapPin, 
  Activity, Scroll, AlertTriangle, RefreshCw, Flame 
} from "lucide-react";

interface PersonajeActivo {
  id: string;
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
  comentarios_kuroi?: string;
  created_at: string;
}

export default function FichaPersonajeActivo() {
  const router = useRouter();
  const [personaje, setPersonaje] = useState<PersonajeActivo | null>(null);
  const [cargando, setCargando] = useState(true);

  // Vueltas de vida y energía para seguimiento durante la sesión
  const [saludActual, setSaludActual] = useState(100);
  const [energiaActual, setEnergiaActual] = useState(100);

  const cargarPersonajeActivo = async () => {
    setCargando(true);
    const idGuardado = localStorage.getItem("personaje_activo_id");

    if (!idGuardado) {
      router.push("/ficha/personajes");
      return;
    }

    const { data, error } = await supabase
      .from("personajes")
      .select("*")
      .eq("id", idGuardado)
      .single();

    if (!error && data) {
      setPersonaje(data as PersonajeActivo);
      // Cálculo inicial de barras en base a atributos
      const saludMax = (data.atributos?.resistencia || 5) * 20;
      const energiaMax = (data.atributos?.magico || 5) * 20;
      setSaludActual(saludMax);
      setEnergiaActual(energiaMax);
    } else {
      router.push("/ficha/personajes");
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarPersonajeActivo();
  }, []);

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono animate-pulse">Invocando el Receptáculo del Reencarnado...</div>;
  if (!personaje) return null;

  const saludMax = (personaje.atributos?.resistencia || 5) * 20;
  const energiaMax = (personaje.atributos?.magico || 5) * 20;

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative">
      
      {/* Luz ambiental abisal */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[250px] bg-red-950/20 blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10 pb-20">
        
        {/* Cabecera / Navegación */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-red-900/40 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/ficha/personajes")} className="text-neutral-500 hover:text-red-400 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <span className="text-[10px] font-mono uppercase text-red-500 tracking-widest font-bold">
                [ AVATAR EN PARTIDA ]
              </span>
              <h1 className="text-3xl font-black text-neutral-100 uppercase tracking-widest font-mono">
                {personaje.nombre}
              </h1>
              <p className="text-xs font-mono text-neutral-400 mt-0.5 flex items-center gap-2">
                <span>Raza: <strong className="text-red-400">{personaje.raza}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-400"><MapPin className="w-3 h-3" /> {personaje.lugar_reencarnacion}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/ficha/personajes")}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-400 hover:text-red-400 uppercase tracking-wider transition-colors"
          >
            Cambiar Receptáculo
          </button>
        </header>

        {/* Mensaje o Dictamen de Kuroi (Si fue editado) */}
        {personaje.comentarios_kuroi && (
          <div className="bg-red-950/30 border border-red-800/80 p-4 rounded-xl flex items-start gap-3 glow-blood-sm">
            <Flame className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-mono text-red-400 uppercase font-bold block">Dictamen del Master (Kuroi):</span>
              <p className="text-xs text-neutral-200 font-mono italic mt-0.5">"{personaje.comentarios_kuroi}"</p>
            </div>
          </div>
        )}

        {/* Barras de Estado (Salud y Energía) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-950 border border-neutral-900 p-6 rounded-xl">
          
          {/* Barra de Salud */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-red-500 font-bold flex items-center gap-1.5 uppercase">
                <Heart className="w-4 h-4 fill-red-500" /> Vitalidad
              </span>
              <span className="text-neutral-300 font-bold">{saludActual} / {saludMax} HP</span>
            </div>
            <div className="w-full h-3.5 bg-black rounded-full border border-neutral-800 overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-red-800 to-red-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, (saludActual / saludMax) * 100))}%` }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setSaludActual(prev => Math.max(0, prev - 10))} className="px-2.5 py-1 bg-black border border-neutral-800 hover:border-red-800 text-[10px] font-mono text-neutral-400 hover:text-red-400 rounded">-10 HP</button>
              <button onClick={() => setSaludActual(prev => Math.min(saludMax, prev + 10))} className="px-2.5 py-1 bg-black border border-neutral-800 hover:border-emerald-800 text-[10px] font-mono text-neutral-400 hover:text-emerald-400 rounded">+10 HP</button>
              <button onClick={() => setSaludActual(saludMax)} className="px-2.5 py-1 bg-black border border-neutral-800 hover:border-neutral-700 text-[10px] font-mono text-neutral-500 rounded flex items-center gap-1"><RefreshCw className="w-2.5 h-2.5"/> Reset</button>
            </div>
          </div>

          {/* Barra de Energía / Mágia */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5 uppercase">
                <Zap className="w-4 h-4 fill-cyan-400" /> Vínculo Mágico / Energía
              </span>
              <span className="text-neutral-300 font-bold">{energiaActual} / {energiaMax} MP</span>
            </div>
            <div className="w-full h-3.5 bg-black rounded-full border border-neutral-800 overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-cyan-800 to-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, (energiaActual / energiaMax) * 100))}%` }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEnergiaActual(prev => Math.max(0, prev - 10))} className="px-2.5 py-1 bg-black border border-neutral-800 hover:border-cyan-800 text-[10px] font-mono text-neutral-400 hover:text-cyan-400 rounded">-10 MP</button>
              <button onClick={() => setEnergiaActual(prev => Math.min(energiaMax, prev + 10))} className="px-2.5 py-1 bg-black border border-neutral-800 hover:border-emerald-800 text-[10px] font-mono text-neutral-400 hover:text-emerald-400 rounded">+10 MP</button>
              <button onClick={() => setEnergiaActual(energiaMax)} className="px-2.5 py-1 bg-black border border-neutral-800 hover:border-neutral-700 text-[10px] font-mono text-neutral-500 rounded flex items-center gap-1"><RefreshCw className="w-2.5 h-2.5"/> Reset</button>
            </div>
          </div>

        </section>

        {/* Atributos Oficiales */}
        <section className="bg-neutral-950 border border-neutral-900 p-6 rounded-xl space-y-4">
          <h2 className="text-sm font-mono text-neutral-400 uppercase tracking-widest font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-500" /> Estadísticas del Receptáculo
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Object.entries(personaje.atributos || {}).map(([key, val]) => (
              <div key={key} className="bg-black border border-neutral-800 p-4 rounded-lg text-center space-y-1">
                <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold block">{key}</span>
                <span className="text-2xl font-mono font-black text-red-500">{val}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Defecto e Historia */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-950 border border-neutral-900 p-6 rounded-xl space-y-2">
            <span className="text-xs font-mono text-amber-500 uppercase font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Defecto Fatal / Maldición
            </span>
            <div className="bg-black/80 border border-neutral-800 p-4 rounded-lg text-xs text-neutral-300 font-mono">
              {personaje.defecto || "Sin defecto registrado..."}
            </div>
          </div>

          <div className="bg-neutral-950 border border-neutral-900 p-6 rounded-xl space-y-2">
            <span className="text-xs font-mono text-neutral-400 uppercase font-bold flex items-center gap-1.5">
              <Scroll className="w-4 h-4 text-red-500" /> Pasado / Registro
            </span>
            <div className="bg-black/80 border border-neutral-800 p-4 rounded-lg text-xs text-neutral-400 italic font-serif leading-relaxed line-clamp-4">
              "{personaje.historia || "Un alma sin recuerdos..."}"
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}