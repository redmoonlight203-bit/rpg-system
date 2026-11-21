/** Proyección del laboratorio. Un peso histórico sin unidad confirmada queda pendiente. */
export type PiezaCarga = {
  id: string;
  ubicacion: 'transportado' | 'externo';
  contenedor?: string;
  cantidad: number;
  pesoKg?: number;
};

type BandaCarga = {
  nombre: string;
  movimiento: number;
  iniciativa: number;
  impactoFisico: number;
  fatigaPrimeraCarrera: number;
};

const BANDAS: readonly BandaCarga[] = [
  { nombre: 'Normal', movimiento: 0, iniciativa: 0, impactoFisico: 0, fatigaPrimeraCarrera: 0 },
  { nombre: 'Cargado', movimiento: -1, iniciativa: 0, impactoFisico: 0, fatigaPrimeraCarrera: 0 },
  { nombre: 'Sobrecarga', movimiento: -2, iniciativa: -1, impactoFisico: 0, fatigaPrimeraCarrera: 1 },
  { nombre: 'Sobrecarga severa', movimiento: -3, iniciativa: -2, impactoFisico: -1, fatigaPrimeraCarrera: 1 },
  { nombre: 'Sobrecarga extrema', movimiento: -4, iniciativa: -3, impactoFisico: -2, fatigaPrimeraCarrera: 2 },
];

export function proyectarCarga(
  piezas: readonly PiezaCarga[],
  aptitudes: { fisico?: number; resistencia?: number; bono?: number },
) {
  const instancias = new Map<string, PiezaCarga>();
  for (const pieza of piezas) {
    const previa = instancias.get(pieza.id);
    if (!pieza.id || (previa && (
      previa.contenedor !== pieza.contenedor || previa.ubicacion !== pieza.ubicacion ||
      previa.cantidad !== pieza.cantidad || !Object.is(previa.pesoKg, pieza.pesoKg)
    ))) throw Error('Datos contradictorios para una instancia de inventario.');
    instancias.set(pieza.id, pieza);
  }

  const ubicaciones = new Map<string, PiezaCarga['ubicacion']>();
  const pendientes: string[] = [];
  let pesoConocido = 0;
  for (const pieza of instancias.values()) {
    const ruta = new Set<string>();
    let actual = pieza;
    while (actual.contenedor !== undefined && !ubicaciones.has(actual.id)) {
      if (ruta.has(actual.id)) throw Error('Hay un ciclo entre contenedores.');
      ruta.add(actual.id);
      const padre = instancias.get(actual.contenedor);
      if (!padre) throw Error('Falta el contenedor de un objeto.');
      actual = padre;
    }
    const ubicacion = ubicaciones.get(actual.id) ?? actual.ubicacion;
    for (const id of ruta) ubicaciones.set(id, ubicacion);
    if (ubicacion === 'externo') continue;

    const { pesoKg, cantidad } = pieza;
    if (pesoKg === undefined || !Number.isFinite(pesoKg) || pesoKg < 0 ||
        !Number.isSafeInteger(cantidad) || cantidad < 1 || !Number.isFinite(pesoKg * cantidad + pesoConocido)) {
      pendientes.push(pieza.id);
      continue;
    }
    pesoConocido += pesoKg * cantidad;
  }

  const fisico = Number.isFinite(aptitudes.fisico) ? aptitudes.fisico : undefined;
  const resistencia = Number.isFinite(aptitudes.resistencia) ? aptitudes.resistencia : undefined;
  const capacidadProvisional = fisico === undefined || resistencia === undefined ||
    (aptitudes.bono !== undefined && !Number.isFinite(aptitudes.bono));
  const capacidadCalculada = 12 + 3 * (fisico ?? 5) + 2 * (resistencia ?? 5) +
    (Number.isFinite(aptitudes.bono) ? aptitudes.bono! : 0);
  if (!Number.isFinite(capacidadCalculada)) throw Error('La capacidad estimada excede el rango numérico.');
  const capacidad = Math.max(1, capacidadCalculada);
  const ratio = pesoConocido / capacidad;
  const indice = [0.8, 1, 1.25, 1.5].filter(umbral => ratio - umbral > 4 * Number.EPSILON).length;
  return {
    pesoConocido,
    capacidad,
    capacidadProvisional,
    pendientes,
    ratio: pendientes.length ? null : ratio,
    banda: pendientes.length ? null : BANDAS[indice],
  };
}
