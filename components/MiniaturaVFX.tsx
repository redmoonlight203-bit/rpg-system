import {buscarVFX} from '../lib/vfx';

export default function MiniaturaVFX({clip,giro}:{clip:string;giro?:string}){
 const recurso=buscarVFX(clip);
 if(!recurso)return null;
 return <picture>
  <source media="(prefers-reduced-motion: reduce)" srcSet={recurso.poster||'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}/>
  <img src={recurso.bucle||recurso.url} alt="" loading="lazy" draggable={false} style={giro?{transform:giro}:undefined}/>
 </picture>;
}
