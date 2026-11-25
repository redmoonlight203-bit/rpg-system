// @ts-nocheck -- Runtime Deno de Supabase.
import {solicitarInvocacion,presupuestoRestante,actuarConReacciones,turnoConReacciones,responderReaccion,acciones,estadisticas,maxVida,dadoSeguro,desplazar,posicionesTablero,huellaDe,huellaReserva,dimensionesTablero,casillasAlcanzables,movimientoRestante,levantarse,phDisponibles,vistaOcular,reaccionesDe,responderVoz,resistirVoz,estaDominado,proyectarRespuesta,desproyectar,reaccionLaDecideGM,controlDe,controladosPor,recursosVisibles,estadosVisibles,esqueletoDeAccion,esqueletoVisual,conceptosDe,describirConcepto} from '../equipo-combate/motor.js';
/** La animación sale del esqueleto del arma (motor: esqueletoDeAccion), nunca del nombre. */
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const respuesta=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return respuesta({error:'Método no permitido.'},405);
 const inicio=performance.now(),mediciones={};
 try{
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return respuesta({error:'Inicia sesión.'},401);
  const u=await fetch(`${url}/auth/v1/user`,{headers:{Authorization:auth,apikey:key}});if(!u.ok)return respuesta({error:'Sesión inválida.'},401);
  const user=await u.json();if(!user.id)return respuesta({error:'Inicia sesión.'},401);mediciones.auth_ms=performance.now()-inicio;
  const texto=await req.text();if(texto.length>5000)return respuesta({error:'Solicitud demasiado grande.'},413);
  const body=JSON.parse(texto);
  const rpc=async(nombre,args)=>{const r=await fetch(`${url}/rest/v1/rpc/${nombre}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,apikey:key,'Content-Type':'application/json'},body:JSON.stringify(args)});const data=await r.json();if(!r.ok){const e=new Error(data.message||'No se pudo consultar el encuentro.');e.code=data.code||`HTTP_${r.status}`;throw e;}return data;};
  if(body.combate_id!=null&&(typeof body.combate_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.combate_id)))throw Error('Encuentro inválido.');
  if(body.combate_id&&(typeof body.actor_id!=='string'||body.actor_id.length>100))throw Error('Selecciona un participante.');
  const args={p_usuario:user.id,p_combate:body.combate_id||null,p_actor:body.actor_id||null};
  if(body.action_id!==undefined&&(typeof body.action_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.action_id)))throw Error('action_id inválido.');
  if(body.operacion==='consultar_accion'){
   if(!body.action_id)throw Error('Selecciona una acción.');
   return respuesta(await rpc('jugador_accion_estado_servidor',{...args,p_action_id:body.action_id}));
  }
  // Potenciadores (rasgos combinables) y control mental viajan en el comando: forman parte de la idempotencia.
  const potenciadores=Array.isArray(body.potenciadores)?body.potenciadores.slice(0,4).map(p=>({rasgo:String(p?.rasgo||'').slice(0,60),potenciador:String(p?.potenciador||'').slice(0,60),unidades:Number.isInteger(p?.unidades)?p.unidades:undefined})):undefined;
  const controlado=typeof body.controlado_id==='string'&&body.controlado_id.length<=100?body.controlado_id:undefined;
  const comando={respuesta:typeof body.respuesta==='string'?body.respuesta.slice(0,200):undefined,version:body.version,operacion:body.operacion,accion_id:body.accion_id,objetivo_id:body.objetivo_id,forzar:body.forzar===true,destino:body.destino,centro:body.centro,potenciadores,controlado_id:controlado};
  const lectura=performance.now();
  let ctx=body.operacion&&body.action_id?
   await rpc('jugador_preparar_accion_servidor',{...args,p_action_id:body.action_id,p_comando:comando}):
   await rpc('jugador_consultar_rapido_servidor',{...args,p_version:!body.operacion&&Number.isInteger(body.version)?body.version:null});
  mediciones.lectura_ms=performance.now()-lectura;
  if(ctx.sin_cambios)return respuesta(ctx);
  if(!body.combate_id){if(body.operacion)throw Error('Selecciona un encuentro.');return respuesta({encuentros:ctx});}
  const dados=[];const rng=caras=>{const valor=dadoSeguro(caras);dados.push({caras,valor});return valor;};
  let resultado;
  if(body.operacion&&!ctx.recibo?.confirmada){
   const motorInicio=performance.now();
   const c=ctx.combate,m=ctx.actor;
   const responde=['aceptar_reaccion','rechazar_reaccion'].includes(body.operacion);
   const mente=['responder_voz','resistir_voz'].includes(body.operacion);
   const oferta=c.reaccion_pendiente?.oferta;
   if(responde&&(!oferta||oferta.defensor!==m.id||reaccionLaDecideGM(m)))throw Error('No tienes esa reacción pendiente.');
   if(!responde&&oferta)throw Error('Espera la respuesta del defensor.');
   // Control mental: el jugador cuya criatura lo lanzó actúa con el afectado en su turno (el bando real no cambia).
   const dirigido=controlado?c.miembros.find(x=>x.id===controlado):undefined;
   if(controlado&&(body.operacion!=='actuar'||!dirigido||controlDe(dirigido)?.controlador!=='fuente'||controlDe(dirigido)?.fuente!==m.id))throw Error('No controlas a ese combatiente.');
   if(!responde&&!mente&&!dirigido&&estaDominado(m))throw Error('Tu personaje está controlado: no decides sus actos.');
   // Una acción legendaria propia se puede usar fuera del turno; el motor comprueba lo que le queda en la ronda.
   const legendaria=body.operacion==='actuar'&&!dirigido&&c.actual!==m.id&&acciones(m).find(a=>a.id===body.accion_id)?.presupuesto==='legendaria';
   if(c.fase!=='en_curso'||!responde&&!mente&&!legendaria&&c.actual!==(dirigido||m).id||m.vida<=0)throw Error('Espera al turno de tu personaje.');
   if(!responde&&m.transformacion?.descontrolada)throw Error('Tu personaje está poseído y no puedes controlarlo.');
   if(!Number.isInteger(body.version)||body.version!==ctx.version)throw Error('El combate cambió. Recarga antes de actuar.');
   let next;
   // Con espejo mental, el jugador hace clic en la vista reflejada: se traduce a la casilla real.
   const espejo=m.espejo_mental,dimsReal=dimensionesTablero(c);
   if(espejo){if(body.destino)body.destino=desproyectar(body.destino,espejo,dimsReal,huellaDe(m).ancho);if(body.centro)body.centro=desproyectar(body.centro,espejo,dimsReal);}
   if(responde)next=responderReaccion(c,m.id,body.operacion==='aceptar_reaccion',rng);
   else if(body.operacion==='responder_voz')next=responderVoz(c,m.id,String(body.respuesta||''));
   else if(body.operacion==='resistir_voz')next=resistirVoz(c,m.id,rng);
   else if(body.operacion==='pasar')next=turnoConReacciones(c,'siguiente',rng);
   else if(body.operacion==='levantarse')next=levantarse(c,m.id);
   else if(body.operacion==='mover')next=desplazar(c,m.id,body.destino);
   else if(body.operacion==='actuar'){
    if(typeof body.accion_id!=='string'||body.accion_id.length>300||typeof body.objetivo_id!=='string'||(!body.centro&&!c.miembros.some(x=>x.id===body.objetivo_id)))throw Error('Acción u objetivo inválidos.');
    next=body.accion_id.startsWith("invocar:")?solicitarInvocacion(c,(dirigido||m).id,body.accion_id):actuarConReacciones(c,(dirigido||m).id,body.accion_id,body.objetivo_id,rng,body.forzar===true,body.centro,potenciadores);resultado=next.resultado;
   }else throw Error('Operación no permitida.');
   if(body.operacion!=='mover'){
    const quien=dirigido||m,accion=body.operacion==='actuar'?acciones(quien).find(a=>a.id===body.accion_id):undefined;
    next.evento_visual={...(next.evento_visual?.id!==c.evento_visual?.id?next.evento_visual:undefined),id:crypto.randomUUID(),nombre:quien.nombre,dados,resultado,arma_visual:esqueletoDeAccion(quien,accion,body.accion_id),esqueleto:esqueletoVisual(accion?.efecto)};
   }
   delete next.historial;
   mediciones.motor_ms=performance.now()-motorInicio;
   const commitInicio=performance.now();
   ctx=body.action_id?
    await rpc('jugador_confirmar_accion_servidor',{...args,p_action_id:body.action_id,p_comando:comando,p_version:ctx.version,p_datos:next}):
    await rpc('jugador_confirmar_rapido_servidor',{...args,p_version:ctx.version,p_datos:next});
   mediciones.commit_ms=performance.now()-commitInicio;
  }
  const c=ctx.combate,m=ctx.actor,posiciones=posicionesTablero(c);
  mediciones.total_ms=performance.now()-inicio;
  const vistaReal={recibo:ctx.recibo,mediciones,propios:ctx.propios,id:ctx.id,nombre:ctx.nombre,version:ctx.version,fase:c.fase,ronda:c.ronda,actual:c.miembros.find(x=>x.id===c.actual)?.nombre||'',reaccion:c.reaccion_pendiente?.oferta.defensor===m.id&&!reaccionLaDecideGM(m)?c.reaccion_pendiente.oferta:undefined,reaccion_esperando:c.reaccion_pendiente&&c.reaccion_pendiente.oferta.defensor!==m.id?c.reaccion_pendiente.oferta.nombre:undefined,es_turno:!c.reaccion_pendiente&&c.fase==='en_curso'&&c.actual===m.id&&!m.transformacion?.descontrolada&&!estaDominado(m),puede_legendaria:!c.reaccion_pendiente&&c.fase==='en_curso'&&c.actual!==m.id&&m.vida>0&&!m.transformacion?.descontrolada&&!estaDominado(m)&&presupuestoRestante(c,m).legendaria>0&&acciones(m).some(a=>a.presupuesto==='legendaria'&&!a.bloqueada),mapa:c.mapa,cierre:c.cierre,modo:c.politica?.modo,evento_visual:c.evento_visual,actual_id:c.actual,tablero:dimensionesTablero(c),movimiento_restante:movimientoRestante(m),alcanzables:casillasAlcanzables(c,m.id),registro:c.registro.slice(0,12),actor:{control_perdido:!!m.transformacion?.descontrolada,derribado:m.estados.some(e=>e.tipo==='derribado'),agotado:m.agotado,imagen_url:m.transformacion?.imagen_etapa||m.configuracion.imagen_url,id:m.id,personaje_id:m.personaje_id,nombre:m.nombre,vida:m.vida,max_vida:maxVida(m),ph:phDisponibles(m),fatiga:m.fatiga,stats:estadisticas(m),accion_usada:m.accion_usada,presupuesto:presupuestoRestante(c,m),rafaga:m.rafaga,estados:m.estados.map(e=>e.nombre),estados_detalle:estadosVisibles(m),recursos:recursosVisibles(m),guardia:{nombre:conceptosDe(m).guardia.nombre,frase:describirConcepto(conceptosDe(m).guardia)},controlado_por:controlDe(m)?.controlador||undefined,controlados:controladosPor(c,m.id).map(x=>({id:x.id,nombre:x.nombre,turno:c.actual===x.id,acciones:acciones(x).filter(a=>!a.bloqueada).map(a=>({id:a.id,nombre:a.nombre,efecto:a.efecto,potenciadores:a.potenciadores}))})),reacciones:reaccionesDe(c,m),dominado:estaDominado(m),voz:m.voz_artefacto?.estado==='activa'?{...m.voz_artefacto,puede_resistir:!m.voz_resistida}:undefined},acciones:acciones(m).map(({invocacion,...a})=>({...a,...(invocacion&&m.solicitud_invocacion?.turno===m.turnos&&m.solicitud_invocacion.accion===a.id?{bloqueada:'Pendiente de confirmación del GM.'}:{}),enfriamiento:a.regla?Math.max(0,(m.motor?.proximos[a.regla]||0)-m.turnos):m.cooldowns[a.id]||0})),objetivos:c.miembros.map(x=>({vfx:x.transformacion?.vfx,id:x.id,nombre:x.nombre,bando:x.bando,caido:x.vida<=0,vida:x.vida,max_vida:maxVida(x),imagen_url:x.transformacion?.imagen_etapa||x.configuracion.imagen_url,estados:x.estados.map(e=>e.nombre),posicion:posiciones[x.id],huella:huellaDe(x),huella_reserva:huellaDe(huellaReserva(x))})),ocular:vistaOcular(c,m.id),dados:ctx.recibo?.repetida?ctx.recibo.evento?.dados||[]:dados,resultado:ctx.recibo?.repetida?ctx.recibo.evento?.resultado:resultado};
  // Espejo mental: solo la vista de este jugador cambia; el GM y el registro ven el tablero real.
  return respuesta(proyectarRespuesta(vistaReal,m.id,m.espejo_mental||m.percepcion_alterada));
 }catch(e){return respuesta({error:e.message||'No se pudo completar la acción.',code:e.code,incierta:['57014','55P03','40P01','40001'].includes(e.code)||String(e.code||'').startsWith('HTTP_5')||e instanceof TypeError||e instanceof SyntaxError||e.name==='AbortError'},400);}
});
