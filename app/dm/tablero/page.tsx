"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { 
  Skull, Map, Plus, Eye, EyeOff, Trash2, 
  User, Edit3, LogOut, Link2, ZoomIn, ZoomOut, RotateCcw,
  Home, Pickaxe, Castle, Trees, Gem, Shield, Swords, Crown, Compass,
  ChevronRight, ArrowLeft, ExternalLink, CornerDownRight, Save, X,
  Globe, Building, MapPin, ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight, Compass as CompassIcon,
  Sliders // <--- Agrega este icono
} from "lucide-react";

interface Tablero {
  id: string;
  nombre: string;
  imagen_url: string;
  columnas: number;
  filas: number;
  activo: boolean;
  es_interior: boolean;
  tipo_mapa: "pais" | "ciudad" | "punto_interes" | "interior";
  mapa_norte_id?: string;
  mapa_sur_id?: string;
  mapa_este_id?: string;
  mapa_oeste_id?: string;
}

interface Token {
  id: string;
  tablero_id: string;
  nombre: string;
  tipo: "jugador" | "enemigo" | "pnj" | "ciudad" | "tesoro";
  icono: string;
  x: number;
  y: number;
  pct_x: number;
  pct_y: number;
  color: string;
  visible_jugadores: boolean;
  submapa_id?: string;
}

export default function TableroKuroi() {
  const router = useRouter();
  const mapaRef = useRef<HTMLDivElement>(null);

  const [tableros, setTableros] = useState<Tablero[]>([]);
  const [tableroActivo, setTableroActivo] = useState<Tablero | null>(null);
  const [historialMapas, setHistorialMapas] = useState<{ id: string; nombre: string }[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [cargando, setCargando] = useState(true);

  // Zoom y AspectRatio
  const [zoom, setZoom] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);

  // Arrastre libre de fichas
  const [tokenArrastrando, setTokenArrastrando] = useState<string | null>(null);

  // Modales
  const [mostrarCrearMapa, setMostrarCrearMapa] = useState(false);
  const [mostrarEditarMapa, setMostrarEditarMapa] = useState(false);
  
  // Formulario de mapa
  const [nombreMapa, setNombreMapa] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [columnas, setColumnas] = useState(15);
  const [filas, setFilas] = useState(15);
  const [tipoMapa, setTipoMapa] = useState<"pais" | "ciudad" | "punto_interes" | "interior">("pais");
  
  // Conexiones cardinales para mapas
  const [mapaNorte, setMapaNorte] = useState("");
  const [mapaSur, setMapaSur] = useState("");
  const [mapaEste, setMapaEste] = useState("");
  const [mapaOeste, setMapaOeste] = useState("");

  // Ficha seleccionada
  const [casillaSeleccionada, setCasillaSeleccionada] = useState<{ x: number; y: number; pct_x: number; pct_y: number } | null>(null);
  const [nombreToken, setNombreToken] = useState("");
  const [tipoToken, setTipoToken] = useState<"jugador" | "enemigo" | "pnj" | "ciudad" | "tesoro">("ciudad");
  const [iconoToken, setIconoToken] = useState("castillo");
  const [submapaVinculado, setSubmapaVinculado] = useState<string>("");
  const [visibleJugadores, setVisibleJugadores] = useState(true);

  // Modal para editar ficha existente
  const [tokenEditando, setTokenEditando] = useState<Token | null>(null);

  const formatearUrlImagen = (url: string) => {
    if (!url) return "";
    let limpia = url.trim();
    if (limpia.includes("imgur.com/") && !limpia.includes("i.imgur.com")) {
      const id = limpia.split("imgur.com/")[1]?.split("/")[0]?.split(".")[0];
      if (id) return `https://i.imgur.com/${id}.jpeg`;
    }
    return limpia;
  };

  const cargarTableros = async () => {
    setCargando(true);
    const { data: tData } = await supabase.from("tableros").select("*").order("created_at", { ascending: false });
    
    if (tData && tData.length > 0) {
      setTableros(tData as Tablero[]);
      const activo = (tData as Tablero[]).find((t) => t.activo) || (tData[0] as Tablero);
      setTableroActivo(activo);
      cargarTokens(activo.id);
    }
    setCargando(false);
  };

  const cargarTokens = async (tableroId: string) => {
    const { data: kTokens } = await supabase.from("tablero_tokens").select("*").eq("tablero_id", tableroId);
    if (kTokens) setTokens(kTokens as Token[]);
  };

  useEffect(() => {
    cargarTableros();
  }, []);

  const handleClicMapa = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tokenArrastrando || !tableroActivo || !mapaRef.current) return;

    const rect = mapaRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pct_x = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const pct_y = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

    const colCalculada = Math.ceil((pct_x / 100) * tableroActivo.columnas);
    const filaCalculada = Math.ceil((pct_y / 100) * tableroActivo.filas);

    setCasillaSeleccionada({
      x: colCalculada,
      y: filaCalculada,
      pct_x: Number(pct_x.toFixed(2)),
      pct_y: Number(pct_y.toFixed(2))
    });
  };

  const iniciarArrastre = (tokenId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tableroActivo?.tipo_mapa === "interior") return;
    setTokenArrastrando(tokenId);
  };

  const procesarArrastre = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tokenArrastrando || !mapaRef.current) return;

    const rect = mapaRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pct_x = Math.max(0, Math.min(100, Number(((clickX / rect.width) * 100).toFixed(2))));
    const pct_y = Math.max(0, Math.min(100, Number(((clickY / rect.height) * 100).toFixed(2))));

    setTokens((prev) =>
      prev.map((t) => (t.id === tokenArrastrando ? { ...t, pct_x, pct_y } : t))
    );
  };

  const finalizarArrastre = async () => {
    if (!tokenArrastrando) return;
    const tokenActualizado = tokens.find((t) => t.id === tokenArrastrando);
    
    if (tokenActualizado) {
      await supabase
        .from("tablero_tokens")
        .update({ pct_x: tokenActualizado.pct_x, pct_y: tokenActualizado.pct_y })
        .eq("id", tokenArrastrando);
    }
    setTokenArrastrando(null);
  };

  // Navegación Recursiva (Profundidad Infinita)
  const navegarAMapa = (mapaId: string) => {
    const mapaDestino = tableros.find((t) => t.id === mapaId);
    if (mapaDestino && tableroActivo) {
      setHistorialMapas((prev) => [...prev, { id: tableroActivo.id, nombre: tableroActivo.nombre }]);
      setTableroActivo(mapaDestino);
      cargarTokens(mapaDestino.id);
      setTokenEditando(null);
      setZoom(1);
    }
  };

  const volverMapaAnterior = () => {
    if (historialMapas.length === 0) return;
    const ultimo = historialMapas[historialMapas.length - 1];
    const mapaPadre = tableros.find((t) => t.id === ultimo.id);
    if (mapaPadre) {
      setHistorialMapas((prev) => prev.slice(0, -1));
      setTableroActivo(mapaPadre);
      cargarTokens(mapaPadre.id);
      setZoom(1);
    }
  };

  const crearNuevoMapa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagenUrl) return;

    const urlDirecta = formatearUrlImagen(imagenUrl);
    const { data, error } = await supabase.from("tableros").insert([{
      nombre: nombreMapa || "Nuevo Territorio",
      imagen_url: urlDirecta,
      columnas,
      filas,
      activo: true,
      tipo_mapa: tipoMapa,
      es_interior: tipoMapa === "interior"
    }]).select().single();

    if (!error && data) {
      setMostrarCrearMapa(false);
      setNombreMapa("");
      setImagenUrl("");
      cargarTableros();
    }
  };

  const guardarConfiguracionMapaActual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableroActivo) return;

    const payload: any = {
      tipo_mapa: tipoMapa,
      es_interior: tipoMapa === "interior",
      mapa_norte_id: mapaNorte || null,
      mapa_sur_id: mapaSur || null,
      mapa_este_id: mapaEste || null,
      mapa_oeste_id: mapaOeste || null,
    };

    if (imagenUrl) payload.imagen_url = formatearUrlImagen(imagenUrl);

    const { error } = await supabase
      .from("tableros")
      .update(payload)
      .eq("id", tableroActivo.id);

    if (!error) {
      setMostrarEditarMapa(false);
      setImagenUrl("");
      cargarTableros();
    }
  };

  const colocarToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!casillaSeleccionada || !tableroActivo) return;

    const colores: Record<string, string> = {
      jugador: "#ef4444",
      enemigo: "#a855f7",
      pnj: "#06b6d4",
      ciudad: "#eab308",
      tesoro: "#10b981",
    };

    const payload = {
      tablero_id: tableroActivo.id,
      nombre: nombreToken || "Ubicación",
      tipo: tipoToken,
      icono: iconoToken,
      x: casillaSeleccionada.x,
      y: casillaSeleccionada.y,
      pct_x: casillaSeleccionada.pct_x,
      pct_y: casillaSeleccionada.pct_y,
      color: colores[tipoToken] || "#eab308",
      visible_jugadores: visibleJugadores,
      submapa_id: submapaVinculado !== "" ? submapaVinculado : null
    };

    const { error } = await supabase.from("tablero_tokens").insert([payload]);

    if (!error) {
      setCasillaSeleccionada(null);
      setNombreToken("");
      setSubmapaVinculado("");
      cargarTokens(tableroActivo.id);
    } else {
      alert(`Error de Supabase: ${error.message}`);
    }
  };

  const guardarEdicionToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenEditando) return;

    const colores: Record<string, string> = {
      jugador: "#ef4444",
      enemigo: "#a855f7",
      pnj: "#06b6d4",
      ciudad: "#eab308",
      tesoro: "#10b981",
    };

    const { error } = await supabase
      .from("tablero_tokens")
      .update({
        nombre: tokenEditando.nombre,
        tipo: tokenEditando.tipo,
        icono: tokenEditando.icono,
        color: colores[tokenEditando.tipo] || tokenEditando.color,
        visible_jugadores: tokenEditando.visible_jugadores,
        submapa_id: tokenEditando.submapa_id || null,
      })
      .eq("id", tokenEditando.id);

    if (!error) {
      setTokenEditando(null);
      if (tableroActivo) cargarTokens(tableroActivo.id);
    }
  };

  const eliminarTokenActual = async () => {
    if (!tokenEditando) return;
    await supabase.from("tablero_tokens").delete().eq("id", tokenEditando.id);
    setTokenEditando(null);
    if (tableroActivo) cargarTokens(tableroActivo.id);
  };

  const renderIcono = (iconoNombre: string, className = "w-4 h-4") => {
    switch (iconoNombre) {
      case "casa": return <Home className={className} />;
      case "mina": return <Pickaxe className={className} />;
      case "castillo": return <Castle className={className} />;
      case "bosque": return <Trees className={className} />;
      case "tesoro": return <Gem className={className} />;
      case "calavera": return <Skull className={className} />;
      case "espadas": return <Swords className={className} />;
      case "corona": return <Crown className={className} />;
      case "escudo": return <Shield className={className} />;
      default: return <CompassIcon className={className} />;
    }
  };

  const getBadgeTipoMapa = (tipo: string) => {
    switch (tipo) {
      case "pais":
        return <span className="bg-red-950/80 border border-red-800 text-red-300 px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1"><Globe className="w-3 h-3"/> País / Continente</span>;
      case "ciudad":
        return <span className="bg-amber-950/80 border border-amber-800 text-amber-300 px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1"><Building className="w-3 h-3"/> Gran Ciudad / Región</span>;
      case "punto_interes":
        return <span className="bg-cyan-950/80 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1"><MapPin className="w-3 h-3"/> Punto de Interés</span>;
      case "interior":
        return <span className="bg-purple-950/80 border border-purple-800 text-purple-300 px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1"><CompassIcon className="w-3 h-3"/> Interior (Cuadrícula)</span>;
      default:
        return null;
    }
  };

  if (cargando) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono animate-pulse">Abriendo el Tablero de Kuroi...</div>;

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 relative z-10 pb-20">
        
        {/* Cabecera */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-red-900/50 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg glow-blood-sm text-red-500">
              <Skull className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-100 uppercase tracking-widest font-mono">
                El Tablero Táctico
              </h1>
              <p className="text-red-700/80 text-xs font-mono tracking-widest uppercase">
                [ JERARQUÍA RECURSIVA DE TERRITORIOS Y CONEXIONES NORTE/SUR/ESTE/OESTE ]
              </p>
            </div>
          </div>

          
        </header>

        {/* MIGA DE PAN (BREADCRUMBS) Y TIPO DE MAPA */}
        <div className="flex flex-wrap items-center justify-between bg-neutral-950 border border-neutral-900 p-4 rounded-xl gap-4">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {historialMapas.length > 0 && (
              <button
                onClick={volverMapaAnterior}
                className="mr-2 px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 font-bold rounded flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Subir de Nivel
              </button>
            )}

            <span className="text-neutral-500 flex items-center gap-1">Ruta:</span>

            {historialMapas.map((h, idx) => (
              <React.Fragment key={idx}>
                <span className="text-neutral-400 font-bold">{h.nombre}</span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
              </React.Fragment>
            ))}

            <span className="text-amber-400 font-bold font-mono">
              {tableroActivo?.nombre}
            </span>

            {tableroActivo && getBadgeTipoMapa(tableroActivo.tipo_mapa || "pais")}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={tableroActivo?.id || ""}
              onChange={(e) => {
                const sel = tableros.find((t) => t.id === e.target.value);
                if (sel) {
                  setHistorialMapas([]);
                  setTableroActivo(sel);
                  cargarTokens(sel.id);
                  setZoom(1);
                }
              }}
              className="bg-black border border-neutral-800 text-xs font-mono text-neutral-200 px-3 py-2 rounded outline-none focus:border-red-800"
            >
              {tableros.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} [{t.tipo_mapa?.toUpperCase() || 'PAÍS'}]
                </option>
              ))}
            </select>

            <button 
              onClick={() => {
                if (tableroActivo) {
                  setTipoMapa(tableroActivo.tipo_mapa || "pais");
                  setMapaNorte(tableroActivo.mapa_norte_id || "");
                  setMapaSur(tableroActivo.mapa_sur_id || "");
                  setMapaEste(tableroActivo.mapa_este_id || "");
                  setMapaOeste(tableroActivo.mapa_oeste_id || "");
                  setMostrarEditarMapa(true);
                }
              }} 
              className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300" 
              title="Configurar Conexiones y Tipo de Mapa"
            >
              <Edit3 className="w-4 h-4 text-amber-500" />
            </button>

            <button onClick={() => setMostrarCrearMapa(!mostrarCrearMapa)} className="px-3 py-2 bg-red-950 hover:bg-red-900 border border-red-800 text-neutral-100 text-xs font-mono font-bold rounded flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Nuevo Mapa
            </button>
          </div>
        </div>

        {/* BARRA DE DESPLAZAMIENTO CARDINAL (NORTE, SUR, ESTE, OESTE) */}
        {tableroActivo && (
          <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="text-neutral-400 font-bold flex items-center gap-1.5">
              <CompassIcon className="w-4 h-4 text-red-500" /> Pasajes Direccionales Conectados:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {tableroActivo.mapa_norte_id && (
                <button
                  onClick={() => navegarAMapa(tableroActivo.mapa_norte_id!)}
                  className="px-3 py-1 bg-neutral-900 hover:bg-red-950 border border-neutral-800 hover:border-red-800 text-neutral-200 text-[11px] rounded flex items-center gap-1"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-red-400" /> Norte: {tableros.find(t => t.id === tableroActivo.mapa_norte_id)?.nombre}
                </button>
              )}

              {tableroActivo.mapa_sur_id && (
                <button
                  onClick={() => navegarAMapa(tableroActivo.mapa_sur_id!)}
                  className="px-3 py-1 bg-neutral-900 hover:bg-red-950 border border-neutral-800 hover:border-red-800 text-neutral-200 text-[11px] rounded flex items-center gap-1"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-red-400" /> Sur: {tableros.find(t => t.id === tableroActivo.mapa_sur_id)?.nombre}
                </button>
              )}

              {tableroActivo.mapa_este_id && (
                <button
                  onClick={() => navegarAMapa(tableroActivo.mapa_este_id!)}
                  className="px-3 py-1 bg-neutral-900 hover:bg-red-950 border border-neutral-800 hover:border-red-800 text-neutral-200 text-[11px] rounded flex items-center gap-1"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-red-400" /> Este: {tableros.find(t => t.id === tableroActivo.mapa_este_id)?.nombre}
                </button>
              )}

              {tableroActivo.mapa_oeste_id && (
                <button
                  onClick={() => navegarAMapa(tableroActivo.mapa_oeste_id!)}
                  className="px-3 py-1 bg-neutral-900 hover:bg-red-950 border border-neutral-800 hover:border-red-800 text-neutral-200 text-[11px] rounded flex items-center gap-1"
                >
                  <ArrowLeftIcon className="w-3.5 h-3.5 text-red-400" /> Oeste: {tableros.find(t => t.id === tableroActivo.mapa_oeste_id)?.nombre}
                </button>
              )}

              {!tableroActivo.mapa_norte_id && !tableroActivo.mapa_sur_id && !tableroActivo.mapa_este_id && !tableroActivo.mapa_oeste_id && (
                <span className="text-neutral-600 italic">Sin pasajes cardinales configurados (Usa el botón del lápiz arriba para conectar áreas adyacentes).</span>
              )}
            </div>

            {/* Controles de Zoom */}
            <div className="flex items-center gap-2 bg-black border border-neutral-800 p-1 rounded-lg">
              <button onClick={() => setZoom((z) => Math.max(1, z - 0.25))} className="p-1 hover:bg-neutral-900 rounded text-neutral-400"><ZoomOut className="w-3.5 h-3.5" /></button>
              <span className="px-1.5 text-red-500 font-bold">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))} className="p-1 hover:bg-neutral-900 rounded text-neutral-400"><ZoomIn className="w-3.5 h-3.5" /></button>
              <button onClick={() => setZoom(1)} className="p-1 hover:bg-neutral-900 text-neutral-500 border-l border-neutral-800"><RotateCcw className="w-3 h-3" /></button>
            </div>
          </div>
        )}

        {/* MODAL CONFIGURAR Y CONECTAR MAPA ACTUAL */}
        {mostrarEditarMapa && tableroActivo && (
          <form onSubmit={guardarConfiguracionMapaActual} className="bg-neutral-950 border border-amber-900/60 p-6 rounded-xl space-y-4 max-w-2xl">
            <h3 className="text-sm font-mono text-amber-500 uppercase font-bold flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Configuración de "{tableroActivo.nombre}"
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">Nivel Jerárquico del Mapa</label>
                <select
                  value={tipoMapa}
                  onChange={(e) => setTipoMapa(e.target.value as any)}
                  className="w-full bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono"
                >
                  <option value="pais">1. País / Continente (Libre)</option>
                  <option value="ciudad">2. Gran Ciudad / Región (Libre)</option>
                  <option value="punto_interes">3. Punto de Interés / Zona (Libre)</option>
                  <option value="interior">4. Edificio / Mazmorra (Cuadrícula Táctica)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">Corregir URL de Imagen</label>
                <input
                  value={imagenUrl}
                  onChange={(e) => setImagenUrl(e.target.value)}
                  placeholder="URL opcional para cambiar foto..."
                  className="w-full bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono"
                />
              </div>
            </div>

            {/* CONEXIONES CARDINALES CON OTROS MAPAS */}
            <div className="bg-black/60 border border-neutral-900 p-4 rounded-lg space-y-3">
              <span className="text-xs font-mono text-red-500 uppercase font-bold block">
                Conexiones Direccionales (Desplazamiento Directo Norte/Sur/Este/Oeste)
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">Mapa al Norte ↑</label>
                  <select value={mapaNorte} onChange={(e) => setMapaNorte(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 p-1.5 text-xs text-neutral-200 rounded font-mono">
                    <option value="">-- Sin Conexión --</option>
                    {tableros.filter(t => t.id !== tableroActivo.id).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">Mapa al Sur ↓</label>
                  <select value={mapaSur} onChange={(e) => setMapaSur(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 p-1.5 text-xs text-neutral-200 rounded font-mono">
                    <option value="">-- Sin Conexión --</option>
                    {tableros.filter(t => t.id !== tableroActivo.id).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">Mapa al Este →</label>
                  <select value={mapaEste} onChange={(e) => setMapaEste(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 p-1.5 text-xs text-neutral-200 rounded font-mono">
                    <option value="">-- Sin Conexión --</option>
                    {tableros.filter(t => t.id !== tableroActivo.id).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">Mapa al Oeste ←</label>
                  <select value={mapaOeste} onChange={(e) => setMapaOeste(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 p-1.5 text-xs text-neutral-200 rounded font-mono">
                    <option value="">-- Sin Conexión --</option>
                    {tableros.filter(t => t.id !== tableroActivo.id).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-amber-950 border border-amber-800 text-amber-200 text-xs font-mono font-bold uppercase rounded">Guardar Cambios</button>
              <button type="button" onClick={() => setMostrarEditarMapa(false)} className="px-4 py-2 bg-neutral-900 text-neutral-400 text-xs font-mono uppercase rounded">Cancelar</button>
            </div>
          </form>
        )}

        {/* MODAL CREAR NUEVO MAPA */}
        {mostrarCrearMapa && (
          <form onSubmit={crearNuevoMapa} className="bg-neutral-950 border border-red-900/50 p-6 rounded-xl space-y-4 max-w-xl">
            <h3 className="text-sm font-mono text-red-500 uppercase font-bold">Cargar Nuevo Mapa / Territorio</h3>
            <input required value={nombreMapa} onChange={(e) => setNombreMapa(e.target.value)} placeholder="Ej. Castillo Wheys / La Gran Biblioteca" className="w-full bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono" />
            <input required value={imagenUrl} onChange={(e) => setImagenUrl(e.target.value)} placeholder="URL de la Imagen" className="w-full bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono" />
            
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-neutral-400 uppercase">Tipo de Mapa</label>
              <select
                value={tipoMapa}
                onChange={(e) => setTipoMapa(e.target.value as any)}
                className="w-full bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono"
              >
                <option value="pais">1. País / Continente</option>
                <option value="ciudad">2. Gran Ciudad / Región</option>
                <option value="punto_interes">3. Punto de Interés / Edificio</option>
                <option value="interior">4. Interior Táctico (Cuadrícula)</option>
              </select>
            </div>

            {tipoMapa === "interior" && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <input type="number" value={columnas} onChange={(e) => setColumnas(Number(e.target.value))} className="bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono" placeholder="Columnas" />
                <input type="number" value={filas} onChange={(e) => setFilas(Number(e.target.value))} className="bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono" placeholder="Filas" />
              </div>
            )}

            <div className="flex gap-3"><button type="submit" className="px-4 py-2 bg-red-900 text-white text-xs font-mono font-bold uppercase rounded">Establecer Tablero</button><button type="button" onClick={() => setMostrarCrearMapa(false)} className="px-4 py-2 bg-neutral-900 text-neutral-400 text-xs font-mono uppercase rounded">Cancelar</button></div>
          </form>
        )}

        {/* RENDER DEL TABLERO CON INTERACCIÓN */}
        {tableroActivo && (
          <section className="bg-neutral-950 border border-neutral-900 p-4 rounded-xl space-y-4 overflow-hidden">
            <div className="w-full overflow-auto max-h-[75vh] border border-neutral-800 rounded-lg p-2 bg-black flex items-center justify-center">
              
              <div
                ref={mapaRef}
                onClick={handleClicMapa}
                onMouseMove={procesarArrastre}
                onMouseUp={finalizarArrastre}
                onMouseLeave={finalizarArrastre}
                className="relative rounded-lg overflow-hidden select-none transition-transform duration-300 ease-out origin-center cursor-crosshair"
                style={{ width: `${100 * zoom}%`, aspectRatio: `${aspectRatio}` }}
              >
                <img
                  src={formatearUrlImagen(tableroActivo.imagen_url)}
                  alt={tableroActivo.nombre}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) setAspectRatio(img.naturalWidth / img.naturalHeight);
                  }}
                  className="w-full h-full object-contain pointer-events-none block"
                />

                {tableroActivo.tipo_mapa === "interior" && (
                  <div
                    className="absolute inset-0 z-10 w-full h-full grid pointer-events-none"
                    style={{
                      gridTemplateColumns: `repeat(${tableroActivo.columnas}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${tableroActivo.filas}, minmax(0, 1fr))`
                    }}
                  >
                    {Array.from({ length: tableroActivo.filas * tableroActivo.columnas }).map((_, idx) => (
                      <div key={idx} className="border border-white/10 hover:border-red-500/80 hover:bg-red-950/20" />
                    ))}
                  </div>
                )}

                {/* RENDERIZADO DE FICHAS */}
                <div className="absolute inset-0 z-20 w-full h-full pointer-events-none">
                  {tokens.map((token) => {
                    const posLeft = tableroActivo.tipo_mapa === "interior"
                      ? `${((token.x - 0.5) / tableroActivo.columnas) * 100}%`
                      : `${token.pct_x || 50}%`;

                    const posTop = tableroActivo.tipo_mapa === "interior"
                      ? `${((token.y - 0.5) / tableroActivo.filas) * 100}%`
                      : `${token.pct_y || 50}%`;

                    return (
                      <div
                        key={token.id}
                        onMouseDown={(e) => iniciarArrastre(token.id, e)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTokenEditando(token);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTokenEditando(token);
                        }}
                        style={{ left: posLeft, top: posTop, backgroundColor: token.color }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-lg border-2 border-black flex items-center justify-center text-black shadow-2xl pointer-events-auto cursor-grab active:cursor-grabbing transition-transform hover:scale-125 ${
                          !token.visible_jugadores ? "opacity-40" : "opacity-100"
                        }`}
                        title={`${token.nombre} (Clic para gestionar)`}
                      >
                        {renderIcono(token.icono || "castillo", "w-4 h-4 text-black")}
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>
          </section>
        )}

        {/* MODAL 1: CREAR NUEVO PUNTO DE INTERÉS */}
        {casillaSeleccionada && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-red-900/60 p-6 rounded-xl max-w-md w-full space-y-4">
              <h3 className="text-sm font-mono text-red-500 uppercase font-bold">
                Crear Punto de Interés [{casillaSeleccionada.pct_x}%, {casillaSeleccionada.pct_y}%]
              </h3>

              <form onSubmit={colocarToken} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">Nombre de la Ubicación</label>
                  <input required value={nombreToken} onChange={(e) => setNombreToken(e.target.value)} placeholder="Ej. Castillo Wheys / Gran Biblioteca" className="w-full bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">Selecciona el Icono</label>
                  <div className="grid grid-cols-5 gap-2 bg-black p-2 rounded border border-neutral-800">
                    {[
                      { id: "castillo", label: "Castillo / Ciudad", icon: Castle },
                      { id: "casa", label: "Casa / Aldea", icon: Home },
                      { id: "mina", label: "Mina / Recursos", icon: Pickaxe },
                      { id: "bosque", label: "Bosque / Zona", icon: Trees },
                      { id: "tesoro", label: "Tesoro", icon: Gem },
                      { id: "calavera", label: "Enemigo / Jefe", icon: Skull },
                      { id: "espadas", label: "Combate", icon: Swords },
                      { id: "corona", label: "Capital", icon: Crown },
                      { id: "escudo", label: "Defensa", icon: Shield },
                    ].map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <button key={item.id} type="button" onClick={() => setIconoToken(item.id)} className={`p-2 rounded flex flex-col items-center justify-center gap-1 transition-colors ${
                          iconoToken === item.id ? "bg-red-950 border border-red-700 text-red-200" : "bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-neutral-200"
                        }`} title={item.label}>
                          <IconComponent className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-amber-500 uppercase font-bold flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5" /> Vincular Sub-Mapa Interior (Nivel Inferior)
                  </label>
                  <select
                    value={submapaVinculado}
                    onChange={(e) => setSubmapaVinculado(e.target.value)}
                    className="w-full bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono"
                  >
                    <option value="">-- Sin Mapa Interior --</option>
                    {tableros
                      .filter((t) => t.id !== tableroActivo?.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          Plano: {t.nombre} [{t.tipo_mapa?.toUpperCase() || 'MAPA'}]
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="vis" checked={visibleJugadores} onChange={(e) => setVisibleJugadores(e.target.checked)} className="accent-red-600" />
                  <label htmlFor="vis" className="text-xs font-mono text-neutral-300">Visible para los Jugadores</label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 bg-red-950 border border-red-800 text-red-200 py-2 rounded text-xs font-mono font-bold uppercase">Fundar / Colocar</button>
                  <button type="button" onClick={() => setCasillaSeleccionada(null)} className="px-4 py-2 bg-neutral-900 text-neutral-400 text-xs font-mono uppercase rounded">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: EDITAR Y ENTRAR A PUNTO DE INTERÉS */}
        {tokenEditando && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-red-900/60 p-6 rounded-xl max-w-md w-full space-y-5 relative">
              <button onClick={() => setTokenEditando(null)} className="absolute top-4 right-4 text-neutral-500 hover:text-red-400"><X className="w-5 h-5" /></button>

              <div className="border-b border-neutral-900 pb-3">
                <span className="text-[10px] font-mono uppercase text-red-500 font-bold">[ GESTIÓN DE PUNTO DE INTERÉS ]</span>
                <h3 className="text-lg font-bold text-neutral-100 font-mono">{tokenEditando.nombre}</h3>
              </div>

              {/* Botón directo para Entrar al Sub-mapa */}
              {tokenEditando.submapa_id && (
                <button
                  onClick={() => navegarAMapa(tokenEditando.submapa_id!)}
                  className="w-full bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-200 text-xs font-mono py-2.5 rounded font-bold uppercase flex items-center justify-center gap-2 shadow-lg"
                >
                  <CornerDownRight className="w-4 h-4 text-amber-400" /> Entrar al Plano de esta Zona
                </button>
              )}

              <form onSubmit={guardarEdicionToken} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">Nombre</label>
                  <input required value={tokenEditando.nombre} onChange={(e) => setTokenEditando({ ...tokenEditando, nombre: e.target.value })} className="w-full bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">Icono Visual</label>
                  <div className="grid grid-cols-5 gap-2 bg-black p-2 rounded border border-neutral-800">
                    {[
                      { id: "castillo", label: "Castillo / Ciudad", icon: Castle },
                      { id: "casa", label: "Casa / Aldea", icon: Home },
                      { id: "mina", label: "Mina / Recursos", icon: Pickaxe },
                      { id: "bosque", label: "Bosque / Zona", icon: Trees },
                      { id: "tesoro", label: "Tesoro", icon: Gem },
                      { id: "calavera", label: "Enemigo / Jefe", icon: Skull },
                      { id: "espadas", label: "Combate", icon: Swords },
                      { id: "corona", label: "Capital", icon: Crown },
                      { id: "escudo", label: "Defensa", icon: Shield },
                    ].map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <button key={item.id} type="button" onClick={() => setTokenEditando({ ...tokenEditando, icono: item.id })} className={`p-2 rounded flex flex-col items-center justify-center gap-1 transition-colors ${
                          tokenEditando.icono === item.id ? "bg-red-950 border border-red-700 text-red-200" : "bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-neutral-200"
                        }`}>
                          <IconComponent className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-amber-500 uppercase font-bold flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5" /> Vincular Sub-Mapa
                  </label>
                  <select
                    value={tokenEditando.submapa_id || ""}
                    onChange={(e) => setTokenEditando({ ...tokenEditando, submapa_id: e.target.value })}
                    className="w-full bg-black border border-neutral-800 p-2 text-xs text-neutral-200 rounded font-mono"
                  >
                    <option value="">-- Sin Mapa Interior --</option>
                    {tableros
                      .filter((t) => t.id !== tableroActivo?.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          Plano: {t.nombre} [{t.tipo_mapa?.toUpperCase() || 'MAPA'}]
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="vis_edit" checked={tokenEditando.visible_jugadores} onChange={(e) => setTokenEditando({ ...tokenEditando, visible_jugadores: e.target.checked })} className="accent-red-600" />
                  <label htmlFor="vis_edit" className="text-xs font-mono text-neutral-300">Visible para los Jugadores</label>
                </div>

                <div className="flex gap-2 pt-2 border-t border-neutral-900">
                  <button type="submit" className="flex-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 py-2 rounded text-xs font-mono font-bold uppercase flex items-center justify-center gap-1">
                    <Save className="w-3.5 h-3.5" /> Guardar
                  </button>
                  <button type="button" onClick={eliminarTokenActual} className="px-3 py-2 bg-neutral-900 hover:bg-red-950 text-neutral-400 hover:text-red-400 border border-neutral-800 rounded text-xs font-mono uppercase">
                    <Trash2 className="w-4 h-4" />
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