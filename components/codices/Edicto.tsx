import { rangoDe } from "../../lib/cartas";
import { vinculosDe } from "../../lib/codices";
import { Portada, type PiezaGaleria } from "../GaleriaCreacion";
import { AtributosCodice, CabeceraCodice, HistoriaCodice } from "./Comunes";
import { GrupoVinculos } from "./Miniaturas";
import { AccionesEfectos, PasivasLista, ReglasCreacion } from "./ReglasCodice";
import type { ContextoCodice } from "./tipos";

export default function Edicto<T extends PiezaGaleria>({ ctx }: { ctx: ContextoCodice<T> }) {
  const { item, props, ranuras } = ctx;
  const rango = rangoDe(item.clase);

  return (
    <div className={`cx-vista-doble cx-edicto ${rango.css}`}>
      <div className="cx-edicto-emblema">
        <div className="cx-estandarte" aria-hidden="true">
          <Portada src={ctx.imagenVisible} tipo={ctx.tipo} icono={ctx.iconoVisible} circular />
          <span>{item.nombre}</span>
        </div>
        {ranuras.formas}
        {ranuras.presentacion}
        {ranuras.estado}
      </div>
      <div className="cx-lectura">
        <div className="cx-proclama">
          <CabeceraCodice ctx={ctx} eyebrow="Por decreto de Kuroi" />
          <HistoriaCodice ctx={ctx} />
        </div>
        {ranuras.acciones}
        <AtributosCodice ctx={ctx} variante="heraldica" titulo="Heráldica" />
        <AccionesEfectos ctx={ctx} />
        <PasivasLista ctx={ctx} />
        <ReglasCreacion ctx={ctx} />
        <GrupoVinculos ctx={ctx} vinculos={vinculosDe(item, props.items)} titulo="Habilidades, pasivas y equipo" />
        {ranuras.peligro}
      </div>
    </div>
  );
}
