import { linaje, type CategoriaBase } from "./estadisticas";
export type TipoCreacion =
  "personaje" | "habilidad" | "objeto" | "titulo" | "pasiva" | "otro";
export const TIPOS: { valor: TipoCreacion; nombre: string }[] = [
  { valor: "personaje", nombre: "Personaje / enemigo" },
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
  { clave: "zapatos", nombre: "Pies", tipos: ["zapatos"] },
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
export type Efecto = {
  elemento?: Elemento;
  naturaleza?: "automatica" | "fisica" | "magica" | "natural";
  salvacion?: {
    cd: number;
    atributo: string;
    exito: "mitad" | "anula" | "solo_estado";
  };
  estado_tipo?:
    "narrativo" | "veneno" | "regeneracion" | "aturdido" | "quemadura";
  id: string;
  nombre: string;
  efecto:
    | "dano"
    | "curacion"
    | "recuperar_ph"
    | "reducir_fatiga"
    | "estado"
    | "crear_arma";
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
  dano: "Daño",
  curacion: "Curación",
  recuperar_ph: "Recuperar PH",
  reducir_fatiga: "Reducir Fatiga",
  estado: "Estado",
  crear_arma: "Crear arma temporal",
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
  if (["razas", "personaje", "personajes", "npc", "monstruo"].includes(root))
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
export function validarEfectos(efectos: Efecto[]): string | null {
  if (efectos.length > 20) return "Máximo 20 acciones por creación.";
  for (const e of efectos) {
    if (e.elemento && !ELEMENTOS.includes(e.elemento))
      return "Elemento inválido.";
    if (
      e.naturaleza &&
      !["automatica", "fisica", "magica", "natural"].includes(e.naturaleza)
    )
      return "Naturaleza inválida.";
    if (
      e.estado_tipo &&
      ![
        "narrativo",
        "veneno",
        "regeneracion",
        "aturdido",
        "quemadura",
      ].includes(e.estado_tipo)
    )
      return "Estado inválido.";
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
    if (!e.nombre.trim()) return "Cada acción necesita un nombre.";
    if (
      ![
        "dano",
        "curacion",
        "recuperar_ph",
        "reducir_fatiga",
        "estado",
        "crear_arma",
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
      (!e.arma_nombre?.trim() ||
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
