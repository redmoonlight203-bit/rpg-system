"use client";
import { memo, useState } from "react";

/** Optional portrait: missing and broken URLs always fall back to initials. */
function RetratoCombate({ nombre, src, compacto = false }: {
  nombre: string; src?: string; compacto?: boolean;
}) {
  const [fallida, setFallida] = useState<string | null>(null);
  const iniciales = nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return <span className={`battle-portrait ${compacto ? "compact" : ""}`} aria-hidden="true">
    {src && fallida !== src ?
      // Configurable remote portraits do not require an image host allowlist.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" decoding="async" loading="lazy" referrerPolicy="no-referrer" onError={() => setFallida(src)} /> :
      <span>{iniciales || "?"}</span>}
  </span>;
}

export default memo(RetratoCombate);
