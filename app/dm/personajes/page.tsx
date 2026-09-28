"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { 
  Skull, User, CheckCircle, XCircle, LogOut, ShieldAlert, 
  Edit3, Activity, X, RefreshCw, Heart, Lock, ArrowLeft, Map 
} from "lucide-react";

interface Perfil {
  id: string;
  email: string;
  rol: string;
  estado: string;
  created_at: string;
}

interface Personaje {
  id: string;
  user_id: string;
  nombre: string;
  raza: string;
  historia: string;
  defecto: string;
  lugar_reencarnacion: string;
  atributos: {
    fisico: number;
    magico: number;
    resistencia: number;
    inteligencia: number;
    agilidad: number;
  };
  estado_aprobacion: string;
  estado_vida: "vivo" | "muerto" | "sellado";
  comentarios_kuroi?: string;
  created_at: string;
}

export default function GestionPersonajesKuroi() {
  const router = useRouter();

  // Estados de datos
  const [cuentasPendientes, setCuentasPendientes] = useState<Perfil[]>([]);
  const [personajesPendientes, setPersonajesPendientes] = useState<Personaje[]>([]);
  const [todosLosPersonajes, setTodosLosPersonajes] = useState<Personaje[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal Personaje
  const [personajeEditando, setPersonajeEditando] = useState<Personaje | null>(null);
  const [comentarioKuroi, setComentarioKuroi] = useState("");

  const cargarDatos = async () => {
    setCargando(true);

    // 1. Cuentas Pendientes
    const { data: cuentas } = await supabase
      .from("perfiles")
      .select("*")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false });
    if (cuentas) setCuentasPendientes(cuentas);

    // 2. Personajes Pendientes de Aprobación
    const { data: charsPendientes } = await supabase
      .from("personajes")
      .select("*")
      .in("estado_aprobacion", ["pendiente", "editado"])
      .order("created_at", { ascending: false });
    if (charsPendientes) setPersonajesPendientes(charsPendientes as Personaje[]);

    // 3. Registro Histórico de Todos los Personajes Aprobados
    const { data: todos } = await supabase
      .from("personajes")
      .select("*")
      .eq("estado_aprobacion", "aprobado")
      .order("created_at", { ascending: false });
    if (todos) setTodosLosPersonajes(todos as Personaje[]);

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Modificar atributos sin restricciones
  const cambiarAtributoKuroi = (attr: string, delta: number) => {
    if (!personajeEditando) return;
    const actual = personajeEditando.atributos[attr as keyof typeof personajeEditando.atributos] || 0;
    setPersonajeEditando({
      ...personajeEditando,
      atributos: { ...personajeEditando.atributos, [attr]: Math.max(0, actual + delta) }
    });
  };

  const resolverPersonaje = async (nuevoEstado: "aprobado" | "editado" | "rechazado") => {
    if (!personajeEditando) return;
    const { error } = await supabase
      .from("personajes")
      .update({
        nombre: personajeEditando.nombre,
        raza: personajeEditando.raza,
        historia: personajeEditando.historia,
        defecto: personajeEditando.defecto,
        lugar_reencarnacion: personajeEditando.lugar_reencarnacion,
        atributos: personajeEditando.atributos,
        estado_aprobacion: nuevoEstado,
        estado_vida: personajeEditando.estado_vida || "vivo",
        comentarios_kuroi: comentarioKuroi
      })
      .eq("id", personajeEditando.id);

    if (!error) {
      alert(`Avatar "${personajeEditando.nombre}" marcado como [${nuevoEstado.toUpperCase()}].`);
      setPersonajeEditando(null);
      setComentarioKuroi("");
      cargarDatos();
    }
  };

  // Rotar el estado de vida: Vivo -> Muerto -> Sellado -> Vivo
  const rotarEstadoVida = async (charId: string, estadoActual: string) => {
    let siguienteEstado: "vivo" | "muerto" | "sellado" = "vivo";
    if (estadoActual === "vivo") siguienteEstado = "muerto";
    else if (estadoActual === "muerto") siguienteEstado = "sellado";
    else siquienteEstado: siguienteEstado = "vivo";

    const { error } = await supabase
      .from("personajes")
      .update({ estado_vida: siguienteEstado })
      .eq("id", charId);

    if (!error) {
      cargarDatos();
    }
  };

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono animate-pulse">Abriendo el Registro de Almas...</div>;

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative">
      <div className="max-w-7xl mx-auto space-y-8 relative z-10 pb-20">
        
        {/* Cabecera */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-red-900/50 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/dm/tablero")} className="text-neutral-500 hover:text-red-400 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono flex items-center gap-2">
                <User className="w-6 h-6 text-red-600" /> Gestión de Almas y Personajes
              </h1>
              <p className="text-red-700/80 text-xs font-mono tracking-widest mt-1 uppercase">
                [ JUICIO DE AVATARES, CUENTAS Y ESTADOS DE VIDA ]
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dm/tablero")} className="px-3 py-2 bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300 rounded flex items-center gap-1.5 uppercase">
              <Map className="w-3.5 h-3.5 text-red-500" /> Volver al Tablero
            </button>
            <button onClick={cargarDatos} className="p-2 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="space-y-10">
          
          {/* SECCIÓN 1: CUENTAS PENDIENTES */}
          <section className="bg-neutral-950 border border-neutral-900 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-amber-500 font-mono uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> 1. Invocaciones en el Limbo (Cuentas por Aprobar)
            </h2>
            {cuentasPendientes.length === 0 ? (
              <p className="text-neutral-600 font-mono text-xs italic">No hay cuentas de usuario esperando ingreso.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cuentasPendientes.map((cuenta) => (
                  <div key={cuenta.id} className="bg-black border border-neutral-800 p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-neutral-200">{cuenta.email}</p>
                      <p className="text-[10px] font-mono text-neutral-500">{new Date(cuenta.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={async () => { await supabase.from("perfiles").update({ estado: "aprobado" }).eq("id", cuenta.id); cargarDatos(); }} className="px-3 py-1.5 bg-red-950 border border-red-800 text-red-200 rounded text-xs font-mono uppercase font-bold">Aprobar</button>
                      <button onClick={async () => { await supabase.from("perfiles").update({ estado: "rechazado" }).eq("id", cuenta.id); cargarDatos(); }} className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded text-xs font-mono uppercase">Rechazar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SECCIÓN 2: PERSONAJES PENDIENTES DE REENCARNAR */}
          <section className="bg-neutral-950 border border-red-900/40 rounded-xl p-6 space-y-4 glow-blood-sm">
            <h2 className="text-base font-bold text-red-500 font-mono uppercase tracking-widest flex items-center gap-2">
              <Skull className="w-5 h-5" /> 2. Solicitudes de Reencarnación (Avatares por Juicio)
            </h2>
            {personajesPendientes.length === 0 ? (
              <p className="text-neutral-600 font-mono text-xs italic">No hay avatares pendientes de revisión.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {personajesPendientes.map((char) => (
                  <div key={char.id} className="bg-black border border-neutral-800 p-5 rounded-xl space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-neutral-100 font-mono">{char.nombre}</h3>
                          <p className="text-xs text-red-500 font-mono">{char.raza} • {char.lugar_reencarnacion}</p>
                        </div>
                        <span className="text-[10px] font-mono text-amber-500 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded uppercase">{char.estado_aprobacion}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center bg-neutral-900/60 p-2 rounded border border-neutral-800">
                        {Object.entries(char.atributos || {}).map(([k, v]) => (
                          <div key={k}><span className="text-neutral-500 uppercase block">{k.slice(0, 3)}</span><span className="font-bold text-neutral-200">{v}</span></div>
                        ))}
                      </div>
                      <p className="text-xs text-neutral-300 italic"><strong className="text-neutral-500">Defecto:</strong> {char.defecto || "Ninguno"}</p>
                    </div>
                    <button onClick={() => { setPersonajeEditando(char); setComentarioKuroi(char.comentarios_kuroi || ""); }} className="w-full bg-red-950 border border-red-800 text-neutral-100 text-xs font-mono py-2.5 rounded font-bold uppercase flex items-center justify-center gap-2">
                      <Edit3 className="w-3.5 h-3.5 text-amber-500" /> Juzgar / Editar Avatar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SECCIÓN 3: REGISTRO HISTÓRICO DE AVATARES (VIVOS, MUERTOS Y SELLADOS) */}
          <section className="bg-neutral-950 border border-neutral-900 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-900 pb-3 gap-2">
              <div>
                <h2 className="text-base font-bold text-neutral-200 font-mono uppercase tracking-widest flex items-center gap-2">
                  <User className="w-5 h-5 text-neutral-400" /> 3. Registro de Avatares del Mundo
                </h2>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">
                  Haz clic en el estado para rotar entre: <strong>VIVO</strong> $\rightarrow$ <strong>DIFUNTO</strong> $\rightarrow$ <strong>SELLADO</strong>.
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                Vivos: {todosLosPersonajes.filter(p => (p.estado_vida || "vivo") === "vivo").length} | 
                Muertos: {todosLosPersonajes.filter(p => p.estado_vida === "muerto").length} | 
                Sellados: {todosLosPersonajes.filter(p => p.estado_vida === "sellado").length}
              </span>
            </div>

            {todosLosPersonajes.length === 0 ? (
              <p className="text-neutral-600 font-mono text-xs italic">Aún no hay personajes aprobados en el mundo.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {todosLosPersonajes.map((char) => {
                  const estado = char.estado_vida || "vivo";

                  return (
                    <div
                      key={char.id}
                      className={`p-5 rounded-xl border transition-all space-y-4 flex flex-col justify-between relative overflow-hidden ${
                        estado === "muerto"
                          ? "bg-neutral-950/40 border-neutral-900 grayscale text-neutral-500"
                          : estado === "sellado"
                          ? "bg-cyan-950/20 border-cyan-800/80 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                          : "bg-black border-neutral-800 text-neutral-200 hover:border-red-900/60"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className={`text-lg font-bold font-mono ${estado === "muerto" ? "line-through text-neutral-600" : ""}`}>
                              {char.nombre}
                            </h3>
                            <p className={`text-xs font-mono ${
                              estado === "muerto" ? "text-neutral-600" : estado === "sellado" ? "text-cyan-400" : "text-red-500"
                            }`}>
                              {char.raza} • {char.lugar_reencarnacion}
                            </p>
                          </div>

                          {/* Botón Selector de Estado Vital / Sellado */}
                          <button
                            onClick={() => rotarEstadoVida(char.id, estado)}
                            className={`text-[10px] font-mono px-2.5 py-1 rounded border font-bold uppercase flex items-center gap-1 transition-all ${
                              estado === "vivo"
                                ? "bg-red-950/80 border-red-800 text-red-300"
                                : estado === "muerto"
                                ? "bg-neutral-900 border-neutral-800 text-neutral-500"
                                : "bg-cyan-950/80 border-cyan-700 text-cyan-300 animate-pulse"
                            }`}
                            title="Haz clic para alternar Estado"
                          >
                            {estado === "vivo" && <><Heart className="w-3 h-3 fill-red-500" /> VIVO</>}
                            {estado === "muerto" && <><Skull className="w-3 h-3" /> DIFUNTO</>}
                            {estado === "sellado" && <><Lock className="w-3 h-3 text-cyan-400" /> SELLADO</>}
                          </button>
                        </div>

                        {/* Atributos */}
                        <div className={`grid grid-cols-5 gap-1 text-[10px] font-mono text-center p-2 rounded border ${
                          estado === "muerto" ? "bg-neutral-900/30 border-neutral-900" : estado === "sellado" ? "bg-cyan-950/40 border-cyan-900" : "bg-neutral-900/60 border-neutral-800"
                        }`}>
                          {Object.entries(char.atributos || {}).map(([k, v]) => (
                            <div key={k}>
                              <span className="uppercase block text-[9px] text-neutral-500">{k.slice(0, 3)}</span>
                              <span className="font-bold">{v}</span>
                            </div>
                          ))}
                        </div>

                        <p className="text-xs italic"><strong className="text-neutral-500">Defecto:</strong> {char.defecto || "Ninguno"}</p>
                      </div>

                      <div className="pt-3 border-t border-neutral-900">
                        <button
                          onClick={() => { setPersonajeEditando(char); setComentarioKuroi(char.comentarios_kuroi || ""); }}
                          className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-mono py-2 rounded font-bold uppercase flex items-center justify-center gap-2"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-500" /> Modificar Avatar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* MODAL MOLDING PERSONAJE */}
        {personajeEditando && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-red-900/80 p-6 md:p-8 rounded-xl max-w-2xl w-full glow-blood relative space-y-6 max-h-[90vh] overflow-y-auto">
              <button onClick={() => setPersonajeEditando(null)} className="absolute top-4 right-4 text-neutral-500 hover:text-red-400"><X className="w-6 h-6" /></button>
              <div className="border-b border-neutral-900 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-mono text-red-500 uppercase font-bold">[ EDITAR AVATAR - KUROI ]</span>
                  <h2 className="text-xl font-bold text-neutral-100 font-mono">{personajeEditando.nombre}</h2>
                </div>

                <select
                  value={personajeEditando.estado_vida || "vivo"}
                  onChange={(e) => setPersonajeEditando({ ...personajeEditando, estado_vida: e.target.value as any })}
                  className="bg-black border border-neutral-800 text-xs font-mono text-neutral-200 px-3 py-1.5 rounded outline-none"
                >
                  <option value="vivo">Estado: VIVO</option>
                  <option value="muerto">Estado: DIFUNTO / MUERTO</option>
                  <option value="sellado">Estado: SELLADO</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input value={personajeEditando.nombre} onChange={(e) => setPersonajeEditando({ ...personajeEditando, nombre: e.target.value })} className="bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono" />
                  <input value={personajeEditando.raza} onChange={(e) => setPersonajeEditando({ ...personajeEditando, raza: e.target.value })} className="bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono" />
                </div>
                <div className="bg-black/60 border border-neutral-900 p-3 rounded-lg space-y-2">
                  <span className="text-xs font-mono text-amber-500 uppercase font-bold">Atributos del Avatar (Sin límite)</span>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(personajeEditando.atributos || {}).map(([key, val]) => (
                      <div key={key} className="bg-neutral-900 p-2 rounded text-center">
                        <span className="text-[10px] font-mono text-neutral-500 uppercase block">{key}</span>
                        <div className="flex items-center justify-center gap-1.5 mt-1">
                          <button onClick={() => cambiarAtributoKuroi(key, -1)} className="w-4 h-4 bg-black text-red-500 font-bold text-xs">-</button>
                          <span className="text-xs font-mono font-bold text-neutral-100">{val}</span>
                          <button onClick={() => cambiarAtributoKuroi(key, 1)} className="w-4 h-4 bg-black text-emerald-500 font-bold text-xs">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <input value={personajeEditando.defecto} onChange={(e) => setPersonajeEditando({ ...personajeEditando, defecto: e.target.value })} placeholder="Defecto / Maldición" className="w-full bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono" />
                <textarea value={personajeEditando.historia} onChange={(e) => setPersonajeEditando({ ...personajeEditando, historia: e.target.value })} rows={3} placeholder="Pasado / Lore" className="w-full bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-serif" />
                <input value={comentarioKuroi} onChange={(e) => setComentarioKuroi(e.target.value)} placeholder="Dictamen de Kuroi para el Jugador..." className="w-full bg-black border border-amber-900/60 p-2 text-xs text-amber-200 rounded font-mono" />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-neutral-900">
                <button onClick={() => resolverPersonaje("aprobado")} className="bg-emerald-950 border border-emerald-800 text-emerald-200 text-xs py-2.5 rounded font-bold font-mono uppercase">Guardar / Aprobar</button>
                <button onClick={() => resolverPersonaje("editado")} className="bg-cyan-950 border border-cyan-800 text-cyan-200 text-xs py-2.5 rounded font-bold font-mono uppercase">Devolver Editado</button>
                <button onClick={() => resolverPersonaje("rechazado")} className="bg-red-950 border border-red-800 text-red-200 text-xs py-2.5 rounded font-bold font-mono uppercase">Rechazar Avatar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}