"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { User, Plus, Lock, ArrowLeft, ShieldAlert, CheckCircle, MapPin, Activity, Play } from "lucide-react";

export default function MisPersonajes() {
  const router = useRouter();
  const [personajes, setPersonajes] = useState<any[]>([]);
  const [tiendaCuerpos, setTiendaCuerpos] = useState(false);
  const [lugaresConocidos, setLugaresConocidos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  // Formulario
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaRaza, setNuevaRaza] = useState("");
  const [nuevaHistoria, setNuevaHistoria] = useState("");
  const [nuevoDefecto, setNuevoDefecto] = useState("");
  const [lugarElegido, setLugarElegido] = useState("");
  
  // Atributos propuestos
  const [atributos, setAtributos] = useState({ fisico: 5, magico: 5, resistencia: 5, inteligencia: 5, agilidad: 5 });
  const puntosMaximos = 25;
  const puntosGastados = Object.values(atributos).reduce((a, b) => a + b, 0);
  const puntosRestantes = puntosMaximos - puntosGastados;

  const cargarDatos = async () => {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push("/login");
      return;
    }

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("tienda_cuerpos, lugares_conocidos")
      .eq("id", session.user.id)
      .single();
      
    if (perfil) {
      setTiendaCuerpos(perfil.tienda_cuerpos);
      const lugaresSeguros = Array.from(new Set([
        "Montaña Shiro (Prueba de vida)", 
        ...(perfil.lugares_conocidos || [])
      ]));
      setLugaresConocidos(lugaresSeguros);
      setLugarElegido(lugaresSeguros[0]);
    }

    const { data: chars } = await supabase
      .from("personajes")
      .select("*")
      .eq("user_id", session.user.id);
      
    if (chars) setPersonajes(chars);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cambiarAtributo = (attr: keyof typeof atributos, delta: number) => {
    const nuevoValor = atributos[attr] + delta;
    if (nuevoValor >= 1 && nuevoValor <= 10) {
      if (delta > 0 && puntosRestantes === 0) return;
      setAtributos({ ...atributos, [attr]: nuevoValor });
    }
  };

  const solicitarReencarnacion = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("personajes").insert([{
      user_id: session.user.id,
      nombre: nuevoNombre,
      raza: nuevaRaza,
      historia: nuevaHistoria,
      defecto: nuevoDefecto,
      lugar_reencarnacion: lugarElegido,
      atributos: atributos,
      estado_aprobacion: "pendiente"
    }]);

    if (!error) {
      alert("Petición de Reencarnación enviada a Kuroi.");
      setMostrarFormulario(false);
      cargarDatos();
    } else {
      console.error("Error Supabase:", error);
      alert(`Error al intentar forjar el alma: ${error.message}`);
    }
  };

  // Función para entrar a la partida con el personaje seleccionado
  const entrarAPartida = (personajeId: string) => {
    localStorage.setItem("personaje_activo_id", personajeId);
    router.push("/ficha/personaje");
  };

  const puedeCrear = tiendaCuerpos || personajes.length === 0;

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono animate-pulse">Consultando el Nexo...</div>;

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8 relative z-10 pb-20">
        
        <header className="flex items-center gap-4 border-b border-red-900/40 pb-6">
          <button onClick={() => router.push("/ficha")} className="text-neutral-500 hover:text-red-400 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono">
              Mis Reencarnaciones
            </h1>
            <p className="text-red-700/80 text-xs font-mono tracking-widest mt-1 uppercase">
              {tiendaCuerpos ? "[ PRIVILEGIO: TIENDA DE CUERPOS ACTIVA ]" : "[ LÍMITE: 1 ALMA MORTAL ]"}
            </p>
          </div>
        </header>

        {!mostrarFormulario ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <button
              onClick={() => puedeCrear && setMostrarFormulario(true)}
              className={`flex flex-col items-center justify-center gap-4 p-8 rounded-xl border-2 border-dashed transition-all h-64 ${
                puedeCrear 
                  ? "border-red-900/50 hover:border-red-500 text-red-900/50 hover:text-red-500 hover:bg-red-950/20 cursor-pointer" 
                  : "border-neutral-800 text-neutral-800 bg-neutral-950/50 cursor-not-allowed"
              }`}
            >
              {puedeCrear ? (
                <>
                  <Plus className="w-12 h-12" />
                  <span className="font-mono font-bold tracking-widest uppercase">Reencarnar</span>
                </>
              ) : (
                <>
                  <Lock className="w-12 h-12" />
                  <span className="font-mono font-bold tracking-widest uppercase text-center text-sm">
                    Receptáculo Lleno <br/> <span className="text-xs font-serif text-neutral-500">(Requiere Tienda de Cuerpos)</span>
                  </span>
                </>
              )}
            </button>

            {personajes.map((char) => (
              <div key={char.id} className="bg-neutral-950 border border-neutral-800 hover:border-red-900/60 p-5 rounded-xl transition-colors h-64 flex flex-col relative overflow-hidden group">
                <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-1 rounded bg-black/80 border border-neutral-800">
                  {char.estado_aprobacion === 'pendiente' && <span className="text-amber-500 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Pendiente</span>}
                  {char.estado_aprobacion === 'aprobado' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Aprobado</span>}
                  {char.estado_aprobacion === 'editado' && <span className="text-cyan-500 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Revisión Requerida</span>}
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-neutral-500 shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-200">{char.nombre}</h2>
                    <p className="text-xs text-red-500 font-mono">{char.raza}</p>
                  </div>
                </div>

                <div className="mt-4 flex-1">
                  <p className="text-xs text-neutral-500 italic line-clamp-3">
                    "{char.historia || 'Un alma sin pasado...'}"
                  </p>
                </div>

                {/* Botón de Entrada a la Partida */}
                <button 
                  disabled={char.estado_aprobacion !== 'aprobado'}
                  onClick={() => entrarAPartida(char.id)}
                  className="w-full mt-4 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-200 hover:text-white text-xs font-mono py-2.5 rounded transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:bg-neutral-900 disabled:border-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed uppercase tracking-wider"
                >
                  {char.estado_aprobacion === 'aprobado' ? (
                    <>
                      <Play className="w-3.5 h-3.5 text-red-500 fill-red-500" /> ENTRAR A LA PARTIDA
                    </>
                  ) : (
                    'NO DISPONIBLE'
                  )}
                </button>
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-neutral-950/80 border border-red-900/40 p-8 rounded-xl max-w-2xl glow-blood-sm">
            <h2 className="text-xl font-bold text-neutral-100 font-mono mb-6 uppercase border-b border-red-900/40 pb-4">
              Ritual de Reencarnación
            </h2>
            <form onSubmit={solicitarReencarnacion} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-neutral-400 uppercase">Nombre</label>
                  <input required value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} type="text" className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 focus:border-red-800 outline-none" placeholder="Ej. Kael'thas" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-neutral-400 uppercase">Raza</label>
                  <input required value={nuevaRaza} onChange={(e) => setNuevaRaza(e.target.value)} type="text" className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 focus:border-red-800 outline-none" placeholder="Ej. Humano, Elfo Oscuro..." />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-neutral-400 uppercase flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> Nexo de Aparición</label>
                <select 
                  value={lugarElegido} 
                  onChange={(e) => setLugarElegido(e.target.value)} 
                  className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 focus:border-red-800 outline-none"
                >
                  {lugaresConocidos.map((lugar, idx) => (
                    <option key={idx} value={lugar}>{lugar}</option>
                  ))}
                </select>
              </div>

              <div className="bg-black/50 border border-neutral-900 p-4 rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono text-neutral-400 uppercase flex items-center gap-1"><Activity className="w-3.5 h-3.5"/> Propuesta de Atributos</label>
                  <span className={`text-xs font-mono font-bold ${puntosRestantes === 0 ? 'text-red-500' : 'text-emerald-500'}`}>Puntos restantes: {puntosRestantes}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(atributos).map(([key, val]) => (
                    <div key={key} className="bg-neutral-900 border border-neutral-800 rounded p-2 flex flex-col items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-neutral-500">{key}</span>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => cambiarAtributo(key as keyof typeof atributos, -1)} className="text-red-500 hover:text-red-400 w-5 h-5 flex items-center justify-center bg-black rounded">-</button>
                        <span className="text-sm font-mono text-neutral-200 w-4 text-center">{val}</span>
                        <button type="button" onClick={() => cambiarAtributo(key as keyof typeof atributos, 1)} className="text-emerald-500 hover:text-emerald-400 w-5 h-5 flex items-center justify-center bg-black rounded">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-neutral-400 uppercase">¿Algo especial?</label>
                <input required value={nuevoDefecto} onChange={(e) => setNuevoDefecto(e.target.value)} type="text" className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 focus:border-red-800 outline-none" placeholder="Ej. Fobia al fuego, Ciego del ojo izquierdo..." />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-neutral-400 uppercase">Historia (Opcional)</label>
                <textarea value={nuevaHistoria} onChange={(e) => setNuevaHistoria(e.target.value)} rows={3} className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 focus:border-red-800 outline-none resize-none" placeholder="Razón por la que esta alma busca regresar al mundo material..." />
              </div>

              <div className="flex gap-4 pt-4 border-t border-neutral-900">
                <button type="submit" className="px-6 py-2 bg-red-900 hover:bg-red-800 text-white font-mono text-sm uppercase rounded transition-colors shadow-lg">
                  Ofrecer Alma a Kuroi
                </button>
                <button type="button" onClick={() => setMostrarFormulario(false)} className="px-6 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 font-mono text-sm uppercase rounded transition-colors">
                  Cancelar Ritual
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}