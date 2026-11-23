import { vinculosDe } from "../../lib/codices";
import { Portada, type PiezaGaleria } from "../GaleriaCreacion";
import { AtributosCodice, CabeceraCodice, HistoriaCodice } from "./Comunes";
import { GrupoVinculos } from "./Miniaturas";
import { AccionesEfectos, PasivasLista, ReglasCreacion } from "./ReglasCodice";
import type { ContextoCodice } from "./tipos";

export default function Pergamino<T extends PiezaGaleria>({ ctx }: { ctx: ContextoCodice<T> }) {
  const { item, props, ranuras } = ctx;

  return (
    <div className="cx-pergamino">
      <div className="cx-rollo">
        <div className="cx-rollo-ilustracion">
          <Portada src={ctx.imagenVisible} tipo={ctx.tipo} icono={ctx.iconoVisible} />
        </div>
        <CabeceraCodice ctx={ctx} />
        <AtributosCodice ctx={ctx} />
        <HistoriaCodice ctx={ctx} />
      </div>
      {ranuras.acciones}
      <AccionesEfectos ctx={ctx} />
      <PasivasLista ctx={ctx} />
      <ReglasCreacion ctx={ctx} />
      <GrupoVinculos ctx={ctx} vinculos={vinculosDe(item, props.items)} titulo="Habilidades, pasivas y equipo" />
      {ranuras.formas}
      {ranuras.presentacion}
      {ranuras.estado}
      {ranuras.peligro}
    </div>
  );
}
