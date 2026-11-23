import { GitBranch, Sparkles, Zap } from "lucide-react";
import { rangoDe } from "../../lib/cartas";
import { cadenaPasiva, vinculosDe } from "../../lib/codices";
import type { PiezaGaleria } from "../GaleriaCreacion";
import IconoYugen from "../IconoYugen";
import { AtributosCodice, CabeceraCodice, HistoriaCodice } from "./Comunes";
import { GrupoVinculos } from "./Miniaturas";
import { AccionesEfectos, ReglasCreacion } from "./ReglasCodice";
import type { ContextoCodice } from "./tipos";

const ICONOS = { evento: Zap, condicion: GitBranch, efecto: Sparkles };

export default function Sello<T extends PiezaGaleria>({ ctx }: { ctx: ContextoCodice<T> }) {
  const { item, props, ranuras } = ctx;
  const rango = rangoDe(item.clase);
  const anillo = `cx-anillo-${item.id}`;

  return (
    <div className={`cx-vista-doble cx-sello ${rango.css}`}>
      <div>
        <div className="cx-sello-lacre">
          <svg viewBox="0 0 220 220" role="img" aria-label={`Sello de ${item.nombre}`}>
            <defs><path id={anillo} d="M 110 110 m -88 0 a 88 88 0 1 1 176 0 a 88 88 0 1 1 -176 0" /></defs>
            <circle cx="110" cy="110" r="104" className="cx-sello-exterior" />
            <circle cx="110" cy="110" r="73" className="cx-sello-interior" />
            <text><textPath href={`#${anillo}`} startOffset="50%" textAnchor="middle">
              {`${item.nombre} · ${rango.nombre}`.toLocaleUpperCase("es")}
            </textPath></text>
          </svg>
          <div className="cx-sello-icono" aria-hidden="true"><IconoYugen id={ctx.iconoVisible} size={70} /></div>
        </div>
        {ranuras.formas}
        {ranuras.presentacion}
        {ranuras.estado}
      </div>
      <div className="cx-lectura">
        <CabeceraCodice ctx={ctx} eyebrow={`Sello · ${props.clasificacion(item.tipo)}`} />
        {ranuras.acciones}
        <AtributosCodice ctx={ctx} />
        {!!item.reglas_pasivas?.length && <section className="cx-seccion">
          <h3>Ritual</h3>
          <h4>Pasivas</h4>
          {item.reglas_pasivas.map((regla, i) => <div key={regla.id || i}>
            {!!regla.nombre && <h4>{regla.nombre}</h4>}
            <ol className="cx-ritual">
              {cadenaPasiva(regla, (key) => props.etiqueta(item, key)).map(({ tipo, texto }, paso) => {
                const Icono = ICONOS[tipo];
                return <li key={paso} data-paso={tipo}><Icono size={17} aria-hidden="true" /><span>{texto}</span></li>;
              })}
            </ol>
          </div>)}
        </section>}
        <AccionesEfectos ctx={ctx} />
        <ReglasCreacion ctx={ctx} />
        <HistoriaCodice ctx={ctx} />
        <GrupoVinculos ctx={ctx} vinculos={vinculosDe(item, props.items)} titulo="Habilidades, pasivas y equipo" />
        {ranuras.peligro}
      </div>
    </div>
  );
}
