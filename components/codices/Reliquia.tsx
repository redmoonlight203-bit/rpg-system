import { rangoDe } from "../../lib/cartas";
import { espacioDe, portadoresDe, vinculosDe } from "../../lib/codices";
import { efectosDe, EFECTOS_NOMBRE, formula } from "../../lib/creacion";
import { Portada, type PiezaGaleria } from "../GaleriaCreacion";
import { AtributosCodice, CabeceraCodice, HistoriaCodice } from "./Comunes";
import { GrupoVinculos } from "./Miniaturas";
import { AccionesEfectos, PasivasLista, ReglasCreacion } from "./ReglasCodice";
import type { ContextoCodice } from "./tipos";

export default function Reliquia<T extends PiezaGaleria>({ ctx }: { ctx: ContextoCodice<T> }) {
  const { item, props, ranuras } = ctx;
  const rango = rangoDe(item.clase);
  const espacio = espacioDe(item.slot_tipo);
  const dano = efectosDe(item).filter((e) => e.efecto === "dano");
  const niveles = [...(item.configuracion_artefacto?.niveles || [])].sort((a, b) => a.nivel - b.nivel);
  const portadores = portadoresDe(item.id, props.items).map((p) => ({ ...p, tipo: "equipo" as const }));

  return (
    <div className={`cx-vista-doble cx-reliquia ${rango.css}`}>
      <div>
        <div className="cx-vitrina">
          <div className="cx-vitrina-arte"><Portada src={ctx.imagenVisible} tipo={ctx.tipo} icono={ctx.iconoVisible} /></div>
          <div className="cx-pedestal" aria-hidden="true" />
        </div>
        {(espacio || item.consumible) && <div className="cx-reliquia-marcas">
          {espacio && <span>{espacio}</span>}{item.consumible && <span>Consumible</span>}
        </div>}
        <AtributosCodice ctx={ctx} variante="placa" titulo="Inscripción" />
        {ranuras.formas}
        {ranuras.presentacion}
        {ranuras.estado}
      </div>
      <div className="cx-lectura">
        <CabeceraCodice ctx={ctx} eyebrow={`Reliquia · ${props.clasificacion(item.tipo)}`} />
        {ranuras.acciones}
        {!!dano.length && <section className="cx-seccion"><h3>Dados</h3>
          <ul>{dano.map((e) => <li key={e.id}>{e.nombre || EFECTOS_NOMBRE[e.efecto]} · {formula(e)}</li>)}</ul>
        </section>}
        {!!niveles.length && <section className="cx-seccion"><h3>Despertar del artefacto</h3>
          <ol className="cx-ascenso">
            {niveles.map(({ nivel, nombre, condicion_subida: condicion, cambios }) => <li key={nivel}>
              <span className="cx-nivel">{nivel}</span>
              <div><h4>{nombre}</h4>
                <p>{!condicion ? "Inicial" : condicion.tipo === "contador"
                  ? `${condicion.meta} ${condicion.contador}`
                  : `Al ocurrir: ${condicion.evento}`}</p>
                {cambios.stats && <ul>{Object.entries(cambios.stats).map(([clave, n]) => (
                  <li key={clave}>{props.etiqueta(item, clave)} {n > 0 ? "+" : ""}{n}</li>
                ))}</ul>}
                {cambios.descripcion && <p>{cambios.descripcion}</p>}
              </div>
            </li>)}
          </ol>
        </section>}
        <AccionesEfectos ctx={ctx} />
        <PasivasLista ctx={ctx} />
        <ReglasCreacion ctx={ctx} />
        <HistoriaCodice ctx={ctx} />
        <GrupoVinculos ctx={ctx} vinculos={vinculosDe(item, props.items)} titulo="Habilidades, pasivas y equipo" />
        <GrupoVinculos ctx={ctx} vinculos={portadores} titulo="La portan" />
        {ranuras.peligro}
      </div>
    </div>
  );
}
