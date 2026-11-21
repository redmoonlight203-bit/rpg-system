import ilustraciones from "./arte-creacion.json";

const artePorId: Readonly<Record<string, string>> = ilustraciones;

export function imagenCreacion(id?: string | null, imagen?: string | null): string {
  const personalizada = imagen?.trim();
  if (personalizada) return personalizada;
  const ilustracion = id && Object.hasOwn(artePorId, id) ? artePorId[id] : undefined;
  return ilustracion ? `/arte/creaciones/${ilustracion}.webp` : "";
}
