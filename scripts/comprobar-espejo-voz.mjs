// Comprobación en navegador de la pantalla de combate del jugador con espejo mental y voz de demonio
// (plan «Yunque · una más», pasos 3.4 y 3.5). La Edge Function se simula con el motor real: la respuesta se
// proyecta como en supabase/functions/combate-jugador. Escritorio (1440) y móvil (390).
// Uso: servidor en 3100 con Supabase de mentira y node scripts/comprobar-espejo-voz.mjs
import {createRequire} from 'node:module';import {mkdirSync} from 'node:fs';
import * as motor from '../supabase/functions/equipo-combate/motor.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const BASE=process.env.BASE||'http://localhost:3100',SALIDA=process.env.SALIDA||'docs/metricas/capturas';
mkdirSync(SALIDA,{recursive:true});
const YO='00000000-0000-4000-8000-0000000000b1',ahora=new Date().toISOString(),COMBATE='11111111-2222-4333-8444-555555555555';
const user={id:YO,aud:'authenticated',role:'authenticated',email:'aiko@ejemplo.test',app_metadata:{},user_metadata:{},created_at:ahora};
const sesion={access_token:'x.eyJzdWIiOiJ4In0.x',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'r',user};
const ficha=(id,nombre,x,efectos=[{id:'golpe',nombre:'Golpe',efecto:'dano',cantidad:1,caras:6,modificador:0,coste_ph:0}])=>({id,nombre,stats:{vida:40,ph:10,armadura:0,voluntad:0},posicion:{x,y:2},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h'+id,nombre:'H',stats:{},efectos}]}});
const voces={cd:14,atributo:'voluntad',duracion:3,voces:[{id:'q',tipo:'pregunta',texto:'¿A quién quieres ver sangrar?',opciones:['Al enemigo','A tu aliado']}]};
function preparar(){
 let c=motor.nuevoCombate();
 c=motor.agregar(c,ficha('p','Aiko',1),'jugador',()=>20);c=motor.agregar(c,ficha('aliado','Bram',2),'jugador',()=>1);c=motor.agregar(c,ficha('malo','Goblin',6),'enemigo',()=>1);
 c=motor.iniciar(c,()=>1);c.regla='directo';c.actual='p';
 c=motor.asignarVoz(motor.tomarArtefacto(c,'p',voces,()=>2),'p','q');
 c=motor.lanzarEspejo(c,'p',{espejar:true,intercambiar:true,ocultar:true,cd:15,atributo:'voluntad'});
 return c;
}
let c,version=1;const enviados=[];
function vista(){
 const m=c.miembros.find(x=>x.id==='p'),pos=motor.posicionesTablero(c);
 const real={id:COMBATE,nombre:'Prueba del espejo',version,fase:c.fase,ronda:c.ronda,actual:c.miembros.find(x=>x.id===c.actual)?.nombre||'',actual_id:c.actual,es_turno:c.actual==='p'&&!c.reaccion_pendiente,
  tablero:motor.dimensionesTablero(c),movimiento_restante:motor.movimientoRestante(m),alcanzables:motor.casillasAlcanzables(c,'p'),registro:c.registro.slice(0,12),evento_visual:c.evento_visual,dados:[],
  propios:[{id:'p',personaje_id:'7',nombre:'Aiko',es_turno:true}],
  actor:{id:'p',personaje_id:'7',nombre:m.nombre,vida:m.vida,max_vida:motor.maxVida(m),ph:motor.phDisponibles(m),fatiga:m.fatiga,stats:motor.estadisticas(m),accion_usada:m.accion_usada,estados:m.estados.map(e=>e.nombre),reacciones:motor.reaccionesDe(c,m),dominado:motor.estaDominado(m),voz:m.voz_artefacto?.estado==='activa'?{...m.voz_artefacto,puede_resistir:!m.voz_resistida}:undefined},
  acciones:motor.acciones(m).map(a=>({...a,enfriamiento:m.cooldowns[a.id]||0})),
  objetivos:c.miembros.map(x=>({id:x.id,nombre:x.nombre,bando:x.bando,caido:x.vida<=0,vida:x.vida,max_vida:motor.maxVida(x),estados:x.estados.map(e=>e.nombre),posicion:pos[x.id]}))};
 return motor.proyectarRespuesta(real,'p',m.espejo_mental);
}
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
const interceptar=async route=>{const req=route.request(),p=new URL(req.url()).pathname;
 const json=b=>route.fulfill({status:200,contentType:'application/json',headers:{...cors,'content-range':'0-0/*'},body:JSON.stringify(b)});
 if(req.method()==='OPTIONS')return json({});
 if(p.startsWith('/auth/v1/user'))return json(user);
 if(p.startsWith('/auth/v1/'))return json(sesion);
 if(p.endsWith('/functions/v1/combate-jugador')){
  const b=req.postDataJSON()||{};
  if(!b.combate_id)return json({encuentros:[{id:COMBATE,nombre:'Prueba del espejo',fase:'en_curso',personajes:[{id:'p',personaje_id:'7',nombre:'Aiko',es_turno:true}]}]});
  if(b.operacion==='consultar_accion')return json({confirmada:true});
  if(b.operacion){enviados.push(b);
   if(b.operacion==='responder_voz')c=motor.responderVoz(c,'p',b.respuesta);
   if(b.operacion==='actuar')c=motor.actuar(c,'p',b.accion_id,b.objetivo_id,()=>4);
   version++;}
  return json(vista());
 }
 if(p.includes('/functions/v1/'))return json({fuentes:[],seleccion:{},version:version,combate_id:COMBATE});
 if(p.startsWith('/rest/v1/perfiles'))return json((req.headers()['accept']||'').includes('pgrst.object')?{rol:'REENCARNADO',estado:'aprobado',mente_colmena:false}:[{id:YO,rol:'REENCARNADO',estado:'aprobado'}]);
 if(p.startsWith('/rest/v1/rpc/'))return json(null);
 return json((req.headers()['accept']||'').includes('pgrst.object')?null:[]);};
const fallos=[];const comprobar=(ok,msg)=>{console.log(`${ok?'✓':'✗'} ${msg}`);if(!ok)fallos.push(msg);};
const navegador=await chromium.launch();
try{
 for(const [ancho,alto,etiqueta] of [[1440,900,'escritorio'],[390,844,'390']]){
  c=preparar();version=1;enviados.length=0;
  const ctx=await navegador.newContext({viewport:{width:ancho,height:alto},deviceScaleFactor:2});
  await ctx.addInitScript(s=>{localStorage.setItem('sb-ejemplo-auth-token',s);},JSON.stringify(sesion));
  await ctx.route('https://ejemplo.supabase.co/**',interceptar);
  const pag=await ctx.newPage();const errores=[];pag.on('pageerror',e=>errores.push(e.message));
  await pag.goto(BASE+'/ficha/combate',{waitUntil:'networkidle',timeout:120000});
  await pag.getByRole('button',{name:/Aiko/}).first().click();
  const aviso=pag.locator('.aviso-espejo');await aviso.waitFor({timeout:15000});
  comprobar(/Tu mente se confunde/.test(await aviso.textContent()),`${etiqueta} · aviso en primera persona visible`);
  const voz=pag.locator('.mv-voz');
  comprobar(await voz.isVisible()&&/A quién quieres ver sangrar/.test(await voz.textContent()),`${etiqueta} · la voz del artefacto aparece en su pantalla`);
  comprobar(await pag.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${etiqueta} · sin scroll horizontal`);
  await pag.waitForTimeout(900);await pag.screenshot({path:`${SALIDA}/espejo-voz-${etiqueta}.png`});
  await voz.getByRole('button',{name:'A tu aliado'}).click();await pag.waitForTimeout(800);
  comprobar(enviados.some(b=>b.operacion==='responder_voz'&&b.respuesta==='A tu aliado'),`${etiqueta} · responder a la voz envía la respuesta`);
  await pag.getByRole('button',{name:'Seguir luchando'}).click();await pag.waitForTimeout(300);
  comprobar(await pag.locator('.mv-eco').isVisible(),`${etiqueta} · la voz queda como eco y deja jugar`);
  const nombres=await pag.locator('.tactical-cell[aria-label]').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')));
  comprobar(!nombres.some(n=>/Bram|Goblin/.test(n||'')),`${etiqueta} · los demás aparecen sin nombre`);
  // Ataca al «enemigo» que ve en la casilla reflejada del aliado (x=2 → 7 en un tablero de 10).
  await pag.locator('.tactical-slots button',{hasText:'Golpe'}).first().click().catch(()=>{});
  const dims=motor.dimensionesTablero(c),pos=motor.posicionesTablero(c).aliado,indice=pos.y*dims.columnas+(dims.columnas-1-pos.x);
  await pag.locator('.tactical-board .tactical-cell').nth(indice).click();await pag.waitForTimeout(300);
  await pag.getByRole('button',{name:'Confirmar acción'}).click({timeout:3000}).catch(()=>{});await pag.waitForTimeout(1000);
  const ataque=enviados.find(b=>b.operacion==='actuar');
  comprobar(ataque?.objetivo_id==='aliado',`${etiqueta} · la acción viaja con el id real (${ataque?.objetivo_id})`);
  comprobar(c.registro.some(l=>/Bram recibe 4/.test(l)),`${etiqueta} · el registro real muestra al aliado («${c.registro.find(l=>/recibe/.test(l))}»)`);
  comprobar(errores.length===0,`${etiqueta} · sin errores de página ${errores.join(' | ')}`);
  await ctx.close();
 }
}finally{await navegador.close();}
if(fallos.length){console.log(`\n${fallos.length} comprobaciones fallaron.`);process.exit(1);}
console.log('\nTodo correcto.');
