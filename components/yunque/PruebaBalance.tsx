'use client';

import { useEffect, useRef, useState } from 'react';
import { proyectarCarga } from '../../lib/balance-carga';
import type { evaluarBalance } from '../../lib/balance-laboratorio';
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

export default function PruebaBalance({ b, ctx }: { b: Borrador; ctx: ContextoTaller }) {
  const vinculos = new Set([...b.habilidades, ...b.pasivas, ...Object.values(b.equipamiento)]);
  const entrada: Entrada = [b, {
    stats: b.tipo === 'personaje' ? valoresBorrador(b, ctx) : {},
    creaciones: b.tipo === 'personaje' ? ctx.creaciones.filter(c => vinculos.has(c.id)) : [],
  }, { repeticiones: 12 }];
  return <InformeBalance key={JSON.stringify(entrada)} entrada={entrada} />;
}

function InformeBalance({ entrada }: { entrada: Entrada }) {
  const [b] = entrada;
  const [resultado, setResultado] = useState<Informe | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const worker = useRef<Worker | null>(null);

  useEffect(() => () => worker.current?.terminate(), []);

  function ejecutar() {
    setError('');
    setResultado(null);
    let tarea: Worker;
    try {
      tarea = new Worker(new URL('./balance.worker.ts', import.meta.url));
    } catch {
      setError('El navegador no pudo iniciar el laboratorio.');
      return;
    }
    worker.current = tarea;
    setOcupado(true);
    function finalizar() {
      tarea.terminate();
      worker.current = null;
      setOcupado(false);
    }
    tarea.onmessage = ({ data }: MessageEvent<Respuesta>) => {
      finalizar();
      if ('error' in data) setError(data.error);
      else setResultado(data.informe);
    };
    tarea.onerror = () => {
      finalizar();
      setError('Falló la ejecución del laboratorio.');
    };
    try {
      tarea.postMessage(entrada);
    } catch {
      finalizar();
      setError('No fue posible preparar los datos de la prueba.');
    }
  }

  const r = resultado;
  return <div className="yq-ficha-prueba">
    <p>Prueba cinco rondas en modo Impacto frente a un portador desarmado de referencia.</p>
    <button type="button" onClick={ejecutar} disabled={ocupado}>{ocupado ? 'Simulando…' : 'Simular borrador'}</button>
    {error && <p role="status">{error}</p>}
    {r && <>
      <p role="status"><strong>{r.ipe === null ? 'Índice de potencia indeterminado' : `Índice de potencia ofensiva · ${numero.format(r.ipe)}`}</strong></p>
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
