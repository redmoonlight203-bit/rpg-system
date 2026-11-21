// Cartas de La creación: un marco por tipo de creación y un color por rango (clase F–KUROI).
import {CLASES_YUGEN} from './clases';

/**
 * Marcos (public/arte/marcos/<tipo>.webp), uno por tipo: personaje (curvas y nudo), monstruo (espinas),
 * habilidad (cuchillas), objeto (metal atornillado), título (gótico con estandarte), pasiva (laureles) y
 * otro (art déco con gemas). Hasta recibir los archivos de título y pasiva, usan el art déco.
 */
export const MARCOS:Record<string,string>={
 personaje:'/arte/marcos/personaje.webp',
 monstruo:'/arte/marcos/monstruo.webp',
 habilidad:'/arte/marcos/habilidad.webp',
 objeto:'/arte/marcos/objeto.webp',
 titulo:'/arte/marcos/titulo.webp',
 pasiva:'/arte/marcos/otro.webp',
 otro:'/arte/marcos/otro.webp',
};
export function marcoDe(tipo:string,monstruo=false):string{
 return MARCOS[monstruo?'monstruo':tipo]||MARCOS.otro;
}

/** Nombre de cada rango para mostrar y su clase CSS (cg-rango-…). Una clase desconocida se trata como D. */
export const RANGOS:Record<string,string>={F:'Hierro',D:'Bronce',C:'Jade',B:'Acero azul',A:'Arcano',S:'Oro',Z:'Sangre',KUROI:'Kuroi'};
export function rangoDe(clase?:string|null):{clave:string;nombre:string;css:string}{
 const c=String(clase||'').trim().toUpperCase();
 const clave=(CLASES_YUGEN as readonly string[]).includes(c)?c:'D';
 return {clave,nombre:RANGOS[clave],css:'cg-rango-'+clave.toLowerCase()};
}
