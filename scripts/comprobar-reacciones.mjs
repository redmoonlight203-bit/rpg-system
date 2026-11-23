// Comprobación en navegador del menú de reacción (plan «Yunque · una más», paso 2.6) en la arena del Yunque.
// Una habilidad con la plantilla «Absorción (Kion)» recibe un «Golpéame» mágico: aparece el menú con su coste;
// «No usar» deja pasar el golpe y «Usar» lo absorbe. Escritorio (1440) y móvil (390), sin scroll horizontal.
// Uso: servidor en 3100 con Supabase de mentira (ver scripts/capturar-yunque.mjs) y node scripts/comprobar-reacciones.mjs
import {createRequire} from 'node:module';import {mkdirSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const BASE=process.env.BASE||'http://localhost:3100',SALIDA=process.env.SALIDA||'docs/metricas/capturas';
mkdirSync(SALIDA,{recursive:true});
const GM='00000000-0000-4000-8000-00000000000a',ahora=new Date().toISOString();
const user={id:GM,aud:'authenticated',role:'authenticated',email:'kuroi@ejemplo.test',app_metadata:{},user_metadata:{},created_at:ahora};
const sesion={access_token:'x.eyJzdWIiOiJ4In0.x',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'r',user};
const tablas={perfiles:[{id:GM,rol:'KUROI',estado:'aprobado',nombre:'Kuroi',email:'kuroi@ejemplo.test',mente_colmena:false,lugares_conocidos:[],created_at:ahora}],
 categorias_forja:[{id:'c1',clave:'tecnicas',nombre:'Técnicas',parent_id:null,created_at:ahora}],config_estadisticas:[],forja_maestra:[]};
const interceptar=async route=>{const req=route.request(),p=new URL(req.url()).pathname;
 const json=b=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-range':'0-0/*'},body:JSON.stringify(b)});
 if(req.method()==='OPTIONS')return json({});
 if(p.startsWith('/auth/v1/user'))return json(user);
 if(p.startsWith('/auth/v1/'))return json(sesion);
 if(p.startsWith('/rest/v1/rpc/'))return json(null);
 if(p.startsWith('/rest/v1/')){const filas=tablas[p.split('/').pop()]||[];const uno=(req.headers()['accept']||'').includes('vnd.pgrst.object');return json(uno?(filas[0]??null):filas);}
 return json({});};
const fallos=[];const comprobar=(ok,msg)=>{console.log(`${ok?'✓':'✗'} ${msg}`);if(!ok)fallos.push(msg);};
const navegador=await chromium.launch();
try{
 for(const [ancho,alto,etiqueta] of [[1440,900,'escritorio'],[390,844,'390']]){
  const ctx=await navegador.newContext({viewport:{width:ancho,height:alto},deviceScaleFactor:2});
  await ctx.addInitScript(s=>{localStorage.setItem('sb-ejemplo-auth-token',s);},JSON.stringify(sesion));
  await ctx.route('https://ejemplo.supabase.co/**',interceptar);
  const pag=await ctx.newPage();const errores=[];pag.on('pageerror',e=>errores.push(e.message));
  await pag.goto(BASE+'/dm/forja',{waitUntil:'networkidle',timeout:120000});
  await pag.getByRole('button',{name:'El yunque',exact:true}).click();
  // En escritorio el núcleo es un nodo del lienzo; a 390 px, la primera sección de la lista.
  const habilidad=pag.locator('.yq-cartas button',{hasText:/^Habilidad/}).first();
  await habilidad.waitFor({timeout:20000});await habilidad.click();
  await pag.getByRole('textbox',{name:'Buscar en el Grimorio'}).or(pag.getByRole('searchbox',{name:'Buscar en el Grimorio'})).first().fill('Absorción');
  await pag.locator('.yq-grimorio button',{hasText:'Absorción (Kion)'}).first().click();
  await pag.waitForTimeout(1500);
  const arena=pag.locator('.yq-arena');
  await arena.locator('.yq-arena-naturaleza button',{hasText:'Mágica'}).click();
  const vida=async()=>Number(/vida (-?[\d.]+)\//.exec(await arena.locator('.tactical-cell[aria-label*="Doll portador"]').first().getAttribute('aria-label')||'')?.[1]??NaN);
  comprobar((await arena.locator('.mr-lista').textContent()||'').includes('2 PH'),`${etiqueta} · la ficha del doll muestra la reacción con su coste`);
  const antes=await vida();
  await arena.locator('.yq-arena-golpeame').click();
  const menu=pag.locator('.mr-carta');await menu.waitFor({timeout:10000});
  const texto=await menu.textContent();
  comprobar(/Absorción/.test(texto)&&/2\s*PH/.test(texto)&&/Al recibir un golpe/.test(texto),`${etiqueta} · el menú muestra nombre, disparador y coste (2 PH)`);
  comprobar(await pag.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${etiqueta} · sin scroll horizontal con el menú abierto`);
  await pag.screenshot({path:`${SALIDA}/menu-reaccion-${etiqueta}.png`});
  await menu.getByRole('button',{name:'No usar'}).click();await menu.waitFor({state:'detached'});await pag.waitForTimeout(300);
  const trasNo=await vida();
  comprobar(trasNo<antes&&!/activa Absorción/.test(await arena.locator('.yq-arena-registro').textContent()||''),`${etiqueta} · «No usar» deja pasar el golpe (${antes} → ${trasNo})`);
  await arena.locator('.yq-arena-golpeame').click();await menu.waitFor();
  await menu.getByRole('button',{name:/^Usar/}).click();await menu.waitFor({state:'detached'});await pag.waitForTimeout(300);
  comprobar(/activa Absorción/.test(await pag.locator('.yq-arena-registro').textContent()||''),`${etiqueta} · «Usar» aplica la reacción y queda en el registro`);
  comprobar(errores.length===0,`${etiqueta} · sin errores de página ${errores.join(' | ')}`);
  await ctx.close();
 }
}finally{await navegador.close();}
if(fallos.length){console.log(`\n${fallos.length} comprobaciones fallaron.`);process.exit(1);}
console.log('\nTodo correcto.');
