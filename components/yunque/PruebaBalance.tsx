'use client';

import { useEffect, useMemo, useState } from 'react';
import { perfilRacial } from '../../lib/estadisticas';
import { proyectarCarga } from '../../lib/balance-carga';
import { REPETICIONES_CLASE, type evaluarBalance } from '../../lib/balance-laboratorio';
import type { Borrador } from '../../lib/yunque-borrador';
import { valoresBorrador, type ContextoTaller } from './contexto';
import './prueba-balance.css';

type Informe = ReturnType<typeof evaluarBalance>;
type Entrada = Parameters<typeof evaluarBalance>;
type Respuesta = { informe: Informe } | { error: string };

const ESCENARIOS: Record<Informe['informe'][number]['escenario']['id'], string> = {
  'defensa-baja': 'Defensa baja',
  'defensa-media': 'Defensa media',
  'defensa-alta': 'Defensa alta',
  'amenaza-magica': 'Amenaza mágica',
  'varios-rivales': 'Tres rivales',
  'objetivo-mojado': 'Objetivo mojado',
  distancia: 'Distancia',
};
const numero = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });
const perfiles = [
  { nombre: 'Frágil', fisico: 2, resistencia: 2 },
  { nombre: 'Medio', fisico: 5, resistencia: 5 },
  { nombre: 'Robusto', fisico: 8, resistencia: 8 },
];

function exportar(entrada: Entrada, informe: Informe) {
  // Solo datos de la prueba actual. El archivo se genera localmente.
  const contenido = JSON.stringify({ entrada, informe }, null, 2);
  const url = URL.createObjectURL(new Blob([contenido], { type: 'application/json' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = 'yugen-balance.json';
  enlace.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CargaObjeto({ peso }: { peso?: number }) {
  const [kg, setKg] = useState('');
  const masa = kg.trim() && Number.isFinite(Number(kg)) && Number(kg) >= 0 ? Number(kg) : null;
  return <fieldset>
    <legend>Proyección de carga</legend>
    <p>{peso === undefined ? 'Peso histórico sin registrar.' : `Peso registrado ${numero.format(peso)}, unidad pendiente de confirmar.`}</p>
    <label>
      <span>Peso de ensayo en kg</span>
      <input type="number" min="0" step="any" value={kg} onChange={e => setKg(e.target.value)} />
    </label>
    {masa !== null && <ul>{perfiles.map(perfil => {
      const r = proyectarCarga([{ id: 'pieza', cantidad: 1, ubicacion: 'transportado', pesoKg: masa }], perfil);
      const banda = r.banda!;
      return <li key={perfil.nombre}>
        {perfil.nombre} · {numero.format(masa)} / {r.capacidad} kg · {banda.nombre}
        {banda.movimiento !== 0 && ` · ${banda.movimiento} MOV`}
        {banda.iniciativa !== 0 && ` · ${banda.iniciativa} INI`}
        {banda.impactoFisico !== 0 && ` · ${banda.impactoFisico} impacto físico`}
        {banda.fatigaPrimeraCarrera !== 0 && ` · +${banda.fatigaPrimeraCarrera} Fatiga en la primera carrera`}
      </li>;
    })}</ul>}
  </fieldset>;
}

export function useBalanceBorrador(b: Borrador, ctx: ContextoTaller) {
  const entrada: Entrada = useMemo(() => {
    const vinculos = new Set([...b.habilidades, ...b.pasivas, ...Object.values(b.equipamiento)]);
    const stats = valoresBorrador(b, ctx);
    return [{ ...b, stats }, {
      stats, ...perfilRacial(ctx.categorias,b.clasificacion),
      creaciones: b.tipo === 'personaje' ? ctx.creaciones.filter(c => vinculos.has(c.id)) : [],
    }, { repeticiones: REPETICIONES_CLASE }];
  }, [b, ctx]);

  const firma = JSON.stringify(entrada);
  const [respuesta, setRespuesta] = useState<{ firma: string; datos: Respuesta }>();
  useEffect(() => {
    let tarea: Worker | undefined;
    const demora = window.setTimeout(() => {
      try {
        tarea = new Worker(new URL('./balance.worker.ts', import.meta.url));
        tarea.onmessage = ({ data }: MessageEvent<Respuesta>) => {
          tarea?.terminate();
          setRespuesta({ firma, datos: data });
        };
        tarea.onerror = () => {
          tarea?.terminate();
          setRespuesta({ firma, datos: { error: 'Falló la simulación.' } });
        };
        tarea.postMessage(JSON.parse(firma) as Entrada);
      } catch {
        tarea?.terminate();
        setRespuesta({ firma, datos: { error: 'El navegador no pudo iniciar la simulación.' } });
      }
    }, 450);
    return () => {
      window.clearTimeout(demora);
      tarea?.terminate();
    };
  }, [firma]);

  const actual = respuesta?.firma === firma ? respuesta.datos : undefined;
  return {
    entrada,
    informe: actual && 'informe' in actual ? actual.informe : null,
    error: actual && 'error' in actual ? actual.error : null,
  };
}

export default function PruebaBalance({ balance }: { balance: ReturnType<typeof useBalanceBorrador> }) {
  const { entrada, informe: r, error } = balance;
  const [b] = entrada;
  return <div className="yq-ficha-prueba">
    <p>El índice compara el daño en cinco rondas de Impacto con el de un portador desarmado. Se actualiza al editar el borrador.</p>
    {error && <p role="status">{error}</p>}
    {r && <>
      <p role="status"><strong>{r.ipe === null ? 'Índice de potencia indeterminado' : `Índice de potencia equivalente · ${numero.format(r.ipe)}`}</strong></p>
      <ul>{r.avisos.map(aviso => <li key={aviso}>{aviso}</li>)}</ul>
      {r.informe.map(({ escenario, creacion: m, referencia, rendimientoPorAccion, incidencias }) =>
        <details key={escenario.id}>
          <summary>{ESCENARIOS[escenario.id]} · {numero.format(m.dano)} de daño medio</summary>
          <p>Referencia {numero.format(referencia.dano)} · Daño de apertura {numero.format(m.pico)} · {numero.format(m.acciones)} acciones</p>
          <p>{numero.format(m.phGastado)} PH gastados · {numero.format(m.fatigaGanada)} Fatiga ganada · {numero.format(m.hpPropioPerdido)} HP propios perdidos al actuar</p>
          <p>{numero.format(m.curacion)} HP recuperados · {numero.format(m.danoRecibido)} HP perdidos ante acciones rivales · {numero.format(m.accionesEnemigasNegadas)} acciones rivales negadas</p>
          {rendimientoPorAccion !== null && <p>Rendimiento de daño ×{numero.format(rendimientoPorAccion)} por acción frente a la referencia</p>}
          {!!incidencias.length && <ul>{incidencias.map(i => <li key={i}>{i}</li>)}</ul>}
        </details>
      )}
      <p>{r.version} · {r.repeticiones} repeticiones por escenario · Semilla {r.semilla}</p>
      <button type="button" onClick={() => exportar(entrada, r)}>Descargar prueba</button>
    </>}
    {b.tipo === 'objeto' && <CargaObjeto peso={b.stats.peso} />}
  </div>;
}
