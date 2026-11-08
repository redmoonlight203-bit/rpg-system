// @ts-nocheck -- Runtime Deno de Supabase.
import {nuevoCombate,agregar,iniciar,dadoSeguro} from '../equipo-combate/motor.js';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const respuesta=(v,status=200)=>new Response(JSON.stringify(v),{status,headers});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return respuesta({error:'Método no permitido.'},405);
 try{
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),auth=req.headers.get('Authorization');
 if(!auth?.startsWith('Bearer '))return respuesta({error:'Inicia sesión.'},401);
 const u=await fetch(`${url}/auth/v1/user`,{headers:{Authorization:auth,apikey:key}});if(!u.ok)return respuesta({error:'Sesión inválida.'},401);const user=await u.json();
 const texto=await req.text();if(texto.length>2000)throw Error('Solicitud demasiado grande.');const b=JSON.parse(texto);
 const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
 if(!/^\d{1,18}$/.test(String(b.personaje_id)))throw Error('Selecciona un personaje.');
 const rpc=async(n,args)=>{const r=await fetch(`${url}/rest/v1/rpc/${n}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,apikey:key,'Content-Type':'application/json'},body:JSON.stringify(args)});const d=await r.json();if(!r.ok)throw Error(d.message||'La arena no está disponible.');return d;};
 const preparado=await rpc('arena_preparar_servidor',{p_usuario:user.id,p_personaje:b.personaje_id});
 let c,sala,version=0,nombre,modo;
 if(b.operacion==='crear'){
 if(!['pvp','pve'].includes(b.modo))throw Error('Elige PvP o PvE.');
 c=nuevoCombate();c.politica={...c.politica,modo:'entrenamiento',limite_rondas:Math.max(0,Math.min(1000,Math.trunc(Number(b.limite_rondas)||100)))};
 c=agregar(c,preparado,'jugador',dadoSeguro);sala=crypto.randomUUID();nombre=String(b.nombre||'Arena de entrenamiento').slice(0,120);modo=b.modo;
 if(modo==='pve'){
 if(!uuid(b.enemigo_id))throw Error('Selecciona un enemigo.');const enemigo=await rpc('arena_preparar_servidor',{p_usuario:user.id,p_personaje:b.personaje_id,p_enemigo:b.enemigo_id});c=agregar(c,enemigo,'enemigo',dadoSeguro);c=iniciar(c,dadoSeguro);
 }
 }else if(b.operacion==='unirse'){
 if(!uuid(b.sala_id))throw Error('Sala inválida.');const ctx=await rpc('arena_contexto_servidor',{p_usuario:user.id,p_sala:b.sala_id});c=agregar(ctx.combate,preparado,'enemigo',dadoSeguro);c=iniciar(c,dadoSeguro);sala=b.sala_id;version=ctx.version;nombre=ctx.sala.nombre;modo='pvp';
 }else throw Error('Operación no permitida.');
 const id=await rpc('arena_guardar_servidor',{p_usuario:user.id,p_sala:sala,p_nombre:nombre,p_modo:modo,p_datos:c,p_version:version});return respuesta({combate_id:id,sala_id:sala});
 }catch(e){return respuesta({error:e.message||'No se pudo entrar a la arena.'},400);}
});
