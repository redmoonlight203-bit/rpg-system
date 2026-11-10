/** Optimización raster local; la publicación final se hace en imagenes-storage.ts. */
export const MAX_PORTADA_BYTES = 450_000;
export function validarPortada(value: string): string | null {
  if (!value) return null;
  if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value))
    return value.length <= MAX_PORTADA_BYTES ? null : "La imagen procesada es demasiado grande. Prueba con otra imagen.";
  if (value.length > 4096) return "La URL es demasiado larga.";
  if (/^\/(?!\/)/.test(value) && !/[\s\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) return null;
  } catch { /* Invalid or unsupported URL. */ }
  return "Usa una URL http/https, una ruta pública o selecciona un archivo PNG, JPG o WebP.";
}
export async function prepararPortada(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw Error("Selecciona una imagen PNG, JPG o WebP.");
  if (!file.size || file.size > 10 * 1024 * 1024) throw Error("El archivo debe pesar entre 1 byte y 10 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40_000_000) throw Error("La imagen es demasiado grande. Usa una de menos de 40 megapíxeles.");
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw Error("No se pudo procesar la imagen en este navegador.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.5]) {
      const result = canvas.toDataURL("image/webp", quality);
      if (!validarPortada(result)) return result;
    }
    throw Error("La imagen sigue siendo demasiado grande. Prueba con una más sencilla.");
  } finally { bitmap.close(); }
}
