"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { Activity, ArrowRight, Layers, Pencil, Plus, Search, X } from "lucide-react";

type Categoria = { id: string; clave: string; nombre: string; descripcion: string | null };
type Stat = { id: string; categoria: string; clave: string; etiqueta: string; descripcion: string | null; valor_defecto: number };
type Editor = { tipo: "categoria"; original?: Categoria } | { tipo: "atributo"; original?: Stat };
const claveDe = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const campo = "w-full rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-neutral-100 outline-none focus:border-emerald-600 disabled:text-neutral-500";
const boton = "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:border-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed";

export default function Estadisticas() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [seleccion, setSeleccion] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [valor, setValor] = useState("0");
  const [guardando, setGuardando] = useState(false);
  const [errorEditor, setErrorEditor] = useState("");
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (editor) dialogo.current?.showModal(); }, [editor]);

  async function cargar() {
    setCargando(true); setError("");
    try {
      const [cats, atributos] = await Promise.all([
        supabase.from("categorias_forja").select("*").order("created_at", { ascending: true }),
        supabase.from("config_estadisticas").select("*").order("created_at", { ascending: true }),
      ]);
      if (cats.error || atributos.error) throw new Error(cats.error?.message || atributos.error?.message);
      const lista = (cats.data || []) as Categoria[];
      setCategorias(lista); setStats((atributos.data || []) as Stat[]);
      setSeleccion(actual => lista.some(c => c.clave === actual) ? actual : lista[0]?.clave || "");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudieron cargar los datos."); }
    finally { setCargando(false); }
  }
  useEffect(() => { void cargar(); }, []);
  const actual = categorias.find(c => c.clave === seleccion);
  const deCategoria = stats.filter(s => s.categoria === seleccion);
  const coincide = (texto: string) => texto.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase());
  const visibles = deCategoria.filter(s => coincide(`${s.etiqueta} ${s.clave} ${s.descripcion || ""}`));
  const huerfanos = stats.filter(s => !categorias.some(c => c.clave === s.categoria));

  function abrir(e: Editor) {
    setEditor(e); setErrorEditor(""); setAviso("");
    setNombre(e.original ? (e.tipo === "categoria" ? e.original.nombre : e.original.etiqueta) : "");
    setClave(e.original?.clave || ""); setDescripcion(e.original?.descripcion || "");
    setValor(e.tipo === "atributo" ? String(e.original?.valor_defecto ?? 0) : "0");
  }
  async function guardar(event: FormEvent) {
    event.preventDefault(); if (!editor || guardando) return;
    const nombreFinal = nombre.trim(), claveFinal = editor.original?.clave || claveDe(clave || nombre);
    if (!nombreFinal || !claveFinal) return setErrorEditor("Escribe un nombre y una clave válida.");
    const duplicado = editor.tipo === "categoria"
      ? categorias.some(c => c.clave === claveFinal && c.id !== editor.original?.id)
      : stats.some(s => s.categoria === seleccion && s.clave === claveFinal && s.id !== editor.original?.id);
    if (duplicado) return setErrorEditor("Esta clave ya existe. Elige otra para evitar duplicados.");
    if (editor.tipo === "atributo" && (!actual || valor.trim() === "" || !Number.isFinite(Number(valor)))) return setErrorEditor("Selecciona una categoría y un valor numérico válido.");
    setGuardando(true); setErrorEditor("");
    try {
      const tabla = editor.tipo === "categoria" ? "categorias_forja" : "config_estadisticas";
      const datos = editor.tipo === "categoria"
        ? { nombre: nombreFinal, descripcion: descripcion.trim() }
        : { etiqueta: nombreFinal, descripcion: descripcion.trim(), valor_defecto: Number(valor) };
      const consulta = editor.original
        ? supabase.from(tabla).update(datos).eq("id", editor.original.id).select("id").single()
        : supabase.from(tabla).insert({ ...datos, clave: claveFinal, ...(editor.tipo === "atributo" ? { categoria: seleccion } : {}) }).select("id").single();
      const resultado = await consulta;
      if (resultado.error) throw new Error(resultado.error.message);
      if (!resultado.data) throw new Error("No se confirmó el guardado. Revisa los permisos de tu cuenta.");
      if (editor.tipo === "categoria") setSeleccion(claveFinal);
      setEditor(null); setAviso("Cambios guardados."); await cargar();
    } catch (e) { setErrorEditor(e instanceof Error ? e.message : "No se pudieron guardar los cambios."); }
    finally { setGuardando(false); }
  }

  return <main className="min-h-full bg-black p-4 text-neutral-200 sm:p-8">
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-neutral-800 pb-6">
        <div><p className="mb-2 text-xs uppercase tracking-widest text-emerald-500">Configuración de Yugen</p><h1 className="text-3xl font-bold">Estadísticas</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">Define los tipos de creación y los atributos disponibles en la Forja: personajes, habilidades, títulos, pasivas, objetos y todo lo que incorpores al juego.</p></div>
        <Link href="/dm/forja" className={boton}>Ir a la Forja <ArrowRight size={16}/></Link>
      </header>
      {aviso && <p role="status" className="text-sm text-emerald-400">{aviso}</p>}
      {error && <div role="alert" className="space-y-3 text-sm text-red-300"><p>No se pudo actualizar la configuración: {error}</p><button className={boton} onClick={() => void cargar()}>Reintentar</button></div>}
      {cargando ? <p role="status" className="py-16 text-neutral-400">Cargando categorías y atributos…</p> : <>
        <div className="flex flex-wrap gap-6 text-sm text-neutral-400"><span><b className="text-white">{categorias.length}</b> categorías de creación</span><span><b className="text-white">{stats.length}</b> atributos definidos</span></div>
        <div className="grid gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><Layers size={17}/> Categorías</h2><button className={boton} onClick={() => abrir({ tipo: "categoria" })} aria-label="Crear categoría"><Plus size={16}/></button></div>
            <p className="text-xs leading-5 text-neutral-500">Cada categoría será un tipo de creación disponible en la Forja.</p>
            <nav aria-label="Categorías de creación" className="space-y-2">{categorias.map(c => <button key={c.id} onClick={() => {setSeleccion(c.clave);setBusqueda("");}} aria-pressed={seleccion === c.clave} className={`w-full rounded-lg border p-4 text-left ${seleccion === c.clave ? "border-emerald-800 bg-emerald-950/30" : "border-neutral-800 hover:border-neutral-600"}`}><span className="block font-medium">{c.nombre}</span><span className="mt-1 block text-xs text-neutral-500">{stats.filter(s => s.categoria === c.clave).length} atributos · {c.clave}</span></button>)}</nav>
            {!categorias.length && <p className="py-6 text-sm text-neutral-500">Crea tu primera categoría para comenzar.</p>}
          </aside>
          <section className="min-w-0 rounded-xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6">
            {actual ? <><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{actual.nombre}</h2><p className="mt-2 text-sm text-neutral-400">{actual.descripcion || "Añade una descripción para explicar qué se crea en esta categoría."}</p><p className="mt-2 font-mono text-xs text-emerald-500">{actual.clave}</p></div><button className={boton} onClick={() => abrir({ tipo: "categoria", original: actual })}><Pencil size={14}/> Editar categoría</button></div>
              <div className="my-6 flex flex-wrap gap-3 border-t border-neutral-800 pt-6"><label className="relative min-w-0 flex-1"><span className="sr-only">Buscar atributos</span><Search size={16} className="absolute left-3 top-3 text-neutral-500"/><input className={`${campo} pl-9`} value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar atributo por nombre o descripción"/></label><button className={boton} onClick={() => abrir({ tipo: "atributo" })}><Plus size={16}/> Añadir atributo</button></div>
              <div className="space-y-3">{visibles.map(s => <article key={s.id} className="flex items-start justify-between gap-4 rounded-lg border border-neutral-800 p-4"><div className="min-w-0"><h3 className="flex items-center gap-2 font-semibold"><Activity size={15} className="shrink-0 text-emerald-500"/>{s.etiqueta}</h3><p className="mt-1 break-all font-mono text-xs text-neutral-500">{s.clave}</p>{s.descripcion && <p className="mt-2 text-sm text-neutral-400">{s.descripcion}</p>}<p className="mt-3 text-xs text-neutral-400">Valor predeterminado: <b className="text-emerald-400">{s.valor_defecto ?? 0}</b></p></div><button className={boton} aria-label={`Editar ${s.etiqueta}`} onClick={() => abrir({ tipo: "atributo", original: s })}><Pencil size={14}/></button></article>)}</div>
              {!visibles.length && <p className="py-10 text-center text-sm text-neutral-500">{busqueda ? "No hay atributos que coincidan con la búsqueda." : "Esta categoría aún no tiene atributos. Añade los que necesitarás al crear en la Forja."}</p>}
              <p className="mt-6 border-t border-neutral-800 pt-4 text-xs leading-5 text-neutral-500">Los cambios de nombre y descripción conservan las referencias existentes. Cambiar el valor predeterminado no modifica las cifras de entidades ya creadas.</p>
            </> : <div className="py-16 text-center"><Layers className="mx-auto mb-4 text-emerald-500"/><h2 className="text-xl">Todo empieza con una categoría</h2><p className="mt-3 text-sm text-neutral-400">Por ejemplo: personajes, habilidades, títulos, pasivas u objetos.</p><button className={`${boton} mt-6`} onClick={() => abrir({tipo:"categoria"})}>Crear categoría</button></div>}
          </section>
        </div>
        {huerfanos.length > 0 && <section className="border-t border-amber-900 pt-5"><h2 className="font-semibold text-amber-400">Atributos sin categoría disponible ({huerfanos.length})</h2><p className="mt-2 text-sm text-neutral-400">Conservamos estos datos. Puedes recuperar su categoría creando una con la misma clave.</p><ul className="mt-3 space-y-2 text-sm">{huerfanos.map(s => <li key={s.id}>{s.etiqueta} <span className="font-mono text-neutral-500">· categoría: {s.categoria} · {s.clave}</span></li>)}</ul></section>}
      </>}
    </div>
    {editor && <dialog ref={dialogo} aria-labelledby="titulo-editor" onCancel={e => { e.preventDefault(); if (!guardando) setEditor(null); }} className="m-auto w-full max-w-lg border-0 bg-transparent p-4 text-neutral-200 backdrop:bg-black/80">
      <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-950 p-6">
        <div className="mb-5 flex items-center justify-between"><h2 id="titulo-editor" className="text-xl font-semibold">{editor.original ? "Editar" : "Crear"} {editor.tipo === "categoria" ? "categoría" : "atributo"}</h2><button disabled={guardando} aria-label="Cerrar editor" className={boton} onClick={() => setEditor(null)}><X size={16}/></button></div>
        <form onSubmit={guardar} className="space-y-4"><label className="block space-y-2 text-sm"><span>Nombre visible</span><input autoFocus required maxLength={120} className={campo} value={nombre} onChange={e => setNombre(e.target.value)}/></label>
          <label className="block space-y-2 text-sm"><span>Clave interna {editor.original ? "(protegida)" : "(opcional)"}</span><input maxLength={120} className={campo} disabled={!!editor.original} value={clave} placeholder={claveDe(nombre) || "Se genera a partir del nombre"} onChange={e => setClave(e.target.value)}/></label>
          <p className="text-xs text-neutral-500">{editor.original ? "Se conserva para mantener conectadas las creaciones existentes." : `Clave que se guardará: ${claveDe(clave || nombre) || "—"}`}</p>
          <label className="block space-y-2 text-sm"><span>Descripción</span><textarea maxLength={2000} rows={3} className={campo} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder={editor.tipo === "categoria" ? "Qué tipo de elementos agrupa" : "Qué representa y cómo se utiliza este atributo"}/></label>
          {editor.tipo === "atributo" && <><p className="text-sm text-neutral-400">Categoría: {actual?.nombre}</p><label className="block space-y-2 text-sm"><span>Valor predeterminado</span><input required type="number" step="any" className={campo} value={valor} onChange={e => setValor(e.target.value)}/></label></>}
          {errorEditor && <p role="alert" className="text-sm text-red-400">{errorEditor}</p>}
          <div className="flex justify-end gap-3 pt-3"><button type="button" disabled={guardando} className={boton} onClick={() => setEditor(null)}>Cancelar</button><button disabled={guardando} className={`${boton} border-emerald-800 bg-emerald-950 text-emerald-200`}>{guardando ? "Guardando…" : "Guardar cambios"}</button></div>
        </form>
      </section>
    </dialog>}
  </main>;
}
