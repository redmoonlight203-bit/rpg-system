import SiluetaYugen from './SiluetaYugen';

/** Figura de la raza (imagen aportada por el propietario) o la silueta genérica si la raza aún no tiene imagen. */
export default function RetratoRaza({src,nombre,className=''}:{src?:string;nombre?:string;className?:string}){
 // eslint-disable-next-line @next/next/no-img-element -- imágenes estáticas de /arte o URL pública de Storage, tamaño fijo por CSS
 if(src)return <img src={src} alt={nombre?`Figura de la raza ${nombre}`:''} className={`y3-retrato-raza ${className}`} width={614} height={683} decoding="async" loading="lazy"/>;
 return <SiluetaYugen className={className}/>;
}
