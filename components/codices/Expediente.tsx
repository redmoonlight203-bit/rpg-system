import type { CSSProperties } from 'react';
import { SLOTS } from '../../lib/creacion';
import { rangoDe } from '../../lib/cartas';
import { Portada, type PiezaGaleria } from '../GaleriaCreacion';
import { Marco, Sello } from '../ui/Juego';
import { AtributosCodice, CabeceraCodice, HistoriaCodice } from './Comunes';
import { MiniReliquia, MiniSello, MiniTarot } from './Miniaturas';
import { AccionesEfectos, PasivasLista, ReglasCreacion } from './ReglasCodice';
import type { ContextoCodice } from './tipos';

const articulaciones = ['casco', 'capa', 'mano_der', 'pechera', 'mano_izq', 'pantalones', 'zapatos'];

function Arsenal<T extends PiezaGaleria>({ ctx }: { ctx: ContextoCodice<T> }) {
  const equipo = ctx.item.equipamiento || {};
  const manoDoble = ['mano_der', 'mano_izq'].find(mano =>
    ctx.props.items.find(item => item.id === equipo[mano])?.slot_tipo === 'dos_manos');
  const ranura = (clave: string) => {
    const slot = SLOTS.find(dato => dato.clave === clave)!;
    const ocupaOtraMano = !!manoDoble && clave !== manoDoble
      && (clave === 'mano_der' || clave === 'mano_izq') && !equipo[clave];
    return (
      <li className={`cx-arsenal-slot cx-arsenal-${clave}${ocupaOtraMano || clave === manoDoble ? ' is-doble' : ''}`} key={clave}>
        <span>{slot.nombre}</span>
        {equipo[clave] ? <MiniReliquia ctx={ctx} id={equipo[clave]} />
          : ocupaOtraMano ? <span className="cx-arsenal-doble" aria-label={`${slot.nombre}: ocupada por un arma de dos manos`}>Dos manos</span>
          : <span className="cx-arsenal-vacio" aria-label={`${slot.nombre}: vacío`}>—</span>}
      </li>
    );
  };

  return (
    <section className="cx-seccion">
      <h3>Arsenal</h3>
      <ul className="cx-arsenal-figura">{articulaciones.map(ranura)}</ul>
      <ul className="cx-arsenal-accesorios">
        {SLOTS.filter(slot => !articulaciones.includes(slot.clave)).map(slot => ranura(slot.clave))}
      </ul>
    </section>
  );
}

export default function Expediente<T extends PiezaGaleria>({ ctx }: { ctx: ContextoCodice<T> }) {
  const { item, props, ranuras } = ctx;
  const rango = rangoDe(item.clase);
  const habilidades = [...new Set(item.habilidades || [])];
  const pasivas = [...new Set(item.pasivas || [])];
  const naturaleza = item.naturaleza_vinculo;
  const vinculos = naturaleza ? [
    ['Bestia', naturaleza.bestia],
    ['Sello', naturaleza.sello],
    ['Origen', naturaleza.origen],
  ].filter(([, dato]) => dato?.trim()) : [];
  const invocacion = item.configuracion_invocacion?.plantilla;

  return (
    <div className={`cx-expediente ${rango.css}`}>
      <aside className="cx-expediente-visual">
        <Marco className="cx-expediente-marco">
          <Portada src={ctx.imagenVisible} tipo={ctx.tipo} icono={ctx.iconoVisible} />
        </Marco>
        <Sello texto={`${rango.clave} · ${rango.nombre}`} />
        {ranuras.formas}
        {ranuras.presentacion}
      </aside>
      <div className="cx-expediente-cuerpo">
        <CabeceraCodice ctx={ctx} eyebrow={`Expediente · ${props.clasificacion(item.tipo)}`} />
        {ranuras.acciones}
        <AtributosCodice ctx={ctx} variante="medallones" />
        {!!habilidades.length && (
          <section className="cx-seccion">
            <h3>Grimorio</h3>
            <ul className="cx-grimorio">
              {habilidades.map((id, indice) => {
                const mitad = (habilidades.length - 1) / 2;
                const angulo = mitad > 0 ? (indice - mitad) / mitad * 18 : 0;
                return <li key={id} style={{ '--k': `${angulo}deg` } as CSSProperties}><MiniTarot ctx={ctx} id={id} /></li>;
              })}
            </ul>
          </section>
        )}
        <Arsenal ctx={ctx} />
        {!!pasivas.length && (
          <section className="cx-seccion">
            <h3>Pasivas</h3>
            <ul className="cx-mini-grupo">{pasivas.map(id => <li key={id}><MiniSello ctx={ctx} id={id} /></li>)}</ul>
          </section>
        )}
        {!!vinculos.length && (
          <section className="cx-seccion">
            <h3>Vínculo de naturaleza</h3>
            <dl className="cx-expediente-lista">
              {vinculos.map(([etiqueta, dato]) => <div key={etiqueta}><dt>{etiqueta}</dt><dd>{dato}</dd></div>)}
            </dl>
            {!!naturaleza?.notas?.trim() && <p>{naturaleza.notas}</p>}
          </section>
        )}
        {invocacion && (
          <section className="cx-seccion">
            <h3>Invocación</h3>
            <p>{invocacion.nombre}</p>
            <dl className="cx-expediente-lista">
              {Object.entries(invocacion.stats || {}).map(([clave, valor]) => (
                <div key={clave}><dt>{props.etiqueta(item, clave)}</dt><dd>{valor}</dd></div>
              ))}
            </dl>
          </section>
        )}
        <AccionesEfectos ctx={ctx} />
        <PasivasLista ctx={ctx} />
        <ReglasCreacion ctx={ctx} />
        <HistoriaCodice ctx={ctx} forma={ctx.forma} />
        {ranuras.estado}
        {ranuras.peligro}
      </div>
    </div>
  );
}
