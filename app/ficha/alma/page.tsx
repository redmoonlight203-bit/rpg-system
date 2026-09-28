"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { 
  ArrowLeft, Sparkles, Package, Award, Layers, 
  X, Lock, BookOpen, Compass, Zap 
} from "lucide-react";

interface ArticuloAlma {
  id: string;
  nombre: string;
  tipo: "habilidad" | "objeto" | "titulo" | "variedad";
  origen: string;
  historia: string;
  efecto: string;
}

export default function VinculosDelAlma() {
  const router = useRouter();
  const [vinculos, setVinculos] = useState<ArticuloAlma[]>([]);
  const [filtro, setFiltro] = useState<string>("todos");
  const [itemSeleccionado, setItemSeleccionado] = useState<ArticuloAlma | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarVinculos = async () => {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    // Consulta los vínculos asociados directamente al user_id del jugador
    const { data, error } = await supabase
      .from("jugador_vinculos")
      .select(`
        articulo_id,
        articulos_alma (
          id,
          nombre,
          tipo,
          origen,
          historia,
          efecto
        )
      `)
      .eq("user_id", session.user.id);

    if (!error && data) {
      // Extraemos los artículos formateados
      const listaExtraida = data
        .map((v: any) => v.articulos_alma)
        .filter(Boolean) as ArticuloAlma[];
      setVinculos(listaExtraida);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarVinculos();
  }, []);

  const vinculosFiltrados = vinculos.filter((item) => {
    if (filtro === "todos") return true;
    return item.tipo === filtro;
  });

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case "habilidad": return <Zap className="w-5 h-5 text-cyan-400" />;
      case "objeto": return <Package className="w-5 h-5 text-amber-500" />;
      case "titulo": return <Award className="w-5 h-5 text-purple-400" />;
      case "variedad": return <Layers className="w-5 h-5 text-emerald-400" />;
      default: return <Sparkles className="w-5 h-5 text-red-500" />;
    }
  };

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono animate-pulse">Sincronizando Archivos de Alma...</div>;

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative">
      <div className="max-w-6xl mx-auto space-y-8 relative z-10 pb-20">
        
        {/* Cabecera */}
        <header className="flex items-center gap-4 border-b border-red-900/40 pb-6">
          <button onClick={() => router.push("/ficha")} className="text-neutral-500 hover:text-red-400 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-red-600" /> Vínculos del Alma
            </h1>
            <p className="text-red-700/80 text-xs font-mono tracking-widest mt-1 uppercase">
              [ BIBLIOTECA INMUTABLE DE HABILIDADES, OBJETOS, TÍTULOS Y VARIEDADES ]
            </p>
          </div>
        </header>

        {/* Filtros de la Biblioteca */}
        <div className="flex flex-wrap gap-2 border-b border-neutral-900 pb-4">
          {[
            { id: "todos", label: `Todos (${vinculos.length})` },
            { id: "habilidad", label: "Habilidades" },
            { id: "objeto", label: "Objetos" },
            { id: "titulo", label: "Títulos" },
            { id: "variedad", label: "Variedades" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFiltro(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                filtro === tab.id
                  ? "bg-red-950 border border-red-800 text-red-200 glow-blood-sm font-bold"
                  : "bg-neutral-950 border border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grilla de Elementos Vinculados */}
        {vinculosFiltrados.length === 0 ? (
          <div className="text-center py-20 bg-neutral-950/40 border border-neutral-900 rounded-xl space-y-3">
            <Lock className="w-10 h-10 text-neutral-700 mx-auto" />
            <p className="text-neutral-600 font-mono text-xs uppercase tracking-widest">
              Tu alma no ha asimilado elementos en esta categoría aún.
            </p>
            <p className="text-neutral-700 text-xs italic">
              Obtén bendiciones asociadas al alma durante tus partidas para verlas aquí.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vinculosFiltrados.map((item) => (
              <div
                key={item.id}
                onClick={() => setItemSeleccionado(item)}
                className="bg-neutral-950 border border-neutral-800 hover:border-red-900/60 p-5 rounded-xl transition-all duration-300 cursor-pointer flex flex-col justify-between group hover:glow-blood-sm"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg">
                      {getIconoTipo(item.tipo)}
                    </div>
                    <span className="text-[10px] font-mono text-red-500/80 bg-red-950/40 border border-red-900/40 px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                      {item.tipo}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-neutral-200 group-hover:text-red-300 transition-colors">
                      {item.nombre}
                    </h3>
                    <p className="text-[11px] font-mono text-neutral-500 mt-1 flex items-center gap-1">
                      <Compass className="w-3 h-3 text-neutral-600" /> Origen: {item.origen || "Desconocido"}
                    </p>
                  </div>

                  <p className="text-xs text-neutral-400 line-clamp-2 italic bg-black/40 p-2.5 rounded border border-neutral-900">
                    "{item.efecto}"
                  </p>
                </div>

                <div className="pt-3 mt-4 border-t border-neutral-900 text-right">
                  <span className="text-[11px] font-mono text-red-500 group-hover:translate-x-1 transition-transform inline-block">
                    Consultar Registro →
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Modal de Lectura Detallada */}
        {itemSeleccionado && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-red-900/50 p-6 md:p-8 rounded-xl max-w-xl w-full glow-blood relative space-y-6">
              
              <button
                onClick={() => setItemSeleccionado(null)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-red-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Cabecera del Elemento */}
              <div className="flex items-center gap-3 border-b border-neutral-900 pb-4">
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                  {getIconoTipo(itemSeleccionado.tipo)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-red-500 tracking-widest font-bold">
                      [{itemSeleccionado.tipo}]
                    </span>
                    <span className="text-[10px] font-mono text-neutral-600">
                      • Origen: {itemSeleccionado.origen}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-neutral-100 font-mono">
                    {itemSeleccionado.nombre}
                  </h2>
                </div>
              </div>

              {/* Efecto / Qué hace */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-neutral-400 uppercase flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Propiedad / Efecto
                </span>
                <div className="bg-black border border-neutral-800 p-4 rounded-lg text-sm text-neutral-200 font-sans leading-relaxed">
                  {itemSeleccionado.efecto}
                </div>
              </div>

              {/* Historia / Lore */}
              {itemSeleccionado.historia && (
                <div className="space-y-1.5">
                  <span className="text-xs font-mono text-neutral-400 uppercase flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-red-500" /> Historia del Registro
                  </span>
                  <div className="bg-neutral-900/40 border border-neutral-900 p-4 rounded-lg text-xs text-neutral-400 italic font-serif leading-relaxed">
                    "{itemSeleccionado.historia}"
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-neutral-900 text-center">
                <button
                  onClick={() => setItemSeleccionado(null)}
                  className="px-6 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs uppercase rounded transition-colors"
                >
                  Cerrar Registro
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}