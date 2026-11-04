// @ts-nocheck -- Supabase Edge usa Deno; el proyecto web usa TypeScript para Next.
import {agregar,nuevoCombate,cambiarEquipo,seleccionEquipo,estadisticas,maxVida,manosLibres} from './motor.js';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const respuesta=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return respuesta({error:'Método no permitido.'},405);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 try{
  const auth=req.headers.get('Authorization');
  if(!auth?.startsWith('Bearer '))return respuesta({error:'Inicia sesión.'},401);
  const usuario=await fetch(`${url}/auth/v1/user`,{headers:{Authorization:auth,apikey:key}});
  if(!usuario.ok)return respuesta({error:'Sesión inválida o vencida.'},401);
  const user=await usuario.json();if(!user.id)return respuesta({error:'Inicia sesión.'},401);
  if(Number(req.headers.get('content-length')||0)>20000)return respuesta({error:'Solicitud demasiado grande.'},413);
  const texto=await req.text();if(texto.length>20000)return respuesta({error:'Solicitud demasiado grande.'},413);
  const body=JSON.parse(texto);
  const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
  if(body.personaje_id!=null&&!/^\d{1,18}$/.test(String(body.personaje_id)))throw Error('Personaje inválido.');
  if(body.combate_id!=null&&!uuid(body.combate_id))throw Error('Encuentro inválido.');
  if(body.actor_id!=null&&(typeof body.actor_id!=='string'||body.actor_id.length>100))throw Error('Participante inválido.');
  const rpc=async(nombre,args)=>{const r=await fetch(`${url}/rest/v1/rpc/${nombre}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,apikey:key,'Content-Type':'application/json'},body:JSON.stringify(args)});const data=await r.json();if(!r.ok)throw Error(data.message||'No se pudo actualizar el equipo.');return data;};
  const args={p_usuario:user.id,p_personaje:body.personaje_id??null,p_combate:body.combate_id??null,p_actor:body.actor_id??null};
  const contexto=async()=>{const ctx=await rpc('equipo_contexto_servidor',args);if(ctx.actor)ctx.fuentes=[...new Map([...ctx.fuentes,...Object.values(ctx.actor.configuracion.equipamiento||{})].filter(p=>p.id).map(p=>[p.id,p])).values()];return ctx;};
  let ctx=await contexto();
  const preparar=ctx=>{
   if(ctx.combate){const c=ctx.combate,m=c.miembros.find(m=>m.id===ctx.actor.id);m.configuracion.reserva=[...ctx.fuentes];return {c,m};}
   const c=agregar(nuevoCombate(),ctx.preparado,'jugador',()=>1);return {c,m:c.miembros[0]};
  };
  if(!body.consultar){
   if(!Object.hasOwn(body,'combate_esperado')||body.combate_esperado!==(ctx.combate_id||null))throw Error('El encuentro del personaje cambió. Recarga.');
   if(ctx.combate_id&&body.version!==ctx.version)throw Error('El encuentro cambió. Recarga el equipamiento.');
   if(!ctx.combate_id&&body.firma!==ctx.firma)throw Error('El inventario cambió. Recarga el equipamiento.');
   if(!body.equipo||typeof body.equipo!=='object'||Array.isArray(body.equipo)||Object.keys(body.equipo).length>13||Object.values(body.equipo).some(x=>typeof x!=='string'||!uuid(x)))throw Error('Selección de equipo inválida.');
   const {c,m}=preparar(ctx);
   const next=cambiarEquipo(c,m.id,body.equipo);
   await rpc('equipo_confirmar_servidor',{p_usuario:user.id,p_personaje:ctx.personaje_id??null,p_combate:ctx.combate_id??null,p_actor:m.id,p_version:ctx.version??0,p_firma:ctx.firma??'',p_equipo:body.equipo,p_datos:ctx.combate_id?next:null});
   ctx=await contexto();
  }
  const {c,m}=preparar(ctx);
  // Nunca devolvemos al jugador las fichas ni el registro privado de sus enemigos.
  return respuesta({equipo:seleccionEquipo(m),fuentes:ctx.fuentes.map(p=>({id:p.id,nombre:p.nombre,slot_tipo:p.slot_tipo})),combate_id:ctx.combate_id||null,version:ctx.version||0,firma:ctx.combate_id?undefined:ctx.firma,es_turno:ctx.combate_id?c.actual===m.id:true,accion_usada:!!m.accion_usada,vida:m.vida,max_vida:maxVida(m),manos_libres:manosLibres(m),stats:estadisticas(m),formas:(m.motor?.modificadores||[]).map(x=>x.nombre),nombre:m.nombre});
 }catch(e){return respuesta({error:e.message||'No se pudo cambiar el equipo.'},400);}
});
