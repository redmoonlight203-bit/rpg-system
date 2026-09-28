"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { 
  ArrowLeft, Hourglass, Clock, Calendar, 
  Sparkles, X, UserCheck, Scroll, History, ShieldAlert 
} from "lucide-react";

interface TiempoJuego {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  en_ejecucion: boolean;
}

interface EraHito {
  id: string;
  ano_inicio: number;
  ano_fin: number;
  titulo: string;
  lore_detallado: string;
}

export default function LineaDeTiempo() {
  const router = useRouter();
  const [tiempo, setTiempo] = useState<TiempoJuego | null>(null);
  const [eras, setEras] = useState<EraHito[]>([]);
  const [personajesAno, setPersonajesAno] = useState<number[]>([]);
  const [eraSeleccionada, setEraSeleccionada] = useState<EraHito | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarDatosTiempo = async () => {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    // 1. Cargar el Reloj / Fecha del Juego
    const { data: dataTiempo } = await supabase
      .from("tiempo_juego")
      .select("*")
      .limit(1)
      .single();

    if (dataTiempo) setTiempo(dataTiempo as TiempoJuego);

    // 2. Cargar las Eras de 100 años escritas por Kuroi
    const { data: dataEras } = await supabase
      .from("linea_tiempo_eras")
      .select("*")
      .order("ano_inicio", { ascending: true });

    if (dataEras) setEras(dataEras as EraHito[]);

    // 3. Cargar los años en que los personajes del jugador han estado presentes
    const { data: chars } = await supabase
      .from("personajes")
      .select("created_at")
      .eq("user_id", session.user.id);

    if (chars && dataTiempo) {
      // Por defecto asociamos los avatares al año actual de la partida
      setPersonajesAno([dataTiempo.ano]);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarDatosTiempo();

    // Actualización en tiempo real del reloj de juego
    const canalTiempo = supabase
      .channel("tiempo_real")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tiempo_juego" }, (payload) => {
        setTiempo(payload.new as TiempoJuego);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalTiempo);
    };
  }, []);

  const formatDosDigitos = (num: number) => num.toString().padStart(2, "0");

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-purple-500 font-mono animate-pulse">Sincronizando con la Corriente del Tiempo...</div>;

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative overflow-x-hidden">
      
      {/* Resplandor Violeta Abisal de fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[300px] bg-purple-950/15 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-10 relative z-10 pb-20">
        
        {/* Cabecera */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-900/40 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/ficha")} className="text-neutral-500 hover:text-purple-400 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono flex items-center gap-2">
                <Hourglass className="w-6 h-6 text-purple-500" /> Línea de Tiempo
              </h1>
              <p className="text-purple-400/80 text-xs font-mono tracking-widest mt-1 uppercase">
                [ CRÓNICA ANCESTRAL Y CONTADOR DEL MUNDO ]
              </p>
            </div>
          </div>

          {/* Widget del Reloj y Calendario en Tiempo Real */}
          {tiempo && (
            <div className="bg-neutral-950 border border-purple-900/60 p-3.5 rounded-xl flex items-center gap-4 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
              <div className="flex items-center gap-2 border-r border-neutral-800 pr-4">
                <Clock className={`w-5 h-5 ${tiempo.en_ejecucion ? "text-purple-400 animate-spin" : "text-neutral-600"}`} />
                <div className="font-mono">
                  <span className="text-[9px] text-neutral-500 uppercase block">Hora Actual</span>
                  <span className="text-sm font-bold text-neutral-100">
                    {formatDosDigitos(tiempo.hora)}:{formatDosDigitos(tiempo.minuto)} hs
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono">
                <Calendar className="w-5 h-5 text-purple-500" />
                <div>
                  <span className="text-[9px] text-neutral-500 uppercase block">Fecha del Mundo</span>
                  <span className="text-sm font-bold text-purple-300">
                    Día {tiempo.dia} / Mes {tiempo.mes} / <span className="text-purple-400">Año {tiempo.ano}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Estado del Tiempo */}
        <div className="flex justify-between items-center text-xs font-mono bg-neutral-950/60 border border-neutral-900 p-3 rounded-lg">
          <span className="text-neutral-500 flex items-center gap-2">
            <History className="w-4 h-4 text-purple-500" />
            Cada nodo representa un rango de <strong>100 Años</strong> registrado por Kuroi.
          </span>
          <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
            tiempo?.en_ejecucion 
              ? "bg-purple-950/80 border-purple-700 text-purple-300 animate-pulse" 
              : "bg-neutral-900 border-neutral-800 text-neutral-500"
          }`}>
            {tiempo?.en_ejecucion ? "• Tiempo Fluyendo en la Partida" : "• Tiempo Pausado en la Grieta"}
          </span>
        </div>

        {/* Línea Violeta Central e Historial por Siglos */}
        <section className="relative my-16">
          
          {/* Línea Violeta Neón Horizontal */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-purple-950 via-purple-600 to-purple-950 -translate-y-1/2 shadow-[0_0_20px_rgba(168,85,247,0.6)]" />

          {/* Nodos de Eras de 100 Años */}
          {eras.length === 0 ? (
            <div className="text-center py-16 relative z-10 bg-black/80 border border-neutral-900 rounded-xl space-y-2 max-w-md mx-auto">
              <ShieldAlert className="w-8 h-8 text-neutral-700 mx-auto" />
              <p className="text-neutral-500 font-mono text-xs uppercase">
                Kuroi aún no ha registrado hitos en la Línea de Tiempo.
              </p>
            </div>
          ) : (
            <div className="relative z-10 flex items-center justify-between gap-8 overflow-x-auto py-8 px-4 scrollbar-thin">
              {eras.map((era) => {
                const estaPresente = personajesAno.some(a => a >= era.ano_inicio && a <= era.ano_fin);

                return (
                  <div
                    key={era.id}
                    onClick={() => setEraSeleccionada(era)}
                    className="flex flex-col items-center group cursor-pointer shrink-0 transition-transform hover:scale-105"
                  >
                    {/* Etiqueta Superior */}
                    <span className="text-[10px] font-mono font-bold text-neutral-400 group-hover:text-purple-300 mb-3 bg-black/80 px-2.5 py-1 rounded border border-neutral-800 transition-colors">
                      {era.ano_inicio} - {era.ano_fin} DC
                    </span>

                    {/* Nodo de Cristal Violeta */}
                    <div
                    title={estaPresente ? "Estuviste presente en este siglo" : ""}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        estaPresente
                        ? "bg-purple-900 border-purple-400 text-white shadow-[0_0_25px_rgba(168,85,247,0.8)] scale-110"
                        : "bg-neutral-950 border-purple-900/80 text-purple-400 group-hover:border-purple-500 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                    }`}
                    >
                    {estaPresente ? (
                        <UserCheck className="w-5 h-5 text-purple-200" />
                    ) : (
                        <Sparkles className="w-4 h-4" />
                    )}
                    </div>

                    {/* Título de la Era */}
                    <span className="text-xs font-mono font-bold text-neutral-300 group-hover:text-purple-300 mt-3 max-w-[140px] text-center line-clamp-1">
                      {era.titulo}
                    </span>

                    {/* Indicador de Presencia del Jugador */}
                    {estaPresente && (
                      <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest mt-1 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                        Reencarnado Activo
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Modal: Lectura de la Era de 100 Años */}
        {eraSeleccionada && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-purple-900/60 p-6 md:p-8 rounded-xl max-w-2xl w-full shadow-[0_0_35px_rgba(168,85,247,0.25)] relative space-y-6 max-h-[90vh] overflow-y-auto">
              
              <button
                onClick={() => setEraSeleccionada(null)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-purple-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Cabecera del Hito */}
              <div className="border-b border-neutral-900 pb-4 space-y-1">
                <span className="text-[10px] font-mono uppercase text-purple-400 tracking-widest font-bold bg-purple-950/60 border border-purple-800 px-2.5 py-1 rounded inline-block">
                  [ SIGLO: AÑOS {eraSeleccionada.ano_inicio} A {eraSeleccionada.ano_fin} ]
                </span>
                <h2 className="text-2xl font-bold text-neutral-100 font-mono pt-2">
                  {eraSeleccionada.titulo}
                </h2>
              </div>

              {/* Lore Escrito por Kuroi */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-purple-400 uppercase font-bold flex items-center gap-1.5">
                  <Scroll className="w-4 h-4" /> Crónica Histórica de los 100 Años
                </span>
                <div className="bg-black/80 border border-neutral-800 p-5 rounded-lg text-sm text-neutral-200 font-serif leading-relaxed whitespace-pre-wrap">
                  "{eraSeleccionada.lore_detallado}"
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-900 text-center">
                <button
                  onClick={() => setEraSeleccionada(null)}
                  className="px-6 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs uppercase rounded"
                >
                  Cerrar Crónica
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}