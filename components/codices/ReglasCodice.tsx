import { EFECTOS_NOMBRE, efectosDe, formula } from "../../lib/creacion";
import { EVENTOS, EFECTOS_REGLA, DESTINOS, type CondicionRegla, type EfectoRegla, type ValorRegla } from "../../lib/reglas";
import { describirEfecto, describirRegla } from "../../lib/descripciones";
import { cadenaPasiva } from "../../lib/codices";
import ContenidoAyuda from "../ContenidoAyuda";
import type { PiezaGaleria } from "../GaleriaCreacion";
import type { ContextoCodice } from "./tipos";

export function AccionesEfectos<T extends PiezaGaleria>({ ctx }: { ctx: ContextoCodice<T> }) {
  const acciones = efectosDe(ctx.item);
  return <>      {!!acciones.length && <section className="cg-detail-section"><h3>Acciones y efectos</h3>{acciones.map((e) => <div className="cg-rule cg-action-help" key={e.id} tabIndex={0} aria-describedby={`efecto-ayuda-${e.id}`}><strong>{e.nombre || EFECTOS_NOMBRE[e.efecto]}</strong><p>{describirEfecto(e).resumen}</p><span className="cg-effect-tooltip" role="tooltip" id={`efecto-ayuda-${e.id}`}><ContenidoAyuda ayuda={describirEfecto(e)}/></span></div>)}</section>}
  </>;
}
export function PasivasLista<T extends PiezaGaleria>({ ctx }: { ctx: ContextoCodice<T> }) {
  const { item, props } = ctx;
  if (!item.reglas_pasivas?.length) return null;
  return <section className="cg-detail-section">
    <h3>Pasivas</h3>
    {item.reglas_pasivas.map(r => {
      const pasos = cadenaPasiva(r, k => props.etiqueta(item, k));
      return <div className="cg-rule" key={r.id}>
        <strong>{r.nombre}</strong>
        <p>{pasos.filter(p => p.tipo !== "efecto").map(p => p.texto).join(" · ")}</p>
        <p>{pasos.filter(p => p.tipo === "efecto").map(p => p.texto).join(" · ")}</p>
      </div>;
    })}
  </section>;
}
export function ReglasCreacion<T extends PiezaGaleria>({ ctx }: { ctx: ContextoCodice<T> }) {
  const { item } = ctx;
  return <>      {!!item.reglas?.length && <section className="cg-detail-section"><h3>Reglas de la creación</h3>{item.reglas.map((r, i) => <div className="cg-rule" key={r.id || i}><strong>{r.nombre || `Regla ${i + 1}`}</strong><p>{describirRegla(r).resumen}</p><p>{EVENTOS[r.evento]}</p><p>Si: {resumenCondicion(r.condicion)}</p><ul>{r.efectos.map((efecto, j) => <li key={j}><ResumenEfecto efecto={efecto} /></li>)}</ul><p>{r.coste_ph || 0} PH · {r.coste_fatiga || 0} Fatiga{r.enfriamiento ? ` · Enfriamiento: ${r.enfriamiento} turnos` : ""}{r.usos ? ` · ${r.usos} usos` : ""}</p></div>)}</section>}
  </>;
}

function resumenValor(v?: ValorRegla): string {
  if (v === undefined) return "";
  if (typeof v === "number") return String(v);
  return [v.dados ? `${v.dados}d${v.caras}` : "", v.atributo ? `${v.atributo}${v.escala ? ` × ${v.escala}` : ""}` : "", v.evento ? "valor del evento" : "", v.bono ? `${v.bono > 0 ? "+" : ""}${v.bono}` : ""].filter(Boolean).join(" ") || "0";
}
export function resumenCondicion(c: CondicionRegla): string {
  switch (c.tipo) {
    case "siempre": return "Siempre";
    case "estado_terminado": return `Al terminar ${c.clave}`;
    case "todas": return c.condiciones.map(resumenCondicion).join(" y ");
    case "alguna": return c.condiciones.map(resumenCondicion).join(" o ");
    case "no": return `No (${resumenCondicion(c.condicion)})`;
    case "estado": return `${DESTINOS[c.sujeto]} tiene ${c.estado}`;
    case "comparar": return `${DESTINOS[c.sujeto]}: ${c.atributo} ${c.operador} ${c.valor}${c.porcentaje ? "%" : ""}`;
    case "elemento": return `Elemento ${c.elemento}`;
    case "probabilidad": return `Probabilidad ${c.porcentaje}%`;
  }
}
export function ResumenEfecto({ efecto: e, depth = 0 }: { efecto: EfectoRegla; depth?: number }) {
  if (depth > 8) return null;
  return <div className="cg-effect-summary"><span>{EFECTOS_REGLA[e.tipo]} · {DESTINOS[e.destino]}{e.atributo ? ` · ${e.atributo}` : ""}{e.operacion ? ` · ${{ sumar: "sumar", fijar: "fijar", multiplicar: "multiplicar" }[e.operacion]}` : ""}{e.valor !== undefined ? ` ${resumenValor(e.valor)}` : ""}{e.nombre || e.clave ? ` · ${e.nombre || e.clave}` : ""}{e.cd ? ` · CD ${e.cd}` : ""}{e.permanente ? " · Permanente" : e.duracion ? ` · ${e.duracion} turnos` : ""}{e.acumular ? " · Acumulable" : ""}</span>
    {e.condicion && <p>Si: {resumenCondicion(e.condicion)}</p>}
    {e.cambios?.map((c, i) => <p key={i}>{c.atributo}: {c.operacion} {resumenValor(c.valor)}</p>)}
    {e.accion && <p>{e.accion.nombre} · {formula(e.accion)}</p>}
    {([['Éxito', e.exito], ['Fallo', e.fallo]] as const).map(([label, efectos]) => efectos?.length ? <div className="cg-effect-branch" key={label}><b>{label}</b>{efectos.map((efecto, i) => <ResumenEfecto key={i} efecto={efecto} depth={depth + 1} />)}</div> : null)}
  </div>;
}
