"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { ShieldAlert, CheckCircle, XCircle, LogOut, Skull } from "lucide-react";

// Definimos cómo luce un perfil en la base de datos
interface Perfil {
  id: string;
  email: string;
  rol: string;
  estado: string;
  created_at: string;
}

export default function PanelKuroi() {
  const router = useRouter();
  const [pendientes, setPendientes] = useState<Perfil[]>([]);
  const [cargando, setCargando] = useState(true);

  // Función para cargar a los usuarios en estado 'pendiente'
  const cargarPendientes = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from("perfiles")
      .select("*")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPendientes(data);
    }
    setCargando(false);
  };

  // Cargar datos al entrar a la página
  useEffect(() => {
    cargarPendientes();
  }, []);

  // Función para Aprobar un alma
  const aprobarAlma = async (id: string, email: string) => {
    const confirmar = window.confirm(`¿Permitir la entrada de ${email} al mundo?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("perfiles")
      .update({ estado: "aprobado" })
      .eq("id", id);

    if (!error) {
      alert("Alma aprobada con éxito.");
      cargarPendientes(); // Recargar la lista
    } else {
      alert("Error al intentar aprobar el alma.");
    }
  };

  // Función para Rechazar un alma
  const rechazarAlma = async (id: string, email: string) => {
    const confirmar = window.confirm(`¿Rechazar a ${email} y enviarlo al vacío?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("perfiles")
      .update({ estado: "rechazado" })
      .eq("id", id);

    if (!error) {
      alert("El alma ha sido rechazada.");
      cargarPendientes(); // Recargar la lista
    } else {
      alert("Error al intentar rechazar el alma.");
    }
  };

  // Función para cerrar sesión
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Cabecera del Panel */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-red-900/50 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg glow-blood-sm text-red-500">
              <Skull className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono">
                Dominio de Kuroi
              </h1>
              <p className="text-red-700/80 text-sm font-mono tracking-widest">
                [ PANEL DE CONTROL DEL MASTER ]
              </p>
            </div>
          </div>

          <button
            onClick={cerrarSesion}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-sm transition-colors text-neutral-400 hover:text-red-400 font-mono"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </header>

        {/* Sección: Almas en el Limbo */}
        <section className="bg-neutral-950/80 border border-red-900/30 rounded-xl p-6 shadow-[0_0_15px_rgba(153,27,27,0.1)]">
          <h2 className="text-lg font-bold text-red-500 flex items-center gap-2 mb-4 font-mono uppercase tracking-widest">
            <ShieldAlert className="w-5 h-5" /> Almas en el Limbo (Pendientes)
          </h2>

          {cargando ? (
            <p className="text-neutral-500 text-sm font-mono">Consultando el abismo...</p>
          ) : pendientes.length === 0 ? (
            <div className="text-center py-8 border border-neutral-900 rounded-lg bg-neutral-900/20">
              <p className="text-neutral-500 font-mono text-sm">
                No hay almas esperando juicio en este momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendientes.map((perfil) => (
                <div 
                  key={perfil.id} 
                  className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-black border border-neutral-800 hover:border-red-900/50 rounded-lg transition-colors gap-4"
                >
                  <div>
                    <p className="font-bold text-neutral-200 text-sm">{perfil.email}</p>
                    <p className="text-xs text-neutral-500 font-mono mt-1">
                      Fecha de invocación: {new Date(perfil.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={() => aprobarAlma(perfil.id, perfil.email)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-100 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" /> Permitir
                    </button>
                    <button
                      onClick={() => rechazarAlma(perfil.id, perfil.email)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}