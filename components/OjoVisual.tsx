'use client';
import {useId} from 'react';
import './ocular.css';
import type {AparienciaOjo} from '../lib/vision';

const C = 50, IRIS = 30, PUPILA = 9;
const polar = (r: number, a: number) => `${(C + r * Math.cos(a)).toFixed(2)},${(C + r * Math.sin(a)).toFixed(2)}`;
const angulo = (i: number, n: number, giro = -Math.PI / 2) => giro + (i * 2 * Math.PI) / Math.max(1, n);

/** Marcas del iris según el patrón. Todo se genera desde los datos: ningún ojo está dibujado a mano. */
function Marcas({a}: {a: AparienciaOjo}) {
  const n = Math.max(0, Math.min(9, a.marcas)), tinta = a.secundario || '#111111';
  switch (a.patron) {
    case 'anillos':
      return <g fill="none" stroke={tinta} strokeWidth={1.6}>{Array.from({length: Math.max(1, n)}, (_, i) => <circle key={i} cx={C} cy={C} r={PUPILA + 3 + ((IRIS - PUPILA - 5) * (i + 1)) / Math.max(1, n)}/>)}</g>;
    case 'aspas':
      // Aspas curvas que giran alrededor de la pupila.
      return <g fill={tinta}>{Array.from({length: n}, (_, i) => {
        const t = angulo(i, n), r = IRIS * 0.62;
        const p = polar(r, t), q = polar(r - 7, t + 0.55), s = polar(r + 4, t + 0.35);
        return <path key={i} d={`M${p} Q${s} ${q} Q${polar(r - 2, t + 0.15)} ${p} Z`}/>;
      })}<circle cx={C} cy={C} r={IRIS * 0.62} fill="none" stroke={tinta} strokeWidth={1} opacity={0.6}/></g>;
    case 'espiral': {
      const vueltas = 1 + n / 3, pasos = 80;
      const puntos = Array.from({length: pasos}, (_, i) => { const f = i / (pasos - 1); return polar(PUPILA + f * (IRIS - PUPILA - 2), f * vueltas * 2 * Math.PI); });
      return <polyline points={puntos.join(' ')} fill="none" stroke={tinta} strokeWidth={2} strokeLinecap="round"/>;
    }
    case 'estrella': {
      const puntas = Math.max(3, n), pts = Array.from({length: puntas * 2}, (_, i) => polar(i % 2 ? IRIS * 0.45 : IRIS * 0.9, angulo(i, puntas * 2)));
      return <polygon points={pts.join(' ')} fill="none" stroke={tinta} strokeWidth={1.6} strokeLinejoin="round"/>;
    }
    case 'rejilla': {
      const lineas = Math.max(2, n + 1);
      return <g stroke={tinta} strokeWidth={1} opacity={0.85}>{Array.from({length: lineas}, (_, i) => { const d = -IRIS + ((i + 1) * 2 * IRIS) / (lineas + 1); return <g key={i}><line x1={C + d} y1={C - IRIS} x2={C + d} y2={C + IRIS}/><line x1={C - IRIS} y1={C + d} x2={C + IRIS} y2={C + d}/></g>; })}</g>;
    }
    case 'petalos':
      return <g fill="none" stroke={tinta} strokeWidth={1.4}>{Array.from({length: Math.max(3, n)}, (_, i) => { const t = (angulo(i, Math.max(3, n)) * 180) / Math.PI; return <ellipse key={i} cx={C + IRIS * 0.5} cy={C} rx={IRIS * 0.38} ry={IRIS * 0.16} transform={`rotate(${t} ${C} ${C})`}/>; })}</g>;
    case 'rendija':
      return <g fill={tinta}>{Array.from({length: n}, (_, i) => { const [x, y] = polar(IRIS * 0.75, angulo(i, n)).split(',').map(Number); return <circle key={i} cx={x} cy={y} r={1.8}/>; })}</g>;
    case 'luna':
      return <g fill={tinta}>{Array.from({length: Math.max(1, n)}, (_, i) => { const t = angulo(i, Math.max(1, n)), r = IRIS * 0.66; const [x, y] = polar(r, t).split(',').map(Number); const [x2, y2] = polar(r + 2.4, t + 0.25).split(',').map(Number); return <g key={i}><circle cx={x} cy={y} r={5}/><circle cx={x2} cy={y2} r={4.4} fill={a.color}/></g>; })}</g>;
  }
  return null;
}

/**
 * Dibujo de un ojo de la primitiva «Visión» a partir de su apariencia (color, patrón, marcas) o de una imagen.
 * `abriendo` reproduce una vez la apertura del párpado (desactivada con movimiento reducido por CSS).
 */
export default function OjoVisual({apariencia: a, nombre, size = 96, abriendo = false}: {apariencia: AparienciaOjo; nombre: string; size?: number; abriendo?: boolean}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const rendija = a.patron === 'rendija';
  return <svg className={`ojo-visual${abriendo ? ' is-abriendo' : ''}`} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Ojo: ${nombre}`}>
    <defs>
      <radialGradient id={`iris${id}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={a.color} stopOpacity={1}/>
        <stop offset="70%" stopColor={a.color} stopOpacity={0.92}/>
        <stop offset="100%" stopColor={a.secundario || '#000000'} stopOpacity={0.9}/>
      </radialGradient>
      <clipPath id={`ojo${id}`}><path d="M4 50 Q50 6 96 50 Q50 94 4 50 Z"/></clipPath>
      <clipPath id={`circulo${id}`}><circle cx={C} cy={C} r={IRIS}/></clipPath>
    </defs>
    <g className="ojo-visual-globo" clipPath={`url(#ojo${id})`}>
      <rect x="0" y="0" width="100" height="100" fill="#efe9df"/>
      {a.imagen_url
        ? <image href={a.imagen_url} x={C - IRIS} y={C - IRIS} width={IRIS * 2} height={IRIS * 2} clipPath={`url(#circulo${id})`} preserveAspectRatio="xMidYMid slice"/>
        : <g className="ojo-visual-iris">
          <circle cx={C} cy={C} r={IRIS} fill={`url(#iris${id})`}/>
          <g clipPath={`url(#circulo${id})`}><Marcas a={a}/></g>
          {rendija ? <ellipse cx={C} cy={C} rx={3} ry={IRIS * 0.8} fill="#050505"/> : <circle cx={C} cy={C} r={a.patron === 'anillos' || a.patron === 'rejilla' ? PUPILA * 0.7 : PUPILA} fill="#050505"/>}
          <circle cx={C - 8} cy={C - 9} r={3.5} fill="#ffffff" opacity={0.7}/>
        </g>}
    </g>
    <path className="ojo-visual-parpado" d="M4 50 Q50 6 96 50 Q50 94 4 50 Z" fill="none" stroke={a.secundario || '#111111'} strokeWidth={3}/>
  </svg>;
}
