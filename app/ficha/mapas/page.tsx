"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  ArrowLeft,
  Map,
  Compass,
  Lock,
  Eye,
  X,
  Maximize2,
  Image as ImageIcon,
} from "lucide-react";

interface MapaDescubierto {
  id: string;
  titulo: string;
  region: string;
  descripcion: string;
  imagen_url: string;
  nivel_peligro: string;
  descubierto_en: string;
}
interface RegistroMapaDescubierto {
  created_at: string;
  mapas: Omit<MapaDescubierto, "descubierto_en"> | null;
}
export default function Cartografia() {
  const router = useRouter();
  const [mapas, setMapas] = useState<MapaDescubierto[]>([]);
  const [mapaSeleccionado, setMapaSeleccionado] = useState<MapaDescubierto | null>(null);
  const [verImagenCompleta, setVerImagenCompleta] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargarMapas = async () => {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("jugador_mapas")
      .select(`
        created_at,
        mapas (
          id,
          titulo,
          region,
          descripcion,
          imagen_url,
          nivel_peligro
        )
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const registros = data as unknown as RegistroMapaDescubierto[];

      const listaFormateada: MapaDescubierto[] = registros.flatMap(
        (item) => {
          if (!item.mapas) {
            return [];
          }

          return [
            {
              ...item.mapas,
              descubierto_en: item.created_at,
            },
          ];
        }
      );

      setMapas(listaFormateada);
    }

    setCargando(false);
  };

  useEffect(() => {
    let activo = true;

    Promise.resolve().then(() => {
      if (activo) {
        void cargarMapas();
      }
    });

    return () => {
      activo = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPeligroBadge = (nivel: string) => {
    switch (nivel.toLowerCase()) {
      case "segura":
      case "zona segura":
        return "bg-emerald-950/80 border-emerald-800 text-emerald-400";
      case "peligro moderado":
      case "moderado":
        return "bg-amber-950/80 border-amber-800 text-amber-400";
      case "mortal":
      case "alto riesgo":
        return "bg-red-950/80 border-red-800 text-red-400";
      case "abisal":
      case "maldito":
        return "bg-purple-950/80 border-purple-800 text-purple-300 animate-pulse";
      default:
        return "bg-neutral-900 border-neutral-800 text-neutral-400";
    }
  };

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-emerald-500 font-mono animate-pulse">Desplegando la Mapeación del Mundo...</div>;

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative">
      
      {/* Resplandor Esmeralda de Cartografía */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-emerald-950/10 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 pb-20">
        
        {/* Cabecera */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-emerald-900/40 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/ficha")} className="text-neutral-500 hover:text-emerald-400 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono flex items-center gap-2">
                <Map className="w-6 h-6 text-emerald-500" /> Cartografía
              </h1>
              <p className="text-emerald-500/80 text-xs font-mono tracking-widest mt-1 uppercase">
                [ ATLAS Y TERRITORIOS EXPLORADOS POR TUS REENCARNADOS ]
              </p>
            </div>
          </div>
        </header>

        {/* Galería de Mapas */}
        {mapas.length === 0 ? (
          <div className="text-center py-20 bg-neutral-950/40 border border-neutral-900 rounded-xl space-y-3">
            <Lock className="w-10 h-10 text-neutral-700 mx-auto" />
            <p className="text-neutral-600 font-mono text-xs uppercase tracking-widest">
              Aún no has descubierto ni pisado ningún territorio registrado.
            </p>
            <p className="text-neutral-700 text-xs italic">
              Explora nuevas zonas durante las sesiones para ir desbloqueando los mapas aquí.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mapas.map((mapa) => (
              <div
                key={mapa.id}
                onClick={() => setMapaSeleccionado(mapa)}
                className="bg-neutral-950 border border-neutral-800 hover:border-emerald-900/60 rounded-xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col justify-between group hover:glow-blood-sm"
              >
                {/* Vista previa de la imagen */}
                <div className="relative h-48 w-full bg-neutral-900 overflow-hidden border-b border-neutral-900">
                  {mapa.imagen_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mapa.imagen_url}
                        alt={mapa.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                      />
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-700 gap-2 bg-neutral-950">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-[10px] font-mono uppercase">
                        Sin Ilustración
                      </span>
                    </div>
                  )}

                  {/* Badge de Peligro sobre la foto */}
                  <div className="absolute top-3 right-3">
                    <span className={`text-[9px] font-mono font-bold uppercase px-2.5 py-1 rounded border shadow-lg ${getPeligroBadge(mapa.nivel_peligro)}`}>
                      {mapa.nivel_peligro}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 uppercase">
                      <Compass className="w-3.5 h-3.5" /> Región: {mapa.region}
                    </div>
                    <h3 className="text-lg font-bold text-neutral-100 group-hover:text-emerald-300 transition-colors font-mono">
                      {mapa.titulo}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 italic font-serif leading-relaxed">
                      &ldquo;{mapa.descripcion}&rdquo;
                    </p>
                  </div>

                  <div className="pt-3 border-t border-neutral-900 flex justify-between items-center text-[11px] font-mono text-neutral-500">
                    <span>Pisado el {new Date(mapa.descubierto_en).toLocaleDateString()}</span>
                    <span className="text-emerald-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> Inspeccionar →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Modal: Detalle del Mapa */}
        {mapaSeleccionado && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-emerald-900/60 p-6 md:p-8 rounded-xl max-w-3xl w-full relative space-y-6 max-h-[90vh] overflow-y-auto shadow-[0_0_35px_rgba(16,185,129,0.15)]">
              
              <button
                onClick={() => { setMapaSeleccionado(null); setVerImagenCompleta(false); }}
                className="absolute top-4 right-4 text-neutral-500 hover:text-emerald-400 transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Imagen Grande */}
              {mapaSeleccionado.imagen_url && (
                <div className="relative rounded-lg overflow-hidden border border-neutral-800 max-h-72 bg-black group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mapaSeleccionado.imagen_url}
                    alt={mapaSeleccionado.titulo}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setVerImagenCompleta(true)}
                    className="absolute bottom-3 right-3 bg-black/80 hover:bg-emerald-950 border border-emerald-800 text-emerald-300 p-2 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> Pantalla Completa
                  </button>
                </div>
              )}

              {/* Detalle Texto */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-900 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-widest font-bold">
                      [ REGIÓN: {mapaSeleccionado.region} ]
                    </span>
                    <h2 className="text-2xl font-bold text-neutral-100 font-mono mt-0.5">
                      {mapaSeleccionado.titulo}
                    </h2>
                  </div>

                  <span className={`text-xs font-mono font-bold uppercase px-3 py-1 rounded border ${getPeligroBadge(mapaSeleccionado.nivel_peligro)}`}>
                    Nivel: {mapaSeleccionado.nivel_peligro}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-mono text-neutral-400 uppercase">Detalles del Territorio</span>
                  <div className="bg-black/80 border border-neutral-900 p-4 rounded-lg text-sm text-neutral-200 font-serif leading-relaxed whitespace-pre-wrap">
                    {mapaSeleccionado.descripcion}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-900 text-center">
                <button
                  onClick={() => setMapaSeleccionado(null)}
                  className="px-6 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs uppercase rounded"
                >
                  Cerrar Mapa
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Modal: Vista en Pantalla Completa de la Ilustración */}
        {verImagenCompleta && mapaSeleccionado?.imagen_url && (
          <div 
            onClick={() => setVerImagenCompleta(false)}
            className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 cursor-zoom-out"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mapaSeleccionado.imagen_url}
              alt={mapaSeleccionado.titulo}
              className="max-w-full max-h-full object-contain rounded-lg border border-neutral-800 shadow-2xl"
            />
            <span className="absolute top-4 right-4 text-neutral-400 font-mono text-xs bg-black/80 px-3 py-1.5 rounded border border-neutral-800">
              Haz clic en cualquier lugar para salir
            </span>
          </div>
        )}

      </div>
    </main>
  );
}