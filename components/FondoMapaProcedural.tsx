'use client';
import { useEffect, useRef } from 'react';
import type { MapaCombate } from '../lib/combate';
import { coloresMapa } from '../lib/mapas-procedurales';
import { cargarImagenAtlas, dibujarMapa } from '../lib/mapas-render';
import { urlAtlasPermitida } from '../lib/tileset-yugen';
export default function FondoMapaProcedural({ mapa, techos = true }: {
    mapa: MapaCombate;
    techos?: boolean;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        let vigente = true;
        const ctx = ref.current?.getContext('2d');
        if (!ctx)
            return;
        for (let y = 0; y < mapa.filas; y++)
            for (let x = 0; x < mapa.columnas; x++) {
                ctx.fillStyle = coloresMapa[mapa.celdas[`${x},${y}`] || 'suelo'];
                ctx.fillRect(x * 64, y * 64, 64, 64);
            }
        const url = mapa.procedural?.atlas?.url;
        if (url && urlAtlasPermitida(url))
            void cargarImagenAtlas(url).then(img => { if (vigente)
                dibujarMapa(ctx, img, mapa, 64, techos); }).catch(() => { });
        return () => { vigente = false; };
    }, [mapa, techos]);
    return <canvas ref={ref} width={mapa.columnas * 64} height={mapa.filas * 64} aria-hidden="true" className="procedural-map-canvas"/>;
}
