// Comprobación en navegador de los diálogos en pantalla (plan «Yunque · una más», paso 1.5).
// Escenarios: borrar una creación desde la Forja (cancelar y confirmar), aprender una habilidad del árbol
// y retirar una oferta de la tienda. Escritorio (1440) y móvil (390), sin scroll horizontal.
// Uso: servidor en 3100 con Supabase de mentira (ver scripts/capturar-yunque.mjs) y
//   node scripts/comprobar-dialogos.mjs   (SALIDA=docs/metricas/capturas por defecto)
import {createRequire} from 'node:module';import {mkdirSync} from 'node:fs';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{playwright=require(require.resolve('playwright',{paths:[process.env.NODE_PATH||'/usr/lib/node_modules','/usr/local/lib/node_modules']}));}
const {chromium}=playwright;
const BASE=process.env.BASE||'http://localhost:3100',SALIDA=process.env.SALIDA||'docs/metricas/capturas';
mkdirSync(SALIDA,{recursive:true});
const GM='00000000-0000-4000-8000-00000000000a',ahora=new Date().toISOString();
const user={id:GM,aud:'authenticated',role:'authenticated',email:'kuroi@ejemplo.test',app_metadata:{},user_metadata:{},created_at:ahora};
const sesion={access_token:'x.eyJzdWIiOiJ4In0.x',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'r',user};
const pj={id:7,nombre:'Aiko',user_id:GM,raza:'humano',nivel:3,exp_total:400,puntos_habilidad:5,atributos:{fuerza:10},estado_vida:'vivo',estado_aprobacion:'aprobado'};
const nodo={id:'n1',personaje_id:7,padre_id:null,nombre:'Tajo arcano',descripcion:'Un corte envuelto en luz.',tipo:'habilidad',habilidad_id:'h1',atributo:null,incremento:null,coste:2,nivel_minimo:1,aprendido_at:null,puntos_gastados:0,bloqueo:null};
const forja=[{id:'f1',nombre:'Espada de ceniza',tipo:'espadas',tipo_creacion:'objeto',estado:'aprobado',clase:'C',stats:{},descripcion:'Hoja gris.',created_at:ahora,habilidades:[],pasivas:[],equipamiento:{},configuracion_dados:[],reglas:[],slot_tipo:'mano',ligado_al_alma:false,es_grupo:false,stats_rango:{},requisitos_uso:{}}];
const tablas={perfiles:[{id:GM,rol:'KUROI',estado:'aprobado',nombre:'Kuroi',email:'kuroi@ejemplo.test',mente_colmena:false,lugares_conocidos:[],created_at:ahora}],
 personajes:[pj],forja_maestra:forja,categorias_forja:[{id:'c6',clave:'armas',nombre:'Armas',parent_id:null,created_at:ahora},{id:'c7',clave:'espadas',nombre:'Espadas',parent_id:'c6',created_at:ahora}],config_estadisticas:[],monedas:[{id:'m1',nombre:'Oro',simbolo:'◎'}],
 tienda_ofertas:[{id:'o1',forja_id:'f1',nombre:'Espada de ceniza',descripcion:'Hoja gris.',tipo:'objeto',clase:'C',estado:'disponible',negociador_id:null,negociador_nombre:null,propuesta:null,modo_precio:'monedas',moneda_id:'m1',precio:30,destino_personaje:null,plantilla:{ligado_al_alma:false}}]};
const rpcs=[];
const interceptar=async route=>{const req=route.request(),url=new URL(req.url()),p=url.pathname;
 const json=(b,s=200)=>route.fulfill({status:s,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-range':'0-0/*'},body:JSON.stringify(b)});
 if(req.method()==='OPTIONS')return json({});
 if(p.startsWith('/auth/v1/user'))return json(user);
 if(p.startsWith('/auth/v1/'))return json(sesion);
 if(p.startsWith('/rest/v1/rpc/')){const n=p.split('/').pop();rpcs.push(n);
  if(n==='arbol_leer')return json({personaje:pj,nodos:[nodo],atributos:[{clave:'fuerza',etiqueta:'Fuerza'}]});
  return json(null);}
 if(p.startsWith('/rest/v1/')){const filas=tablas[p.split('/').pop()]||[];const uno=(req.headers()['accept']||'').includes('vnd.pgrst.object');return json(uno?(filas[0]??null):filas);}
 return json({});};
const fallos=[];const comprobar=(ok,msg)=>{console.log(`${ok?'✓':'✗'} ${msg}`);if(!ok)fallos.push(msg);};
const navegador=await chromium.launch();
try{
 for(const [ancho,alto,etiqueta] of [[1440,900,'escritorio'],[390,844,'390']]){
  const ctx=await navegador.newContext({viewport:{width:ancho,height:alto},deviceScaleFactor:2});
  await ctx.addInitScript(s=>{localStorage.setItem('sb-ejemplo-auth-token',s);localStorage.setItem('personaje_activo_id','7');},JSON.stringify(sesion));
  await ctx.route('https://ejemplo.supabase.co/**',interceptar);
  const pag=await ctx.newPage();const errores=[];pag.on('pageerror',e=>errores.push(e.message));
  const dialogo=pag.locator('[role=alertdialog]');
  const sinScroll=async donde=>comprobar(await pag.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${etiqueta} · ${donde}: sin scroll horizontal`);
  // 1 · Forja: borrar una creación (cancelar, luego confirmar).
  await pag.goto(BASE+'/dm/forja',{waitUntil:'networkidle',timeout:120000});
  await pag.getByRole('button',{name:/Ver detalles de Espada de ceniza/}).first().click();
  await pag.getByRole('button',{name:/Eliminar creación/}).click();
  await dialogo.waitFor({timeout:10000});
  comprobar(await dialogo.getByRole('heading',{name:'Eliminar creación'}).isVisible(),`${etiqueta} · Forja: aparece el panel «Eliminar creación»`);
  comprobar(await pag.evaluate(()=>document.activeElement?.textContent==='Eliminar'),`${etiqueta} · Forja: el foco va al botón de aceptar`);
  await sinScroll('panel de la Forja');
  await pag.screenshot({path:`${SALIDA}/dialogo-forja-${etiqueta}.png`});
  const antes=rpcs.length;
  await pag.keyboard.press('Escape');await dialogo.waitFor({state:'detached'});
  comprobar(!rpcs.slice(antes).includes('forja_eliminar'),`${etiqueta} · Forja: Esc cancela sin borrar`);
  await pag.getByRole('button',{name:/Eliminar creación/}).click();await dialogo.waitFor();
  await dialogo.getByRole('button',{name:'Eliminar'}).click();await dialogo.waitFor({state:'detached'});
  await pag.waitForTimeout(400);
  comprobar(rpcs.slice(antes).includes('forja_eliminar'),`${etiqueta} · Forja: confirmar llama a forja_eliminar`);
  // 2 · Árbol: aprender una habilidad.
  tablas.perfiles[0].rol='REENCARNADO';
  await pag.goto(BASE+'/ficha/experiencia',{waitUntil:'networkidle',timeout:120000});
  await pag.locator('.arbol-node',{hasText:'Tajo arcano'}).click();
  await pag.getByRole('button',{name:/Aprender por 2 puntos/}).click();
  await dialogo.waitFor({timeout:10000});
  comprobar((await dialogo.textContent()).includes('¿Aprender «Tajo arcano» por 2 puntos de Aiko?'),`${etiqueta} · Árbol: el panel conserva el mensaje`);
  await sinScroll('panel del árbol');
  await pag.screenshot({path:`${SALIDA}/dialogo-arbol-${etiqueta}.png`});
  const a2=rpcs.length;
  await dialogo.getByRole('button',{name:'Aprender'}).click();await pag.waitForTimeout(400);
  comprobar(rpcs.slice(a2).includes('arbol_comprar'),`${etiqueta} · Árbol: aceptar llama a arbol_comprar`);
  tablas.perfiles[0].rol='KUROI';
  // 3 · Tienda del GM: retirar una oferta (clic fuera cancela; aceptar retira).
  await pag.goto(BASE+'/dm/mercado',{waitUntil:'networkidle',timeout:120000});
  await pag.getByRole('button',{name:'Retirar oferta'}).first().click();
  await dialogo.waitFor({timeout:10000});
  await sinScroll('panel de la tienda');
  await pag.screenshot({path:`${SALIDA}/dialogo-tienda-${etiqueta}.png`});
  const a3=rpcs.length;
  await pag.mouse.click(5,5);await dialogo.waitFor({state:'detached'});
  comprobar(!rpcs.slice(a3).includes('tienda_operar_v4'),`${etiqueta} · Tienda: clic fuera cancela`);
  await pag.getByRole('button',{name:'Retirar oferta'}).first().click();await dialogo.waitFor();
  await dialogo.getByRole('button',{name:'Retirar'}).click();await pag.waitForTimeout(400);
  comprobar(rpcs.slice(a3).includes('tienda_operar_v4'),`${etiqueta} · Tienda: aceptar retira la oferta`);
  comprobar(errores.length===0,`${etiqueta} · sin errores de página ${errores.join(' | ')}`);
  await ctx.close();
 }
}finally{await navegador.close();}
if(fallos.length){console.log(`\n${fallos.length} comprobaciones fallaron.`);process.exit(1);}
console.log('\nTodo correcto.');
