import type { Personaje } from "../lib/personajes";
import { vidaMaxima } from "../lib/personajes";
import { BarraVital } from "./ui/Juego";

/** Vitales persistentes del personaje (design.md v3: barras que se llenan con destello al cambiar). */
export default function FichaVital({ personaje: p }: { personaje: Personaje }) {
  const max = p.vida_maxima_actual ?? vidaMaxima(p),
    vida = p.vida_actual ?? max;
  return (
    <div className="y3-vitales">
      <BarraVital grande tipo="vida" etiqueta="Vida" valor={vida} max={max} />
      <div className="y3-vitales-menores">
        <BarraVital tipo="ph" etiqueta="PH" valor={p.ph_actual ?? p.atributos.ph ?? 0} max={p.atributos.ph ?? 0} />
        <BarraVital tipo="fatiga" etiqueta="Fatiga" valor={p.fatiga_actual ?? 0} max={p.atributos.fatiga ?? 0} />
      </div>
    </div>
  );
}
