"use client";
import {Enso} from "./ui/Signature";
import { memo } from "react";
import FotoEncuadrada from "./FotoEncuadrada";

/** Optional portrait: missing and broken URLs always fall back to initials. */
function RetratoCombate({ nombre, src, compacto = false, activo = false, circular = false }: {
  nombre: string; src?: string; compacto?: boolean; activo?: boolean; circular?: boolean;
}) {
  const iniciales = nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return <span className={`battle-portrait ${compacto ? "compact" : ""}`} aria-hidden="true">
    {activo&&<Enso activo/>}
    <FotoEncuadrada src={src} circular={circular} enfoque="cara" fallback={<span>{iniciales || "?"}</span>} />
  </span>;
}

export default memo(RetratoCombate);
