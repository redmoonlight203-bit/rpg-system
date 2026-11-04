import {supabase} from './supabase';
export async function consultarCombateJugador(body:Record<string,unknown>={}){
 const {data,error}=await supabase.functions.invoke('combate-jugador',{body});
 if(error){let mensaje=error.message;try{mensaje=(await error.context.json()).error||mensaje;}catch{}throw Error(mensaje);}
 if(data?.error)throw Error(data.error);return data;
}
