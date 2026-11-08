'use client';
import { useEffect, useRef } from 'react';
import type { MapaCombate } from '../lib/combate';
import { coloresMapa, regionParaCelda } from '../lib/mapas-procedurales';
/** One canvas and one shared atlas; independent of turn and animation state. */
export default function FondoMapaProcedural({ mapa }: {
    mapa: MapaCombate;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => { let vigente = true; const ctx = ref.current?.getContext('2d'); if (!ctx)
        return; const pintar = (img?: HTMLImageElement) => { if (!vigente)
        return; ctx.imageSmoothingEnabled = false; for (let y = 0; y < mapa.filas; y++)
        for (let x = 0; x < mapa.columnas; x++) {
            ctx.fillStyle = coloresMapa[mapa.celdas[`${x},${y}`] || 'suelo'];
            ctx.fillRect(x * 32, y * 32, 32, 32);
            const r = regionParaCelda(mapa, x, y);
            if (r && img)
                ctx.drawImage(img, r.x, r.y, r.w, r.h, x * 32, y * 32, 32, 32);
        } }; pintar(); const url = mapa.procedural?.atlas?.url; if (url && /^data:image\/(png|webp);base64,/.test(url) && url.length < 350000) {
        const img = new Image();
        img.onload = () => pintar(img);
        img.src = url;
    } return () => { vigente = false; }; }, [mapa]);
    return <canvas ref={ref} width={mapa.columnas * 32} height={mapa.filas * 32} aria-hidden="true" className="procedural-map-canvas"/>;
}
