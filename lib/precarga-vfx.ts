import {buscarVFX} from './vfx';
const cache=new Map<string,Promise<void>>();
export function precargarVFX(ids:(string|undefined)[]){
 if(typeof Image==='undefined')return;
 for(const id of ids){const a=buscarVFX(id);if(!a||cache.has(a.url))continue;
  const imagen=new Image();imagen.src=a.url;
  cache.set(a.url,imagen.decode().catch(()=>{}));if(cache.size>96)cache.delete(cache.keys().next().value!);
 }
}
