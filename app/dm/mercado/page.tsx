"use client";

import React, { useEffect, useState } from "react";
import { ForjaOperacion } from "../../../components/ForjaOperacion";
import { supabase } from "../../../lib/supabase";
import { 
  ShoppingBag, MessageSquare, Trash2, CheckCircle, XCircle, Package, UserCheck, Eye, RotateCcw
} from "lucide-react";

interface EntidadForja {
  id: string;
  tipo: string;
  nombre: string;
  descripcion: string;
  clase: string;
  imagen_url: string;
  stats: Record<string, number>;
  stats_rango?: Record<string, { min: number; max: number }>;
  es_grupo: boolean;
  ligado_al_alma: boolean;
  es_vendible: boolean;
  precio_sugerido: string;
  ubicacion: string;
}

interface ItemInventarioJugador {
  id: string;
  user_id: string;
  forja_id: string;
  nombre: string;
  tipo: string;
  clase: string;
  stats: Record<string, number>;
  ligado_al_alma: boolean;
  personaje_id: number | null;
  created_at: string;
  jugador_nombre?: string;
}

interface Negociacion {
  id: string;
  user_id: string;
  item_id: string;
  mensaje: string;
  estado: string;
  created_at: string;
  personaje_nombre: string;
  item_nombre: string;
}

interface CuentaJugador {
  user_id: string;
  identificador_cuenta: string;
}

export default function MercadoNegroKuroi() {
  const [pestana, setPestana] = useState<"escaparate" | "negociaciones" | "inventarios">("escaparate");
  const [articulosForja, setArticulosForja] = useState<EntidadForja[]>([]);
  const [negociaciones, setNegociaciones] = useState<Negociacion[]>([]);
  const [cuentasJugadores, setCuentasJugadores] = useState<CuentaJugador[]>([]);
  const [inventariosGlobales, setInventariosGlobales] = useState<ItemInventarioJugador[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal Venta / Entrega
  const [itemAEntregar, setItemAEntregar] = useState<EntidadForja | null>(null);
  const [negociacionEntrega, setNegociacionEntrega] = useState<Negociacion | null>(null);

  const cargarDatos = async () => {
    setCargando(true);

    // 1. Cargar escaparate público
    const { data: forjaData } = await supabase
      .from("forja_maestra")
      .select("*")
      .eq("es_vendible", true)
      .order("created_at", { ascending: false });
    if (forjaData) setArticulosForja(forjaData as EntidadForja[]);

    // 2. Cargar Cuentas Únicas de Jugadores
    const { data: pjs } = await supabase.from("personajes").select("user_id, nombre");
    if (pjs) {
      const cuentasMap = new Map<string, string>();
      pjs.forEach((p) => {
        if (!cuentasMap.has(p.user_id)) cuentasMap.set(p.user_id, p.nombre);
      });

      const listaCuentas: CuentaJugador[] = Array.from(cuentasMap.entries()).map(([uId, nombrePj]) => ({
        user_id: uId,
        identificador_cuenta: `Cuenta Reencarnada (${nombrePj})`
      }));
      setCuentasJugadores(listaCuentas);
    }

    // 3. Cargar Negociaciones Pendientes
    const { data: negs } = await supabase
      .from("negociaciones_tienda")
      .select("*")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false });

    if (negs) {
      const negociacionesMapeadas = await Promise.all(
        negs.map(async (n: any) => {
          const { data: itemData } = await supabase.from("forja_maestra").select("nombre").eq("id", n.item_id).single();
          const { data: pjData } = await supabase.from("personajes").select("nombre").eq("user_id", n.user_id).single();

          return {
            id: n.id,
            user_id: n.user_id,
            item_id: n.item_id,
            mensaje: n.mensaje,
            estado: n.estado,
            created_at: n.created_at,
            personaje_nombre: pjData?.nombre || "Reencarnado Desconocido",
            item_nombre: itemData?.nombre || "Objeto de la Forja"
          };
        })
      );
      setNegociaciones(negociacionesMapeadas as Negociacion[]);
    }

    // 4. Cargar Auditoría de Inventarios de Jugadores
    const { data: invData } = await supabase.from("inventario_jugador").select("*").order("created_at", { ascending: false });
    if (invData && pjs) {
      const invMapeados = invData.map((inv: any) => {
        const matchPj = pjs.find(p => p.user_id === inv.user_id);
        return {
          ...inv,
          jugador_nombre: matchPj?.nombre || "Reencarnado"
        };
      });
      setInventariosGlobales(invMapeados as ItemInventarioJugador[]);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const resolverNegociacion = async (neg: Negociacion, estado: "aprobada" | "rechazada") => {
    if (estado === "rechazada") {
      const r = await supabase.from("negociaciones_tienda").update({estado:"rechazada"}).eq("id",neg.id).eq("estado","pendiente");
      if (r.error) alert(r.error.message); else void cargarDatos();
      return;
    }
    const r = await supabase.from("forja_maestra").select("*").eq("id",neg.item_id).single();
    if (r.error || !r.data) { alert(r.error?.message || "La creación no está disponible."); return; }
    setNegociacionEntrega(neg); setItemAEntregar(r.data as EntidadForja);
  };

  // REVOCAR OBJETO DE UN JUGADOR
  const revocarDeJugador = async (invId: string, forjaId?: string) => {
    if (!window.confirm("¿Seguro que deseas revocar este objeto del inventario del jugador? Se devolverá a La Forja.")) return;

    await supabase.from("inventario_jugador").delete().eq("id", invId);


    cargarDatos();
  };

  const quitarDelEscaparate = async (id: string) => {
    await supabase.from("forja_maestra").update({ es_vendible: false, ubicacion: "forja" }).eq("id", id);
    cargarDatos();
  };

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-purple-500 font-mono animate-pulse">Sincronizando la Trazabilidad del Mercado...</div>;

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-8 relative z-10 pb-20">
        
        {/* CABECERA */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-purple-900/50 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-950/40 border border-purple-800 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.2)] text-purple-500">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono">
                Mercado Clandestino
              </h1>
              <p className="text-purple-700/80 text-xs font-mono tracking-widest uppercase">
                [ ESCAPARATE DE LA FORJA Y AUDITORÍA DE INVENTARIOS ]
              </p>
            </div>
          </div>
        </header>

        {/* PESTAÑAS */}
        <nav className="flex flex-wrap gap-2 border-b border-neutral-900 pb-4">
          {[
            { id: "escaparate", label: `En Escaparate (${articulosForja.length})`, icon: Package },
            { id: "negociaciones", label: `Ofertas (${negociaciones.length})`, icon: MessageSquare },
            { id: "inventarios", label: `Inventarios de Jugadores (${inventariosGlobales.length})`, icon: Eye },
          ].map((tab) => {
            const Icono = tab.icon;
            const activa = pestana === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPestana(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                  activa
                    ? "bg-purple-950/80 border border-purple-800 text-purple-200 font-bold shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                    : "bg-neutral-950 border border-neutral-900 text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Icono className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* PESTAÑA 1: EN ESCAPARATE */}
        {pestana === "escaparate" && (
          <section className="space-y-4">
            {articulosForja.length === 0 ? (
              <div className="bg-neutral-950 border border-neutral-900 p-12 text-center rounded-xl text-neutral-500 font-mono text-sm">
                No hay artículos expuestos en la tienda. Activa "Vender en Mercado" desde La Forja.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articulosForja.map((art) => (
                  <div key={art.id} className="bg-black border border-purple-900/30 p-5 rounded-xl flex flex-col justify-between space-y-4 hover:border-purple-800 transition-colors shadow-lg">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-purple-900 bg-purple-950 text-purple-300 uppercase">
                          {art.tipo} • RANGO {art.clase}
                        </span>
                        <button onClick={() => quitarDelEscaparate(art.id)} className="p-1 text-neutral-600 hover:text-red-500 transition-colors" title="Retirar del Mercado">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <h3 className="text-lg font-bold text-neutral-100 font-mono">{art.nombre}</h3>
                      <p className="text-xs text-neutral-400 italic font-serif leading-relaxed line-clamp-3">"{art.descripcion}"</p>

                      <div className="bg-neutral-900/60 p-2.5 rounded border border-neutral-800 flex justify-between items-center">
                        <span className="text-[10px] font-mono text-neutral-500 uppercase">Precio:</span>
                        <span className="text-xs font-mono font-bold text-amber-500">{art.precio_sugerido || "Sin Precio"}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {setNegociacionEntrega(null);setItemAEntregar(art);}}
                      className="w-full bg-purple-950 hover:bg-purple-900 border border-purple-800 text-purple-200 text-xs font-mono py-2.5 rounded font-bold uppercase flex items-center justify-center gap-2 transition-colors"
                    >
                      <UserCheck className="w-4 h-4" /> Transferir a Jugador
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* PESTAÑA 2: NEGOCIACIONES */}
        {pestana === "negociaciones" && (
          <section className="space-y-4">
            {negociaciones.length === 0 ? (
              <div className="bg-neutral-950 border border-neutral-900 p-10 text-center rounded-xl text-neutral-500 font-mono text-sm">
                No hay propuestas pendientes.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {negociaciones.map((neg) => (
                  <div key={neg.id} className="bg-black border border-amber-900/50 p-5 rounded-xl flex flex-col justify-between space-y-4 shadow-lg">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono text-amber-500 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900">
                          OFERTA PENDIENTE
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">{new Date(neg.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      <h3 className="text-base font-bold text-neutral-100 font-mono border-b border-neutral-900 pb-2">
                        {neg.item_nombre}
                      </h3>

                      <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded space-y-1">
                        <p className="text-[10px] text-neutral-400 font-mono uppercase">
                          Jugador: <strong className="text-red-400">{neg.personaje_nombre}</strong>
                        </p>
                        <p className="text-xs text-amber-300 font-serif italic border-l-2 border-amber-700 pl-2 mt-1">
                          "{neg.mensaje}"
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-neutral-900">
                      <button onClick={() => resolverNegociacion(neg, "aprobada")} className="flex-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 text-[11px] font-mono py-2 rounded font-bold uppercase flex items-center justify-center gap-1 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Aprobar Trato
                      </button>
                      <button onClick={() => resolverNegociacion(neg, "rechazada")} className="flex-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-[11px] font-mono py-2 rounded font-bold uppercase flex items-center justify-center gap-1 transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* PESTAÑA 3: INVENTARIOS DE JUGADORES */}
        {pestana === "inventarios" && (
          <section className="space-y-4">
            {inventariosGlobales.length === 0 ? (
              <div className="bg-neutral-950 border border-neutral-900 p-12 text-center rounded-xl text-neutral-500 font-mono text-sm">
                Ningún jugador posee objetos en su Alma o Avatar actualmente.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inventariosGlobales.map((inv) => (
                  <div key={inv.id} className="bg-black border border-neutral-800 p-5 rounded-xl space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-purple-900 bg-purple-950 text-purple-300 uppercase">
                          {inv.jugador_nombre}
                        </span>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${inv.personaje_id ? "bg-amber-950 border-amber-800 text-amber-300" : "bg-indigo-950 border-indigo-800 text-indigo-300"}`}>
                          {inv.personaje_id ? "Equipado" : "En Alma"}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-neutral-100 font-mono">{inv.nombre}</h3>
                      
                      {inv.stats && Object.keys(inv.stats).length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2 border-t border-neutral-900">
                          {Object.entries(inv.stats).map(([k, v]) => (
                            <span key={k} className="text-[9px] font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded text-emerald-400">
                              {k}: +{v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => revocarDeJugador(inv.id, inv.forja_id)}
                      className="w-full bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-mono py-2 rounded font-bold uppercase flex items-center justify-center gap-2 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Retirar esta copia
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {itemAEntregar && <ForjaOperacion item={itemAEntregar} modo="inventario" usuarioId={negociacionEntrega?.user_id} negociacionId={negociacionEntrega?.id}
          onClose={() => {setItemAEntregar(null);setNegociacionEntrega(null);}}
          onDone={() => {setItemAEntregar(null);setNegociacionEntrega(null);void cargarDatos();alert("Copia entregada al inventario del personaje.");}}/>}

      </div>
    </main>
  );
}