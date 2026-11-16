"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { mensajeError } from "../../lib/errores";
import { useTiempoReal } from "../../lib/useTiempoReal";
import { Cabecera } from "../../components/layout/Cabecera";
import { Marco, Runa } from "../../components/ui/Juego";
import { Button } from "../../components/ui/Button";

type Encuentro = { id: string; nombre: string; fase: string | null; ronda: number | null };
type Resumen = { jugadores: number; personajes: number; pactos: number; peticiones: number; recompensas: number; encuentros: Encuentro[] };

/** Mesa de Kuroi (design.md v3): lo que pide atención al empezar una sesión, con cifras grandes. */
export default function MesaDeKuroi() {
  const [r, setR] = useState<Resumen | null>(null), [error, setError] = useState("");
  const cargar = useCallback(async () => {
    try {
      const contar = (t: string, f: (q: ReturnType<typeof supabase.from>) => unknown) => f(supabase.from(t)) as PromiseLike<{ count: number | null; error: { message: string } | null }>;
      const [j, p, d, c, s, e] = await Promise.all([
        contar("perfiles", (q) => q.select("id", { count: "exact", head: true }).eq("estado", "pendiente")),
        contar("personajes", (q) => q.select("id", { count: "exact", head: true }).eq("estado_aprobacion", "pendiente")),
        contar("deudas_kuroi", (q) => q.select("id", { count: "exact", head: true }).eq("estado", "pendiente_aprobacion")),
        contar("creaciones_forja", (q) => q.select("id", { count: "exact", head: true }).eq("estado", "pendiente")),
        contar("resultados_encuentro", (q) => q.select("combate_id", { count: "exact", head: true }).eq("aprobado", false)),
        supabase.from("combates_yugen").select("id,nombre,fase:datos->>fase,ronda:datos->>ronda").order("updated_at", { ascending: false }).limit(20),
      ]);
      for (const x of [j, p, d, c, s, e]) if (x.error) throw x.error;
      const activos = ((e.data || []) as unknown as { id: string; nombre: string; fase: string | null; ronda: string | null }[])
        .filter((x) => x.fase && x.fase !== "finalizado").map((x) => ({ ...x, ronda: x.ronda ? Number(x.ronda) : null }));
      setR({ jugadores: j.count || 0, personajes: p.count || 0, pactos: d.count || 0, peticiones: c.count || 0, recompensas: s.count || 0, encuentros: activos });
      setError("");
    } catch (e) { setError(mensajeError(e, "No se pudo preparar la mesa.")); }
  }, []);
  useTiempoReal(cargar);
  useEffect(() => { const t = setTimeout(() => void cargar(), 0); return () => clearTimeout(t); }, [cargar]);

  const tareas = r ? [
    { seccion: "personajes", cifra: r.personajes + r.jugadores, titulo: "Almas por recibir", detalle: `${r.personajes} personajes y ${r.jugadores} jugadores esperan tu aprobación`, href: "/dm/personajes" },
    { seccion: "deudas", cifra: r.pactos, titulo: "Pactos por sellar", detalle: "Promesas que los jugadores registraron", href: "/dm/deudas" },
    { seccion: "forja", cifra: r.peticiones, titulo: "Peticiones a la Forja", detalle: "Creaciones que piden tu juicio", href: "/dm/forja" },
    { seccion: "recompensas", cifra: r.recompensas, titulo: "Botín sin repartir", detalle: "Encuentros terminados con recompensas por aprobar", href: "/dm/combate" },
  ] : [];
  const principal = r?.encuentros[0];

  return (
    <main className="y3-mesa">
      <Cabecera kanji="主" migas="Kuroi · Mesa" titulo="La mesa de Kuroi" subtitulo="Lo que espera tu mano antes de que empiece la sesión." />
      {error && <p role="alert" className="y-error" style={{ marginBottom: 24 }}>{error} <Button variant="secondary" onClick={() => void cargar()}>Reintentar</Button></p>}
      {!r ? (!error && <p role="status" className="y-vacio">Kuroi despliega el tablero…</p>) : (
        <>
          <Marco brillo className="y3-mesa-encuentro">
            <Runa seccion="combate" size={56} />
            <div>
              <p className="y3-carta-linaje">Encuentro en curso</p>
              {principal ? <>
                <h2 className="y3-display">{principal.nombre}</h2>
                <p className="y-nota" style={{ margin: 0 }}>{principal.fase === "preparacion" ? "En preparación" : `Ronda ${principal.ronda ?? 1}`}{r.encuentros.length > 1 ? ` · ${r.encuentros.length - 1} más abiertos` : ""}</p>
              </> : <h2 className="y3-display">Ningún combate abierto</h2>}
            </div>
            <Link href="/dm/combate" className="y3-boton-principal">{principal ? "Volver al campo" : "Preparar combate"}</Link>
          </Marco>
          <h2 className="y3-display y3-seccion-titulo">Asuntos pendientes</h2>
          <div className="y3-mesa-tareas">
            {tareas.map((t) => (
              <Link key={t.titulo} href={t.href} className={`y3-mesa-tarea ${t.cifra > 0 ? "y3-halo" : "is-calma"}`}>
                <Runa seccion={t.seccion} size={34} />
                <strong className="y3-mesa-cifra">{t.cifra}</strong>
                <span className="y3-mesa-titulo">{t.titulo}</span>
                <small>{t.cifra > 0 ? t.detalle : "Nada pendiente"}</small>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
