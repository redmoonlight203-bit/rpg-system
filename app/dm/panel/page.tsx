"use client";

import React from "react";
import Link from "next/link";
import {
  Map, User, Handshake, Hammer, ShoppingBag, Sliders, Skull, ArrowUpRight
} from "lucide-react";

// Un solo estilo para todas las tarjetas: la identidad la da la paleta,
// no un color distinto por módulo. `ko` es decorativo (puedes quitarlo).
const modulos = [
  {
    titulo: "El Tablero",
    ko: "지도",
    desc: "Controla los mapas del mundo, los tokens y el paso del tiempo del juego.",
    icono: Map,
    ruta: "/dm/tablero",
  },
  {
    titulo: "Gestión de Almas",
    ko: "영혼",
    desc: "Aprueba cuentas nuevas, edita stats y maneja estados de vida (Vivo, Muerto, Sellado).",
    icono: User,
    ruta: "/dm/personajes",
  },
  {
    titulo: "Bóveda de Deudas",
    ko: "부채",
    desc: "Revisa, aprueba y cobra los pactos y promesas realizadas por los jugadores.",
    icono: Handshake,
    ruta: "/dm/deudas",
  },
  {
    titulo: "El Yunque (Forja)",
    ko: "대장간",
    desc: "Juzga y ponle precio/rango a las armas y habilidades que inventan los jugadores.",
    icono: Hammer,
    ruta: "/dm/forja",
  },
  {
    titulo: "Reglas & Stats",
    ko: "규칙",
    desc: "Crea o elimina atributos globales (Fuerza, Cordura, Durabilidad) para todo el juego.",
    icono: Sliders,
    ruta: "/dm/reglas",
  },
  {
    titulo: "Mercado Negro",
    ko: "시장",
    desc: "Publica ofertas de objetos, personajes y habilidades para que las compren.",
    icono: ShoppingBag,
    ruta: "/dm/mercado",
  },
];

export default function PanelPrincipalKuroi() {
  return (
    <main className="p-6 md:p-10 relative min-h-full kr-ambient">
      <div className="max-w-5xl mx-auto space-y-12 relative z-10">

        <header className="text-center space-y-6 pt-4">
          <div className="inline-flex p-4 bg-red-950/50 border border-amber-500/50 glow-blood">
            <Skull className="w-12 h-12 text-red-500" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-black text-neutral-100 uppercase tracking-[0.2em] font-mono">
              Centro de Mando <span className="text-red-600">Kuroi</span>
            </h1>
            <p className="text-amber-500 font-mono text-xs uppercase tracking-[0.3em]">
              Selecciona el módulo del mundo que deseas controlar
            </p>
          </div>
          <div className="kr-divider max-w-md mx-auto" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modulos.map((mod, idx) => {
            const Icono = mod.icono;
            return (
              <Link
                key={mod.ruta}
                href={mod.ruta}
                className="kr-panel group p-6 flex flex-col gap-5"
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-neutral-900 border border-amber-500/30 group-hover:border-red-700 group-hover:bg-red-950/40 transition-colors">
                    <Icono className="w-6 h-6 text-amber-500 group-hover:text-red-400 transition-colors" />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-700 tracking-widest">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-base font-bold text-neutral-100 font-mono uppercase tracking-wider">
                      {mod.titulo}
                    </h2>
                    <span className="text-xs text-amber-600">{mod.ko}</span>
                  </div>
                  <p className="text-xs text-neutral-400 font-serif mt-2 leading-relaxed">
                    {mod.desc}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-600 group-hover:text-amber-400 transition-colors">
                  Entrar <ArrowUpRight className="w-3 h-3" />
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </main>
  );
}