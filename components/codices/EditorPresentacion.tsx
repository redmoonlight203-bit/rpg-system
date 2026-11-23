"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Link2, Upload, ImageOff, Save } from "lucide-react";
import { mensajeError } from "../../lib/errores";
import { validarPortada } from "../../lib/imagenes-creacion";
import { imagenCreacion } from "../../lib/arte-creacion";
import { publicarArchivoImagen } from "../../lib/imagenes-storage";
import { Carta, Portada, type PiezaGaleria, type PropsGaleria } from "../GaleriaCreacion";
import SelectorIconoYugen from "../SelectorIconoYugen";
import type { ContextoCodice } from "./tipos";

export function usePresentacion<T extends PiezaGaleria>(item: T, props: PropsGaleria<T>) {
  const [imagen, setImagen] = useState(item.imagen_url || "");
  const [icono,setIcono]=useState(item.icono||"");
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState(false);
  const bloqueo = useRef(false);
  const dirty = imagen !== (item.imagen_url || "") || icono !== (item.icono || "");
  const ocupado = procesando || guardando;
  useEffect(() => {
    if (!dirty) return;
    const salir = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", salir);
    return () => window.removeEventListener("beforeunload", salir);
  }, [dirty]);
  async function archivo(file?: File) {
    if (!file || bloqueo.current) return;
    bloqueo.current = true; setProcesando(true); setError(""); setAviso("");
    try { setImagen(await publicarArchivoImagen(file)); } catch (e) { setError(mensajeError(e,"No se pudo leer la imagen.")); }
    finally { bloqueo.current = false; setProcesando(false); }
  }
  async function guardar() {
    if (bloqueo.current) return;
    const value = imagen.trim(), fallo = validarPortada(value);
    if (fallo) { setError(fallo); return; }
    bloqueo.current = true; setGuardando(true); setError(""); setAviso("");
    try { await props.onImagen(item.id, value, icono); setImagen(value); setAviso("Presentación guardada en la creación."); setEditando(false); }
    catch (e) { setError(mensajeError(e,"No se pudo guardar la imagen.")); }
    finally { bloqueo.current = false; setGuardando(false); }
  }
  function cancelar() {
    setImagen(item.imagen_url || "");
    setIcono(item.icono || "");
    setError("");
    setEditando(false);
  }
  return { imagen, setImagen, icono, setIcono, procesando, guardando, setGuardando, error, setError, aviso, editando, setEditando, dirty, ocupado, archivo, guardar, cancelar };
}
export type Presentacion = ReturnType<typeof usePresentacion>;

export function EditorPresentacion<T extends PiezaGaleria>({ ctx, estado }: { ctx: ContextoCodice<T>; estado: Presentacion }) {
  const { item, props, imagenVisible, tipo, iconoVisible } = ctx;
  const { imagen, setImagen, icono, setIcono, ocupado, editando, setEditando, archivo, setError, dirty, guardar, cancelar } = estado;
  return <>
      <button className="cg-button cg-image-toggle" disabled={ocupado} onClick={() => setEditando(!editando)} aria-expanded={editando}><ImagePlus size={16} />{imagenCreacion(item.id, item.imagen_url) ? "Cambiar imagen o icono" : "Elegir imagen o icono"}</button>
      {editando && <div className="cg-image-editor"><h3>Imagen o emblema</h3>
        <div className="cg-encuadres">
          <figure><Carta item={{...item, imagen_url: imagen, icono}} props={props} dueno={null} orden={0} /><figcaption>Tarjeta</figcaption></figure>
          <figure><div className="cg-vista-ficha"><Portada src={imagenVisible} tipo={tipo} icono={iconoVisible} circular /></div><figcaption>Ficha circular</figcaption></figure>
        </div>
        <fieldset disabled={ocupado}>
        <div className="cg-symbol-editor"><h4>Icono de Yugen</h4><p>Se usa cuando no hay imagen o no se puede cargar. Automático utiliza el símbolo de la raza o categoría.</p><SelectorIconoYugen value={icono} onChange={setIcono} automatico={props.iconoDe({...item,icono:null})} disabled={ocupado}/></div>
        <label><Link2 size={14} />URL de la imagen<input type="text" placeholder="https://…" value={imagen.startsWith("data:") ? "" : imagen} onChange={(e) => { setImagen(e.target.value); setError(""); }} /></label>
        <span className="cg-or">o selecciona un archivo</span>
        <label className="cg-upload"><Upload size={20} /><strong>Publicar imagen</strong><span>PNG, JPG o WebP · visible mediante enlace público</span><input aria-label="Insertar imagen desde archivo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { void archivo(e.target.files?.[0]); e.target.value = ""; }} /></label>
        {imagen.startsWith("data:") && <p className="cg-local-image">Imagen de archivo lista para guardar.</p>}
        <div className="cg-image-actions"><button className="cg-button" disabled={!imagen} onClick={() => { setImagen(""); setError(""); }}><ImageOff size={14} />{imagenCreacion(item.id) ? "Restaurar ilustración" : "Quitar imagen"}</button><button className="cg-button" onClick={cancelar}>Cancelar</button></div>
        <button className="cg-button cg-primary" disabled={!dirty} onClick={() => void guardar()}><Save size={16} />Guardar presentación</button>
      </fieldset><small>Los archivos se optimizan y publican en Storage; cualquiera con el enlace podrá verlos.</small></div>}
  </>;
}

export function EstadoPresentacion({ estado }: { estado: Presentacion }) {
  const { ocupado, procesando, error, aviso, dirty } = estado;
  return <>
      {ocupado && <p role="status">{procesando ? "Preparando imagen…" : "Guardando imagen…"}</p>}{error && <p className="cg-error" role="alert">{error}</p>}{aviso && <p className="cg-success" role="status">{aviso}</p>}{dirty && <p className="cg-unsaved">Presentación sin guardar</p>}
  </>;
}
