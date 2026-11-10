import { supabase } from "./supabase";
import { prepararPortada, validarPortada } from "./imagenes-creacion";

/**
 * Subida desde la sesión autenticada del usuario. No usa service_role ni
 * publica el respaldo cifrado; Storage valida que la carpeta pertenezca a auth.uid().
 * Las ilustraciones del bucket "imagenes" son PÚBLICAS por decisión del GM.
 */
export async function publicarDataImage(dataUrl: string): Promise<string> {
  const error = validarPortada(dataUrl);
  if (error) throw new Error(error);
  const match = /^data:image\/(webp|png);base64,([A-Za-z0-9+/]+=*)$/.exec(dataUrl);
  if (!match) throw new Error("La imagen incrustada debe ser WebP o PNG.");
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  if (bytes.length === 0 || bytes.length > 500_000) throw new Error("La imagen excede el límite de Storage.");

  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error("Inicia sesión para publicar ilustraciones.");
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const sha = Array.from(new Uint8Array(hash), (v) => v.toString(16).padStart(2, "0")).join("");
  const folder = `${auth.data.user.id}/retratos`;
  const filename = `${sha}.${match[1]}`;
  const path = `${folder}/${filename}`;
  const storage = supabase.storage.from("imagenes");
  const uploaded = await storage.upload(path, bytes, {
    contentType: `image/${match[1]}`,
    cacheControl: "3600",
    upsert: false,
  });

  // Una repetición segura debe reutilizar el recurso exacto, no sobrescribirlo.
  if (uploaded.error) {
    const existing = await storage.list(folder, { search: filename });
    if (existing.error || !existing.data?.some((item) => item.name === filename)) {
      throw new Error(`No se pudo publicar la imagen: ${uploaded.error.message}`);
    }
  }
  return storage.getPublicUrl(path).data.publicUrl;
}

export async function publicarArchivoImagen(file: File): Promise<string> {
  const optimizada = await prepararPortada(file);
  return publicarDataImage(optimizada);
}
