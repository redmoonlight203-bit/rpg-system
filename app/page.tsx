"use client";

import React, { useState } from "react";
import { Personaje } from "../types/rpg";
import { Shield, Zap, Flame, Award, Heart, Dna, Plus, Minus } from "lucide-react";

const personajeInicial: Personaje = {
  id: "char_01",
  nombre: "Kael",
  raza: "Humano",
  titulos: ["Caminante Silencioso"],
  pasiva: "Recuperación acelerada en descanso.",
  usuarioDelSistema: true,
  habilidadO: {
    nombre: "Desconocida",
    desbloqueada: false,
    efecto: "???",
  },
  atributos: {
    fisico: 6,
    magico: 5,
    resistencia: 5,
    inteligencia: 5,
    agilidad: 7,
  },
  recursos: {
    vidaActual: 50,
    vidaMaxima: 50,
    energiaActual: 50,
    energiaMaxima: 50,
    hambre: 80,
    exp: 120,
    nivel: 2,
    puntosKuro: 1,
  },
  equipamiento: {
    casco: undefined,
    pechera: "Pechera de Cuero Herido",
    pantalones: "Pantalones de Viajero",
    botas: "Botas de Piel",
    manoPrincipal: "Daga Mismática",
    manoSecundaria: undefined,
    accesorios: ["Anillo de Bronce", null, null, null, null, null],
  },
};

export default function FichaPersonaje() {
  const [char, setChar] = useState<Personaje>(personajeInicial);

  const getEstadoHambre = (hambre: number) => {
    if (hambre <= 0) return { label: "Inanición (-3 Atrib. Físicos / Sin Reg. Energía)", color: "text-red-500" };
    if (hambre <= 30) return { label: "Hambriento (-1 Todos Atrib. / -50% Reg. Energía)", color: "text-amber-500" };
    return { label: "Saciado", color: "text-emerald-400" };
  };

  const modificarRecurso = (campo: keyof typeof char.recursos, delta: number) => {
    setChar((prev) => {
      const valorActual = prev.recursos[campo];
      const nuevoValor = Math.max(0, valorActual + delta);
      return {
        ...prev,
        recursos: { ...prev.recursos, [campo]: nuevoValor },
      };
    });
  };

  const estadoHambre = getEstadoHambre(char.recursos.hambre);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">{char.nombre}</h1>
              {char.usuarioDelSistema && (
                <span className="bg-indigo-900/60 border border-indigo-500 text-indigo-300 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3 text-indigo-400" /> Usuario del Sistema
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Raza: <span className="text-slate-200 font-medium">{char.raza}</span> | Nivel {char.recursos.nivel}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
            <div>
              <p className="text-xs text-slate-400">Puntos Kuro</p>
              <p className="text-xl font-bold text-amber-400">{char.recursos.puntosKuro}</p>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <p className="text-xs text-slate-400">EXP</p>
              <p className="text-xl font-bold text-indigo-400">{char.recursos.exp}</p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-1.5 font-semibold text-rose-400">
                <Heart className="w-4 h-4 fill-rose-500/20" /> Vida
              </span>
              <span>{char.recursos.vidaActual} / {char.recursos.vidaMaxima}</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="bg-rose-600 h-full transition-all duration-300"
                style={{ width: `${(char.recursos.vidaActual / char.recursos.vidaMaxima) * 100}%` }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => modificarRecurso("vidaActual", -5)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs py-1 rounded flex justify-center items-center"><Minus className="w-3 h-3"/></button>
              <button onClick={() => modificarRecurso("vidaActual", 5)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs py-1 rounded flex justify-center items-center"><Plus className="w-3 h-3"/></button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-1.5 font-semibold text-cyan-400">
                <Zap className="w-4 h-4 fill-cyan-500/20" /> Energía Pura
              </span>
              <span>{char.recursos.energiaActual} / {char.recursos.energiaMaxima}</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="bg-cyan-500 h-full transition-all duration-300"
                style={{ width: `${(char.recursos.energiaActual / char.recursos.energiaMaxima) * 100}%` }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => modificarRecurso("energiaActual", -5)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs py-1 rounded flex justify-center items-center"><Minus className="w-3 h-3"/></button>
              <button onClick={() => modificarRecurso("energiaActual", 5)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs py-1 rounded flex justify-center items-center"><Plus className="w-3 h-3"/></button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-1.5 font-semibold text-amber-400">
                <Flame className="w-4 h-4 fill-amber-500/20" /> Saciedad / Hambre
              </span>
              <span>{char.recursos.hambre}%</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${char.recursos.hambre}%` }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => modificarRecurso("hambre", -10)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs py-1 rounded flex justify-center items-center"><Minus className="w-3 h-3"/></button>
              <button onClick={() => modificarRecurso("hambre", 10)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs py-1 rounded flex justify-center items-center"><Plus className="w-3 h-3"/></button>
            </div>
            <p className={`text-[11px] mt-1 font-medium ${estadoHambre.color}`}>
              {estadoHambre.label}
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 border-b border-slate-800 pb-2">
              <Shield className="w-5 h-5 text-indigo-400" /> Atributos
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(char.atributos).map(([nombre, valor]) => (
                <div key={nombre} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="capitalize text-slate-300 font-medium text-sm">{nombre}</span>
                  <span className="text-lg font-bold text-indigo-300">{valor}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 border-b border-slate-800 pb-2">
              <Award className="w-5 h-5 text-amber-400" /> Títulos y Poder Único
            </h2>
            
            <div>
              <p className="text-xs text-slate-400 mb-1">Títulos Activos</p>
              <div className="flex flex-wrap gap-2">
                {char.titulos.map((t, idx) => (
                  <span key={idx} className="bg-slate-800 text-amber-200 border border-amber-500/30 text-xs px-2.5 py-1 rounded">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <p className="text-xs text-slate-400">Pasiva de Raza / Historia</p>
              <p className="text-sm text-slate-200">{char.pasiva}</p>
            </div>

            <div className="bg-indigo-950/30 border border-indigo-800/40 p-3.5 rounded-lg space-y-1">
              <p className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
                <Dna className="w-3.5 h-3.5" /> Habilidad O (Secreta)
              </p>
              <p className="text-sm font-semibold text-slate-200">{char.habilidadO.nombre}</p>
              <p className="text-xs text-slate-400">{char.habilidadO.efecto}</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}