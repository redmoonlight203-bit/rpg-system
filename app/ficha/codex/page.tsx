"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { 
  ArrowLeft, BookOpen, User, Package, Zap, 
  Award, HelpCircle, Search, X, Compass, Lock, Eye 
} from "lucide-react";

interface EntradaCodex {
  id: string;
  titulo: string;
  tipo: "personaje" | "objeto" | "habilidad" | "titulo" | "extra";
  origen: string;
  descripcion: string;
  mecanica: string;
  revelado_en: string;
}
interface DescubrimientoCodex {
  created_at: string;
  codex_entradas:
    | Omit<EntradaCodex, "revelado_en">
    | Omit<EntradaCodex, "revelado_en">[]
    | null;
}
export default function ElCodice() {
  const router = useRouter();
  const [entradas, setEntradas] = useState<EntradaCodex[]>([]);
  const [filtro, setFiltro] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState<string>("");
  const [entradaDetalle, setEntradaDetalle] = useState<EntradaCodex | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarCodex = async () => {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const userId = session.user.id;

    // Consultar todos los descubrimientos del jugador
    const { data, error } = await supabase
      .from("codex_descubrimientos")
      .select(`
        created_at,
        codex_entradas (
          id,
          titulo,
          tipo,
          origen,
          descripcion,
          mecanica
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
     const descubrimientos = data as unknown as DescubrimientoCodex[];
     const listaFormateada: EntradaCodex[] =
      descubrimientos.flatMap((descubrimiento) => {
        const relacion = descubrimiento.codex_entradas;

        if (!relacion) {
          return [];
        }

        const registros = Array.isArray(relacion)
          ? relacion
          : [relacion];

        return registros.map((entrada) => ({
          ...entrada,
          revelado_en: descubrimiento.created_at,
        }));
      });

    setEntradas(listaFormateada);
    }

    setCargando(false);
  };

  useEffect(() => {
    let activo = true;

    Promise.resolve().then(() => {
      if (activo) {
        void cargarCodex();
      }
    });

    return () => {
      activo = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case "personaje": return <User className="w-5 h-5 text-red-500" />;
      case "objeto": return <Package className="w-5 h-5 text-amber-500" />;
      case "habilidad": return <Zap className="w-5 h-5 text-cyan-400" />;
      case "titulo": return <Award className="w-5 h-5 text-purple-400" />;
      default: return <HelpCircle className="w-5 h-5 text-emerald-400" />;
    }
  };

  const entradasFiltradas = entradas.filter((item) => {
    const coincideFiltro = filtro === "todos" || item.tipo === filtro;
    const coincideBusqueda = 
      item.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.origen.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    return coincideFiltro && coincideBusqueda;
  });

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono animate-pulse">Abriendo el Códice Ancestral...</div>;

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative">
      <div className="max-w-6xl mx-auto space-y-8 relative z-10 pb-20">
        
        {/* Cabecera */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-red-900/40 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/ficha")} className="text-neutral-500 hover:text-red-400 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-red-600" /> El Códice del Mundo
              </h1>
              <p className="text-red-700/80 text-xs font-mono tracking-widest mt-1 uppercase">
                [ COMPENDIO DE CONOCIMIENTO REVELADO EN TUS VIAJES ]
              </p>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en el Códice..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-xs text-neutral-200 focus:border-red-800 outline-none font-mono"
            />
          </div>
        </header>

        {/* Filtros por Categoría */}
        <div className="flex flex-wrap gap-2 border-b border-neutral-900 pb-4">
          {[
            { id: "todos", label: `Todo (${entradas.length})` },
            { id: "personaje", label: "Personajes" },
            { id: "objeto", label: "Objetos" },
            { id: "habilidad", label: "Habilidades" },
            { id: "titulo", label: "Títulos" },
            { id: "extra", label: "Extras / Varios" },
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

        {/* Grilla del Códice */}
        {entradasFiltradas.length === 0 ? (
          <div className="text-center py-20 bg-neutral-950/40 border border-neutral-900 rounded-xl space-y-3">
            <Lock className="w-10 h-10 text-neutral-700 mx-auto" />
            <p className="text-neutral-600 font-mono text-xs uppercase tracking-widest">
              Ningún conocimiento registrado en esta categoría aún.
            </p>
            <p className="text-neutral-700 text-xs italic">
              Explora el mundo y enfrenta nuevos entes para desbloquear entradas en el Códice.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entradasFiltradas.map((item) => (
              <div
                key={item.id}
                onClick={() => setEntradaDetalle(item)}
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
                      {item.titulo}
                    </h3>
                    <p className="text-[11px] font-mono text-neutral-500 mt-1 flex items-center gap-1">
                      <Compass className="w-3 h-3 text-neutral-600" /> Origen: {item.origen || "Desconocido"}
                    </p>
                  </div>

                  <p className="text-xs text-neutral-400 line-clamp-2 italic bg-black/40 p-2.5 rounded border border-neutral-900">
                    &ldquo;{item.descripcion || "Sin información de historia registrada..."}&rdquo;
                  </p>
                </div>

                <div className="pt-3 mt-4 border-t border-neutral-900 flex justify-between items-center text-[11px] font-mono">
                  <span className="text-neutral-600">
                    {new Date(item.revelado_en).toLocaleDateString()}
                  </span>
                  <span className="text-red-500 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Abrir Códice →
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Modal de Lectura Completa */}
        {entradaDetalle && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-red-900/50 p-6 md:p-8 rounded-xl max-w-2xl w-full glow-blood relative space-y-6 max-h-[90vh] overflow-y-auto">
              
              <button
                onClick={() => setEntradaDetalle(null)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-red-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-3 border-b border-neutral-900 pb-4">
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                  {getIconoTipo(entradaDetalle.tipo)}
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-red-500 tracking-widest font-bold">
                    [ CÓDICE: {entradaDetalle.tipo} ]
                  </span>
                  <h2 className="text-2xl font-bold text-neutral-100 font-mono">
                    {entradaDetalle.titulo}
                  </h2>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">
                    Origen: {entradaDetalle.origen} • Revelado el {new Date(entradaDetalle.revelado_en).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Funcionamiento y Reglas */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-amber-500 uppercase font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Funcionamiento y Propiedades
                </span>
                <div className="bg-black border border-neutral-800 p-4 rounded-lg text-sm text-neutral-200 font-mono leading-relaxed whitespace-pre-wrap">
                  {entradaDetalle.mecanica || "Sin detalles mecánicos especificados."}
                </div>
              </div>

              {/* Historia y Lore */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-red-500 uppercase font-bold flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> Historia y Leyenda
                </span>
                <div className="bg-neutral-900/40 border border-neutral-900 p-4 rounded-lg text-xs text-neutral-300 italic font-serif leading-relaxed whitespace-pre-wrap">
                  &ldquo;{entradaDetalle.descripcion || "Historia no documentada en el registro."}&rdquo;
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-900 text-center">
                <button
                  onClick={() => setEntradaDetalle(null)}
                  className="px-6 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs uppercase rounded"
                >
                  Cerrar Códice
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}