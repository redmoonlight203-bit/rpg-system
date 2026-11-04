"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {EditorEquipoCombate,consultarEquipo,type ContextoEquipo} from "../../../components/EditorEquipoCombate";
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

  const [contextoEquipo,setContextoEquipo]=useState<ContextoEquipo|null>(null),[editarEquipo,setEditarEquipo]=useState(false),[errorEquipo,setErrorEquipo]=useState(''),[borradorEquipo,setBorradorEquipo]=useState<Record<string,string>>({});
  async function abrirEquipo(quitarId?:string){if(!personaje)return;setEditarEquipo(false);try{setErrorEquipo('');const r=await consultarEquipo({personaje_id:personaje.id,consultar:true});setContextoEquipo(r);setBorradorEquipo(Object.fromEntries(Object.entries(r.equipo).filter(([,id])=>id!==quitarId)));setEditarEquipo(true);}catch(e){setErrorEquipo(e instanceof Error?e.message:'No se pudo cargar el equipo.');}}

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
      try{setContextoEquipo(await consultarEquipo({personaje_id:pjData.id,consultar:true}));}catch{setContextoEquipo(null);}
    } else {
      router.push("/ficha/personajes");
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Toda edición usa la misma operación atómica; el servidor comprueba combate y acción.
  const desequiparItem = async (id:string)=>{await abrirEquipo(id);};
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
  const der=getItemEnSlot('mano_der'),izq=getItemEnSlot('mano_izq');
  const manoDer = der || (izq?.slot_tipo==='dos_manos'?izq:undefined);
  const manoIzq = izq || (der?.slot_tipo==='dos_manos'?der:undefined);

  const accesorios = [
    getItemEnSlot("acc_1"), getItemEnSlot("acc_2"), getItemEnSlot("acc_3"),
    getItemEnSlot("acc_4"), getItemEnSlot("acc_5"), getItemEnSlot("acc_6"),
  ];

  const tituloEquipado = getItemEnSlot("titulo");

  // CÁLCULO DE STATS CON BONOS
  const calcularStatTotal = (claveAttr: string, valorBase: number = 0) => {
    const clave=claveAttr==='hp'?'vida':claveAttr;
    if(contextoEquipo && clave in contextoEquipo.stats){const total=contextoEquipo.stats[clave];return {total,bono:total-valorBase};}
    let bono = 0;
    inventario.filter(i => i.slot_equipado).forEach(item => {
      if (item.stats && item.stats[claveAttr]) {
        bono += item.stats[claveAttr];
      }
    });
    return { total: valorBase + bono, bono };
  };

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

        {contextoEquipo&&<div className="rounded-xl border border-orange-900 bg-neutral-950 p-4 text-sm"><p>Vida {contextoEquipo.vida}/{contextoEquipo.max_vida} · ARM {contextoEquipo.stats.armadura||0} · Bono de daño {contextoEquipo.stats.dano||0} · Bono de impacto {contextoEquipo.stats.bono_impacto||0}</p>{!!contextoEquipo.formas?.length&&<p className="mt-2 text-orange-300">{contextoEquipo.formas.join(' · ')}</p>}<p className="mt-2 text-neutral-400">{contextoEquipo.manos_libres} manos libres · {contextoEquipo.combate_id?(contextoEquipo.es_turno&&!contextoEquipo.accion_usada?'Puedes cambiar el equipo gastando tu acción.':'Espera a tu turno con una acción disponible.'):'Fuera de combate'}</p></div>}
        <div className="space-y-3"><button className="rounded-lg border border-orange-700 px-4 py-2 text-sm" onClick={()=>void abrirEquipo()}>Cambiar equipamiento</button><p className="text-sm text-neutral-400">En combate, confirmar cambios consume una acción y requiere tu turno. Fuera de combate el cambio es libre.</p>{errorEquipo&&<p role="alert" className="text-red-300">{errorEquipo}</p>}{editarEquipo&&contextoEquipo&&<EditorEquipoCombate inicial={borradorEquipo} contexto={contextoEquipo} solicitud={{personaje_id:personaje.id}} onCerrar={()=>setEditarEquipo(false)} onGuardado={async()=>{setEditarEquipo(false);await cargarDatos();}}/>}</div>
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
                  onClick={()=>void abrirEquipo()}
                  onDesequipar={() => casco && desequiparItem(casco.id)}
                />
              </div>

              {/* MANO IZQUIERDA | PECHERA | MANO DERECHA */}
              <div className="col-start-1">
                <SlotCard
                  etiqueta="MANO IZQUIERDA"
                  item={manoIzq}
                  onClick={()=>void abrirEquipo()}
                  onDesequipar={() => manoIzq && desequiparItem(manoIzq.id)}
                />
              </div>

              <div className="col-start-2">
                <SlotCard
                  etiqueta="PECHERA / TORSO"
                  item={pechera}
                  onClick={()=>void abrirEquipo()}
                  onDesequipar={() => pechera && desequiparItem(pechera.id)}
                />
              </div>

              <div className="col-start-3">
                <SlotCard
                  etiqueta="MANO DERECHA"
                  item={manoDer}
                  onClick={()=>void abrirEquipo()}
                  onDesequipar={() => manoDer && desequiparItem(manoDer.id)}
                />
              </div>

              {/* PANTALONES */}
              <div className="col-start-2">
                <SlotCard
                  etiqueta="PANTALONES / PIERNAS"
                  item={pantalones}
                  onClick={()=>void abrirEquipo()}
                  onDesequipar={() => pantalones && desequiparItem(pantalones.id)}
                />
              </div>

              {/* ZAPATOS */}
              <div className="col-start-2">
                <SlotCard
                  etiqueta="ZAPATOS / PIES"
                  item={zapatos}
                  onClick={()=>void abrirEquipo()}
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
                    onClick={()=>void abrirEquipo()}
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
                onClick={()=>void abrirEquipo()}
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
