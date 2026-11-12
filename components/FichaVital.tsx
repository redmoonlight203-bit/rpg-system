import {ResourceBar} from "./ui/ResourceBar";
import type { Personaje } from "../lib/personajes";
import { vidaMaxima } from "../lib/personajes";
export default function FichaVital({ personaje: p }: { personaje: Personaje }) {
  const max = p.vida_maxima_actual ?? vidaMaxima(p),
    vida = p.vida_actual ?? max;
  return (
    <div className="pj-vital">
      <div>
        <span>VIDA PERMANENTE</span>
        <strong>
          {vida} <small>/ {max}</small>
        </strong>
      </div>
      <meter
        min={0}
        max={max}
        value={vida}
        aria-label={`Vida: ${vida} de ${max}`}
      />
      <div className="pj-vital-resources"><ResourceBar label="PH" value={p.ph_actual ?? p.atributos.ph ?? 0} max={p.atributos.ph ?? 0} kind="special"/><ResourceBar label="Fatiga" value={p.fatiga_actual ?? 0} max={p.atributos.fatiga ?? 0} kind="fatigue"/></div>
    </div>
  );
}
