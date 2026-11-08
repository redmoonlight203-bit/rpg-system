'use client';
import { useEffect, useRef, useState } from 'react';
import type { MapaCombate, Terreno } from '../lib/combate';
import { coloresMapa, cortarAtlas, generarMapa, regionParaCelda, validarMapa, type AtlasMapa, type PerfilMapa, type ProcedenciaMapa, type RolTile } from '../lib/mapas-procedurales';
const roles: Record<RolTile, string> = { suelo: 'Suelo', muro: 'Muro', dificil: 'Terreno difícil', cobertura: 'Cobertura', peligro: 'Peligro' };
const boton = 'rounded-lg border border-neutral-600 px-3 py-2 disabled:opacity-40';
export default function TallerMapas({ mapa, ocupado, onAplicar }: {
    mapa: MapaCombate;
    ocupado: boolean;
    onAplicar: (m: MapaCombate) => Promise<void>;
}) {
    const [borrador, setBorrador] = useState(mapa), [pasado, setPasado] = useState<MapaCombate[]>([]), [futuro, setFuturo] = useState<MapaCombate[]>([]);
    const [op, setOp] = useState<ProcedenciaMapa>(mapa.procedural || { schemaVersion: 1, generatorVersion: '1.0.0', semilla: 'yugen-1', perfil: 'taberna', densidad: .45, protegidas: [] });
    const [pincel, setPincel] = useState<RolTile | 'proteger'>('muro'), [herramienta, setHerramienta] = useState<'pincel' | 'relleno'>('pincel'), [zoom, setZoom] = useState(24), [error, setError] = useState(''), [atlas, setAtlas] = useState<AtlasMapa | undefined>(mapa.procedural?.atlas), [seleccion, setSeleccion] = useState<string[]>([]), [rol, setRol] = useState<RolTile>('suelo'), [cargando, setCargando] = useState(false);
    const canvas = useRef<HTMLCanvasElement>(null), imagen = useRef<HTMLImageElement | null>(null), pintando = useRef(false), inicioTrazo = useRef<MapaCombate | null>(null), ultimo = useRef('');
    const problemas = validarMapa(borrador);
    function cambiar(m: MapaCombate) { setPasado(p => [...p.slice(-29), borrador]); setFuturo([]); setBorrador(m); }
    useEffect(() => { const ctx = canvas.current?.getContext('2d'); if (!ctx)
        return; ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, borrador.columnas * zoom, borrador.filas * zoom); for (let y = 0; y < borrador.filas; y++)
        for (let x = 0; x < borrador.columnas; x++) {
            ctx.fillStyle = coloresMapa[borrador.celdas[`${x},${y}`] || 'suelo'];
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
            const r = regionParaCelda(borrador, x, y);
            if (r && imagen.current)
                ctx.drawImage(imagen.current, r.x, r.y, r.w, r.h, x * zoom, y * zoom, zoom, zoom);
            ctx.strokeStyle = '#ffffff18';
            ctx.strokeRect(x * zoom, y * zoom, zoom, zoom);
            if (borrador.procedural?.protegidas.includes(`${x},${y}`)) {
                ctx.strokeStyle = '#e5b454';
                ctx.strokeRect(x * zoom + 2, y * zoom + 2, zoom - 4, zoom - 4);
            }
        } }, [borrador, zoom, cargando]);
    useEffect(() => { if (!atlas) {
        imagen.current = null;
        return;
    } let vigente = true; const img = new Image(); img.onload = () => { if (vigente) {
        imagen.current = img;
        setCargando(false);
    } }; img.onerror = () => { if (vigente) {
        setError('No se pudo cargar el atlas.');
        setCargando(false);
    } }; setCargando(true); img.src = atlas.url; return () => { vigente = false; }; }, [atlas?.url]);
    function pintar(e: React.PointerEvent<HTMLCanvasElement>) {
        const rect = e.currentTarget.getBoundingClientRect(), x = Math.floor((e.clientX - rect.left) * borrador.columnas / rect.width), y = Math.floor((e.clientY - rect.top) * borrador.filas / rect.height), k = `${x},${y}`;
        if (x < 0 || y < 0 || x >= borrador.columnas || y >= borrador.filas || ultimo.current === k)
            return;
        ultimo.current = k;
        setBorrador(m => {
            const meta = m.procedural || op;
            if (pincel === 'proteger') {
                const protegidas = meta.protegidas.includes(k) ? meta.protegidas.filter(v => v !== k) : [...meta.protegidas, k];
                return { ...m, procedural: { ...meta, protegidas } };
            }
            if (meta.protegidas.includes(k))
                return m;
            const celdas = { ...m.celdas }, anterior = celdas[k], pendientes = [k], vistas = new Set<string>();
            for (let i = 0; i < pendientes.length; i++) {
                const key = pendientes[i];
                if (vistas.has(key))
                    continue;
                vistas.add(key);
                if (meta.protegidas.includes(key) || celdas[key] !== anterior)
                    continue;
                if (pincel === 'suelo')
                    delete celdas[key];
                else
                    celdas[key] = pincel as Terreno;
                if (herramienta === 'relleno') {
                    const [a, b] = key.split(',').map(Number);
                    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
                        if (a + dx >= 0 && b + dy >= 0 && a + dx < m.columnas && b + dy < m.filas)
                            pendientes.push(`${a + dx},${b + dy}`);
                }
            }
            return { ...m, celdas };
        });
    }
    function acabarTrazo() { if (inicioTrazo.current) {
        const antes = inicioTrazo.current;
        setPasado(p => [...p.slice(-29), antes]);
        setFuturo([]);
    } inicioTrazo.current = null; pintando.current = false; ultimo.current = ''; }
    async function importar(file?: File) { if (!file)
        return; setError(''); try {
        if (!['image/png', 'image/webp'].includes(file.type) || file.size > 250000)
            throw Error('Usa PNG o WebP de hasta 250 KB. Esta primera versión guarda el atlas con el mapa.');
        const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
        const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
        const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
        if (!png && !webp)
            throw Error('El contenido del archivo no es PNG/WebP.');
        const url = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file); });
        const img = new Image();
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(Error('Imagen dañada.')); img.src = url; });
        const nuevo: AtlasMapa = { url, ancho: img.width, alto: img.height, celda: 32, margen: 0, separacion: 0, autor: '', licencia: '', regiones: cortarAtlas(img.width, img.height, 32) };
        setAtlas(nuevo);
        setSeleccion([]);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo importar.');
    } }
    function actualizarAtlas(a: AtlasMapa) { setAtlas(a); cambiar({ ...borrador, procedural: { ...(borrador.procedural || op), atlas: a } }); }
    return <section className="my-5 rounded-xl border border-amber-700/60 bg-neutral-950 p-4"><h3 className="text-lg font-semibold text-amber-300">Taller de mapas</h3><p className="my-2 text-sm text-neutral-400">Genera, pinta y revisa. Los cambios se guardan en el encuentro al pulsar Aplicar. El marco dorado protege tus casillas al regenerar.</p>
 <fieldset disabled={ocupado} className="space-y-4"><label>Nombre del mapa<input className="block bg-neutral-800 p-2" maxLength={120} value={borrador.nombre} onChange={e => setBorrador({ ...borrador, nombre: e.target.value })}/></label><div className="flex flex-wrap gap-3"><label>Escenario<select className="block bg-neutral-800 p-2" value={op.perfil} onChange={e => setOp({ ...op, perfil: e.target.value as PerfilMapa })}>{['taberna', 'casa', 'bosque', 'pueblo', 'mazmorra'].map(p => <option key={p}>{p}</option>)}</select></label><label>Semilla<input className="block bg-neutral-800 p-2" maxLength={120} value={op.semilla} onChange={e => setOp({ ...op, semilla: e.target.value })}/></label><label>Densidad {Math.round(op.densidad * 100)}%<input className="block" type="range" min="0" max="1" step="0.05" value={op.densidad} onChange={e => setOp({ ...op, densidad: Number(e.target.value) })}/></label>{(['columnas', 'filas'] as const).map(k => <label key={k}>{k}<select className="block bg-neutral-800 p-2" value={borrador[k]} onChange={e => cambiar({ ...borrador, [k]: Number(e.target.value), celdas: {}, procedural: { ...op, protegidas: [], atlas } })}>{[8, 12, 16, 20, 24].map(n => <option key={n}>{n}</option>)}</select></label>)}<button className={boton} onClick={() => { setError(''); cambiar(generarMapa(borrador, { ...op, atlas, protegidas: borrador.procedural?.protegidas || [] })); }}>Generar vista previa</button><button className={boton} onClick={() => { cambiar(mapa); setOp(mapa.procedural || op); setAtlas(mapa.procedural?.atlas); }}>Recuperar mapa guardado</button></div>
 <div className="flex flex-wrap gap-2">{Object.entries(roles).map(([r, n]) => <button key={r} aria-pressed={pincel === r} className={`${boton} ${pincel === r ? 'bg-amber-900' : ''}`} onClick={() => setPincel(r as RolTile)}>{n}</button>)}<button className={boton} aria-pressed={pincel === 'proteger'} onClick={() => setPincel('proteger')}>Proteger / liberar</button><select aria-label="Herramienta" className="bg-neutral-800" value={herramienta} onChange={e => setHerramienta(e.target.value as 'pincel' | 'relleno')}><option value="pincel">Pincel</option><option value="relleno">Relleno conectado</option></select><button className={boton} disabled={!pasado.length} onClick={() => { setFuturo(f => [borrador, ...f]); setBorrador(pasado[pasado.length - 1]); setPasado(p => p.slice(0, -1)); }}>Deshacer</button><button className={boton} disabled={!futuro.length} onClick={() => { setPasado(p => [...p, borrador]); setBorrador(futuro[0]); setFuturo(f => f.slice(1)); }}>Rehacer</button><label>Zoom<input aria-label="Zoom" type="range" min="16" max="48" value={zoom} onChange={e => setZoom(Number(e.target.value))}/></label></div>
 <div className="overflow-auto max-h-[600px]"><canvas ref={canvas} width={borrador.columnas * zoom} height={borrador.filas * zoom} style={{ touchAction: 'none', imageRendering: 'pixelated' }} aria-label="Lienzo del mapa. Usa el pincel para pintar y arrastrar." onPointerDown={e => { if (ocupado)
        return; e.currentTarget.setPointerCapture(e.pointerId); inicioTrazo.current = borrador; pintando.current = true; pintar(e); }} onPointerMove={e => { if (pintando.current)
        pintar(e); }} onPointerUp={acabarTrazo} onPointerCancel={acabarTrazo}/></div>
 <details><summary className="cursor-pointer text-amber-300">Importar y clasificar tileset</summary><p className="text-sm my-2">PNG/WebP hasta 250 KB, 4096 px por lado. Selecciona recortes y asígnales una función. Cada recorte ocupa una casilla.</p><input aria-label="Subir atlas" type="file" accept="image/png,image/webp" onChange={e => void importar(e.target.files?.[0])}/>{atlas && <><div className="flex flex-wrap gap-3 my-3">{(['celda', 'margen', 'separacion'] as const).map(k => <label key={k}>{k}<input type="number" className="block bg-neutral-800 p-2 w-24" min={k === 'celda' ? 8 : 0} max="512" value={atlas[k]} onChange={e => setAtlas({ ...atlas, [k]: Number(e.target.value) })}/></label>)}<button className={boton} onClick={() => { try {
        actualizarAtlas({ ...atlas, regiones: cortarAtlas(atlas.ancho, atlas.alto, atlas.celda, atlas.margen, atlas.separacion) });
        setSeleccion([]);
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    } }}>Actualizar cortes</button><label>Autor<input className="block bg-neutral-800 p-2" value={atlas.autor} onChange={e => setAtlas({ ...atlas, autor: e.target.value })}/></label><label>Licencia / permiso de uso<input className="block bg-neutral-800 p-2" value={atlas.licencia} onChange={e => setAtlas({ ...atlas, licencia: e.target.value })}/></label></div><div className="flex gap-2 my-2"><select aria-label="Función de los recortes" className="bg-neutral-800" value={rol} onChange={e => setRol(e.target.value as RolTile)}>{Object.entries(roles).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select><button className={boton} disabled={!seleccion.length} onClick={() => actualizarAtlas({ ...atlas, regiones: atlas.regiones.map(r => seleccion.includes(r.id) ? { ...r, rol } : r) })}>Asignar a {seleccion.length} recortes</button><button className={boton} onClick={() => setSeleccion([])}>Quitar selección</button><button className={boton} onClick={() => actualizarAtlas(atlas)}>Usar atlas en vista previa</button></div><div className="flex flex-wrap gap-1 max-h-64 overflow-auto">{atlas.regiones.map(r => <button key={r.id} className={`border-2 ${seleccion.includes(r.id) ? 'border-amber-400' : 'border-neutral-700'}`} aria-label={`Recorte ${r.x}, ${r.y}: ${roles[r.rol]}`} aria-pressed={seleccion.includes(r.id)} title={roles[r.rol]} onClick={() => setSeleccion(s => s.includes(r.id) ? s.filter(v => v !== r.id) : [...s, r.id])} style={{ width: 36, height: 36, backgroundImage: `url("${atlas.url}")`, backgroundSize: `${atlas.ancho * 32 / r.w}px ${atlas.alto * 32 / r.h}px`, backgroundPosition: `-${r.x * 32 / r.w}px -${r.y * 32 / r.h}px`, backgroundRepeat: 'no-repeat', imageRendering: 'pixelated' }}/>)}</div></>}</details>
 <div role="status">{problemas.length ? problemas.map(p => <p className="text-amber-300" key={p}>{p}</p>) : <p className="text-emerald-400">✓ Todas las casillas transitables están conectadas.</p>}</div>{error && <p role="alert" className="text-red-400">{error}</p>}<button className={`${boton} bg-amber-900`} disabled={!!problemas.length || ocupado || cargando} onClick={async () => { setError(''); try {
        if (atlas && (!atlas.autor.trim() || !atlas.licencia.trim()))
            throw Error('Indica autor y licencia del atlas antes de guardarlo.');
        await onAplicar({ ...borrador, id: borrador.id || crypto.randomUUID(), procedural: { ...(borrador.procedural || op), atlas } });
    }
    catch (e) {
        setError((e as Error).message);
    } }}>Aplicar mapa al encuentro</button></fieldset></section>;
}
