"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { 
  Shield, ArrowLeft, Heart, Zap, Sparkles, Crown, Activity, 
  X, Plus, RefreshCw, CheckCircle, RotateCcw, Lock
} from "lucide-react";

interface Personaje {
  id: string | number;
  user_id: string;
  nombre: string;
  raza: string;
  lugar_reencarnacion: string;
  estado_vida: string;
  atributos: Record<string, number>;
}

interface ItemInventario {
  id: string;
  user_id: string;
  forja_id?: string;
  nombre: string;
  tipo: string;
  slot_tipo: string; // 'casco', 'pechera', 'pantalones', 'zapatos', 'mano', 'dos_manos', 'accesorio', 'titulo', 'ninguno'
  descripcion: string;
  imagen_url?: string;
  clase: string;
  stats: Record<string, number>;
  ligado_al_alma: boolean;
  personaje_id: string | number | null;
  slot_equipado: string | null; // 'casco', 'pechera', 'pantalones', 'zapatos', 'mano_der', 'mano_izq', 'acc_1'..'acc_6', 'titulo'
}

export default function EquipamientoJugador() {
  const router = useRouter();
  const [personaje, setPersonaje] = useState<Personaje | null>(null);
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal para seleccionar qué equipar en un slot específico
  const [slotSeleccionado, setSlotSeleccionado] = useState<{ clave: string; etiqueta: string; tiposPermitidos: string[] } | null>(null);

  const cargarDatos = async () => {
    setCargando(true);
    const activeId = localStorage.getItem("personaje_activo_id");

    if (!activeId) {
      router.push("/ficha/personajes");
      return;
    }

    // 1. Cargar Personaje Activo
    const { data: pjData } = await supabase
      .from("personajes")
      .select("*")
      .eq("id", activeId)
      .single();

    if (pjData) {
      setPersonaje(pjData as Personaje);

      // 2. Cargar Inventario del Jugador asignado a este personaje
      const { data: invData } = await supabase
        .from("inventario_jugador")
        .select("*")
        .eq("user_id", pjData.user_id)
        .eq("personaje_id", activeId);

      if (invData) setInventario(invData as ItemInventario[]);
    } else {
      router.push("/ficha/personajes");
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // LÓGICA DE EQUIPAR UN OBJETO EN UN SLOT
  const equiparItem = async (item: ItemInventario, slotClave: string) => {
    if (!personaje) return;

    // Si el objeto es de 'dos_manos', se libera tanto mano_der como mano_izq
    if (item.slot_tipo === "dos_manos") {
      await supabase
        .from("inventario_jugador")
        .update({ slot_equipado: null })
        .eq("personaje_id", personaje.id)
        .in("slot_equipado", ["mano_der", "mano_izq"]);
    } else {
      // Liberar el objeto previo que estuviera en este slot
      await supabase
        .from("inventario_jugador")
        .update({ slot_equipado: null })
        .eq("personaje_id", personaje.id)
        .eq("slot_equipado", slotClave);
    }

    // Equipar el nuevo objeto
    const { error } = await supabase
      .from("inventario_jugador")
      .update({ slot_equipado: slotClave })
      .eq("id", item.id);

    if (!error) {
      setSlotSeleccionado(null);
      cargarDatos();
    } else {
      alert("Error al equipar la pieza.");
    }
  };

  // DESEQUIPAR UN OBJETO
  const desequiparItem = async (itemId: string) => {
    const { error } = await supabase
      .from("inventario_jugador")
      .update({ slot_equipado: null })
      .eq("id", itemId);

    if (!error) cargarDatos();
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-purple-500 font-mono animate-pulse">
        Ajustando la Armadura del Avatar...
      </div>
    );
  }

  if (!personaje) return null;

  // OBTENER OBJETO POR SLOT
  const getItemEnSlot = (slot: string) => inventario.find(i => i.slot_equipado === slot);

  const casco = getItemEnSlot("casco");
  const pechera = getItemEnSlot("pechera");
  const pantalones = getItemEnSlot("pantalones");
  const zapatos = getItemEnSlot("zapatos");
  const manoDer = getItemEnSlot("mano_der");
  const manoIzq = getItemEnSlot("mano_izq");

  const accesorios = [
    getItemEnSlot("acc_1"), getItemEnSlot("acc_2"), getItemEnSlot("acc_3"),
    getItemEnSlot("acc_4"), getItemEnSlot("acc_5"), getItemEnSlot("acc_6"),
  ];

  const tituloEquipado = getItemEnSlot("titulo");

  // CÁLCULO DE STATS CON BONOS
  const calcularStatTotal = (claveAttr: string, valorBase: number = 0) => {
    let bono = 0;
    inventario.filter(i => i.slot_equipado).forEach(item => {
      if (item.stats && item.stats[claveAttr]) {
        bono += item.stats[claveAttr];
      }
    });
    return { total: valorBase + bono, bono };
  };

  // FILTRAR OBJETOS ELEGIBLES PARA EL MODAL DE SELECCIÓN
  const itemsElegibles = slotSeleccionado
    ? inventario.filter(i => 
        !i.slot_equipado && 
        slotSeleccionado.tiposPermitidos.includes(i.slot_tipo || "ninguno")
      )
    : [];

  return (
    <main className="min-h-screen bg-black text-neutral-200 p-6 font-serif relative overflow-x-hidden">
      
      {/* Resplandor Púrpura Divino */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[300px] bg-purple-950/20 blur-[170px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 pb-20">
        
        {/* ENCABEZADO */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-950 border border-purple-900/50 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/ficha/personaje")}
              className="p-2.5 bg-black hover:bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-purple-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase text-purple-400 font-bold bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                  MATRIZ DE EQUIPAMIENTO
                </span>
                {tituloEquipado && (
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800 font-bold flex items-center gap-1">
                    <Crown className="w-3 h-3" /> {tituloEquipado.nombre}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black font-mono text-neutral-100 mt-1">
                {personaje.nombre}
              </h1>
            </div>
          </div>

          <button onClick={cargarDatos} className="p-2.5 bg-black hover:bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUMNA 1 & 2: SILUETA DE RANURAS CORPORALES */}
          <div className="lg:col-span-2 bg-black border border-purple-900/40 p-6 rounded-2xl space-y-6 shadow-xl">
            <h2 className="text-sm font-bold font-mono text-purple-400 uppercase tracking-widest border-b border-neutral-900 pb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Armadura y Indumentaria Táctica
            </h2>

            {/* MATRIZ CORPORAL */}
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              
              {/* CASCO */}
              <div className="col-start-2">
                <SlotCard
                  etiqueta="CASCO / CABEZA"
                  item={casco}
                  onClick={() => setSlotSeleccionado({ clave: "casco", etiqueta: "Casco / Cabeza", tiposPermitidos: ["casco"] })}
                  onDesequipar={() => casco && desequiparItem(casco.id)}
                />
              </div>

              {/* MANO IZQUIERDA | PECHERA | MANO DERECHA */}
              <div className="col-start-1">
                <SlotCard
                  etiqueta="MANO IZQUIERDA"
                  item={manoIzq}
                  onClick={() => setSlotSeleccionado({ clave: "mano_izq", etiqueta: "Mano Izquierda", tiposPermitidos: ["mano", "dos_manos"] })}
                  onDesequipar={() => manoIzq && desequiparItem(manoIzq.id)}
                />
              </div>

              <div className="col-start-2">
                <SlotCard
                  etiqueta="PECHERA / TORSO"
                  item={pechera}
                  onClick={() => setSlotSeleccionado({ clave: "pechera", etiqueta: "Pechera / Torso", tiposPermitidos: ["pechera"] })}
                  onDesequipar={() => pechera && desequiparItem(pechera.id)}
                />
              </div>

              <div className="col-start-3">
                <SlotCard
                  etiqueta="MANO DERECHA"
                  item={manoDer}
                  onClick={() => setSlotSeleccionado({ clave: "mano_der", etiqueta: "Mano Derecha", tiposPermitidos: ["mano", "dos_manos"] })}
                  onDesequipar={() => manoDer && desequiparItem(manoDer.id)}
                />
              </div>

              {/* PANTALONES */}
              <div className="col-start-2">
                <SlotCard
                  etiqueta="PANTALONES / PIERNAS"
                  item={pantalones}
                  onClick={() => setSlotSeleccionado({ clave: "pantalones", etiqueta: "Pantalones / Piernas", tiposPermitidos: ["pantalones"] })}
                  onDesequipar={() => pantalones && desequiparItem(pantalones.id)}
                />
              </div>

              {/* ZAPATOS */}
              <div className="col-start-2">
                <SlotCard
                  etiqueta="ZAPATOS / PIES"
                  item={zapatos}
                  onClick={() => setSlotSeleccionado({ clave: "zapatos", etiqueta: "Zapatos / Pies", tiposPermitidos: ["zapatos"] })}
                  onDesequipar={() => zapatos && desequiparItem(zapatos.id)}
                />
              </div>

            </div>

            {/* BANDEJA DE 6 ACCESORIOS */}
            <div className="pt-4 border-t border-neutral-900 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">
                  Bandeja de 6 Accesorios Místicos:
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {accesorios.map((acc, idx) => (
                  <SlotCard
                    key={idx}
                    etiqueta={`ACCESORIO ${idx + 1}`}
                    item={acc}
                    onClick={() => setSlotSeleccionado({ clave: `acc_${idx + 1}`, etiqueta: `Accesorio ${idx + 1}`, tiposPermitidos: ["accesorio"] })}
                    onDesequipar={() => acc && desequiparItem(acc.id)}
                  />
                ))}
              </div>
            </div>

            {/* RANURA DE TÍTULO NOBILIARIO */}
            <div className="pt-2 border-t border-neutral-900">
              <SlotCard
                etiqueta="TÍTULO NOBILIARIO / HAZAÑA"
                item={tituloEquipado}
                onClick={() => setSlotSeleccionado({ clave: "titulo", etiqueta: "Título Nobiliario", tiposPermitidos: ["titulo"] })}
                onDesequipar={() => tituloEquipado && desequiparItem(tituloEquipado.id)}
              />
            </div>
          </div>

          {/* COLUMNA 3: ESTADÍSTICAS CALCULADAS EN TIEMPO REAL */}
          <div className="space-y-6">
            <div className="bg-black border border-purple-900/40 p-6 rounded-2xl space-y-4 shadow-xl">
              <h2 className="text-xs font-bold font-mono text-purple-400 uppercase tracking-widest border-b border-neutral-900 pb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Atributos Totales Con Equipamiento
              </h2>

              <div className="space-y-2.5">
                {Object.entries(personaje.atributos || {}).map(([key, val]) => {
                  const calc = calcularStatTotal(key, val);
                  return (
                    <div key={key} className="bg-neutral-950 p-3 rounded-xl border border-neutral-900 flex justify-between items-center text-xs font-mono">
                      <span className="text-neutral-400 uppercase font-bold">{key}:</span>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-neutral-100 text-sm font-mono">{calc.total}</strong>
                        {calc.bono > 0 && (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900">
                            (+{calc.bono})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* MODAL PARA SELECCIONAR QUÉ EQUIPAR */}
        {slotSeleccionado && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-purple-900/80 p-6 rounded-2xl max-w-lg w-full relative space-y-5 shadow-2xl">
              <button onClick={() => setSlotSeleccionado(null)} className="absolute top-4 right-4 text-neutral-500 hover:text-purple-400">
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-neutral-900 pb-3">
                <span className="text-[10px] font-mono uppercase text-purple-500 font-bold">Selección de Pieza</span>
                <h3 className="text-lg font-bold font-mono text-neutral-100 mt-0.5">
                  Equipar en: {slotSeleccionado.etiqueta}
                </h3>
              </div>

              {itemsElegibles.length === 0 ? (
                <div className="bg-black border border-neutral-900 p-8 text-center rounded-xl text-neutral-500 font-mono text-xs">
                  No tienes piezas de tipo <strong>[{slotSeleccionado.tiposPermitidos.join(", ")}]</strong> disponibles en tu inventario.
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {itemsElegibles.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => equiparItem(item, slotSeleccionado.clave)}
                      className="bg-black border border-neutral-800 hover:border-purple-700 p-3.5 rounded-xl cursor-pointer flex justify-between items-center transition-all group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-mono text-neutral-200 group-hover:text-purple-300 transition-colors">
                            {item.nombre}
                          </strong>
                          <span className="text-[9px] font-mono text-orange-400 font-bold uppercase">
                            RANGO {item.clase}
                          </span>
                        </div>
                        <p className="text-xs font-serif text-neutral-400 italic line-clamp-1">
                          "{item.descripcion}"
                        </p>
                      </div>

                      <span className="text-xs font-mono text-purple-400 group-hover:translate-x-1 transition-transform font-bold">
                        Equipar →
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

// COMPONENTE TARJETA DE RANURA TÁCTICA
function SlotCard({ etiqueta, item, onClick, onDesequipar }: { etiqueta: string; item?: ItemInventario; onClick: () => void; onDesequipar: () => void }) {
  return (
    <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all relative group ${
      item ? "bg-purple-950/40 border-purple-700/80 text-purple-200" : "bg-neutral-950 border-neutral-900 hover:border-neutral-800 text-neutral-600"
    }`}>
      <div className="flex justify-between items-center">
        <span className="text-[8px] font-mono uppercase font-bold text-neutral-500">{etiqueta}</span>
        {item && (
          <button
            onClick={(e) => { e.stopPropagation(); onDesequipar(); }}
            className="text-[9px] font-mono text-red-400 hover:text-red-300 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-900"
            title="Desequipar"
          >
            Quitar
          </button>
        )}
      </div>

      <div onClick={onClick} className="mt-2 cursor-pointer">
        <strong className={`text-xs font-mono line-clamp-1 block ${item ? "text-neutral-100" : "text-neutral-600"}`}>
          {item ? item.nombre : "+ Equipar"}
        </strong>
      </div>
    </div>
  );
}