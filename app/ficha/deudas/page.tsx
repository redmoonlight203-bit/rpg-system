"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { 
  ArrowLeft, Handshake, Plus, Mail, Calendar, 
  Clock, CheckCircle2, AlertCircle, XCircle, Send, X, ShieldAlert 
} from "lucide-react";

interface Deuda {
  id: string;
  user_id: string;
  titulo: string;
  mensaje: string;
  estado: "pendiente_aprobacion" | "aprobada" | "rechazada" | "pendiente_pago_confirmacion" | "completada";
  created_at: string;
  fecha_pago_solicitado?: string;
}

export default function DeudasKuroi() {
  const router = useRouter();
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [deudaDetalle, setDeudaDetalle] = useState<Deuda | null>(null);

  // Formulario de nueva deuda
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Cargar deudas y evaluar temporizadores automáticos
  const cargarYProcesarDeudas = async () => {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setCargando(false);
      router.push("/login");
      return;
    }

    const userId = session.user.id;
    const { data, error } = await supabase
      .from("deudas_kuroi")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const ahora = new Date().getTime();
      const CINCO_DIAS_MS = 5 * 24 * 60 * 60 * 1000;
      const DOS_DIAS_MS = 2 * 24 * 60 * 60 * 1000;

      // Evaluar auto-aprobaciones y auto-pagos pasados
      const deudasActualizadas = await Promise.all(
        data.map(async (d: Deuda) => {
          const fechaCreacion = new Date(d.created_at).getTime();

          // REGLA 1: Auto-aprobar si pasaron 5 días sin respuesta de Kuroi
          if (d.estado === "pendiente_aprobacion" && (ahora - fechaCreacion > CINCO_DIAS_MS)) {
            await supabase.from("deudas_kuroi").update({ estado: "aprobada" }).eq("id", d.id);
            return { ...d, estado: "aprobada" as const };
          }

          // REGLA 2: Auto-completar si Kuroi marcó pagado y pasaron 2 días sin respuesta del jugador
          if (d.estado === "pendiente_pago_confirmacion" && d.fecha_pago_solicitado) {
            const fechaPago = new Date(d.fecha_pago_solicitado).getTime();
            if (ahora - fechaPago > DOS_DIAS_MS) {
              await supabase.from("deudas_kuroi").update({ estado: "completada" }).eq("id", d.id);
              return { ...d, estado: "completada" as const };
            }
          }

          return d;
        })
      );

      setDeudas(deudasActualizadas);
    }
    setCargando(false);
  };

  useEffect(() => {
    let activo = true;

    Promise.resolve().then(() => {
      if (activo) {
        void cargarYProcesarDeudas();
      }
    });

    return () => {
      activo = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Registrar nueva deuda
  const registrarDeuda = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setEnviando(false);
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("deudas_kuroi").insert([{
      user_id: session.user.id,
      titulo,
      mensaje,
      estado: "pendiente_aprobacion"
    }]);

    if (!error) {
      alert("Promesa enviada a la bitácora de Kuroi.");
      setTitulo("");
      setMensaje("");
      setMostrarFormulario(false);
      cargarYProcesarDeudas();
    } else {
      alert("Error al intentar registrar el pacto.");
    }
    setEnviando(false);
  };

  // Confirmar o rechazar el pago marcado por Kuroi
  const responderPago = async (deudaId: string, aceptar: boolean) => {
    const nuevoEstado = aceptar ? "completada" : "aprobada"; // Si rechaza el pago, vuelve a 'aprobada' activa
    const { error } = await supabase
      .from("deudas_kuroi")
      .update({ estado: nuevoEstado, fecha_pago_solicitado: null })
      .eq("id", deudaId);

    if (!error) {
      alert(aceptar ? "Deuda saldada oficialmente." : "Pago impugnado. La deuda permanece activa.");
      setDeudaDetalle(null);
      cargarYProcesarDeudas();
    }
  };

  const getBadgestado = (estado: string) => {
    switch (estado) {
      case "pendiente_aprobacion":
        return <span className="bg-amber-950/80 border border-amber-800 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1"><Clock className="w-3 h-3"/> Pendiente Kuroi (5d)</span>;
      case "aprobada":
        return <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Pacto Activo</span>;
      case "pendiente_pago_confirmacion":
        return <span className="bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Kuroi declaró Pagado (2d)</span>;
      case "completada":
        return <span className="bg-neutral-900 border border-neutral-800 text-neutral-500 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Saldada</span>;
      case "rechazada":
        return <span className="bg-red-950/80 border border-red-800 text-red-400 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1"><XCircle className="w-3 h-3"/> Rechazada por Kuroi</span>;
      default:
        return null;
    }
  };

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono animate-pulse">Consultando el Registro de Promesas...</div>;

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative">
      <div className="max-w-5xl mx-auto space-y-8 relative z-10 pb-20">
        
        {/* Cabecera */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-red-900/40 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/ficha")} className="text-neutral-500 hover:text-red-400 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono flex items-center gap-2">
                <Handshake className="w-6 h-6 text-amber-500" /> Deudas de Kuroi
              </h1>
              <p className="text-red-700/80 text-xs font-mono tracking-widest mt-1 uppercase">
                [ REGISTRO INMUTABLE DE PROMESAS, FAVORES Y PACTOS ]
              </p>
            </div>
          </div>

          <button
            onClick={() => setMostrarFormulario(true)}
            className="px-4 py-2.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-800/80 text-amber-200 text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" /> Registrar Nueva Promesa
          </button>
        </header>

        {/* Lista de Deudas (Cartas estilo Correo) */}
        {deudas.length === 0 ? (
          <div className="text-center py-20 bg-neutral-950/40 border border-neutral-900 rounded-xl space-y-3">
            <Mail className="w-10 h-10 text-neutral-700 mx-auto" />
            <p className="text-neutral-600 font-mono text-xs uppercase tracking-widest">
              Kuroi no te debe nada en este momento... o aún no lo has registrado.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deudas.map((item) => {
              const fecha = new Date(item.created_at);
              const fechaTexto = `${fecha.toLocaleDateString()} a las ${fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

              return (
                <div
                  key={item.id}
                  onClick={() => setDeudaDetalle(item)}
                  className={`bg-neutral-950 border p-5 rounded-xl transition-all duration-300 cursor-pointer flex flex-col justify-between group relative ${
                    item.estado === "pendiente_pago_confirmacion"
                      ? "border-cyan-800 glow-blood-sm bg-cyan-950/10"
                      : "border-neutral-800 hover:border-amber-900/60"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      {getBadgestado(item.estado)}
                      <span className="text-[10px] font-mono text-neutral-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {fecha.toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-neutral-100 group-hover:text-amber-400 transition-colors font-mono">
                        {item.titulo}
                      </h3>
                      <p className="text-xs text-neutral-400 line-clamp-3 mt-2 bg-black/50 p-3 rounded border border-neutral-900 italic font-serif">
                        &ldquo;{item.mensaje}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t border-neutral-900 flex justify-between items-center text-[11px] font-mono">
                    <span className="text-neutral-600">Registrado el {fechaTexto}</span>
                    <span className="text-amber-500 group-hover:translate-x-1 transition-transform">Ver Carta →</span>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Modal: Registrar Deuda */}
        {mostrarFormulario && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-amber-900/50 p-6 md:p-8 rounded-xl max-w-xl w-full glow-blood relative space-y-6">
              <button onClick={() => setMostrarFormulario(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-red-400">
                <X className="w-6 h-6" />
              </button>

              <div className="border-b border-neutral-900 pb-3">
                <h2 className="text-xl font-bold text-amber-500 font-mono flex items-center gap-2 uppercase">
                  <Send className="w-5 h-5" /> Redactar Promesa de Kuroi
                </h2>
                <p className="text-neutral-500 text-xs font-mono mt-1">
                  Si Kuroi no responde en 5 días, el pacto se aceptará automáticamente.
                </p>
              </div>

              <form onSubmit={registrarDeuda} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-neutral-400 uppercase">Título del Pacto / Promesa</label>
                  <input
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    type="text"
                    placeholder="Ej. Espada de Hueso pendiente tras la gesta del dragón"
                    className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-xs text-neutral-200 focus:border-amber-800 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-neutral-400 uppercase">Explicación y Origen de la Deuda</label>
                  <textarea
                    required
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    rows={5}
                    placeholder="Escribe exactamente qué prometió Kuroi y en qué momento o sesión ocurrió..."
                    className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-xs text-neutral-200 focus:border-amber-800 outline-none resize-none font-serif leading-relaxed"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-neutral-900">
                  <button
                    type="submit"
                    disabled={enviando}
                    className="flex-1 bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-800 font-mono text-xs uppercase py-3 rounded font-bold transition-colors"
                  >
                    {enviando ? "Sellando Carta..." : "Enviar a la Bóveda de Kuroi"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarFormulario(false)}
                    className="px-4 py-3 bg-neutral-900 text-neutral-400 font-mono text-xs uppercase rounded hover:bg-neutral-800"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Ver Carta Detalle y Confirmar Pago */}
        {deudaDetalle && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-neutral-800 p-6 md:p-8 rounded-xl max-w-xl w-full relative space-y-6">
              <button onClick={() => setDeudaDetalle(null)} className="absolute top-4 right-4 text-neutral-500 hover:text-red-400">
                <X className="w-6 h-6" />
              </button>

              <div className="border-b border-neutral-900 pb-3 space-y-2">
                <div className="flex justify-between items-center">
                  {getBadgestado(deudaDetalle.estado)}
                  <span className="text-[10px] font-mono text-neutral-500">
                    Sello: {new Date(deudaDetalle.created_at).toLocaleString()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-neutral-100 font-mono">{deudaDetalle.titulo}</h2>
              </div>

              <div className="bg-black/80 border border-neutral-900 p-4 rounded-lg space-y-2">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Origen / Explicación del Pacto</span>
                <p className="text-sm text-neutral-300 font-serif leading-relaxed whitespace-pre-wrap">
                  {deudaDetalle.mensaje}
                </p>
              </div>

              {/* Si Kuroi declaró haber pagado la deuda */}
              {deudaDetalle.estado === "pendiente_pago_confirmacion" && (
                <div className="bg-cyan-950/40 border border-cyan-800/80 p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-cyan-300 font-mono text-xs font-bold">
                    <ShieldAlert className="w-4 h-4" /> Kuroi ha marcado esta deuda como SALDADA.
                  </div>
                  <p className="text-xs text-neutral-400">
                    ¿Confirmas que ya recibiste lo prometido? Si no respondes en 2 días, la deuda se marcará como pagada automáticamente.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => responderPago(deudaDetalle.id, true)}
                      className="flex-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 text-xs font-mono py-2 rounded font-bold"
                    >
                      Sí, he recibido el pago
                    </button>
                    <button
                      onClick={() => responderPago(deudaDetalle.id, false)}
                      className="flex-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-mono py-2 rounded font-bold"
                    >
                      No, impugnar pago
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-neutral-900 text-center">
                <button
                  onClick={() => setDeudaDetalle(null)}
                  className="px-6 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs uppercase rounded"
                >
                  Cerrar Carta
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}