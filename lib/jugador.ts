import {errorDeServidor} from './accion-segura';
import {registrarMetrica} from './metricas-combate';
import {supabase} from './supabase';
export async function consultarCombateJugador(body:Record<string,unknown>={}){
 const {data,error}=await supabase.functions.invoke('combate-jugador',{body,timeout:15000});
 if(error){let detalle={message:error.message};try{const d=await error.context.json();detalle={...d,message:d.error||error.message};}catch{}throw errorDeServidor(detalle,error.context?.status);}
 if(data?.error)throw errorDeServidor({...data,message:data.error});
 for(const [tramo,ms] of Object.entries(data?.mediciones||{}))if(typeof ms==='number')registrarMetrica('servidor.'+tramo,ms);
 return data;
}
