"use client";

import React from "react";
import Link from "next/link";
import { 
  Map, User, Handshake, Hammer, ShoppingBag, Hourglass, Sliders, Skull
} from "lucide-react";

export default function PanelPrincipalKuroi() {
  const modulos = [
    {
      titulo: "El Tablero Táctico",
      desc: "Gestor de mapas, ciudades, mazmorras anidadas y tokens en tiempo real.",
      icono: Map,
      ruta: "/dm/tablero",
      color: "text-red-500",
      bg: "bg-red-950/40 border-red-800",
      glow: "hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:border-red-500"
    },
    {
      titulo: "Gestión de Almas",
      desc: "Aprueba cuentas nuevas, edita stats y maneja estados de vida (Vivo, Muerto, Sellado).",
      icono: User,
      ruta: "/dm/personajes",
      color: "text-amber-500",
      bg: "bg-amber-950/40 border-amber-800",
      glow: "hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:border-amber-500"
    },
    {
      titulo: "Reglas & Stats",
      desc: "Crea o elimina atributos globales (Fuerza, Cordura, Durabilidad) para todo el juego.",
      icono: Sliders,
      ruta: "/dm/reglas",
      color: "text-emerald-500",
      bg: "bg-emerald-950/40 border-emerald-800",
      glow: "hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:border-emerald-500"
    },
    {
      titulo: "Bóveda de Deudas",
      desc: "Revisa, aprueba y cobra los pactos y promesas realizadas por los jugadores.",
      icono: Handshake,
      ruta: "/dm/deudas",
      color: "text-cyan-500",
      bg: "bg-cyan-950/40 border-cyan-800",
      glow: "hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:border-cyan-500"
    },
    {
      titulo: "El Yunque (Forja)",
      desc: "Juzga y ponle precio/rango a las armas y habilidades que inventan los jugadores.",
      icono: Hammer,
      ruta: "/dm/forja",
      color: "text-orange-500",
      bg: "bg-orange-950/40 border-orange-800",
      glow: "hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:border-orange-500"
    },
    {
      titulo: "Mercado Negro",
      desc: "Publica ofertas de objetos, personajes y habilidades para que las compren.",
      icono: ShoppingBag,
      ruta: "/dm/mercado",
      color: "text-purple-500",
      bg: "bg-purple-950/40 border-purple-800",
      glow: "hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:border-purple-500"
    },
    {
      titulo: "Reloj & Eras",
      desc: "Avanza el tiempo del mundo, crea Eras y eventos históricos globales.",
      icono: Hourglass,
      ruta: "/dm/tiempo",
      color: "text-blue-500",
      bg: "bg-blue-950/40 border-blue-800",
      glow: "hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-blue-500"
    }
  ];

  return (
    <main className="p-8 relative min-h-full">
      {/* Luz ambiental abisal en el fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[300px] bg-red-950/20 blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-10 relative z-10">
        
        <header className="text-center space-y-4">
          <Skull className="w-16 h-16 text-red-600 mx-auto glow-blood" />
          <div>
            <h1 className="text-4xl font-black text-neutral-100 uppercase tracking-widest font-mono">
              Centro de Mando Kuroi
            </h1>
            <p className="text-neutral-400 font-mono text-sm mt-2 uppercase tracking-widest">
              Selecciona el módulo del mundo que deseas controlar
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulos.map((mod, idx) => {
            const Icono = mod.icono;
            return (
              <Link 
                key={idx} 
                href={mod.ruta}
                className={`group p-6 rounded-xl border transition-all duration-300 bg-black flex flex-col gap-4 relative overflow-hidden ${mod.glow} border-neutral-900`}
              >
                {/* Efecto de luz interna al hacer hover */}
                <div className={`absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-10 blur-[50px] transition-opacity ${mod.bg.split(' ')[0]}`} />

                <div className={`p-3 rounded-lg w-fit ${mod.bg} border`}>
                  <Icono className={`w-6 h-6 ${mod.color}`} />
                </div>
                
                <div>
                  <h2 className="text-lg font-bold text-neutral-100 font-mono uppercase tracking-wide">
                    {mod.titulo}
                  </h2>
                  <p className="text-xs text-neutral-400 font-serif mt-1.5 leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </main>
  );
}