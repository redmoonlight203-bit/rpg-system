"use client";

import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import "./foto-encuadrada.css";

type Props = {
  src?: string;
  alt?: string;
  circular?: boolean;
  fallback: ReactNode;
};

function Foto({ src, alt = "", circular, fallback }: Props & { src: string }) {
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
  let dimensiones: CSSProperties | undefined;
  if (circular && medidas) {
    // La diagonal de la foto deja un pequeño margen dentro del círculo.
    const escala = 96 / Math.hypot(medidas.ancho, medidas.alto);
    dimensiones = {
      "--foto-ancho": `${medidas.ancho * escala}%`,
      "--foto-alto": `${medidas.alto * escala}%`,
    } as CSSProperties;
  }
  return <span className={`foto-encuadrada${circular ? " foto-encuadrada-circular" : ""}`} style={dimensiones}>
    {/* Ambas capas usan la misma URL y aprovechan la caché del navegador. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {medidas && <img className="foto-encuadrada-fondo" src={src} alt="" aria-hidden="true" decoding="async" referrerPolicy="no-referrer" />}
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
