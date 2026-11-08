import IconoYugen from './IconoYugen';
import {validarPortada} from '../lib/imagenes-creacion';
export default function ImagenIconoLogro({icono,imagen,nombre,size=56}:{icono?:string|null;imagen?:string|null;nombre:string;size?:number}){
 return <span className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-amber-800/60 bg-neutral-950 text-amber-200" style={{width:size,height:size}}><IconoYugen id={icono||'corona'} size={Math.round(size*.65)}/>{imagen&&!validarPortada(imagen)&&<img src={imagen} alt={nombre} className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display='none';}}/>}</span>; // eslint-disable-line @next/next/no-img-element
}
