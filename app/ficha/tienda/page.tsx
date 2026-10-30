"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { linaje } from "../../../lib/estadisticas";
import { supabase } from "../../../lib/supabase";
import { 
  ArrowLeft, ShoppingBag, User, Sparkles, Package, 
  Heart, MessageSquare, Check, X, ShieldAlert, Tag 
} from "lucide-react";

interface TiendaItem {
  id: string;
  titulo: string;
  tipo: string;
  clasificacion?: string;
  descripcion: string;
  precio: string;
  requisito: string;
}

export default function TiendaKuroi() {
  const router = useRouter();
  const [items, setItems] = useState<TiendaItem[]>([]);
  const [deseos, setDeseos] = useState<string[]>([]);
  const [negociaciones, setNegociaciones] = useState<string[]>([]);
  const [filtro, setFiltro] = useState<string>("todos");
  const [itemSeleccionado, setItemSeleccionado] = useState<TiendaItem | null>(null);
  const [mensajeNegociacion, setMensajeNegociacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargarTienda = async () => {
    setCargando(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push("/login");
      return;
    }

    const userId = session.user.id;

    // 1. Obtener todas las ofertas de la tienda
    const [catalogo, cats] = await Promise.all([
      supabase.from("forja_maestra").select("*").eq("es_vendible",true).eq("estado","aprobado"),
      supabase.from("categorias_forja").select("*"),
    ]);
    if (catalogo.error || cats.error) { alert(catalogo.error?.message || cats.error?.message); setCargando(false); return; }
    setItems((catalogo.data || []).map(f => {
      const ruta = linaje(cats.data || [], f.tipo);
      const raiz = ruta[0]?.clave || f.tipo;
      const tipo = ["objetos","objeto"].includes(raiz) ? "objeto" : ["razas","personaje","npc","monstruo"].includes(raiz) ? "personaje" : ["habilidades","habilidad"].includes(raiz) ? "habilidad" : raiz;
      return {id:f.id,titulo:f.nombre,tipo,descripcion:f.descripcion || "",precio:f.precio_sugerido || "A negociar",requisito:f.requisitos || "Ninguno",clasificacion:ruta.map(c=>c.nombre).join(" / ") || f.tipo};
    }));

    // 2. Obtener lista de deseos del jugador
    const { data: listaDeseos } = await supabase
      .from("lista_deseos")
      .select("item_id")
      .eq("user_id", userId);
    if (listaDeseos) setDeseos(listaDeseos.map((d) => d.item_id));

    // 3. Obtener negociaciones activas enviadas
    const { data: negs } = await supabase
      .from("negociaciones_tienda")
      .select("item_id")
      .eq("user_id", userId);
    if (negs) setNegociaciones(negs.map((n) => n.item_id));

    setCargando(false);
  };

  useEffect(() => {
    cargarTienda();
  }, []);

  // Alternar wishlist (Agregar/Quitar)
  const toggleDeseo = async (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const existe = deseos.includes(itemId);

    if (existe) {
      await supabase.from("lista_deseos").delete().eq("user_id", session.user.id).eq("item_id", itemId);
      setDeseos(deseos.filter((id) => id !== itemId));
    } else {
      await supabase.from("lista_deseos").insert([{ user_id: session.user.id, item_id: itemId }]);
      setDeseos([...deseos, itemId]);
    }
  };

  // Enviar oferta de negociación a Kuroi
  const enviarNegociacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSeleccionado) return;
    setEnviando(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("negociaciones_tienda").insert([{
      user_id: session.user.id,
      item_id: itemSeleccionado.id,
      mensaje: mensajeNegociacion
    }]);

    if (!error) {
      alert(`Aviso enviado a Kuroi para negociar "${itemSeleccionado.titulo}".`);
      setNegociaciones([...negociaciones, itemSeleccionado.id]);
      setItemSeleccionado(null);
      setMensajeNegociacion("");
    } else {
      alert("Error al enviar la propuesta de negociación.");
    }
    setEnviando(false);
  };

  const itemsFiltrados = items.filter((item) => {
    if (filtro === "deseos") return deseos.includes(item.id);
    if (filtro !== "todos") return item.tipo === filtro;
    return true;
  });

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case "personaje": return <User className="w-5 h-5 text-red-500" />;
      case "habilidad": return <Sparkles className="w-5 h-5 text-cyan-500" />;
      case "objeto": return <Package className="w-5 h-5 text-amber-500" />;
      default: return <Tag className="w-5 h-5 text-neutral-400" />;
    }
  };

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono animate-pulse">Abriendo el Mercado Negro de Kuroi...</div>;

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
                <ShoppingBag className="w-6 h-6 text-red-600" /> Mercado de Kuroi
              </h1>
              <p className="text-red-700/80 text-xs font-mono tracking-widest mt-1 uppercase">
                [ OFERTAS, RELIQUIAS Y RECEPTÁCULOS EN VENTA ]
              </p>
            </div>
          </div>
        </header>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap gap-2 border-b border-neutral-900 pb-4">
          {[
            { id: "todos", label: "Todas las Ofertas" },
            { id: "personaje", label: "Personajes" },
            { id: "habilidad", label: "Habilidades" },
            { id: "objeto", label: "Objetos" },
            { id: "deseos", label: `Lista de Deseos (${deseos.length})` },
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

        {/* Lista de Productos */}
        {itemsFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-neutral-950/40 border border-neutral-900 rounded-xl">
            <p className="text-neutral-600 font-mono text-sm uppercase">No hay elementos en esta categoría actualmente.</p>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itemsFiltrados.map((item) => {
              const enDeseos = deseos.includes(item.id);
              const enNegociacion = negociaciones.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => setItemSeleccionado(item)}
                  className="bg-neutral-950 border border-neutral-800 hover:border-red-900/60 p-5 rounded-xl transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden hover:glow-blood-sm"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
                          {getIconoTipo(item.tipo)}
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase font-bold tracking-wider">
                          {item.tipo}
                        </span>
                      </div>

                      {/* Botón Lista de Deseos */}
                      <button
                        onClick={(e) => toggleDeseo(item.id, e)}
                        className={`p-2 rounded-lg transition-colors border ${
                          enDeseos
                            ? "bg-red-950/80 border-red-800 text-red-500"
                            : "bg-neutral-900 border-neutral-800 text-neutral-600 hover:text-red-400"
                        }`}
                        title={enDeseos ? "Quitar de Lista de Deseos" : "Agregar a Lista de Deseos"}
                      >
                        <Heart className={`w-4 h-4 ${enDeseos ? "fill-red-500" : ""}`} />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-neutral-200 group-hover:text-red-300 transition-colors">
                        {item.titulo}
                      </h3>
                      <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
                        {item.descripcion}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-neutral-900 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-mono text-neutral-600 uppercase">Precio Sugerido</p>
                      <p className="text-xs font-mono font-bold text-amber-500">{item.precio}</p>
                    </div>

                    {enNegociacion ? (
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-900 px-2.5 py-1 rounded flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Negociación Solicitada
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-red-500 group-hover:translate-x-1 transition-transform">
                        Ver Oferta →
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Modal de Detalle / Negociación */}
        {itemSeleccionado && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-red-900/50 p-6 md:p-8 rounded-xl max-w-xl w-full glow-blood relative space-y-6">
              
              <button
                onClick={() => setItemSeleccionado(null)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-red-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-3 border-b border-neutral-900 pb-4">
                <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                  {getIconoTipo(itemSeleccionado.tipo)}
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-red-500 tracking-widest">
                    [ OFERTA DE KUROI: {itemSeleccionado.tipo} ]
                  </span>
                  <h2 className="text-xl font-bold text-neutral-100 font-mono">
                    {itemSeleccionado.titulo}
                  </h2>
                </div>
              </div>

              <div className="space-y-3 text-sm text-neutral-300">
                <p className="leading-relaxed bg-black/60 p-4 rounded-lg border border-neutral-900">
                  {itemSeleccionado.descripcion}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase block">Precio / Costo</span>
                    <span className="text-xs font-mono font-bold text-amber-500">{itemSeleccionado.precio}</span>
                  </div>
                  <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase block">Requisito</span>
                    <span className="text-xs font-mono font-bold text-neutral-300">{itemSeleccionado.requisito}</span>
                  </div>
                </div>
              </div>

              {/* Formulario / Botones de Acción */}
              <form onSubmit={enviarNegociacion} className="space-y-4 pt-2 border-t border-neutral-900">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-neutral-400 uppercase">
                    Propuesta o Mensaje de Negociación para Kuroi (Opcional)
                  </label>
                  <textarea
                    value={mensajeNegociacion}
                    onChange={(e) => setMensajeNegociacion(e.target.value)}
                    rows={2}
                    placeholder="Ej. Te ofrezco 100 Puntos Kuro y el favor de la misión pasada..."
                    className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-xs text-neutral-200 focus:border-red-800 outline-none resize-none font-mono"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={enviando || negociaciones.includes(itemSeleccionado.id)}
                    className="flex-1 bg-red-900 hover:bg-red-800 disabled:bg-neutral-900 text-white font-mono text-xs uppercase py-3 rounded font-bold transition-colors flex items-center justify-center gap-2 border border-red-700/50 disabled:border-neutral-800 disabled:text-neutral-600"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {negociaciones.includes(itemSeleccionado.id)
                      ? "Negociación ya enviada"
                      : "Solicitar Negociación a Kuroi"}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleDeseo(itemSeleccionado.id)}
                    className={`px-4 py-3 rounded text-xs font-mono uppercase font-bold transition-colors border flex items-center justify-center gap-2 ${
                      deseos.includes(itemSeleccionado.id)
                        ? "bg-neutral-900 border-red-800 text-red-400"
                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${deseos.includes(itemSeleccionado.id) ? "fill-red-500 text-red-500" : ""}`} />
                    {deseos.includes(itemSeleccionado.id) ? "En Deseos" : "Añadir a Deseos"}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}