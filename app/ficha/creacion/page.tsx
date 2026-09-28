"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { 
  ArrowLeft, Hammer, Plus, Clock, CheckCircle2, 
  XCircle, ShieldAlert, Sparkles, Activity, MessageSquare 
} from "lucide-react";

interface Creacion {
  id: string;
  nombre: string;
  descripcion: string;
  coste_peticion: string;
  atributos: {
    fisico: number;
    magico: number;
    resistencia: number;
    inteligencia: number;
    agilidad: number;
  };
  clase_calculada: string;
  estado: "pendiente" | "aprobada" | "rechazada" | "editada";
  comentarios_kuroi?: string;
  created_at: string;
}

export default function ForjaCreacion() {
  const router = useRouter();
  const [pestana, setPestana] = useState<"crear" | "pendientes">("crear");
  const [creaciones, setCreaciones] = useState<Creacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Formulario de creación
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [costePeticion, setCostePeticion] = useState("");
  const [atributos, setAtributos] = useState({
    fisico: 1,
    magico: 1,
    resistencia: 1,
    inteligencia: 1,
    agilidad: 1,
  });

  // Cálculo de Rango/Clase en función de los atributos
  const calcularClase = (stats: typeof atributos): string => {
    const suma = Object.values(stats).reduce((a, b) => a + b, 0);
    if (suma <= 10) return "F";
    if (suma <= 15) return "D";
    if (suma <= 20) return "C";
    if (suma <= 25) return "B";
    if (suma <= 30) return "A";
    if (suma <= 35) return "A+";
    if (suma <= 40) return "S";
    if (suma <= 45) return "S+";
    if (suma <= 50) return "Z";
    return "KUROI";
  };

  const claseActual = calcularClase(atributos);

  const cambiarAtributo = (key: keyof typeof atributos, delta: number) => {
    const valorActual = atributos[key];
    const nuevoValor = valorActual + delta;
    // Límite de 0 a 11 por atributo
    if (nuevoValor >= 0 && nuevoValor <= 11) {
      setAtributos({ ...atributos, [key]: nuevoValor });
    }
  };

  const cargarCreaciones = async () => {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("creaciones_forja")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCreaciones(data as Creacion[]);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarCreaciones();
  }, []);

  const enviarCreacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("creaciones_forja").insert([{
      user_id: session.user.id,
      nombre,
      descripcion,
      coste_peticion: costePeticion,
      atributos,
      clase_calculada: claseActual,
      estado: "pendiente"
    }]);

    if (!error) {
      alert(`Tu creación "${nombre}" de Rango [${claseActual}] ha sido ofrecida en la Forja.`);
      setNombre("");
      setDescripcion("");
      setCostePeticion("");
      setAtributos({ fisico: 1, magico: 1, resistencia: 1, inteligencia: 1, agilidad: 1 });
      setPestana("pendientes");
      cargarCreaciones();
    } else {
      alert("Error al intentar forjar la propuesta.");
    }
    setEnviando(false);
  };

  const getBadgeClaseColor = (clase: string) => {
    switch (clase) {
      case "F": case "D": return "text-neutral-400 border-neutral-700 bg-neutral-900";
      case "C": case "B": return "text-cyan-400 border-cyan-800 bg-cyan-950/40";
      case "A": case "A+": return "text-emerald-400 border-emerald-800 bg-emerald-950/40";
      case "S": case "S+": return "text-amber-400 border-amber-800 bg-amber-950/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]";
      case "Z": return "text-purple-400 border-purple-800 bg-purple-950/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]";
      case "KUROI": return "text-red-500 border-red-800 bg-red-950/60 shadow-[0_0_15px_rgba(220,38,38,0.5)] font-black animate-pulse";
      default: return "text-neutral-400 border-neutral-800 bg-neutral-900";
    }
  };

  const getBadgeEstado = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return <span className="text-amber-400 bg-amber-950/60 border border-amber-800 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1"><Clock className="w-3 h-3"/> En Juicio de Kuroi</span>;
      case "aprobada":
        return <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Forjada y Aprobada</span>;
      case "editada":
        return <span className="text-cyan-400 bg-cyan-950/60 border border-cyan-800 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Modificada por Kuroi</span>;
      case "rechazada":
        return <span className="text-red-400 bg-red-950/60 border border-red-800 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1"><XCircle className="w-3 h-3"/> Destruida en el Yunque</span>;
      default: return null;
    }
  };

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono animate-pulse">Encendiendo los Fuegos de la Forja...</div>;

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
                <Hammer className="w-6 h-6 text-orange-500" /> Forja de Creación
              </h1>
              <p className="text-red-700/80 text-xs font-mono tracking-widest mt-1 uppercase">
                [ TALLER DE OBJETOS, HABILIDADES Y RECEPTÁCULOS PERSONALIZADOS ]
              </p>
            </div>
          </div>

          {/* Navegación por pestañas */}
          <div className="flex bg-neutral-950 border border-neutral-800 p-1 rounded-lg">
            <button
              onClick={() => setPestana("crear")}
              className={`px-4 py-1.5 rounded-md text-xs font-mono uppercase transition-all flex items-center gap-1.5 ${
                pestana === "crear"
                  ? "bg-red-950 border border-red-800 text-neutral-100 font-bold glow-blood-sm"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Forjar Nuevo
            </button>
            <button
              onClick={() => setPestana("pendientes")}
              className={`px-4 py-1.5 rounded-md text-xs font-mono uppercase transition-all flex items-center gap-1.5 ${
                pestana === "pendientes"
                  ? "bg-red-950 border border-red-800 text-neutral-100 font-bold glow-blood-sm"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Creaciones ({creaciones.length})
            </button>
          </div>
        </header>

        {pestana === "crear" ? (
          /* Pestaña: Crear Nueva Creación */
          <section className="bg-neutral-950/80 border border-red-900/40 p-6 md:p-8 rounded-xl max-w-3xl mx-auto space-y-6 glow-blood-sm">
            <div className="border-b border-neutral-900 pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-neutral-100 font-mono uppercase">
                  Petición de Creación
                </h2>
                <p className="text-neutral-500 text-xs font-mono mt-0.5">
                  Ajusta los atributos hasta un máximo de 11 por categoría para determinar su rango.
                </p>
              </div>

              {/* Indicador Dinámico de Clase / Rango */}
              <div className="text-center bg-black/80 border border-neutral-800 p-2.5 rounded-xl min-w-[90px]">
                <span className="text-[9px] font-mono text-neutral-500 uppercase block">Clase / Rango</span>
                <span className={`text-xl font-mono font-bold px-2 py-0.5 rounded border inline-block mt-0.5 ${getBadgeClaseColor(claseActual)}`}>
                  {claseActual}
                </span>
              </div>
            </div>

            <form onSubmit={enviarCreacion} className="space-y-6">
              
              {/* Nombre */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-neutral-400 uppercase">Nombre de la Creación</label>
                <input
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  type="text"
                  placeholder="Ej. Anillo de la Llama Abisal / Grimorio Devorador"
                  className="w-full bg-black border border-neutral-800 rounded px-3 py-2.5 text-sm text-neutral-100 focus:border-red-800 outline-none font-mono"
                />
              </div>

              {/* Selector de Atributos (Cap 11 por stat) */}
              <div className="bg-black/60 border border-neutral-900 p-4 rounded-xl space-y-3">
                <span className="text-xs font-mono text-amber-500 uppercase font-bold flex items-center gap-1">
                  <Activity className="w-4 h-4" /> Distribución de Atributos (Límite: 11 por stat)
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                  {Object.entries(atributos).map(([key, val]) => (
                    <div key={key} className="bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 flex flex-col items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 font-mono">{key}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => cambiarAtributo(key as keyof typeof atributos, -1)}
                          className="w-6 h-6 flex items-center justify-center bg-black border border-neutral-700 text-red-500 hover:text-red-400 rounded text-xs font-bold"
                        >
                          -
                        </button>
                        <span className="text-sm font-mono font-bold text-neutral-100 w-5 text-center">{val}</span>
                        <button
                          type="button"
                          onClick={() => cambiarAtributo(key as keyof typeof atributos, 1)}
                          className="w-6 h-6 flex items-center justify-center bg-black border border-neutral-700 text-emerald-500 hover:text-emerald-400 rounded text-xs font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-neutral-400 uppercase">Descripción y Funcionamiento</label>
                <textarea
                  required
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={4}
                  placeholder="Describe detalladamente qué hace este objeto/habilidad, sus efectos mecánicos e historia..."
                  className="w-full bg-black border border-neutral-800 rounded px-3 py-2.5 text-xs text-neutral-200 focus:border-red-800 outline-none resize-none font-serif leading-relaxed"
                />
              </div>

              {/* Coste / Mensaje de propuesta */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-neutral-400 uppercase flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-500" /> Coste Petición (¿Qué pides a cambio?)
                </label>
                <textarea
                  required
                  value={costePeticion}
                  onChange={(e) => setCostePeticion(e.target.value)}
                  rows={2}
                  placeholder="Ej. Pido 150 Puntos Kuro y 1 Fragmento de Alma, o que aparezca en el mercado de la próxima sesión..."
                  className="w-full bg-black border border-neutral-800 rounded px-3 py-2.5 text-xs text-neutral-200 focus:border-red-800 outline-none resize-none font-mono leading-relaxed"
                />
              </div>

              {/* Botón de Enviar */}
              <div className="pt-3 border-t border-neutral-900">
                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-red-950 hover:bg-red-900 border border-red-800/80 text-neutral-100 font-mono text-xs uppercase py-3.5 rounded-lg font-bold tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {enviando ? "Enviando al Yunque..." : "Ofrecer Creación a Kuroi"}
                </button>
              </div>

            </form>
          </section>
        ) : (
          /* Pestaña: Creaciones Pendientes / Historial */
          <section className="space-y-4">
            {creaciones.length === 0 ? (
              <div className="text-center py-20 bg-neutral-950/40 border border-neutral-900 rounded-xl space-y-3">
                <Hammer className="w-10 h-10 text-neutral-700 mx-auto" />
                <p className="text-neutral-600 font-mono text-xs uppercase tracking-widest">
                  No has forjado ninguna propuesta de creación todavía.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {creaciones.map((item) => (
                  <div
                    key={item.id}
                    className="bg-neutral-950 border border-neutral-800 hover:border-red-900/60 p-5 rounded-xl transition-all space-y-4 relative"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getBadgeClaseColor(item.clase_calculada)}`}>
                          Clase {item.clase_calculada}
                        </span>
                        <h3 className="text-base font-bold text-neutral-100 font-mono">
                          {item.nombre}
                        </h3>
                      </div>
                      {getBadgeEstado(item.estado)}
                    </div>

                    <p className="text-xs text-neutral-400 bg-black/60 p-3 rounded border border-neutral-900 italic font-serif leading-relaxed">
                      "{item.descripcion}"
                    </p>

                    {/* Matriz de Atributos */}
                    <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center bg-neutral-900/50 p-2 rounded border border-neutral-800">
                      {Object.entries(item.atributos).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-neutral-500 uppercase block">{k.slice(0, 3)}</span>
                          <span className="font-bold text-neutral-200">{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Petición de Coste */}
                    <div className="bg-amber-950/20 border border-amber-900/40 p-2.5 rounded text-xs font-mono">
                      <span className="text-[10px] text-amber-500 uppercase font-bold block">Petición de Coste:</span>
                      <p className="text-amber-200/90 italic">{item.coste_peticion}</p>
                    </div>

                    {/* Comentarios de Kuroi */}
                    {item.comentarios_kuroi && (
                      <div className="bg-red-950/40 border border-red-800/80 p-2.5 rounded text-xs font-mono">
                        <span className="text-[10px] text-red-400 uppercase font-bold block">Dictamen de Kuroi:</span>
                        <p className="text-neutral-200">{item.comentarios_kuroi}</p>
                      </div>
                    )}

                    <div className="text-[10px] font-mono text-neutral-600 pt-2 border-t border-neutral-900 text-right">
                      Enviado el {new Date(item.created_at).toLocaleDateString()}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      </div>
    </main>
  );
}