'use client';
import { useState } from 'react';
import TallerMapas from './TallerMapas';
import { configurarMapa, posicionesTablero, type Combate, type MapaCombate } from '../lib/combate';
export default function EditorMapaCombate({ combate: c, ocupado, onGuardar }: {
    combate: Combate;
    ocupado: boolean;
    onGuardar: (c: Combate) => Promise<void>;
}) {
    const [participante, setParticipante] = useState('');
    const mapa: MapaCombate = c.mapa || { id: '', version: 1, nombre: 'Campo de batalla', columnas: 12, filas: 8, celdas: {} };
    const posiciones = posicionesTablero(c), fichas = new Map(c.miembros.map(m => [`${posiciones[m.id].x},${posiciones[m.id].y}`, m.nombre]));
    return <details className="rounded-xl border border-neutral-700 p-4 my-4"><summary className="cursor-pointer font-semibold">Mapa de combate · taller y generador</summary>
 {c.fase !== 'preparacion' ? <p>El mapa queda fijado al iniciar. Crea un encuentro nuevo para cambiarlo.</p> : <>
 <TallerMapas key={mapa.id + ':' + mapa.nombre} mapa={mapa} ocupado={ocupado} onAplicar={async (m) => onGuardar(configurarMapa(c, m))}/>
 <p className="text-sm my-3">Posiciones iniciales sobre el mapa guardado: elige un participante y toca una casilla libre. Aplicar un mapa nuevo recoloca automáticamente las fichas si hace falta.</p>
 <select aria-label="Participante para posición inicial" className="bg-neutral-900 p-2" value={participante} disabled={ocupado} onChange={e => setParticipante(e.target.value)}><option value="">Elegir participante</option>{c.miembros.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select>
 {participante && <div className="overflow-auto mt-2"><div className="grid gap-1 min-w-max" style={{ gridTemplateColumns: `repeat(${mapa.columnas},28px)` }}>{Array.from({ length: mapa.columnas * mapa.filas }, (_, i) => { const x = i % mapa.columnas, y = Math.floor(i / mapa.columnas), k = `${x},${y}`, ficha = fichas.get(k); return <button type="button" key={k} title={ficha || mapa.celdas[k] || 'Suelo libre'} aria-label={`Posición ${x + 1},${y + 1}${ficha ? ': ' + ficha : ''}`} className={`h-7 border ${ficha ? 'border-amber-400' : mapa.celdas[k] === 'muro' ? 'bg-neutral-600' : 'border-neutral-700'}`} disabled={ocupado || fichas.has(k) || mapa.celdas[k] === 'muro'} onClick={() => void onGuardar({ ...c, miembros: c.miembros.map(m => m.id === participante ? { ...m, posicion: { x, y } } : m) })}>{ficha ? '◆' : '·'}</button>; })}</div></div>}
 </>}
 </details>;
}
