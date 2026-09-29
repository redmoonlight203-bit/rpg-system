"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { 
  Skull, Map, User, Handshake, Hammer, 
  ShoppingBag, Sliders, LogOut, Home, Crown
} from "lucide-react";

export default function DMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const menu = [
    { id: "panel", path: "/dm/panel", label: "Centro de Mando", icon: Home },
    { id: "tablero", path: "/dm/tablero", label: "El Tablero", icon: Map },
    { id: "personajes", path: "/dm/personajes", label: "Gestión de Almas", icon: User },
    { id: "deudas", path: "/dm/deudas", label: "Bóveda de Deudas", icon: Handshake },
    { id: "forja", path: "/dm/forja", label: "El Yunque (Forja)", icon: Hammer },
    { id: "reglas", path: "/dm/reglas", label: "Reglas & Stats", icon: Sliders },
    { id: "mercado", path: "/dm/mercado", label: "Mercado Negro", icon: ShoppingBag },
  ];

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-black text-neutral-200 font-serif flex">
      
      {/* SIDEBAR LATERAL FIJA */}
      <aside className="w-64 bg-neutral-950 border-r border-red-900/40 hidden md:flex flex-col h-screen sticky top-0 shrink-0">
        
        {/* Logo / Cabecera Sidebar */}
        <div className="p-6 border-b border-red-900/40 flex items-center gap-3">
          <div className="p-2 bg-red-950/40 border border-red-800 rounded-lg text-red-500 glow-blood-sm">
            <Skull className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-black text-neutral-100 uppercase tracking-widest font-mono">Dominio Kuroi</h2>
            <p className="text-[9px] font-mono text-red-500 tracking-widest uppercase flex items-center gap-1 mt-0.5">
              <Crown className="w-3 h-3" /> Dungeon Master
            </p>
          </div>
        </div>

        {/* Navegación Sidebar */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <span className="text-[10px] font-mono uppercase text-neutral-600 font-bold ml-2 mb-2 block">Módulos del Sistema</span>
          
          {menu.map((item) => {
            const activo = pathname === item.path;
            const Icono = item.icon;
            
            return (
              <Link 
                key={item.id} 
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                  activo 
                    ? "bg-red-950/60 border border-red-800/80 text-red-200 font-bold shadow-[0_0_10px_rgba(220,38,38,0.2)]" 
                    : "border border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                }`}
              >
                <Icono className={`w-4 h-4 ${activo ? "text-red-400" : "text-neutral-500"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-neutral-900">
          <button 
            onClick={cerrarSesion}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-red-950 border border-neutral-800 hover:border-red-800 rounded-lg text-xs text-neutral-400 hover:text-red-400 font-mono uppercase transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL DE LA PÁGINA */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        {children}
      </div>

    </div>
  );
}