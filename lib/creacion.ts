import type {ConfiguracionVFX} from "./vfx";
import type { DefinicionTransformacion } from "./transformaciones";
import {validarPortada} from "./imagenes-creacion";
import {validarReglas} from "./reglas";
import {validarVision,type Vision} from "./vision";
import {DISPARADORES,RESULTADOS_POR_DISPARADOR,NOMBRE_DISPARADOR,ACOMPANANTES,CON_ALCANCE,disparadorDe,type ClaveResultado,type DisparadorReaccion} from "./reacciones";
import { linaje, type CategoriaBase } from "./estadisticas";
import {validarInmunidades,type Inmunidad} from "./inmunidades";
import {validarDefinicionEstado,definicionBase,type DefinicionEstado} from "./estados";
import {validarRasgo,ETIQUETAS,MAX_COMPONENTES,type Rasgo} from "./rasgos";
import {validarConcepto,type ConceptoBasico} from "./conceptos-basicos";
import {validarEsqueleto,esqueletoBase,type Esqueleto} from "./esqueletos";
export type TipoCreacion =
  "personaje" | "habilidad" | "objeto" | "titulo" | "pasiva" | "otro";
export const TIPOS: { valor: TipoCreacion; nombre: string }[] = [
  { valor: "personaje", nombre: "Personaje" },
  { valor: "habilidad", nombre: "Habilidad" },
  { valor: "objeto", nombre: "Objeto" },
  { valor: "titulo", nombre: "Título" },
  { valor: "pasiva", nombre: "Pasiva" },
  { valor: "otro", nombre: "Otro" },
];
export const SLOTS = [
  { clave: "casco", nombre: "Cabeza", tipos: ["casco"] },
  { clave: "pechera", nombre: "Torso", tipos: ["pechera"] },
  { clave: "pantalones", nombre: "Piernas", tipos: ["pantalones"] },
  { clave: "zapatos", nombre: "Botas", tipos: ["zapatos"] },
  { clave: "capa", nombre: "Capa", tipos: ["capa"] },
  { clave: "mano_der", nombre: "Mano derecha", tipos: ["mano", "dos_manos"] },
  { clave: "mano_izq", nombre: "Mano izquierda", tipos: ["mano", "dos_manos"] },
  ...Array.from({ length: 6 }, (_, i) => ({
    clave: `acc_${i + 1}`,
    nombre: `Accesorio ${i + 1}`,
    tipos: ["accesorio"],
  })),
  { clave: "titulo", nombre: "Título", tipos: ["titulo"] },
];
export type Elemento =
  "ninguno" | "fuego" | "agua" | "electricidad" | "hielo" | "luz_sagrada";
export const ELEMENTOS: Elemento[] = [
  "ninguno",
  "fuego",
  "agua",
  "electricidad",
  "hielo",
  "luz_sagrada",
];
export type ArmaResultado = {
  cara: number;
  origen_id?: string;
  nombre: string;
  cantidad: number;
  caras: number;
  modificador: number;
  tipo_dano: string;
  elemento?: Elemento;
  arma_slot: "mano_der" | "mano_izq" | "dos_manos";
};
export type AlcanceHabilidad = {
  alcance: number;
  forma: 'individual'|'circulo'|'cuadrado'|'linea'|'cono'|'cruz';
  tamano: number;
  afecta: 'enemigos'|'aliados'|'todos'|'yo';
  color?: 'azul'|'rojo'|'verde'|'dorado'|'violeta';
  desplazamiento?: {tipo:'atraer'|'empujar';casillas:number;cuando:'siempre'|'fallo_salvacion'};
  /** Mueve al lanzador al ejecutar el ataque, sin gastar el movimiento normal. */
  movimiento_lanzador?: {tipo:'dash'|'salto'|'teletransporte'|'carrera';casillas:number;alcance_golpe:number;ancho?:number};
  /** Objetivo: centro elegido; lanzador: rugido/aura; aterrizaje: impacto tras salto; recorrido: carrera que golpea a su paso. */
  origen_area?: 'objetivo'|'lanzador'|'aterrizaje'|'recorrido';
  /** false excluye al lanzador del daño de área (p.ej. su propio rugido). */
  afecta_lanzador?: boolean;
  derribo?: 'siempre'|'fallo_salvacion';
};
/**
 * Primitiva «Reacción» del Yunque general: responde a un impacto recibido.
 * Una reacción principal intercepta el golpe (con salvación opcional) y reduce el daño;
 * un seguimiento usa lo que detuvo la principal (devolverlo al atacante o guardarlo en una reserva).
 */
export type ReservaReaccion = { recurso: string; proporcion: number; maximo: number };
export type ContraataqueReaccion = { cantidad: number; caras: number; modificador?: number };
export type ResultadoReaccion = {
  devolver?: { maximo?: number };
  reservar?: ReservaReaccion;
  /** Repite la tirada fallida (ataque o salvación) una vez; vale la segunda. */
  repetir_tirada?: Record<string, never>;
  /** Daño directo al atacante (o al objetivo, si un aliado golpea), sin encadenar reacciones. */
  contraatacar?: ContraataqueReaccion;
  /** El portador recibe el ataque dirigido al aliado. */
  interponerse?: Record<string, never>;
};
export type UsosReaccion = { tipo: 'encuentro'|'turno'|'ilimitado'; maximo?: number };
export type Reaccion = {
  /** Cuándo se ofrece. Sin disparador: al recibir un golpe (comportamiento clásico). */
  disparador?: DisparadorReaccion;
  /** Casillas hasta el aliado o el enemigo que la dispara (disparadores de otros). Por defecto 1. */
  alcance?: number;
  /** PH al activarla. Sin coste propio se usa el coste de PH de la acción. */
  coste?: number;
  usos?: UsosReaccion;
  /** Rondas de espera tras cada uso. */
  enfriamiento?: number;
  /** Las principales se prueban de mayor a menor prioridad; la primera que se paga resuelve el golpe. */
  prioridad?: number;
  una_por_ronda?:boolean;
  esquiva_opuesta?:{caras:number;contra_caras:number};
  /** Solo ante impactos mágicos (efecto mágico o con coste de PH) o solo físicos. */
  naturaleza?: 'magica'|'fisica';
  /** Requiere que el portador esté (o no esté) en esta forma de transformación. */
  forma?: string;
  sin_forma?: string;
  principal?: ResultadoReaccion & {
    salvacion?: { cd: number; atributo: string };
    /** Obligatorio al recibir un golpe; opcional en los demás disparadores. */
    reducir?: { modo: 'todo'|'mitad'|'fijo'; valor?: number };
    animacion?: string;
    /** Tras una principal exitosa se ejecuta el primer seguimiento aplicable. */
    permite_seguimiento?: boolean;
  };
  seguimiento?: ResultadoReaccion;
};
/** Componente de daño (Apéndice C): una técnica combinada suma varios, cada uno con su elemento. */
export type ComponenteDano = { id: string; elemento: Elemento; cantidad: number; caras: number; origen: "base" | "potenciador"; nombre?: string };
export type Efecto = {
  /** Ataque múltiple: cada dado es un disparo con su propia tirada para impactar y su propio objetivo (puede repetirse).
   *  Tras el primer disparo solo se puede seguir disparando o moverse; los disparos que queden se pierden al acabar el turno. */
  rafaga?: boolean;
  /** Imagen propia de la acción para el combate (ranura de la barra). Sin ella se usa la de la creación. */
  imagen?: string;
  /** Varios componentes elementales en un mismo efecto (máx. 3). Sin esta lista se usa elemento + dados. */
  componentes?: ComponenteDano[];
  /** Etiquetas de técnica (lista cerrada): deciden qué potenciadores acepta. */
  etiquetas?: string[];
  /** Primitiva «Reacción» configurada en la Forja. Tiene prioridad sobre `defensa`. */
  reaccion?: Reaccion;
  /** Primitiva «Visión»: habilidad ocular (puntos débiles, revelar, anticipar…). */
  vision?: Vision;
  ley_limitless?:boolean;
  axioma?:boolean;
  suelo?:boolean;
  portal?:boolean;
  vuelo?:boolean;
  aterrizar?:boolean;
  /** Clave de plantilla de las creaciones antiguas; al cargar se convierte en `reaccion` (normalizarReaccion). */
  defensa?:string;
  recurso?: {nombre:string; inicial:number; cambio:number; descargar?:boolean};
  aprendizaje?:{bono:number;cd:number};
  companero_magico?:string;
  vfx?: ConfiguracionVFX;
  animacion?: "proyectil"|"destello"|"aura"|"impacto"|"trayectoria"|"desplazamiento"|"ninguna";
  transformacion?: DefinicionTransformacion;
  tablero?: AlcanceHabilidad;
  tabla_armas?: { caras: number; resultados: ArmaResultado[] };

  requisito_forma?: { atributo: string; minimo: number };
  elemento?: Elemento;
  naturaleza?: "automatica" | "fisica" | "magica" | "natural";
  salvacion?: {
    cd: number;
    atributo: string;
    exito: "mitad" | "anula" | "solo_estado";
  };
  /** Estado del catálogo (`lib/estados.ts`) o «narrativo». */
  estado_tipo?:
    "narrativo" | "veneno" | "regeneracion" | "aturdido" | "quemadura" | (string & {});
  /** Estado creado en el Yunque con primitivas; tiene prioridad sobre `estado_tipo`. */
  estado_def?: DefinicionEstado;
  /** Categoría para las inmunidades (p. ej. un control mental). */
  categoria?: "mental" | "fisico" | "elemental";
  subcategoria?: string;
  /** Inmunidades que este efecto atraviesa: `dano:fuego`, `estado:quemadura`, `categoria:mental`. */
  ignora?: string[];
  /** Inmunidades que concede al portador mientras tenga la habilidad o lleve el objeto equipado. */
  inmunidades?: Inmunidad[];
  /** No es una acción de combate: solo concede defensas, rasgos o conceptos básicos al portador. */
  solo_pasivo?: boolean;
  /** Rasgo combinable (recursos + potenciadores) que concede al portador. */
  rasgo?: Rasgo;
  /** Uso interno del motor: estados que añade un potenciador a la técnica potenciada. */
  estados_potenciador?: string[];
  /** Estado (creado con primitivas) que aplica el golpe al impactar: sangrado de unas garras, etc. */
  estado_impacto?: DefinicionEstado;
  /** Concepto básico que sustituye al de por defecto (desarmado o guardia) para el portador. */
  concepto?: ConceptoBasico;
  /** Esqueleto de la animación del arma (id de un esqueleto base o del catálogo del GM). */
  esqueleto?: string;
  /** Copia del esqueleto creado por el GM: el combate no necesita consultar la base para animarlo. */
  esqueleto_def?: Esqueleto;
  /** Ajustes visuales sobre el esqueleto: solo longitud y color. */
  esqueleto_ajustes?: { longitud?: number; color?: string };
  id: string;
  nombre: string;
  descripcion?: string;
  efecto:
    | "desplazamiento"
    | "dano"
    | "curacion"
    | "recuperar_ph"
    | "reducir_fatiga"
    | "estado"
    | "crear_arma"
    | "transformacion";
  cantidad: number;
  caras: number;
  modificador: number;
  tipo_dano: string;
  estado: string;
  duracion: number;
  coste_ph: number;
  coste_fatiga?: number;
  arma_nombre?: string;
  arma_slot?: "mano_der" | "mano_izq" | "dos_manos";
  bonos_estado?: Record<string, number>;
};
export const EFECTOS_NOMBRE: Record<Efecto["efecto"], string> = {
  desplazamiento:"Dash",
  dano: "Daño",
  curacion: "Curación",
  recuperar_ph: "Recuperar PH",
  reducir_fatiga: "Reducir Fatiga",
  estado: "Estado",
  crear_arma: "Crear arma temporal",
  transformacion: "Transformación",
};
export type FuenteCreacion = {
  id: string;
  nombre: string;
  tipo: string;
  tipo_creacion?: TipoCreacion;
  estado?: string;
  slot_tipo?: string;
  stats?: Record<string, number>;
  configuracion_dados?: Efecto[];
};
export function tipoDe(
  f: FuenteCreacion,
  categorias: CategoriaBase[],
): TipoCreacion {
  if (f.tipo_creacion) return f.tipo_creacion;
  const root = linaje(categorias, f.tipo)[0]?.clave || f.tipo;
  if (["razas", "personaje", "personajes", "npc", "monstruo", "monstruos"].includes(root))
    return "personaje";
  if (
    ["objetos", "objeto", "armas", "arma", "armadura", "accesorios"].includes(
      root,
    )
  )
    return "objeto";
  if (["habilidades", "habilidad"].includes(root)) return "habilidad";
  if (["titulos", "titulo"].includes(root)) return "titulo";
  if (["pasivas", "pasiva"].includes(root)) return "pasiva";
  return "otro";
}
export function subcategorias(categorias: CategoriaBase[]): CategoriaBase[] {
  return categorias.filter((c) => !!c.parent_id);
}
export function clasificacionesPara(
  tipo: TipoCreacion,
  categorias: CategoriaBase[],
): CategoriaBase[] {
  return subcategorias(categorias).filter((c) => {
    const familia = tipoDe({ id: "", nombre: "", tipo: c.clave }, categorias);
    return tipo === "otro" || familia === "otro" || familia === tipo;
  });
}
export function nuevoEfecto(): Efecto {
  return {
    id: crypto.randomUUID(),
    nombre: "",
    efecto: "dano",
    cantidad: 1,
    caras: 6,
    modificador: 0,
    tipo_dano: "",
    estado: "",
    duracion: 0,
    coste_ph: 0,
  };
}
export function formula(
  e: Pick<Efecto, "cantidad" | "caras" | "modificador">,
): string {
  return `${e.cantidad ? `${e.cantidad}d${e.caras}` : "0"}${e.modificador ? `${e.modificador > 0 ? "+" : ""}${e.modificador}` : ""}`;
}
/** Validación estructural independiente del catálogo visual, también para datos antiguos. */
function validarAnimacion(v:unknown):string|null {
 if(v===undefined)return null;
 if(!v||typeof v!=='object'||Array.isArray(v))return 'Configuración de animación inválida.';
 const c=v as Record<string,unknown>;
 for(const k of ['lanzamiento','recorrido','impacto','entrada','aura'])if(c[k]!==undefined&&(typeof c[k]!=='string'||!/^[a-z0-9_-]{1,100}$/.test(c[k] as string)))return 'Referencia de animación inválida.';
 if(c.escala!==undefined&&(typeof c.escala!=='number'||!Number.isFinite(c.escala)||c.escala<0.5||c.escala>4))return 'Tamaño visual inválido (0.5–4 casillas).';
 return null;
}
/** Valida la primitiva «Reacción» (plan del Yunque general). */
export function validarReaccion(r: unknown): string | null {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return 'Reacción inválida.';
  const x = r as Reaccion;
  if(x.esquiva_opuesta&&(!x.principal||![x.esquiva_opuesta.caras,x.esquiva_opuesta.contra_caras].every(v=>Number.isInteger(v)&&v>=2&&v<=100)))return 'Configura los dados de esquiva y contraataque (2 a 100 caras).';
  const entero = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
  const claveForma = (v: unknown) => typeof v === 'string' && /^[a-z0-9_-]{1,64}$/i.test(v);
  if (x.prioridad !== undefined && !entero(x.prioridad, -100, 100)) return 'Prioridad de reacción de -100 a 100.';
  if (x.naturaleza !== undefined && !['magica', 'fisica'].includes(x.naturaleza)) return 'La reacción responde a golpes mágicos o físicos.';
  for (const k of ['forma', 'sin_forma'] as const) if (x[k] !== undefined && !claveForma(x[k])) return 'Forma de la reacción inválida.';
  if (x.disparador !== undefined && !(DISPARADORES as readonly string[]).includes(x.disparador)) return 'Disparador de reacción desconocido.';
  const disparador = disparadorDe(x), permitidos = RESULTADOS_POR_DISPARADOR[disparador], nombre = NOMBRE_DISPARADOR[disparador].toLowerCase();
  if (x.coste !== undefined && !entero(x.coste, 0, 1000)) return 'Coste de la reacción de 0 a 1000 PH.';
  if (x.enfriamiento !== undefined && !entero(x.enfriamiento, 0, 100)) return 'Enfriamiento de 0 a 100 rondas.';
  if (x.usos !== undefined && (!x.usos || !['encuentro','turno','ilimitado'].includes(x.usos.tipo) || (x.usos.tipo !== 'ilimitado' && !entero(x.usos.maximo, 1, 100)))) return 'Usos por encuentro o por turno: de 1 a 100.';
  if (x.alcance !== undefined && (!CON_ALCANCE.includes(disparador) || !entero(x.alcance, 1, 30))) return 'Alcance de la reacción de 1 a 30 casillas (solo cuando la dispara otro combatiente).';
  if (x.seguimiento && !permitidos.includes('seguimiento')) return `Una reacción «${nombre}» no tiene seguimiento.`;
  if (x.esquiva_opuesta && !permitidos.includes('esquiva_opuesta')) return `La esquiva enfrentada solo responde al recibir un golpe.`;
  if (x.principal) {
    const claves = (Object.keys(x.principal) as (keyof NonNullable<Reaccion['principal']>)[]).filter(k => x.principal![k] !== undefined && k !== 'permite_seguimiento');
    const ajena = claves.find(k => !permitidos.includes(k as ClaveResultado));
    if (ajena) return `«${ajena.replace('_', ' ')}» no se puede usar en una reacción «${nombre}».`;
    if (!claves.some(k => !ACOMPANANTES.includes(k as ClaveResultado)) && !x.esquiva_opuesta) return `Elige qué hace la reacción «${nombre}».`;
    if (disparador === 'despues_ser_atacado' && !x.principal.reducir) return 'Elige cómo reduce el daño: a la mitad o una cantidad fija.';
    if (x.principal.repetir_tirada !== undefined && (typeof x.principal.repetir_tirada !== 'object' || x.principal.repetir_tirada === null)) return 'Repetir tirada inválido.';
    if (x.principal.interponerse !== undefined && (typeof x.principal.interponerse !== 'object' || x.principal.interponerse === null)) return 'Interponerse inválido.';
  }
  if (!x.principal && !x.seguimiento) return 'Configura la reacción principal o un seguimiento.';
  const resultado = (res: ResultadoReaccion | undefined): string | null => {
    if (!res) return null;
    if (res.contraatacar !== undefined && (!res.contraatacar || !entero(res.contraatacar.cantidad, 1, 20) || !entero(res.contraatacar.caras, 2, 100) || (res.contraatacar.modificador !== undefined && !entero(res.contraatacar.modificador, -100, 100)))) return 'Contraataque: de 1 a 20 dados de 2 a 100 caras.';
    if (res.devolver !== undefined && (typeof res.devolver !== 'object' || (res.devolver.maximo !== undefined && !entero(res.devolver.maximo, 1, 1000)))) return 'Máximo devuelto de 1 a 1000.';
    if (res.reservar !== undefined) {
      const v = res.reservar;
      if (!v || typeof v.recurso !== 'string' || !v.recurso.trim() || v.recurso.length > 60) return 'Nombra el recurso de la reserva.';
      if (typeof v.proporcion !== 'number' || !(v.proporcion > 0) || v.proporcion > 10) return 'Proporción de la reserva entre 0 y 10.';
      if (!entero(v.maximo, 1, 1000000)) return 'Máximo de la reserva inválido.';
    }
    return null;
  };
  if (x.principal) {
    const p = x.principal;
    if (p.reducir && !['todo','mitad', 'fijo'].includes(p.reducir.modo)) return 'Elige cómo reduce el daño: a la mitad o una cantidad fija.';
    if (p.reducir?.modo === 'fijo' && !entero(p.reducir.valor, 1, 1000)) return 'Reducción fija de 1 a 1000.';
    if (p.salvacion && (!entero(p.salvacion.cd, 1, 100) || !/^[a-z_][a-z0-9_]{0,63}$/.test(p.salvacion.atributo || ''))) return 'Salvación de la reacción inválida.';
    if (p.animacion !== undefined && (typeof p.animacion !== 'string' || p.animacion.length > 60)) return 'Animación de la reacción inválida.';
    if (p.permite_seguimiento !== undefined && typeof p.permite_seguimiento !== 'boolean') return 'Seguimiento inválido.';
    const f = resultado(p); if (f) return f;
  }
  return resultado(x.seguimiento);
}
export function validarEfectos(efectos: Efecto[]): string | null {
  if (efectos.length > 20) return "Máximo 20 acciones por creación.";
  for (const e of efectos) {
    if(e.rafaga!==undefined){
      if(typeof e.rafaga!=="boolean")return "Ataque múltiple inválido.";
      if(e.rafaga){
        if(e.efecto!=="dano")return `${e.nombre||"Acción"}: el ataque múltiple solo es para acciones de daño.`;
        if(!Number.isInteger(e.cantidad)||e.cantidad<2||e.cantidad>20)return `${e.nombre||"Acción"}: el ataque múltiple necesita entre 2 y 20 dados (un disparo por dado).`;
        if(e.componentes?.length)return `${e.nombre||"Acción"}: el ataque múltiple usa un solo tipo de daño, sin componentes elementales.`;
        if(e.tablero&&e.tablero.forma!=="individual")return `${e.nombre||"Acción"}: cada disparo va a un solo objetivo; usa alcance individual.`;
      }
    }
    if(e.imagen!==undefined){if(typeof e.imagen!=="string")return "La imagen de la acción no es válida.";const error=validarPortada(e.imagen);if(error)return `${e.nombre||"Acción"}: ${error}`;}
    const errorVFX=validarAnimacion(e.vfx);if(errorVFX)return errorVFX;
    const errorVision=validarVision(e.vision);if(errorVision)return errorVision;
    if(e.vision&&e.vision.modo==='abrir'&&e.tablero&&e.tablero.afecta!=='yo')return 'Un ojo que se abre con su propia acción no apunta a otros: quita el alcance o usa «Se abre al usar la acción».';
    if(e.efecto==="transformacion"){
      const d=e.transformacion;
      if(!d||!d.id||!d.nombre||!["forma","poder"].includes(d.tipo)||!Array.isArray(d.etapas)||d.etapas.length<1||d.etapas.length>12||d.etapas.some(v=>!v.id||!v.nombre||!v.stats||!Object.keys(v.stats).length||Object.keys(v.stats).some(k=>!/^[a-z_][a-z0-9_]{0,63}$/.test(k))||Object.values(v.stats).some(n=>!Number.isFinite(n)||n<0||n>1000000)))return "Configura una transformación válida con etapas y estadísticas.";
      if(new Set(d.etapas.map(v=>v.id)).size!==d.etapas.length)return 'Cada etapa necesita un identificador distinto.';
      for(const etapa of d.etapas){if(etapa.imagen_url!==undefined){if(typeof etapa.imagen_url!=="string")return "La imagen de etapa no es válida.";const error=validarPortada(etapa.imagen_url);if(error)return `${etapa.nombre}: ${error}`;}}
      if(d.etapas.some(v=>v.habilidades!==undefined&&(!Array.isArray(v.habilidades)||v.habilidades.some(id=>typeof id!=='string'||!id))))return 'Selecciona poderes de etapa válidos.';
      if(d.tipo==="forma"&&d.etapas.some(v=>!((v.stats.hp??v.stats.vida)>0)))return "Cada forma necesita HP propios.";
      for(const etapa of d.etapas){
        const errorVFX=validarAnimacion(etapa.vfx);if(errorVFX)return errorVFX;
        const errorOjo=validarVision(etapa.vision);if(errorOjo)return `${etapa.nombre}: ${errorOjo}`;
        if(etapa.reglas!==undefined){if(!Array.isArray(etapa.reglas))return 'Las pasivas de etapa deben ser reglas válidas.';const error=validarReglas(etapa.reglas);if(error)return `${etapa.nombre}: ${error}`;}
        if(etapa.descontrolada!==undefined&&typeof etapa.descontrolada!=='boolean')return 'Control de etapa inválido.';
        if(etapa.curacion_entrada!==undefined&&(!Number.isInteger(etapa.curacion_entrada)||etapa.curacion_entrada<0||etapa.curacion_entrada>1000000))return 'Curación de posesión inválida.';
        if(etapa.vida_maxima_posesion!==undefined&&(!Number.isInteger(etapa.vida_maxima_posesion)||etapa.vida_maxima_posesion<1||etapa.vida_maxima_posesion>1000000))return 'HP máximos de posesión inválidos.';
      }
      if(d.posesion){
        const p=d.posesion;
        if(!Number.isInteger(p.umbral_pct)||p.umbral_pct<1||p.umbral_pct>99||!Number.isInteger(p.cd)||p.cd<1||p.cd>100||!d.etapas.some(et=>et.id===p.etapa_id&&et.descontrolada))return 'Configura el umbral, CD y una etapa descontrolada para la posesión.';
      }
    }
    const t=e.tablero;
    if(t!==undefined){
      const avance=t.movimiento_lanzador;
      if(t.origen_area&&!['objetivo','lanzador','aterrizaje','recorrido'].includes(t.origen_area))return 'Origen del efecto inválido.';
      if(t.afecta_lanzador!==undefined&&typeof t.afecta_lanzador!=='boolean')return 'Configura correctamente si el área alcanza al lanzador.';
      if(t.origen_area==='lanzador'&&t.alcance!==0)return 'Los rugidos y auras necesitan alcance de lanzamiento 0.';
      if(avance&&(!['dash','salto','teletransporte','carrera'].includes(avance.tipo)||!Number.isInteger(avance.casillas)||avance.casillas<1||avance.casillas>30||!Number.isInteger(avance.alcance_golpe)||avance.alcance_golpe<0||avance.alcance_golpe>20||(avance.ancho!==undefined&&(!Number.isInteger(avance.ancho)||avance.ancho<0||avance.ancho>2))||e.efecto!=='dano'||(t.forma!=='individual'&&!['aterrizaje','recorrido'].includes(t.origen_area||''))))return 'Configura el movimiento, sus casillas y el área de impacto.';
      if(t.origen_area==='aterrizaje'&&(!avance||avance.tipo==='carrera'))return 'Un impacto de aterrizaje necesita un salto, dash o teletransporte.';
      if(t.origen_area==='recorrido'&&(!avance||avance.tipo!=='carrera'))return 'Un ataque de recorrido necesita una carrera.';
      if(avance?.tipo==='carrera'&&t.origen_area!=='recorrido')return 'Una carrera debe dañar las casillas del recorrido.';
      if(!t||typeof t!=='object'||!Number.isInteger(t.alcance)||t.alcance<0||t.alcance>60||!['individual','circulo','cuadrado','linea','cono','cruz'].includes(t.forma)||!Number.isInteger(t.tamano)||t.tamano<0||t.tamano>12||t.forma!=='individual'&&t.tamano<1||!['enemigos','aliados','todos','yo'].includes(t.afecta))return 'Configura alcance de 0 a 60 y tamaño de 1 a 12 casillas (individual: 0).';
      if(t.color&&!['azul','rojo','verde','dorado','violeta'].includes(t.color))return 'Color de área inválido.';
      if(e.efecto==='crear_arma')return 'Crear un arma no utiliza un área en el tablero.';
      if(t.desplazamiento&&(!['atraer','empujar'].includes(t.desplazamiento.tipo)||!Number.isInteger(t.desplazamiento.casillas)||t.desplazamiento.casillas<1||t.desplazamiento.casillas>12||!['siempre','fallo_salvacion'].includes(t.desplazamiento.cuando)))return 'Configura un desplazamiento de 1 a 12 casillas.';
      if(t.derribo&&!['siempre','fallo_salvacion'].includes(t.derribo))return 'Condición de derribo inválida.';
      if((t.derribo==='fallo_salvacion'||t.desplazamiento?.cuando==='fallo_salvacion')&&!e.salvacion)return 'Activa una salvación para condicionar el desplazamiento o derribo a su fallo.';
    }
    const tabla = e.tabla_armas;
    if (tabla !== undefined) {
      if (e.efecto !== 'crear_arma' || !tabla || !Number.isInteger(tabla.caras) || tabla.caras < 2 || tabla.caras > 100 || !Array.isArray(tabla.resultados) || tabla.resultados.length !== tabla.caras)
        return 'Asigna un arma a cada cara del dado (entre 2 y 100 caras).';
      const caras = new Set<number>();
      for (const r of tabla.resultados) {
        if (!r || !Number.isInteger(r.cara) || r.cara < 1 || r.cara > tabla.caras || caras.has(r.cara)) return 'Cada cara debe aparecer exactamente una vez.';
        caras.add(r.cara);
        if (typeof r.nombre !== 'string' || !r.nombre.trim() || r.nombre.length > 120 || !['mano_der','mano_izq','dos_manos'].includes(r.arma_slot)) return `Cara ${r.cara}: elige nombre y mano válidos.`;
        const fallo = validarEfectos([{...e, tabla_armas: undefined, arma_nombre:r.nombre, cantidad:r.cantidad, caras:r.caras, modificador:r.modificador, tipo_dano:r.tipo_dano, elemento:r.elemento, arma_slot:r.arma_slot}]);
        if (fallo) return `Cara ${r.cara}: ${fallo}`;
      }
    }

    if (e.requisito_forma && (!/^[a-z_][a-z0-9_]*$/.test(e.requisito_forma.atributo) || !Number.isFinite(e.requisito_forma.minimo))) return 'Requisito de forma inválido.';
    if(e.aprendizaje&&(e.efecto!=='estado'||!Number.isInteger(e.aprendizaje.bono)||Math.abs(e.aprendizaje.bono)>100||!Number.isInteger(e.aprendizaje.cd)||e.aprendizaje.cd<1||e.aprendizaje.cd>100))return 'Revisa el bono y la CD de aprendizaje.';
    if(e.recurso?.descargar&&e.efecto!=='dano')return 'Descargar la reserva requiere una acción de daño.';
    if (e.reaccion !== undefined) { const fallo = validarReaccion(e.reaccion); if (fallo) return `${e.nombre||'Reacción'}: ${fallo}`; }
    if (e.elemento && !ELEMENTOS.includes(e.elemento))
      return "Elemento inválido.";
    if (
      e.naturaleza &&
      !["automatica", "fisica", "magica", "natural"].includes(e.naturaleza)
    )
      return "Naturaleza inválida.";
    if (e.estado_tipo && !["narrativo","veneno","regeneracion","aturdido","quemadura"].includes(e.estado_tipo) && !definicionBase(e.estado_tipo))
      return "Estado inválido.";
    if (e.estado_def !== undefined) { const fallo = validarDefinicionEstado(e.estado_def); if (fallo) return `${e.nombre||'Estado'}: ${fallo}`; }
    if (e.concepto !== undefined) { const fallo = validarConcepto(e.concepto); if (fallo) return `${e.nombre||'Concepto'}: ${fallo}`; }
    if (e.estado_impacto !== undefined) { const fallo = validarDefinicionEstado(e.estado_impacto); if (fallo) return `Estado al impactar: ${fallo}`; }
    if (e.esqueleto_def !== undefined) { const fallo = validarEsqueleto(e.esqueleto_def); if (fallo) return `Esqueleto: ${fallo}`; }
    if (e.esqueleto !== undefined && (typeof e.esqueleto !== "string" || !/^[a-z_][a-z0-9_]{0,40}$/.test(e.esqueleto) || (!esqueletoBase(e.esqueleto) && e.esqueleto_def?.id !== e.esqueleto))) return "Elige un esqueleto de la lista.";
    if (e.esqueleto_ajustes !== undefined && ((e.esqueleto_ajustes.longitud !== undefined && !(e.esqueleto_ajustes.longitud >= .3 && e.esqueleto_ajustes.longitud <= 3)) || (e.esqueleto_ajustes.color !== undefined && !/^#[0-9a-f]{6}$/i.test(e.esqueleto_ajustes.color)))) return "Ajustes del esqueleto inválidos.";
    if (e.rasgo !== undefined) { const fallo = validarRasgo(e.rasgo); if (fallo) return `${e.nombre||'Rasgo'}: ${fallo}`; }
    if (e.etiquetas !== undefined && (!Array.isArray(e.etiquetas) || e.etiquetas.length > 12 || e.etiquetas.some(x => !(ETIQUETAS as readonly string[]).includes(x)))) return "Elige etiquetas de la lista.";
    if (e.componentes !== undefined && (!Array.isArray(e.componentes) || e.componentes.length < 1 || e.componentes.length > MAX_COMPONENTES || e.componentes.some(c => !c || !ELEMENTOS.includes(c.elemento) || !Number.isInteger(c.cantidad) || c.cantidad < 0 || c.cantidad > 100 || !Number.isInteger(c.caras) || c.caras < 2 || c.caras > 1000))) return `Como máximo ${MAX_COMPONENTES} componentes de daño, cada uno con un elemento válido.`;
    if (e.inmunidades !== undefined) { const fallo = validarInmunidades(e.inmunidades); if (fallo) return fallo; }
    if (e.categoria !== undefined && !["mental","fisico","elemental"].includes(e.categoria)) return "Categoría inválida.";
    if (e.subcategoria !== undefined && !/^[a-z_]{1,40}$/.test(e.subcategoria)) return "Subcategoría inválida.";
    if (e.ignora !== undefined && (!Array.isArray(e.ignora) || e.ignora.length > 20 || e.ignora.some(x => typeof x !== "string" || !/^(dano|estado|categoria):[a-z_][a-z0-9_:]{0,63}$/.test(x)))) return "Lista de inmunidades ignoradas inválida.";
    if (
      e.salvacion &&
      (!Number.isInteger(e.salvacion.cd) ||
        e.salvacion.cd < 1 ||
        e.salvacion.cd > 1000 ||
        !["mitad", "anula", "solo_estado"].includes(e.salvacion.exito) ||
        !/^[a-z_][a-z0-9_]*$/.test(e.salvacion.atributo))
    )
      return "Configura una salvación válida.";
    if (e.naturaleza === "magica" && e.coste_ph <= 0)
      return "Una habilidad mágica debe consumir PH.";
    if (["natural", "fisica"].includes(e.naturaleza || "") && e.coste_ph > 0)
      return "Las acciones con PH son mágicas; el daño físico se configura aparte.";
    if (e.descripcion !== undefined && (typeof e.descripcion !== "string" || e.descripcion.length > 2000)) return "La descripción de cada acción debe ser un texto de hasta 2000 caracteres.";
    if(e.efecto==='desplazamiento'&&(!e.tablero||!Number.isInteger(e.tablero.alcance)||e.tablero.alcance<1||e.tablero.alcance>30||e.tablero.forma!=='individual'))return 'El dash necesita un alcance de 1 a 30 casillas y destino individual.';
    if (!e.nombre.trim()) return "Cada acción necesita un nombre.";
    if (
      ![
        "dano",
        "curacion",
        "recuperar_ph",
        "reducir_fatiga",
        "desplazamiento",
        "estado",
        "crear_arma",
        "transformacion",
      ].includes(e.efecto)
    )
      return "Selecciona un efecto válido.";
    if (
      !Number.isInteger(e.cantidad) ||
      e.cantidad < 0 ||
      e.cantidad > 100 ||
      !Number.isInteger(e.caras) ||
      e.caras < 2 ||
      e.caras > 1000 ||
      !Number.isInteger(e.modificador) ||
      Math.abs(e.modificador) > 1000000
    )
      return "Usa de 0 a 100 dados, de 2 a 1000 caras y un modificador entero.";
    if (
      !Number.isInteger(e.coste_ph) ||
      e.coste_ph < 0 ||
      e.coste_ph > 1000000 ||
      !Number.isInteger(e.duracion) ||
      e.duracion < 0 ||
      e.duracion > 1000000
    )
      return "Coste de PH y duración deben ser enteros no negativos.";
    if (
      e.coste_fatiga !== undefined &&
      (!Number.isInteger(e.coste_fatiga) || e.coste_fatiga < 0)
    )
      return "Coste de Fatiga inválido.";
    if (
      e.efecto === "crear_arma" &&
      ((!e.tabla_armas && !e.arma_nombre?.trim()) ||
        e.cantidad < 1 ||
        e.duracion < 1 ||
        !["mano_der", "mano_izq", "dos_manos"].includes(
          e.arma_slot || "mano_der",
        ))
    )
      return "Configura nombre, mano, duración y dados del arma temporal.";
    if (
      Object.values(e.bonos_estado || {}).some(
        (v) => !Number.isFinite(v) || Math.abs(v) > 1000000,
      )
    )
      return "Bonos inválidos.";
    if (e.efecto === "estado" && !e.estado.trim())
      return "Describe el estado que aplica la acción.";
  }
  return null;
}
export function validarEquipamiento(
  equipo: Record<string, string>,
  creaciones: FuenteCreacion[],
  categorias: CategoriaBase[],
): string | null {
  for (const [slot, id] of Object.entries(equipo)) {
    if (!id) continue;
    const espacio = SLOTS.find((s) => s.clave === slot),
      item = creaciones.find((f) => f.id === id);
    if (
      !espacio ||
      !item ||
      item.estado !== "aprobado" ||
      !["objeto", "titulo"].includes(tipoDe(item, categorias)) ||
      !espacio.tipos.includes(item.slot_tipo || "ninguno")
    )
      return `El equipo de ${espacio?.nombre || slot} no es compatible o ya no existe.`;
  }
  const derecha = creaciones.find((c) => c.id === equipo.mano_der),
    izquierda = creaciones.find((c) => c.id === equipo.mano_izq);
  if (
    (derecha?.slot_tipo === "dos_manos" && equipo.mano_izq) ||
    (izquierda?.slot_tipo === "dos_manos" && equipo.mano_der)
  )
    return "Un arma de dos manos necesita la otra mano libre.";
  return null;
}
export function efectosDe(f: FuenteCreacion): Efecto[] {
  if (Array.isArray(f.configuracion_dados)) return f.configuracion_dados;
  const s = f.stats || {};
  if (
    Number.isInteger(s.dados_dano) &&
    s.dados_dano > 0 &&
    Number.isInteger(s.caras_dano) &&
    s.caras_dano >= 2
  )
    return [
      {
        id: `legacy-${f.id}`,
        nombre: "Ataque del arma",
        efecto: "dano",
        cantidad: s.dados_dano,
        caras: s.caras_dano,
        modificador: s.dano || 0,
        tipo_dano: "",
        estado: "",
        duracion: 0,
        coste_ph: 0,
      },
    ];
  return [];
}

