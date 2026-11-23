import { arcanoDe, type Vinculo } from '../../lib/codices';
import { rangoDe } from '../../lib/cartas';
import { imagenCreacion } from '../../lib/arte-creacion';
import { Portada, type PiezaGaleria } from '../GaleriaCreacion';
import IconoYugen from '../IconoYugen';
import { EnlaceCreacion } from './Comunes';
import type { ContextoCodice } from './tipos';

type MiniProps<T extends PiezaGaleria> = {
  ctx: ContextoCodice<T>;
  id: string;
  espacio?: string;
};

function Miniatura<T extends PiezaGaleria>({
  ctx,
  id,
  espacio,
  forma,
}: MiniProps<T> & { forma: 'tarot' | 'sello' | 'reliquia' | 'chip' }) {
  const pieza = ctx.props.items.find(item => item.id === id);
  if (!pieza) return <EnlaceCreacion ctx={ctx} id={id} className="cx-mini-chip">{null}</EnlaceCreacion>;

  const tipo = ctx.props.tipoDe(pieza);
  const rango = rangoDe(pieza.clase);
  return (
    <EnlaceCreacion ctx={ctx} id={id} className={`cx-mini cx-mini-${forma} ${rango.css}`} ariaLabel={`Abrir ${pieza.nombre}`}>
      {forma === 'tarot' && <span className="cx-mini-arcano" aria-hidden="true">{arcanoDe(id).romano}</span>}
      {forma === 'chip' ? (
        <IconoYugen id={ctx.props.iconoDe(pieza)} size={20} />
      ) : (
        <span className="cx-mini-arte" aria-hidden="true">
          <Portada
            src={imagenCreacion(pieza.id, pieza.imagen_url)}
            tipo={tipo}
            icono={ctx.props.iconoDe(pieza)}
            circular={forma === 'sello'}
          />
        </span>
      )}
      <span className="cx-mini-nombre">{pieza.nombre}</span>
      {espacio && <small className="cx-mini-espacio">{espacio}</small>}
    </EnlaceCreacion>
  );
}

export function MiniTarot<T extends PiezaGaleria>(props: MiniProps<T>) {
  return <Miniatura {...props} forma="tarot" />;
}

export function MiniSello<T extends PiezaGaleria>(props: MiniProps<T>) {
  return <Miniatura {...props} forma="sello" />;
}

export function MiniReliquia<T extends PiezaGaleria>(props: MiniProps<T>) {
  return <Miniatura {...props} forma="reliquia" />;
}

export function GrupoVinculos<T extends PiezaGaleria>({ ctx, vinculos, titulo }: {
  ctx: ContextoCodice<T>;
  vinculos: Vinculo[];
  titulo: string;
}) {
  if (!vinculos.length) return null;
  return (
    <section className="cx-seccion">
      <h3>{titulo}</h3>
      <ul className="cx-mini-grupo">
        {vinculos.map(({ id, tipo, espacio }) => {
          const pieza = ctx.props.items.find(item => item.id === id);
          const tipoReal = pieza && ctx.props.tipoDe(pieza);
          const forma = tipoReal === 'habilidad' ? 'tarot'
            : tipoReal === 'pasiva' ? 'sello'
            : tipoReal === 'objeto' ? 'reliquia'
            : 'chip';
          return <li key={`${tipo}:${espacio || ''}:${id}`}><Miniatura ctx={ctx} id={id} espacio={espacio} forma={forma} /></li>;
        })}
      </ul>
    </section>
  );
}
