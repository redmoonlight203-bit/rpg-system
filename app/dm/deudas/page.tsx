"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Skull, Handshake, Check, Clock } from "lucide-react";

interface Deuda {
  id: string;
  user_id: string;
  titulo: string;
  mensaje: string;
  estado: string;
  created_at: string;
  fecha_pago_solicitado?: string;
}

export default function DeudasKuroi() {
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarDeudas = async () => {
    setCargando(true);
    const { data: deudasData, error } = await supabase
      .from("deudas_kuroi")
      .select("*")
      .order("created_at", { ascending: false });

    if (deudasData && !error) {
      setDeudas(deudasData as Deuda[]);
    }
    setCargando(false);
  };

  
useEffect(() => {
  let cancelado = false;

  const consulta = supabase
    .from("deudas_kuroi")
    .select("*")
    .order("created_at", { ascending: false });

  consulta.then(({ data, error }) => {
    if (cancelado) return;

    if (!error && data) {
      setDeudas(data as Deuda[]);
    } else if (error) {
      console.error("Error al cargar deudas:", error.message);
    }

    setCargando(false);
  });

  return () => {
    cancelado = true;
  };
}, []);


  const resolverDeuda = async (deudaId: string, nuevoEstado: "aprobada" | "rechazada" | "pendiente_pago_confirmacion") => {
    const updateData: {
      estado: "aprobada" | "rechazada" | "pendiente_pago_confirmacion";
      fecha_pago_solicitado?: string;
    } = {
      estado: nuevoEstado,
    };
    
    // Si Kuroi decide cobrar la deuda hoy, guardamos la fecha para el temporizador de 2 días
    if (nuevoEstado === "pendiente_pago_confirmacion") {
      updateData.fecha_pago_solicitado = new Date().toISOString();
      if (!window.confirm("¿Estás seguro de COBRAR esta deuda? El jugador tendrá 2 días en la vida real para saldarla en el rol.")) return;
    } else {
      if (!window.confirm(`¿Seguro que deseas marcar este pacto como ${nuevoEstado.toUpperCase()}?`)) return;
    }

    const { error } = await supabase
      .from("deudas_kuroi")
      .update(updateData)
      .eq("id", deudaId);

    if (!error) {
      cargarDeudas();
    } else {
      alert("Error al actualizar la deuda.");
    }
  };

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-amber-500 font-mono animate-pulse">Abriendo la Bóveda de Pactos...</div>;

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 relative z-10 pb-20">
        
        {/* CABECERA Y NAVEGACIÓN SUPERIOR */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-amber-900/50 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-950/40 border border-amber-800 rounded-lg text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Handshake className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono">
                Bóveda de Deudas
              </h1>
              <p className="text-amber-700/80 text-xs font-mono tracking-widest uppercase">
                [ REGISTRO DE PACTOS, FAVORES Y COBROS ]
              </p>
            </div>
          </div>
        </header>

        {/* CONTENIDO DEL GESTOR DE DEUDAS */}
        <section className="bg-neutral-950 border border-amber-900/40 rounded-xl p-6 space-y-6">
          <div className="border-b border-neutral-900 pb-3">
            <h2 className="text-lg font-bold text-amber-500 font-mono uppercase tracking-widest flex items-center gap-2">
              <Skull className="w-5 h-5 text-amber-600" /> Pactos Anotados por los Reencarnados ({deudas.length})
            </h2>
            <p className="text-neutral-500 text-xs font-mono mt-1">
              Aprueba o rechaza los favores. Cuando un jugador deba pagar, marca la deuda como <strong>&quot;PAGADA&quot;</strong> para iniciar su temporizador fatal de 2 días.
            </p>
          </div>

          {deudas.length === 0 ? (
            <p className="text-neutral-600 font-mono text-xs italic text-center py-12">No hay pactos registrados en el mundo actualmente.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deudas.map((item) => (
                <div key={item.id} className="bg-black border border-neutral-800 hover:border-amber-900/60 transition-colors p-5 rounded-xl space-y-4 flex flex-col justify-between">
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                        item.estado === "pendiente_aprobacion" ? "bg-orange-950/60 border-orange-800 text-orange-400 animate-pulse" :
                        item.estado === "aprobada" ? "bg-emerald-950/60 border-emerald-800 text-emerald-400" :
                        item.estado === "pendiente_pago_confirmacion" ? "bg-cyan-950/60 border-cyan-800 text-cyan-400" :
                        item.estado === "completada" ? "bg-neutral-900 border-neutral-700 text-neutral-500" :
                        "bg-red-950/60 border-red-800 text-red-400"
                      }`}>
                        Estado: {item.estado.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h3 className="text-base font-bold text-neutral-100 font-mono">{item.titulo}</h3>
                    
                    <p className="text-xs text-neutral-300 italic bg-neutral-900/60 p-3 rounded border border-neutral-800 font-serif leading-relaxed">
                      &ldquo;{item.mensaje}&rdquo;
                    </p>
                  </div>

                  {/* Botonera Contextual según el Estado */}
                  <div className="pt-3 border-t border-neutral-900 flex flex-col gap-2">
                    
                    {/* 1. Si está recién enviada */}
                    {item.estado === "pendiente_aprobacion" && (
                      <div className="flex gap-2">
                        <button onClick={() => resolverDeuda(item.id, "aprobada")} className="flex-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 text-[11px] font-mono py-2 rounded font-bold uppercase transition-colors">
                          Aprobar Pacto
                        </button>
                        <button onClick={() => resolverDeuda(item.id, "rechazada")} className="flex-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-[11px] font-mono py-2 rounded font-bold uppercase transition-colors">
                          Rechazar
                        </button>
                      </div>
                    )}

                    {/* 2. Si está aprobada y el jugador la está usando (Esperando Cobro de Kuroi) */}
                    {item.estado === "aprobada" && (
                      <button onClick={() => resolverDeuda(item.id, "pendiente_pago_confirmacion")} className="w-full bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-200 text-xs font-mono py-2.5 rounded font-bold uppercase flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-900/20">
                        <Check className="w-4 h-4 text-amber-400" /> Marcar Pacto como PAGADO
                      </button>
                    )}

                    {/* 3. Si Kuroi cobró y el jugador tiene 2 días para confirmar */}
                    {item.estado === "pendiente_pago_confirmacion" && (
                      <div className="w-full text-center text-xs font-mono text-cyan-400 bg-cyan-950/40 p-2.5 rounded border border-cyan-900 flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> El reloj de 2 días está corriendo para el Jugador.
                      </div>
                    )}

                    {/* 4. Si la deuda se pagó y el jugador confirmó */}
                    {item.estado === "completada" && (
                      <div className="w-full text-center text-xs font-mono text-neutral-500 bg-neutral-900 p-2 rounded">
                        ✓ Deuda Saldada y Terminada
                      </div>
                    )}

                    {/* 5. Si la rechazaste */}
                    {item.estado === "rechazada" && (
                      <div className="w-full text-center text-xs font-mono text-red-500 bg-red-950/30 p-2 rounded border border-red-900/50">
                        Pacto Denegado
                      </div>
                    )}

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