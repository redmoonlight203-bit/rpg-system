"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { 
  LogOut, User, BookOpen, ShoppingBag, 
  Sparkles, Map, Hammer, Hourglass, Handshake 
} from "lucide-react";

export default function NexoReencarnado() {
  const router = useRouter();
  const [correoAlma, setCorreoAlma] = useState<string>("");

  useEffect(() => {
    const verificarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setCorreoAlma(session.user.email || "Alma Desconocida");
      }
    };
    verificarSesion();
  }, [router]);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const menuOpciones = [
    {
      titulo: "Personajes",
      descripcion: "Revisa tus avatares, estadísticas y estado en los mundos.",
      icono: User,
      ruta: "/ficha/personajes",
      color: "text-red-500"
    },
    {
      titulo: "Deudas de Kuroi",
      descripcion: "Pactos y promesas del Master. Una vez aprobado, el contrato es inquebrantable.",
      icono: Handshake,
      ruta: "/ficha/deudas",
      color: "text-amber-500"
    },
    {
      titulo: "El Códice",
      descripcion: "Conocimiento, bestiario y secretos descubiertos en tus viajes.",
      icono: BookOpen,
      ruta: "/ficha/codex",
      color: "text-neutral-400"
    },
    {
      titulo: "Tienda de Kuroi",
      descripcion: "Intercambia recursos por favores, objetos o milagros.",
      icono: ShoppingBag,
      ruta: "/ficha/tienda",
      color: "text-yellow-600"
    },
    {
      titulo: "Vínculo de Alma",
      descripcion: "Habilidades y reliquias que conservas tras la muerte para futuros runs.",
      icono: Sparkles,
      ruta: "/ficha/alma",
      color: "text-cyan-600"
    },
    {
      titulo: "Cartografía",
      descripcion: "Mapas, zonas seguras y territorios explorados.",
      icono: Map,
      ruta: "/ficha/mapas",
      color: "text-emerald-700"
    },
    {
      titulo: "Forja de Creación",
      descripcion: "Propón nuevos objetos o habilidades. Kuroi decidirá su destino.",
      icono: Hammer,
      ruta: "/ficha/creacion",
      color: "text-orange-600"
    },
    {
      titulo: "Línea de Tiempo",
      descripcion: "Crónica de tus vidas pasadas y la historia del mundo.",
      icono: Hourglass,
      ruta: "/ficha/lore",
      color: "text-purple-600"
    }
  ];

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative overflow-hidden">
      
      {/* Luces abisales de fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-red-950/10 blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-10 mt-4">
        
        {/* Cabecera del Nexo */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-red-900/40 pb-6">
          <div>
            <h1 className="text-3xl font-black text-neutral-100 uppercase tracking-widest font-mono">
              El Nexo
            </h1>
            <p className="text-red-700/80 text-sm font-mono tracking-widest mt-1 uppercase">
              Santuario de: {correoAlma}
            </p>
          </div>

          <button
            onClick={cerrarSesion}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 rounded-lg text-xs transition-colors text-neutral-400 hover:text-red-400 font-mono uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" /> Despertar (Salir)
          </button>
        </header>

        {/* Cuadrícula del Menú Principal */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuOpciones.map((opcion, index) => {
            const Icono = opcion.icono;
            return (
              <button
                key={index}
                onClick={() => router.push(opcion.ruta)}
                className="group relative bg-neutral-950/80 border border-neutral-900 hover:border-red-900/60 p-6 rounded-xl text-left transition-all duration-300 hover:glow-blood overflow-hidden flex flex-col gap-4"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10 flex items-center gap-3">
                  <div className={`p-3 bg-neutral-900 border border-neutral-800 rounded-lg group-hover:border-red-900/50 transition-colors ${opcion.color}`}>
                    <Icono className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-neutral-200 group-hover:text-red-100 transition-colors font-mono uppercase tracking-wide">
                    {opcion.titulo}
                  </h2>
                </div>
                
                <p className="relative z-10 text-sm text-neutral-500 group-hover:text-neutral-400 font-sans leading-relaxed">
                  {opcion.descripcion}
                </p>
              </button>
            );
          })}
        </section>

      </div>
    </main>
  );
}