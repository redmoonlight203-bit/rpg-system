'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FolderOpen, Layers, Paintbrush, Redo2, Undo2, WandSparkles, Shield, Grid2X2 } from 'lucide-react';
import type { MapaCombate } from '../lib/combate';
import { coloresMapa, cortarAtlas, generarMapa, validarMapa, type AtlasMapa, type PerfilMapa, type ProcedenciaMapa, type RegionAtlas, type RolTile, type SuperficieMapa } from '../lib/mapas-procedurales';
import { atlasYugen, esAtlasYugen, urlAtlasPermitida } from '../lib/tileset-yugen';
import { cargarImagenAtlas, dibujarMapa } from '../lib/mapas-render';
import { editarCasillaMapa, rellenarMapa, type PincelMapa } from '../lib/mapas-edicion';
import { leerArchivoMapa } from '../lib/mapas-archivo';
import './taller-mapas.css';
const nombres: Record<RolTile, string> = { suelo: 'Suelo libre', muro: 'Bloquea paso y visión', dificil: 'Terreno difícil', cobertura: 'Cobertura', peligro: 'Peligro' };
const superficies: Record<SuperficieMapa, string> = { hierba: 'Hierba', tierra: 'Tierra', barro: 'Barro', grava: 'Grava', adoquin: 'Adoquines', camino_tierra: 'Camino de tierra', camino_piedra: 'Camino de piedra' };
const perfiles: Record<PerfilMapa, string> = { bosque: 'Bosque y senderos', pueblo: 'Pueblo abandonado', ruinas: 'Ruinas de piedra', taberna: 'Taberna', casa: 'Casa', mazmorra: 'Mazmorra' };
function inicial(m: MapaCombate): MapaCombate {
    if (m.procedural)
        return m;
    const op: ProcedenciaMapa = { schemaVersion: 1, generatorVersion: '2.0.0', semilla: 'yugen-exteriores-1', perfil: 'pueblo', densidad: .5, protegidas: [], atlas: atlasYugen(), estiloCamino: 'tierra', colorTecho: 'gris' };
    // Existing handmade terrain is preserved; only empty encounters get an initial generated draft.
    return Object.keys(m.celdas).length ? { ...m, procedural: { ...op, superficies: {}, objetos: [] } } : generarMapa(m, op);
}
export default function TallerMapas({ mapa, ocupado, onAplicar }: {
    mapa: MapaCombate;
    ocupado: boolean;
    onAplicar: (m: MapaCombate) => Promise<void>;
}) {
    const [borrador, setBorrador] = useState(() => inicial(mapa));
    const [op, setOp] = useState<ProcedenciaMapa>(() => inicial(mapa).procedural!);
    const [pasado, setPasado] = useState<MapaCombate[]>([]), [futuro, setFuturo] = useState<MapaCombate[]>([]);
    const [pincel, setPincel] = useState<PincelMapa>({ tipo: 'superficie', superficie: 'camino_tierra' });
    const [herramienta, setHerramienta] = useState<'pincel' | 'relleno'>('pincel'), [zoom, setZoom] = useState(40), [techos, setTechos] = useState(true), [rejilla, setRejilla] = useState(true);
    const [error, setError] = useState(''), [aviso, setAviso] = useState(''), [cargando, setCargando] = useState(false), [familia, setFamilia] = useState('todas'), [busqueda, setBusqueda] = useState('');
    const [huella, setHuella] = useState(1), [rotacion, setRotacion] = useState(0), [seleccion, setSeleccion] = useState<string[]>([]), [rol, setRol] = useState<RolTile>('suelo');
    const [cursor, setCursor] = useState({ x: 0, y: 0 }), [tab, setTab] = useState<'piezas' | 'importar'>('piezas');
    const canvas = useRef<HTMLCanvasElement>(null), pintando = useRef(false), inicioTrazo = useRef<MapaCombate | null>(null), ultimo = useRef('');
    const atlas = borrador.procedural?.atlas, builtin = esAtlasYugen(atlas);
    const problemas = useMemo(() => validarMapa(borrador), [borrador]);
    const piezas = useMemo(() => (atlas?.regiones || []).filter(r => (familia === 'todas' || r.familia === familia || r.rol === familia) && `${r.nombre || ''} ${r.familia || r.rol}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())), [atlas, familia, busqueda]);
    function cambiar(m: MapaCombate) { setPasado(p => [...p.slice(-29), borrador]); setFuturo([]); setBorrador(m); setAviso(''); }
    function actualizarAtlas(a: AtlasMapa) { cambiar({ ...borrador, procedural: { ...borrador.procedural!, atlas: a } }); setFamilia('todas'); }
    useEffect(() => {
        let vigente = true;
        const ctx = canvas.current?.getContext('2d');
        if (!ctx)
            return;
        function dibujar(img?: HTMLImageElement) {
            if (!vigente || !ctx)
                return;
            ctx.clearRect(0, 0, borrador.columnas * zoom, borrador.filas * zoom);
            for (let y = 0; y < borrador.filas; y++)
                for (let x = 0; x < borrador.columnas; x++) {
                    ctx.fillStyle = coloresMapa[borrador.celdas[`${x},${y}`] || 'suelo'];
                    ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
                }
            if (img)
                dibujarMapa(ctx, img, borrador, zoom, techos);
            for (let y = 0; y < borrador.filas; y++)
                for (let x = 0; x < borrador.columnas; x++) {
                    if (borrador.celdas[`${x},${y}`] === 'peligro') {
                        ctx.fillStyle = '#d92d2044';
                        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
                        ctx.fillStyle = '#ffe0bc';
                        ctx.font = `bold ${Math.max(12, zoom / 2)}px sans-serif`;
                        ctx.fillText('!', x * zoom + zoom * .4, y * zoom + zoom * .7);
                    }
                    if (rejilla) {
                        ctx.strokeStyle = '#ffffff28';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x * zoom, y * zoom, zoom, zoom);
                    }
                    if (borrador.procedural?.protegidas.includes(`${x},${y}`)) {
                        ctx.strokeStyle = '#f3ca70';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(x * zoom + 2, y * zoom + 2, zoom - 4, zoom - 4);
                    }
                }
        }
        dibujar();
        if (atlas && urlAtlasPermitida(atlas.url)) {
            setCargando(true);
            void cargarImagenAtlas(atlas.url).then(img => { dibujar(img); if (vigente)
                setCargando(false); }).catch(e => { if (vigente) {
                setError(e.message);
                setCargando(false);
            } });
        }
        else
            setCargando(false);
        return () => { vigente = false; };
    }, [borrador, zoom, techos, rejilla, atlas]);
    function aplicarPincel(x: number, y: number) { setBorrador(m => herramienta === 'relleno' ? rellenarMapa(m, x, y, pincel) : editarCasillaMapa(m, x, y, pincel)); }
    function pintar(e: React.PointerEvent<HTMLCanvasElement>) { const r = e.currentTarget.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) * borrador.columnas / r.width), y = Math.floor((e.clientY - r.top) * borrador.filas / r.height), k = `${x},${y}`; if (ultimo.current === k)
        return; ultimo.current = k; setCursor({ x, y }); aplicarPincel(x, y); }
    function finTrazo() { if (inicioTrazo.current) {
        const antes = inicioTrazo.current;
        setPasado(p => [...p.slice(-29), antes]);
        setFuturo([]);
    } inicioTrazo.current = null; pintando.current = false; ultimo.current = ''; setAviso(''); }
    function seleccionarPieza(region: RegionAtlas) { setPincel({ tipo: 'pieza', region, ancho: huella, alto: huella, rotacion }); setHerramienta('pincel'); }
    function generar(nuevaSemilla = false) { setError(''); try {
        const semilla = nuevaSemilla ? crypto.randomUUID().slice(0, 12) : op.semilla;
        const m = generarMapa(borrador, { ...op, semilla, atlas, protegidas: borrador.procedural?.protegidas || [] });
        cambiar(m);
        setOp({ ...m.procedural! });
    }
    catch (e) {
        setError((e as Error).message);
    } }
    function usarYugen() { const a = atlasYugen(), config: ProcedenciaMapa = { ...op, atlas: a, generatorVersion: '2.0.0', perfil: ['bosque', 'pueblo', 'ruinas'].includes(op.perfil) ? op.perfil : 'pueblo', protegidas: [] }; setOp(config); cambiar(generarMapa(borrador, config)); setSeleccion([]); setFamilia('todas'); setPincel({ tipo: 'superficie', superficie: 'camino_tierra' }); }
    async function importarAtlas(file?: File) {
        if (!file)
            return;
        setError('');
        try {
            if (!['image/png', 'image/webp'].includes(file.type) || file.size > 250000)
                throw Error('Para atlas personalizados usa PNG/WebP de hasta 250 KB. El paquete YUGEN ya viene instalado y no tiene ese límite.');
            const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
            if (!(bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) && !(String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'))
                throw Error('El contenido no corresponde a PNG/WebP.');
            const url = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file); });
            const img = await cargarImagenAtlas(url);
            const nuevo: AtlasMapa = { url, ancho: img.width, alto: img.height, celda: 32, margen: 0, separacion: 0, autor: '', licencia: '', regiones: cortarAtlas(img.width, img.height, 32) };
            const config: ProcedenciaMapa = { schemaVersion: 1, generatorVersion: '1.0.0', semilla: op.semilla, perfil: 'bosque', densidad: op.densidad, protegidas: [], atlas: nuevo };
            setOp(config);
            cambiar({ ...borrador, procedural: config });
            setSeleccion([]);
        }
        catch (e) {
            setError((e as Error).message);
        }
    }
    function descargar() { const url = URL.createObjectURL(new Blob([JSON.stringify(borrador)], { type: 'application/json' })), a = document.createElement('a'); a.href = url; a.download = `${borrador.nombre.replace(/[^a-z0-9áéíóúñ_-]/gi, '-') || 'mapa'}.yugen.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    async function abrir(file?: File) { if (!file)
        return; try {
        const m = leerArchivoMapa(await file.text());
        cambiar(m.procedural ? m : inicial(m));
        setOp(m.procedural || inicial(m).procedural!);
        setSeleccion([]);
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    } }
    function nombrePincel() { return pincel.tipo === 'pieza' ? pincel.region.nombre || pincel.region.id : pincel.tipo === 'superficie' ? superficies[pincel.superficie] : pincel.tipo === 'terreno' ? nombres[pincel.terreno] : pincel.tipo === 'proteger' ? 'Proteger / liberar' : 'Borrar ' + pincel.capa; }
    return <section className="map-workshop" aria-label="Taller de mapas"><header className="map-title"><div><small>EL ATLAS DE YUGEN</small><h3>Forja de escenarios</h3><p>Genera un lugar. Dale historia. Llévalo al combate.</p></div><span className="map-pack-badge">{builtin ? 'Exteriores oscuros · 89 piezas' : 'Tileset personalizado'}</span></header>
 <fieldset disabled={ocupado} className="map-fieldset">
 <div className="map-generator"><label>Nombre del escenario<input maxLength={120} value={borrador.nombre} onChange={e => setBorrador({ ...borrador, nombre: e.target.value })}/></label><label>Escenario<select value={op.perfil} onChange={e => setOp({ ...op, perfil: e.target.value as PerfilMapa })}>{(builtin ? ['bosque', 'pueblo', 'ruinas'] : ['taberna', 'casa', 'bosque', 'pueblo', 'mazmorra']).map(p => <option key={p} value={p}>{perfiles[p as PerfilMapa]}</option>)}</select></label><label>Semilla<input maxLength={120} value={op.semilla} onChange={e => setOp({ ...op, semilla: e.target.value })}/></label>
 {(['columnas', 'filas'] as const).map(k => <label key={k}>{k === 'columnas' ? 'Ancho' : 'Alto'}<select value={borrador[k]} onChange={e => cambiar({ ...borrador, [k]: Number(e.target.value), celdas: {}, procedural: { ...op, atlas, protegidas: [], superficies: {}, objetos: [] } })}>{[8, 12, 16, 20, 24].map(n => <option key={n} value={n}>{n} casillas</option>)}</select></label>)}
 <label>Densidad · {Math.round(op.densidad * 100)}%<input type="range" min="0" max="1" step=".05" value={op.densidad} onChange={e => setOp({ ...op, densidad: Number(e.target.value) })}/></label>
 {builtin && <><label>Caminos<select value={op.estiloCamino || 'tierra'} onChange={e => setOp({ ...op, estiloCamino: e.target.value as 'tierra' | 'piedra' })}><option value="tierra">Tierra</option><option value="piedra">Piedra</option></select></label><label>Tejados<select value={op.colorTecho || 'gris'} onChange={e => setOp({ ...op, colorTecho: e.target.value as 'gris' | 'rojo' })}><option value="gris">Pizarra gris</option><option value="rojo">Tejas rojas</option></select></label></>}
 <div className="map-generate-actions"><button type="button" className="map-primary" onClick={() => generar()}><WandSparkles size={17}/>Generar con esta semilla</button><button type="button" onClick={() => generar(true)}>Otra variante</button></div></div>
 <div className="map-studio"><aside className="map-sidebar"><div className="map-tabs"><button type="button" aria-pressed={tab === 'piezas'} onClick={() => setTab('piezas')}>Piezas</button><button type="button" aria-pressed={tab === 'importar'} onClick={() => setTab('importar')}>Paquetes</button></div>
 {tab === 'piezas' ? <><label>Buscar pieza<input value={busqueda} placeholder="Roca, muro, techo…" onChange={e => setBusqueda(e.target.value)}/></label><label>Categoría<select value={familia} onChange={e => setFamilia(e.target.value)}><option value="todas">Todas las piezas</option>{Array.from(new Set(atlas?.regiones.map(r => r.familia || r.rol))).map(f => <option key={f} value={f}>{f.replaceAll('_', ' ')}</option>)}</select></label>
 <div className="map-stamp-settings"><label>Huella<select value={huella} onChange={e => { const n = Number(e.target.value); setHuella(n); if (pincel.tipo === 'pieza')
            setPincel({ ...pincel, ancho: n, alto: n }); }}>{[1, 2, 3].map(n => <option key={n} value={n}>{n}×{n}</option>)}</select></label><label>Rotación<select value={rotacion} onChange={e => { const n = Number(e.target.value); setRotacion(n); if (pincel.tipo === 'pieza')
            setPincel({ ...pincel, rotacion: n }); }}>{[0, 90, 180, 270].map(n => <option key={n} value={n}>{n}°</option>)}</select></label></div>
 <div className="map-palette" role="list" aria-label="Piezas del tileset">{piezas.map(r => <button type="button" role="listitem" draggable key={r.id} title={`${r.nombre || r.id} · ${nombres[r.rol]}`} aria-label={r.nombre || r.id} aria-pressed={pincel.tipo === 'pieza' && pincel.region.id === r.id} onClick={() => seleccionarPieza(r)} onDragStart={e => { seleccionarPieza(r); e.dataTransfer.setData('application/x-yugen-tile', r.id); }}><span style={{ backgroundImage: `url("${atlas!.url}")`, backgroundSize: `${atlas!.ancho * 64 / r.w}px ${atlas!.alto * 64 / r.h}px`, backgroundPosition: `-${r.x * 64 / r.w}px -${r.y * 64 / r.h}px` }}/><small>{r.nombre || r.id}</small></button>)}</div>{!piezas.length && <p>No hay piezas para este filtro.</p>}</> : <><div className="map-builtin-card"><img src="/tilesets/yugen-exteriores-oscuro-v1.jpg" alt="Exteriores oscuros: hierba, caminos, ruinas y techos"/><strong>Exteriores oscuros</strong><p>Tu primer tileset, ya recortado y clasificado. Caminos conectados y edificios con interior.</p><button type="button" onClick={usarYugen}>Usar paquete YUGEN</button></div><details><summary>Importar otro atlas</summary><p>PNG/WebP hasta 250 KB. El atlas incorporado se carga como archivo compartido.</p><input aria-label="Subir atlas personalizado" type="file" accept="image/png,image/webp" onChange={e => void importarAtlas(e.target.files?.[0])}/>{atlas && !builtin && <>
 {(['celda', 'margen', 'separacion'] as const).map(k => <label key={k}>{k}<input type="number" min={k === 'celda' ? 8 : 0} max="512" value={atlas[k]} onChange={e => setBorrador({ ...borrador, procedural: { ...borrador.procedural!, atlas: { ...atlas, [k]: Number(e.target.value) } } })}/></label>)}<button type="button" onClick={() => { try {
                actualizarAtlas({ ...atlas, regiones: cortarAtlas(atlas.ancho, atlas.alto, atlas.celda, atlas.margen, atlas.separacion) });
                setSeleccion([]);
            }
            catch (e) {
                setError((e as Error).message);
            } }}>Actualizar cortes</button>
 {(['autor', 'licencia'] as const).map(k => <label key={k}>{k}<input value={atlas[k]} onChange={e => setBorrador({ ...borrador, procedural: { ...borrador.procedural!, atlas: { ...atlas, [k]: e.target.value } } })}/></label>)}
 <select aria-label="Clasificar como" value={rol} onChange={e => setRol(e.target.value as RolTile)}>{Object.entries(nombres).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select><button type="button" disabled={!seleccion.length} onClick={() => actualizarAtlas({ ...atlas, regiones: atlas.regiones.map(r => seleccion.includes(r.id) ? { ...r, rol } : r) })}>Asignar a {seleccion.length} piezas</button><div className="map-import-selection">{atlas.regiones.map(r => <button type="button" key={r.id} aria-pressed={seleccion.includes(r.id)} onClick={() => setSeleccion(s => s.includes(r.id) ? s.filter(v => v !== r.id) : [...s, r.id])}>{r.id}</button>)}</div>
 </>}</details></>}
 </aside><div className="map-stage"><div className="map-toolbar"><button type="button" title="Deshacer" aria-label="Deshacer" disabled={!pasado.length} onClick={() => { setFuturo(f => [borrador, ...f]); setBorrador(pasado[pasado.length - 1]); setPasado(p => p.slice(0, -1)); }}><Undo2 size={17}/></button><button type="button" title="Rehacer" aria-label="Rehacer" disabled={!futuro.length} onClick={() => { setPasado(p => [...p, borrador]); setBorrador(futuro[0]); setFuturo(f => f.slice(1)); }}><Redo2 size={17}/></button><select aria-label="Herramienta de pintura" value={herramienta} onChange={e => setHerramienta(e.target.value as 'pincel' | 'relleno')}><option value="pincel">Pincel / sello</option><option value="relleno">Relleno conectado</option></select><button type="button" aria-pressed={pincel.tipo === 'proteger'} onClick={() => setPincel({ tipo: 'proteger' })}><Shield size={16}/>Proteger</button><button type="button" onClick={() => setPincel({ tipo: 'borrar', capa: 'objetos' })}>Borrar objeto</button><button type="button" onClick={() => setPincel({ tipo: 'borrar', capa: 'techos' })}>Borrar techo</button><button type="button" aria-pressed={techos} onClick={() => setTechos(v => !v)}><Layers size={16}/>{techos ? 'Ver interior' : 'Ver techos'}</button><button type="button" aria-pressed={rejilla} aria-label="Mostrar cuadrícula" onClick={() => setRejilla(v => !v)}><Grid2X2 size={16}/></button><label>Zoom<input type="range" min="24" max="72" value={zoom} onChange={e => setZoom(Number(e.target.value))}/></label></div>
 <div className="map-brushes">{builtin && Object.entries(superficies).map(([k, n]) => <button type="button" key={k} aria-pressed={pincel.tipo === 'superficie' && pincel.superficie === k} onClick={() => setPincel({ tipo: 'superficie', superficie: k as SuperficieMapa })}>{n}</button>)}<details><summary>Comportamiento táctico</summary><div>{Object.entries(nombres).map(([k, n]) => <button type="button" key={k} aria-pressed={pincel.tipo === 'terreno' && pincel.terreno === k} onClick={() => setPincel({ tipo: 'terreno', terreno: k as RolTile })}>{n}</button>)}</div></details></div>
 <div className="map-canvas-scroll"><canvas ref={canvas} width={borrador.columnas * zoom} height={borrador.filas * zoom} tabIndex={0} aria-label={`Mapa editable. ${nombrePincel()}. Flechas para mover el cursor; espacio para pintar.`} onKeyDown={e => { if (ocupado)
        return; const pasos: Record<string, [
        number,
        number
    ]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }; if (pasos[e.key]) {
        e.preventDefault();
        const [dx, dy] = pasos[e.key];
        setCursor(p => ({ x: Math.max(0, Math.min(borrador.columnas - 1, p.x + dx)), y: Math.max(0, Math.min(borrador.filas - 1, p.y + dy)) }));
    }
    else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const antes = borrador;
        cambiar(editarCasillaMapa(antes, cursor.x, cursor.y, pincel));
    } }} onPointerDown={e => { if (ocupado)
        return; e.currentTarget.setPointerCapture(e.pointerId); inicioTrazo.current = borrador; pintando.current = true; pintar(e); }} onPointerMove={e => { if (pintando.current && !ocupado)
        pintar(e); }} onPointerUp={finTrazo} onPointerCancel={finTrazo} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (ocupado)
        return; const id = e.dataTransfer.getData('application/x-yugen-tile'), region = atlas?.regiones.find(r => r.id === id); if (!region)
        return; const r = e.currentTarget.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * borrador.columnas), y = Math.floor((e.clientY - r.top) / r.height * borrador.filas); cambiar(editarCasillaMapa(borrador, x, y, { tipo: 'pieza', region, ancho: huella, alto: huella, rotacion })); }}/></div>
 <div className="map-canvas-caption"><span><Paintbrush size={14}/> {nombrePincel()} · casilla {cursor.x + 1}, {cursor.y + 1}</span><span>{borrador.columnas}×{borrador.filas} · {borrador.procedural?.objetos?.length || 0} piezas</span></div>
 </div></div>
 <footer className="map-footer"><div role="status">{problemas.length ? problemas.map(p => <p className="map-warning" key={p}>{p}</p>) : <p className="map-success">✓ Todas las zonas transitables están conectadas.</p>}<small>Las casillas doradas conservan piezas completas al regenerar. El borrador se guarda al aplicar.</small>{aviso && <p className="map-success">{aviso}</p>}</div><div className="map-file-actions"><button type="button" onClick={descargar}><Download size={16}/>Descargar mapa</button><label className="map-file-button"><FolderOpen size={16}/>Abrir mapa<input aria-label="Abrir mapa YUGEN" type="file" accept=".json,application/json" onChange={e => void abrir(e.target.files?.[0])}/></label><button type="button" onClick={() => { const m = inicial(mapa); cambiar(m); setOp(m.procedural!); }}>Recuperar guardado</button><button type="button" className="map-primary" disabled={!!problemas.length || cargando || ocupado} onClick={async () => { try {
        setError('');
        if (!borrador.nombre.trim())
            throw Error('Ponle un nombre al mapa.');
        if (atlas && (!atlas.autor.trim() || !atlas.licencia.trim()))
            throw Error('Indica autor y licencia del atlas.');
        const m = { ...borrador, id: borrador.id || crypto.randomUUID() };
        leerArchivoMapa(JSON.stringify(m));
        await onAplicar(m);
        setAviso('Mapa aplicado y guardado en el encuentro.');
    }
    catch (e) {
        setError((e as Error).message);
    } }}>Aplicar al encuentro</button></div></footer>{error && <p role="alert" className="map-error">{error}</p>}
 </fieldset></section>;
}
