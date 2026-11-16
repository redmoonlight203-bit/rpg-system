"use client";
import {mensajeError} from '../../../lib/errores';
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
import { linaje, imagenDeRaza } from "../../../lib/estadisticas";
import FichaVital from "../../../components/FichaVital";
import RetratoRaza from "../../../components/RetratoRaza";
import CelebracionNivel from "../../../components/CelebracionNivel";
import { Marco, BarraVital, Medallon } from "../../../components/ui/Juego";
import { experienciaParaNivel, NIVEL_MAXIMO } from "../../../lib/progresion";
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
      setError(mensajeError(e,"No se pudo cargar la ficha."));
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
  const nivel = p?.nivel || 1,
    expTotal = p?.exp_total || 0,
    expBase = experienciaParaNivel(nivel),
    expSiguiente = experienciaParaNivel(Math.min(NIVEL_MAXIMO, nivel + 1)),
    nivelMaximo = nivel >= NIVEL_MAXIMO;
  return (
    <main className="pj-page y3-heroe">
      <Link className="pj-button" href={p?.es_companero?"/ficha/party":"/ficha/personajes"}>
        <ArrowLeft size={14} aria-hidden="true" />
        {p?.es_companero?"Mi party":"Mis personajes"}
      </Link>
      {error ? (
        <p className="pj-notice pj-error" role="alert">
          {error}
          <button onClick={() => void cargar()}>Reintentar</button>
        </p>
      ) : !p ? (
        <p className="pj-empty" role="status">Kuroi busca tu historia entre las almas…</p>
      ) : (
        <>
          <CelebracionNivel personajeId={p.id} nivel={nivel} nombre={p.nombre} />
          {/* Carta de héroe: retrato, nombre, linaje y progreso */}
          <Marco brillo className="y3-carta">
            <div className="y3-carta-retrato" aria-hidden="true">
              <RetratoRaza src={imagenDeRaza(categorias, raza?.clave)} nombre={raza?.nombre} className="y3-carta-silueta" />
              <span className="y3-carta-emblema"><IconoYugen id={raza?.icono} size={40} /></span>
            </div>
            <div className="y3-carta-cuerpo">
              <p className="y3-carta-linaje">{raza?.nombre || p.raza}{p.lugar_reencarnacion ? ` · ${p.lugar_reencarnacion}` : ""}</p>
              <h1 className="y3-display y3-carta-nombre">{p.nombre}</h1>
              <div className="y3-carta-nivel">
                <span className="y3-nivel-gema" role="img" aria-label={`Nivel ${nivel}`}><strong>{nivel}</strong></span>
                <div className="y3-carta-exp">
                  <BarraVital tipo="exp" etiqueta={nivelMaximo ? "Nivel máximo alcanzado" : `Experiencia hacia el nivel ${nivel + 1}`}
                    valor={nivelMaximo ? 1 : expTotal - expBase} max={nivelMaximo ? 1 : expSiguiente - expBase} />
                  <small>{expTotal.toLocaleString("es")} XP acumulada</small>
                </div>
              </div>
              <FichaVital personaje={p} />
              <p className="y-nota">Las heridas, los PH gastados y la fatiga se conservan entre encuentros. Kuroi puede curarte o darte descanso.</p>
            </div>
          </Marco>

          <section className="pj-section" aria-labelledby="atributos-titulo">
            <h2 id="atributos-titulo" className="y3-display y3-seccion-titulo">Atributos</h2>
            <div className="y3-medallones">
              {Object.entries(p.atributos || {}).map(([k, v]) => (
                <Medallon key={k} etiqueta={defs.find((s) => s.clave === k)?.etiqueta || k.replaceAll("_", " ")} valor={String(v)} />
              ))}
            </div>
            <p className="y-nota">Valores de la ficha. El equipo y los efectos temporales se suman al preparar el combate.</p>
          </section>

          <div className="y3-dos">
            <Marco titulo="Historia">
              <p className="y3-historia">{p.historia || "Tu historia todavía se escribe."}</p>
              {p.defecto && <p className="y-nota">Rasgo especial: {p.defecto}</p>}
            </Marco>
            {!!pasivas.length && (
              <Marco titulo="Herencia racial">
                {pasivas.map((c) => (
                  <article key={c.id} className="y3-herencia">
                    <small>{c.nombre}</small>
                    <h3>{c.pasiva_racial?.nombre}</h3>
                    <p>{c.pasiva_racial?.descripcion}</p>
                  </article>
                ))}
              </Marco>
            )}
          </div>

          <section aria-labelledby="caminos-titulo">
            <h2 id="caminos-titulo" className="y3-display y3-seccion-titulo">Tus caminos</h2>
            <div className="y3-lugares">
              {opciones.map((o) => (
                <Link href={o.href} className="y3-lugar" key={o.href}>
                  <span className="y3-lugar-icono" aria-hidden="true"><o.icon size={30} /></span>
                  <span className="y3-lugar-texto"><strong>{o.nombre}</strong><small>{o.texto}</small></span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
