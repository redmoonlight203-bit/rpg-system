"use client";
import {useRef, useState} from "react";
import {AlertTriangle, ArrowLeft, Send, Save} from "lucide-react";
import {mensajeError} from "../lib/errores";
import {supabase} from "../lib/supabase";
import {validarPasivas} from "../lib/pasivas";
import {validarReglas} from "../lib/reglas";
import {
  atributosBaseRaza,
  atributosPropuestaIniciales,
  validarPropuestaRaza,
  type Atributo,
  type AtributoPropuesto,
  type PropuestaRaza,
} from "../lib/personajes";
import PortadaYunque from "./PortadaYunque";
import {EditorPasivas} from "./EditorPasivas";
import {EditorReglas} from "./EditorReglas";
import type {DefinicionRacial} from "./PasivaRacial";

const pasivaVacia = (): DefinicionRacial => ({nombre: "", descripcion: "", reglas: [], reglas_pasivas: []});

/** Asistente del reencarnado para proponer una raza única con las mismas piezas que usa el GM. */
export default function PropuestaRazaUnica({
  atributos,
  propuesta,
  onCerrar,
  onGuardada,
}: {
  atributos: Atributo[];
  propuesta: PropuestaRaza | null;
  onCerrar: () => void;
  onGuardada: (enviada: boolean) => void;
}) {
  const base = atributosBaseRaza(atributos);
  const [nombre, setNombre] = useState(propuesta?.nombre || ""),
    [descripcion, setDescripcion] = useState(propuesta?.descripcion || ""),
    [imagen, setImagen] = useState(propuesta?.imagen_url || ""),
    [icono, setIcono] = useState(propuesta?.icono || ""),
    [stats, setStats] = useState<Record<string, AtributoPropuesto>>(() =>
      propuesta && Object.keys(propuesta.atributos).length ? propuesta.atributos : atributosPropuestaIniciales(atributos),
    ),
    [conPasiva, setConPasiva] = useState(!!propuesta?.pasiva_racial),
    [pasiva, setPasiva] = useState<DefinicionRacial>(() =>
      propuesta?.pasiva_racial ? (structuredClone(propuesta.pasiva_racial) as DefinicionRacial) : pasivaVacia(),
    ),
    [acepta, setAcepta] = useState(false),
    [subiendo, setSubiendo] = useState(false),
    [ocupado, setOcupado] = useState(false),
    [error, setError] = useState("");
  const bloqueo = useRef(false);

  async function guardar(enviar: boolean) {
    if (bloqueo.current) return;
    const datos = {nombre, descripcion, imagen_url: imagen || null, atributos: stats, pasiva_racial: conPasiva ? pasiva : null};
    const fallo =
      validarPropuestaRaza(datos, atributos, enviar, acepta) ||
      (conPasiva ? validarPasivas(pasiva.reglas_pasivas) || validarReglas(pasiva.reglas) : null);
    if (fallo) return setError(fallo);
    bloqueo.current = true;
    setOcupado(true);
    setError("");
    try {
      const r = await supabase.rpc("raza_propuesta_guardar", {
        p_id: propuesta?.id ?? null,
        p_nombre: nombre.trim(),
        p_descripcion: descripcion.trim(),
        p_icono: icono || null,
        p_imagen: imagen || null,
        p_atributos: stats,
        p_pasiva: conPasiva ? {...pasiva, nombre: pasiva.nombre.trim(), descripcion: pasiva.descripcion.trim()} : null,
        p_enviar: enviar,
        p_acepta: enviar && acepta,
      });
      if (r.error) throw Error(r.error.message);
      onGuardada(enviar);
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar la propuesta."));
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  return (
    <section className="pj-panel pj-raza-unica" aria-labelledby="raza-unica-titulo">
      <div className="pj-actions">
        <button type="button" onClick={onCerrar} disabled={ocupado}>
          <ArrowLeft size={15} />
          Volver
        </button>
      </div>
      <span className="pj-eyebrow">RAZA ÚNICA / PROPUESTA AL GM</span>
      <h2 id="raza-unica-titulo">Propón una raza que no existe</h2>
      <p>
        Usas las mismas piezas que el GM: atributos base y límites, una pasiva racial con sus reglas automáticas,
        descripción e imagen. Mientras el GM no la apruebe, la raza no existe en el mundo.
      </p>
      <fieldset disabled={ocupado} className="pj-raza-unica-campos">
        <label>
          Nombre de la raza
          <input maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <label>
          Descripción
          <textarea maxLength={4000} rows={4} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </label>
        <PortadaYunque
          titulo="Imagen de la raza"
          nombre={nombre}
          imagen={imagen}
          icono={icono}
          enlace={false}
          onProcesando={setSubiendo}
          onChange={(p) => {
            if (p.imagen !== undefined) setImagen(p.imagen);
            if (p.icono !== undefined) setIcono(p.icono);
          }}
        />
        <h3>Atributos base y límites</h3>
        <p>El valor base es con el que nace un personaje de esta raza; el límite es el máximo que puede proponer al crearlo.</p>
        <div className="pj-stats">
          {base.map((s) => {
            const v = stats[s.clave];
            return (
              <fieldset className="pj-stat" key={s.clave}>
                <legend>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!v}
                      onChange={(e) => {
                        const siguiente = {...stats};
                        if (e.target.checked)
                          siguiente[s.clave] = {
                            valor_defecto: Number(s.valor_defecto) || 0,
                            limite_jugador: s.limite_jugador == null ? null : Number(s.limite_jugador),
                          };
                        else delete siguiente[s.clave];
                        setStats(siguiente);
                      }}
                    />{" "}
                    {s.etiqueta}
                  </label>
                </legend>
                {v && (
                  <>
                    <label>
                      Base
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={v.valor_defecto}
                        onChange={(e) => setStats({...stats, [s.clave]: {...v, valor_defecto: Number(e.target.value)}})}
                      />
                    </label>
                    <label>
                      Límite (vacío = sin límite)
                      <input
                        type="number"
                        min={v.valor_defecto}
                        step="any"
                        value={v.limite_jugador ?? ""}
                        onChange={(e) =>
                          setStats({...stats, [s.clave]: {...v, limite_jugador: e.target.value === "" ? null : Number(e.target.value)}})
                        }
                      />
                    </label>
                  </>
                )}
                <small>{s.descripcion}</small>
              </fieldset>
            );
          })}
        </div>
        {!base.length && <p className="pj-notice">El GM aún no definió atributos para las razas.</p>}
        <label className="pj-check">
          <input type="checkbox" checked={conPasiva} onChange={(e) => setConPasiva(e.target.checked)} /> Añadir una pasiva racial
        </label>
        {conPasiva && (
          <section className="pj-section">
            <label>
              Nombre de la pasiva
              <input maxLength={120} value={pasiva.nombre} onChange={(e) => setPasiva({...pasiva, nombre: e.target.value})} />
            </label>
            <label>
              Descripción para el jugador
              <textarea maxLength={2000} rows={3} value={pasiva.descripcion} onChange={(e) => setPasiva({...pasiva, descripcion: e.target.value})} />
            </label>
            <EditorPasivas value={pasiva.reglas_pasivas} onChange={(reglas_pasivas) => setPasiva({...pasiva, reglas_pasivas})} />
            <details>
              <summary>Reglas avanzadas: condiciones, salvaciones y transformaciones</summary>
              <EditorReglas value={pasiva.reglas} onChange={(reglas) => setPasiva({...pasiva, reglas})} />
            </details>
          </section>
        )}
        <div className="pj-notice pj-advertencia" role="note">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Antes de enviar, ten en cuenta:</strong>
            <ul>
              <li>El GM evaluará con más rigor a cualquier personaje de esta raza.</li>
              <li>Pierdes la elección de lugar de aparición: el GM decide dónde aparece tu personaje.</li>
              <li>Si el GM la rechaza, la raza se borra y solo verás su comentario.</li>
              <li>Si la aprueba, se publica en Reglas y estadísticas y solo tú podrás usarla al crear personajes.</li>
            </ul>
            <label className="pj-check">
              <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} /> Entiendo y acepto estas consecuencias.
            </label>
          </div>
        </div>
        {error && (
          <p role="alert" className="pj-notice pj-error">
            {error}
          </p>
        )}
        <div className="pj-actions">
          <button type="button" disabled={subiendo} onClick={() => void guardar(false)}>
            <Save size={15} />
            {ocupado ? "Guardando…" : "Guardar borrador"}
          </button>
          <button type="button" disabled={subiendo || !acepta} onClick={() => void guardar(true)}>
            <Send size={15} />
            {ocupado ? "Enviando…" : "Enviar al GM"}
          </button>
        </div>
      </fieldset>
    </section>
  );
}
