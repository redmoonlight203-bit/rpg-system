"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  Skull, Map, User, Handshake, Hammer,
  ShoppingBag, Sliders, LogOut, Home, Crown, Swords
} from "lucide-react";

// `ko` es un subtítulo decorativo en hangul. Si alguno no te convence,
// bórralo o cámbialo: no afecta a la lógica.
const menu = [
  { id: "panel", path: "/dm/panel", label: "Centro de Mando", ko: "지휘소", icon: Home },
  { id: "personajes", path: "/dm/personajes", label: "Gestión de Almas", ko: "영혼", icon: User },
  { id: "deudas", path: "/dm/deudas", label: "Bóveda de Deudas", ko: "부채", icon: Handshake },
  { id: "combate", path: "/dm/combate", label: "Campo de batalla", ko: "전투", icon: Swords },
  { id: "forja", path: "/dm/forja", label: "El Yunque (Forja)", ko: "대장간", icon: Hammer },
  { id: "reglas", path: "/dm/reglas", label: "Reglas & Stats", ko: "규칙", icon: Sliders },
  { id: "mercado", path: "/dm/mercado", label: "Mercado Negro", ko: "시장", icon: ShoppingBag },
];

export default function DMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const esActivo = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="h-screen bg-black text-neutral-200 font-serif flex flex-col md:flex-row overflow-hidden">

      {/* ===== BARRA SUPERIOR (solo móvil) ===== */}
      <header className="md:hidden shrink-0 bg-neutral-950 border-b border-amber-500/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-red-500" />
            <span className="text-xs font-black uppercase tracking-[0.25em] font-mono text-neutral-100">
              Dominio Kuroi
            </span>
          </div>
          <button
            onClick={cerrarSesion}
            aria-label="Cerrar sesión"
            className="p-2 text-neutral-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {menu.map((item) => {
            const activo = esActivo(item.path);
            const Icono = item.icon;
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border-b-2 transition-colors ${
                  activo
                    ? "border-red-600 text-amber-300"
                    : "border-transparent text-neutral-500 hover:text-neutral-200"
                }`}
              >
                <Icono className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* ===== SIDEBAR (escritorio) ===== */}
      <aside className="w-64 bg-neutral-950 border-r border-amber-500/20 hidden md:flex flex-col h-full shrink-0">

        {/* Cabecera */}
        <div className="p-6 flex items-center gap-3">
          <div className="p-2.5 bg-red-950/60 border border-amber-500/50 text-red-500 glow-blood-sm">
            <Skull className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-black text-neutral-100 uppercase tracking-[0.2em] font-mono">
              Dominio Kuroi
            </h2>
            <p className="text-[9px] font-mono text-amber-500 tracking-[0.25em] uppercase flex items-center gap-1 mt-1">
              <Crown className="w-3 h-3" /> Dungeon Master
            </p>
          </div>
        </div>
        <div className="kr-divider mx-6" />

        {/* Navegación */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-600 font-bold ml-3 mb-3 block">
            Módulos del Sistema
          </span>

          {menu.map((item) => {
            const activo = esActivo(item.path);
            const Icono = item.icon;

            return (
              <Link
                key={item.id}
                href={item.path}
                className={`group relative flex items-center gap-3 pl-4 pr-3 py-2.5 text-xs font-mono uppercase tracking-wider transition-all ${
                  activo
                    ? "bg-gradient-to-r from-red-950/80 to-transparent text-amber-300 font-bold"
                    : "text-neutral-400 hover:bg-neutral-900/70 hover:text-neutral-100"
                }`}
              >
                {/* Barra indicadora */}
                <span
                  className={`absolute left-0 top-1 bottom-1 w-[3px] transition-colors ${
                    activo ? "bg-red-600" : "bg-transparent group-hover:bg-amber-500/40"
                  }`}
                />
                <Icono className={`w-4 h-4 shrink-0 ${activo ? "text-red-500" : "text-neutral-500 group-hover:text-amber-500"}`} />
                <span className="flex-1">{item.label}</span>
                <span className={`text-[10px] tracking-normal ${activo ? "text-amber-500" : "text-neutral-700 group-hover:text-amber-700"}`}>
                  {item.ko}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Pie */}
        <div className="p-4 border-t border-amber-500/15">
          <button
            onClick={cerrarSesion}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-neutral-800 hover:border-red-700 hover:bg-red-950/50 text-xs text-neutral-400 hover:text-red-300 font-mono uppercase tracking-wider transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ===== CONTENIDO ===== */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto">
        {children}
      </div>

    </div>
  );
}
