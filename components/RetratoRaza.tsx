/** Figura neutra cuando no se conoce la raza (p. ej. al previsualizar un objeto en la Forja). */
export const FIGURA_POR_DEFECTO = '/arte/razas/humanos.webp';

/** Figura de la raza (imagen aportada por el propietario); sin raza conocida, la figura humana. */
export default function RetratoRaza({src,nombre,className=''}:{src?:string;nombre?:string;className?:string}){
 // eslint-disable-next-line @next/next/no-img-element -- imágenes estáticas de /arte o URL pública de Storage, tamaño fijo por CSS
 return <img src={src||FIGURA_POR_DEFECTO} alt={nombre?`Figura de la raza ${nombre}`:''} className={`y3-retrato-raza ${className}`} width={614} height={683} decoding="async" loading="lazy"/>;
}
