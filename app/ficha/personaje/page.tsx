"use client";
import {useTiempoReal} from "../../../lib/useTiempoReal";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  Package,
  Sparkles,
  Swords,
  TrendingUp,
  Flame,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import {
  definiciones,
  type Personaje,
  type Raza,
  type Atributo,
} from "../../../lib/personajes";
import { linaje } from "../../../lib/estadisticas";
import FichaVital from "../../../components/FichaVital";
import IconoYugen from "../../../components/IconoYugen";
import "../../../components/personajes.css";
export default function FichaPersonaje() {
  const router = useRouter();
  const [p, setP] = useState<Personaje | null>(null),
    [categorias, setCategorias] = useState<Raza[]>([]),
    [atributos, setAtributos] = useState<Atributo[]>([]),
    [error, setError] = useState("");
  const cargar = useCallback(async () => {
    try {
      const id = localStorage.getItem("personaje_activo_id");
      if (!id) {
        router.replace("/ficha/personajes");
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const [r, c, a] = await Promise.all([
        supabase
          .from("personajes")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .eq("estado_vida", "vivo")
          .eq("estado_aprobacion", "aprobado")
          .maybeSingle(),
        supabase.from("categorias_forja").select("*"),
        supabase.from("config_estadisticas").select("*"),
      ]);
      for (const x of [r, c, a]) if (x.error) throw Error(x.error.message);
      if (!r.data) {
        localStorage.removeItem("personaje_activo_id");
        router.replace("/ficha/personajes");
        return;
      }
      setP(r.data);
      setCategorias(c.data || []);
      setAtributos(a.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la ficha.");
    }
  }, [router]);
  useTiempoReal(cargar);
 useEffect(() => {
    void cargar();

  }, [cargar]);
  const raza = categorias.find(
      (c) => c.id === p?.categoria_id || c.clave === p?.raza,
    ),
    defs = definiciones(categorias, atributos, raza?.id || ""),
    pasivas = raza
      ? linaje(categorias, raza.clave)
          .map((c) => categorias.find((x) => x.id === c.id)!)
          .filter((c) => c.pasiva_racial)
      : [];
  const opciones = [
    {
      nombre: "Habilidades y pasivas",
      texto: "Explora las técnicas que llevas contigo.",
      href: "/ficha/habilidades",
      icon: Sparkles,
    },
    {
      nombre: "Equipamiento",
      texto: "Prepara tus armas, armadura y accesorios.",
      href: "/ficha/equipamiento",
      icon: Shield,
    },
    {
      nombre: "Inventario",
      texto: "Consulta tus pertenencias y consumibles.",
      href: "/ficha/inventario",
      icon: Package,
    },
    {
      nombre: "Árbol de habilidades",
      texto: "Invierte tus puntos en habilidades y estadísticas.",
      href: "/ficha/experiencia",
      icon: TrendingUp,
    },
    {
      nombre: "Combates",
      texto: "Entra al encuentro cuando te toque actuar.",
      href: "/ficha/combate",
      icon: Swords,
    },
    {
      nombre: "Vínculo del alma",
      texto: "Las pertenencias que acompañan a tu cuenta.",
      href: "/ficha/alma",
      icon: Flame,
    },
  ];
  return (
    <main className="pj-page">
      <Link className="pj-button" href="/ficha/personajes">
        <ArrowLeft size={14} />
        Mis personajes
      </Link>
      {error ? (
        <p className="pj-notice pj-error" role="alert">
          {error}
          <button onClick={() => void cargar()}>Reintentar</button>
        </p>
      ) : !p ? (
        <p className="pj-empty">Cargando tu historia…</p>
      ) : (
        <>
          <header className="pj-head pj-section">
            <div>
              <span className="pj-eyebrow">
                {raza?.nombre || p.raza} / NIVEL {p.nivel || 1}
              </span>
              <h1>{p.nombre}</h1>
              <p>{p.lugar_reencarnacion}</p>
            </div>
            <IconoYugen id={raza?.icono} size={65} />
          </header>
          <div className="pj-layout">
            <section className="pj-panel">
              <FichaVital personaje={p} />
              <p>
                Las heridas, los PH gastados y la fatiga se conservan entre
                encuentros. El GM puede curarte o darte descanso.
              </p>
            </section>
            <section className="pj-panel">
              <span className="pj-eyebrow">IDENTIDAD</span>
              <p>{p.historia || "Tu historia todavía se escribe."}</p>
              {p.defecto && <p>Rasgo especial: {p.defecto}</p>}
              <p>{(p.exp_total || 0).toLocaleString("es-DO")} XP acumulada</p>
            </section>
          </div>
          <section className="pj-section">
            <h2>Atributos del personaje</h2>
            <div className="pj-stats">
              {Object.entries(p.atributos || {}).map(([k, v]) => (
                <div className="pj-stat" key={k}>
                  <small>
                    {defs.find((s) => s.clave === k)?.etiqueta ||
                      k.replaceAll("_", " ")}
                  </small>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
            <p>
              Valores de la ficha. El equipo y los efectos temporales se
              calculan al preparar el combate.
            </p>
          </section>
          {!!pasivas.length && (
            <section className="pj-section">
              <h2>Herencia racial</h2>
              <div className="pj-grid">
                {pasivas.map((c) => (
                  <article key={c.id} className="pj-card">
                    <span className="pj-eyebrow">{c.nombre}</span>
                    <h3>{c.pasiva_racial?.nombre}</h3>
                    <p>{c.pasiva_racial?.descripcion}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
          <div className="pj-grid">
            {opciones.map((o) => (
              <Link href={o.href} className="pj-card" key={o.href}>
                <o.icon size={28} />
                <h2>{o.nombre}</h2>
                <p>{o.texto}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
