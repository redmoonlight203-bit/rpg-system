"use client";

import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import "./foto-encuadrada.css";

type Props = {
  src?: string;
  alt?: string;
  circular?: boolean;
  /** En una ficha circular, «cara» acerca la foto hacia el tercio superior (retratos); «centro» la centra sin zoom (iconos). */
  enfoque?: "cara" | "centro";
  fallback: ReactNode;
};

function Foto({ src, alt = "", circular, enfoque = "centro", fallback }: Props & { src: string }) {
  const [medidas, setMedidas] = useState<{ ancho: number; alto: number }>();
  const [fallida, setFallida] = useState(false);
  const revisarImagen = useCallback((imagen: HTMLImageElement | null) => {
    if (!imagen?.complete) return;
    if (imagen.naturalWidth && imagen.naturalHeight) {
      setMedidas({ ancho: imagen.naturalWidth, alto: imagen.naturalHeight });
    } else {
      setFallida(true);
    }
  }, []);

  if (fallida) return fallback;
  let encuadre: CSSProperties | undefined;
  if (circular && medidas) {
    // El círculo se rellena entero (sin franjas). En el retrato vertical de un personaje la cara suele estar en el tercio
    // superior: se ancla arriba y se acerca un poco más cuanto más alargada es la imagen (como mucho ×1,5).
    // Los iconos (habilidades, pasivas, objetos) se centran sin zoom.
    const proporcion = medidas.alto / medidas.ancho;
    const retrato = enfoque === "cara" && proporcion >= 1.15;
    encuadre = {
      "--foto-y": retrato ? "16%" : "50%",
      "--foto-zoom": retrato ? String(Math.min(1.5, 1 + (proporcion - 1) * 0.8).toFixed(2)) : "1",
    } as CSSProperties;
  }
  return <span className={`foto-encuadrada${circular ? " foto-encuadrada-circular" : ""}`} style={encuadre}>
    {/* Ambas capas usan la misma URL y aprovechan la caché del navegador. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {medidas && !circular && <img className="foto-encuadrada-fondo" src={src} alt="" aria-hidden="true" decoding="async" referrerPolicy="no-referrer" />}
    <span className="foto-encuadrada-ventana">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="foto-encuadrada-frente" src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer"
        ref={revisarImagen} onLoad={({ currentTarget }) => revisarImagen(currentTarget)}
        onError={() => setFallida(true)} />
    </span>
  </span>;
}

export default function FotoEncuadrada({ src, ...props }: Props) {
  return src ? <Foto key={src} src={src} {...props} /> : props.fallback;
}
