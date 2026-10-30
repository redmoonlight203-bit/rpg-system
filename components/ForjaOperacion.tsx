"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Creacion = { id: string; nombre: string; es_grupo: boolean };
type Personaje = { id: number | string; nombre: string; user_id: string; raza: string };
const input = "w-full rounded border border-neutral-700 bg-black p-2.5 text-sm text-neutral-100";
export function ForjaOperacion({ item, modo, usuarioId, negociacionId, onClose, onDone }: {
  item: Creacion; modo: "inventario" | "batalla"; usuarioId?: string; negociacionId?: string;
  onClose: () => void; onDone: () => void;
}) {
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [personaje, setPersonaje] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState(negociacionId ? "Compra en tienda" : "");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(modo === "inventario");
  const [ocupado, setOcupado] = useState(false);
  const bloqueo = useRef(false);
  const solicitud = useRef({ firma: "", id: "" });
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialogo.current?.showModal(); }, []);
  useEffect(() => {
    if (modo !== "inventario") return;
    let activo = true;
    void (async () => {
      try {
        let q = supabase.from("personajes").select("id,nombre,user_id,raza").eq("estado_aprobacion", "aprobado").not("user_id", "is", null).order("nombre");
        if (usuarioId) q = q.eq("user_id", usuarioId);
        const r = await q;
        if (r.error) throw r.error;
        if (activo) setPersonajes(r.data || []);
      } catch (e) { if (activo) setError(e instanceof Error ? e.message : "No se pudieron cargar los personajes."); }
      finally { if (activo) setCargando(false); }
    })();
    return () => { activo = false; };
  }, [modo, usuarioId]);
  async function enviar(e: React.FormEvent) {
    e.preventDefault(); if (bloqueo.current) return;
    const n = Number(cantidad);
    if (!Number.isInteger(n) || n < 1 || n > 50) return setError("Usa una cantidad de 1 a 50.");
    if (modo === "inventario" && !personajes.some(p => String(p.id) === personaje)) return setError("Selecciona el personaje que recibirá las copias.");
    const params = { p_forja: item.id, p_modo: modo, p_personaje: modo === "inventario" ? personaje : null, p_cantidad: n, p_motivo: motivo.trim(), p_negociacion: negociacionId || null };
    const firma = JSON.stringify(params);
    if (solicitud.current.firma !== firma) solicitud.current = { firma, id: crypto.randomUUID() };
    bloqueo.current = true; setOcupado(true); setError("");
    try {
      const r = await supabase.rpc("forja_crear_copias", { ...params, p_solicitud: solicitud.current.id });
      if (r.error) throw new Error(r.error.message);
      if (!r.data || r.data.cantidad !== n) throw new Error("No se confirmó la creación de copias.");
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar la operación."); }
    finally { bloqueo.current = false; setOcupado(false); }
  }
  return <dialog ref={dialogo} onCancel={e => { e.preventDefault(); if (!ocupado) onClose(); }} aria-labelledby="operacion-titulo" className="m-auto w-full max-w-lg rounded-xl border border-orange-900 bg-neutral-950 p-6 text-neutral-100 backdrop:bg-black/80">
    <form onSubmit={enviar} className="space-y-4">
      <h2 id="operacion-titulo" className="text-xl font-semibold">{modo === "inventario" ? "Entregar a personaje" : "Preparar para batalla"}</h2>
      <p>{item.nombre}</p><p className="text-sm text-neutral-400">{item.es_grupo ? "Malla: cada copia obtiene valores nuevos dentro de los rangos y los conserva." : "Único / fijo: todas las copias conservan las estadísticas definidas."}</p>
      {modo === "inventario" && <label className="block space-y-2 text-sm"><span>Personaje destinatario</span><select required disabled={ocupado || cargando} className={input} value={personaje} onChange={e => setPersonaje(e.target.value)}><option value="">{cargando ? "Cargando…" : "Elige un personaje"}</option>{personajes.map(p => <option key={p.id} value={String(p.id)}>{p.nombre} · {p.raza} · #{p.id}</option>)}</select>{!cargando && !personajes.length && <span className="text-amber-300">No hay personajes aprobados disponibles.</span>}</label>}
      <label className="block space-y-2 text-sm"><span>Cantidad de copias</span><input disabled={ocupado || !!negociacionId} required type="number" min="1" max="50" step="1" className={input} value={cantidad} onChange={e => setCantidad(e.target.value)}/></label>
      <label className="block space-y-2 text-sm"><span>Motivo o encuentro</span><input disabled={ocupado} maxLength={500} className={input} placeholder="Botín de la taberna, recompensa…" value={motivo} onChange={e => setMotivo(e.target.value)}/></label>
      <p className="text-xs text-neutral-500">{modo === "inventario" ? "Se crea una entrada independiente por copia en el inventario de este personaje. No se equipa automáticamente." : "Las instancias se guardarán en Preparados para batalla. Sus valores no se volverán a sortear al recargar."}</p>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex justify-end gap-3"><button disabled={ocupado} type="button" className="rounded border border-neutral-700 px-4 py-2" onClick={onClose}>Cancelar</button><button disabled={ocupado || cargando} className="rounded bg-orange-900 px-4 py-2 disabled:opacity-40">{ocupado ? "Procesando…" : modo === "inventario" ? "Entregar copias" : "Generar instancias"}</button></div>
    </form>
  </dialog>;
}

type Instancia = { id: string; nombre: string; stats: Record<string, number>; recursos: Record<string, number>; estado: string; created_at: string };
export function ForjaInstancias({ revision }: { revision: number }) {
  const [filas, setFilas] = useState<Instancia[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  async function cargar() {
    setCargando(true); setError("");
    const r = await supabase.from("forja_instancias").select("*").neq("estado", "finalizado").order("created_at", { ascending: false }).limit(200);
    if (r.error) setError(r.error.message); else setFilas(r.data || []);
    setCargando(false);
  }
  useEffect(() => { void cargar(); }, [revision]);
  async function cambiar(id: string, estado: string) {
    if (ocupado) return; setOcupado(true);
    try {
      const r = await supabase.from("forja_instancias").update({ estado }).eq("id", id).select("id").single();
      if (r.error) throw new Error(r.error.message);
      await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar la instancia."); }
    finally { setOcupado(false); }
  }
  return <section className="space-y-4 rounded-xl border border-neutral-800 p-5"><div className="flex justify-between gap-3"><h2 className="text-xl">Preparados para batalla</h2><button onClick={() => void cargar()}>Actualizar</button></div><p className="text-sm text-neutral-400">Apariciones independientes con estadísticas guardadas. Máximo 200 activas visibles. Esta lista prepara enemigos; todavía no resuelve turnos ni daño.</p>
    {error && <p role="alert" className="text-red-300">{error}</p>}{cargando ? <p>Cargando instancias…</p> : <div className="grid gap-3 md:grid-cols-2">{filas.map(f => <article key={f.id} className="rounded border border-neutral-800 p-4"><h3>{f.nombre} <span className="text-xs text-neutral-500">#{f.id.slice(0,8)} · {f.estado}</span></h3><p className="mt-2 text-xs text-neutral-400">{Object.entries(f.stats).map(([k,v]) => `${k}: ${v}`).join(" · ") || "Sin atributos"}</p><div className="mt-3 flex gap-4 text-sm">{f.estado === "pendiente" && <button disabled={ocupado} onClick={() => void cambiar(f.id,"en_batalla")}>Marcar en batalla</button>}<button disabled={ocupado} onClick={() => void cambiar(f.id,"finalizado")}>Finalizar</button></div></article>)}</div>}{!cargando && !filas.length && <p className="text-neutral-500">Genera una malla desde la galería para preparar sus apariciones.</p>}
  </section>;
}
