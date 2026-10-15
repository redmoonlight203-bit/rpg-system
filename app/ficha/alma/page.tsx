"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  ArrowLeft,
  Flame,
  UserCheck,
  RefreshCw,
  Lock,
  ShieldAlert,
  ArrowRightLeft,
} from "lucide-react";

interface ItemInventario {
  id: string;
  user_id: string;
  forja_id?: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  imagen_url?: string;
  clase: string;
  stats: Record<string, number>;
  ligado_al_alma: boolean;
  personaje_id: number | null;
  created_at: string;
}

interface Personaje {
  id: number;
  nombre: string;
}

export default function NexoDelAlma() {
  const router = useRouter();
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [pjActivo, setPjActivo] = useState<Personaje | null>(null);
  const [pestana, setPestana] = useState<"alma" | "equipados">("alma");
  const [cargando, setCargando] = useState(true);

  const cargarDatos = async () => {
    setCargando(true);

    // 1. Obtener sesión del usuario
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const userId = session.user.id;

    // 2. Cargar Personajes del Jugador
    const { data: pjsData } = await supabase
      .from("personajes")
      .select("id, nombre")
      .eq("user_id", userId);

    if (pjsData && pjsData.length > 0) {
      setPersonajes(pjsData as Personaje[]);
      
      // Obtener el personaje activo guardado en localStorage o el primero
      const activeId = localStorage.getItem("personaje_activo_id");
      const encontrado = pjsData.find(p => p.id.toString() === activeId);
      setPjActivo(encontrado ? (encontrado as Personaje) : (pjsData[0] as Personaje));
    }

    // 3. Cargar Objetos del Inventario del Alma / Jugador
    const { data: invData } = await supabase
      .from("inventario_jugador")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (invData) {
      setItems(invData as ItemInventario[]);
    }

    setCargando(false);
  };

  useEffect(() => {
    let activo = true;

    Promise.resolve().then(() => {
      if (activo) {
        void cargarDatos();
      }
    });

    return () => {
      activo = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // EQUIPAR / VINCULAR A UN AVATAR
  const vincularAApajon = async (itemId: string, pjId: number) => {
    const { error } = await supabase
      .from("inventario_jugador")
      .update({ personaje_id: pjId })
      .eq("id", itemId);

    if (!error) {
      cargarDatos();
    } else {
      alert("No se pudo manifestar el objeto en el avatar.");
    }
  };

  // REGRESAR AL NEXO DEL ALMA
  const devolverAlNexo = async (itemId: string) => {
    const { error } = await supabase
      .from("inventario_jugador")
      .update({ personaje_id: null })
      .eq("id", itemId);

    if (!error) {
      cargarDatos();
    } else {
      alert("No se pudo desvincular el objeto del avatar.");
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-purple-500 font-mono animate-pulse">
        Sincronizando con el Nexo de las Almas...
      </div>
    );
  }

  // Filtrar objetos en la caja fuerte del Alma vs Equipados en avatares
  const enElAlma = items.filter(i => i.personaje_id === null);
  const equipados = items.filter(i => i.personaje_id !== null);

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative overflow-x-hidden">
      
      {/* Luz mística de fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-purple-950/20 blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 pb-20">
        
        {/* CABECERA */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-purple-900/40 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/ficha")} className="text-neutral-500 hover:text-purple-400 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <span className="text-[10px] font-mono uppercase text-purple-500 tracking-widest font-bold">
                [ BÓVEDA ESPIRITUAL ]
              </span>
              <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono flex items-center gap-2">
                <Flame className="w-6 h-6 text-purple-600" /> Nexo del Alma
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {pjActivo && (
              <div className="bg-neutral-950 border border-purple-900/50 px-3 py-1.5 rounded-lg text-xs font-mono">
                <span className="text-neutral-500 block text-[9px] uppercase">Avatar Seleccionado:</span>
                <strong className="text-purple-300">{pjActivo.nombre}</strong>
              </div>
            )}
            <button onClick={cargarDatos} className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded transition-colors text-neutral-400">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* NAVEGACIÓN DE PESTAÑAS */}
        <nav className="flex flex-wrap gap-2 border-b border-neutral-900 pb-4">
          <button
            onClick={() => setPestana("alma")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
              pestana === "alma"
                ? "bg-purple-950/80 border border-purple-800 text-purple-200 font-bold shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                : "bg-neutral-950 border border-neutral-900 text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <Lock className="w-4 h-4 text-purple-400" />
            Guardado en el Alma ({enElAlma.length})
          </button>

          <button
            onClick={() => setPestana("equipados")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
              pestana === "equipados"
                ? "bg-purple-950/80 border border-purple-800 text-purple-200 font-bold shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                : "bg-neutral-950 border border-neutral-900 text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Manifestado en Avatares ({equipados.length})
          </button>
        </nav>

        {/* PESTAÑA 1: GUARDADO EN EL ALMA (Inmune a la muerte) */}
        {pestana === "alma" && (
          <section className="space-y-4">
            <div className="bg-purple-950/10 border border-purple-900/30 p-4 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <p className="text-xs font-serif text-purple-300/80 leading-relaxed">
                Los objetos resguardados aquí permanecen vinculados a tu esencia eterna. Si tu avatar muere en <strong>El Mundo</strong>, no perderás nada de lo que permanezca en esta pestaña.
              </p>
            </div>

            {enElAlma.length === 0 ? (
              <div className="bg-neutral-950 border border-neutral-900 p-12 text-center rounded-xl text-neutral-500 font-mono text-xs uppercase">
                Tu Bóveda Espiritual está vacía. Adquiere reliquias en el Mercado o recíbelas de Kuroi.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enElAlma.map((item) => (
                  <div key={item.id} className="bg-black border border-purple-900/30 rounded-xl overflow-hidden flex flex-col justify-between hover:border-purple-800 transition-colors p-5 space-y-4 shadow-lg shadow-black/60">
                    
                    {item.imagen_url && (
                      <div className="relative w-full h-36 bg-neutral-900 rounded overflow-hidden">
                        <Image
                          src={item.imagen_url}
                          alt={item.nombre}
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-purple-900 bg-purple-950 text-purple-300 uppercase">
                          {item.tipo} • RANGO {item.clase}
                        </span>
                        {item.ligado_al_alma && (
                          <span className="text-[9px] font-mono bg-indigo-950 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded" title="Volverá al Alma si tu avatar muere">
                            ALMA LIGADA
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-neutral-100 font-mono">{item.nombre}</h3>
                      <p className="text-xs text-neutral-400 italic font-serif leading-relaxed line-clamp-3">&ldquo;{item.descripcion}&rdquo;</p>

                      {/* STATS */}
                      {item.stats && Object.keys(item.stats).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-900">
                          {Object.entries(item.stats).map(([k, v]) => (
                            <span key={k} className="text-[9px] font-mono bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded text-emerald-400 font-bold">
                              {k.toUpperCase()}: +{v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* VINCULAR A AVATAR */}
                    <div className="pt-3 border-t border-neutral-900 space-y-2">
                      <label className="text-[9px] font-mono text-neutral-500 uppercase block">Manifestar en Avatar:</label>
                      <div className="flex gap-2">
                        {personajes.map((pj) => (
                          <button
                            key={pj.id}
                            onClick={() => vincularAApajon(item.id, pj.id)}
                            className="flex-1 bg-neutral-900 hover:bg-purple-950 border border-neutral-800 hover:border-purple-800 text-neutral-300 hover:text-purple-200 py-2 rounded text-[10px] font-mono uppercase font-bold transition-colors flex items-center justify-center gap-1"
                          >
                            <ArrowRightLeft className="w-3 h-3" /> {pj.nombre}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* PESTAÑA 2: MANIFESTADO EN AVATARES (Peligro de pérdida al morir) */}
        {pestana === "equipados" && (
          <section className="space-y-4">
            <div className="bg-amber-950/10 border border-amber-900/30 p-4 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs font-serif text-amber-300/80 leading-relaxed">
                Estos objetos están equipados o portados por tus personajes en <strong>El Mundo</strong>. Si el avatar muere, estos objetos quedarán tirados en su cadáver (a menos que tengan la propiedad <strong>ALMA LIGADA</strong>).
              </p>
            </div>

            {equipados.length === 0 ? (
              <div className="bg-neutral-950 border border-neutral-900 p-12 text-center rounded-xl text-neutral-500 font-mono text-xs uppercase">
                No tienes reliquias manifestadas en ningún avatar en este momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {equipados.map((item) => {
                  const pjPortador = personajes.find(p => p.id === item.personaje_id);
                  return (
                    <div key={item.id} className="bg-black border border-amber-900/30 rounded-xl overflow-hidden flex flex-col justify-between p-5 space-y-4 shadow-lg">
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-amber-900 bg-amber-950 text-amber-300 uppercase">
                            Portador: {pjPortador?.nombre || "Avatar"}
                          </span>
                          {item.ligado_al_alma ? (
                            <span className="text-[9px] font-mono bg-indigo-950 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded">
                              ALMA LIGADA
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono bg-red-950 border border-red-800 text-red-400 px-2 py-0.5 rounded">
                              RIESGO DE PERDIDA
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-neutral-100 font-mono">{item.nombre}</h3>
                        <p className="text-xs text-neutral-400 italic font-serif leading-relaxed line-clamp-2">
                          &ldquo;{item.descripcion}&rdquo;
                        </p>
                      </div>

                      <button
                        onClick={() => devolverAlNexo(item.id)}
                        className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white py-2 rounded text-[10px] font-mono uppercase font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <Lock className="w-3 h-3 text-purple-400" /> Resguardar en el Alma
                      </button>

                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

      </div>
    </main>
  );
}