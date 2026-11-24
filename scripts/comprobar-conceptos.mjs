// Verificación en navegador del plan maestro «conceptos básicos configurables» (Fase 5).
// Yunque: defensas, estado propio, rasgo con potenciador, desarmado y guardia propios, esqueleto nuevo.
// Arena del Yunque (misma barra y menús que el combate): menú de potenciadores y los seis gestos de esqueleto.
// Playwright + Chromium preinstalado, Supabase interceptado, servidor `next dev` en 3100. Escritorio y 390 px.
import {createRequire} from 'node:module';import {mkdirSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const BASE=process.env.BASE||'http://localhost:3100',SALIDA=process.env.SALIDA||'docs/metricas/capturas';
mkdirSync(SALIDA,{recursive:true});
const GM='00000000-0000-4000-8000-00000000000a',ahora=new Date().toISOString();
const user={id:GM,aud:'authenticated',role:'authenticated',email:'kuroi@ejemplo.test',app_metadata:{},user_metadata:{},created_at:ahora};
const sesion={access_token:'x.eyJzdWIiOiJ4In0.x',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'r',user};
const tablas={perfiles:[{id:GM,rol:'KUROI',estado:'aprobado'}],
 categorias_forja:[{id:'c1',clave:'habilidades',nombre:'Habilidades',parent_id:null,created_at:ahora},{id:'c2',clave:'magias',nombre:'Magias',parent_id:'c1',created_at:ahora},{id:'c6',clave:'armas',nombre:'Armas',parent_id:null,created_at:ahora},{id:'c7',clave:'hachas',nombre:'Hachas',parent_id:'c6',created_at:ahora}],
 config_estadisticas:[],forja_maestra:[],esqueletos:[]};
const escritos=[];
const interceptar=async route=>{const req=route.request(),p=new URL(req.url()).pathname;
 const json=b=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-range':'0-0/*'},body:JSON.stringify(b)});
 if(req.method()==='OPTIONS')return json({});if(p.startsWith('/auth/v1/user'))return json(user);if(p.startsWith('/auth/v1/'))return json(sesion);
 if(p.startsWith('/rest/v1/rpc/'))return json(null);
 if(p.startsWith('/rest/v1/')){const t=p.split('/').pop();if(req.method()!=='GET'){escritos.push({t,body:req.postDataJSON?.()});return json([]);}const f=tablas[t]||[];return json((req.headers()['accept']||'').includes('pgrst.object')?(f[0]??null):f);}return json({});};
const fallos=[];const comprobar=(ok,msg)=>{console.log(`${ok?'✓':'✗'} ${msg}`);if(!ok)fallos.push(msg);};
export async function abrirYunque(navegador,ancho,alto){
 const ctx=await navegador.newContext({viewport:{width:ancho,height:alto},deviceScaleFactor:ancho<500?2:1});
 await ctx.addInitScript(s=>{localStorage.setItem('sb-ejemplo-auth-token',s);},JSON.stringify(sesion));
 await ctx.route('https://ejemplo.supabase.co/**',interceptar);
 const pag=await ctx.newPage();const errores=[];pag.on('pageerror',e=>errores.push(e.message));
 await pag.goto(BASE+'/dm/forja',{waitUntil:'networkidle',timeout:180000});
 await pag.getByRole('button',{name:'El yunque',exact:true}).click();
 await pag.locator('.yq-cartas button').first().waitFor({timeout:30000});
 return {ctx,pag,errores};
}
const modo=process.argv[2]||'explorar';
const navegador=await chromium.launch();
try{
 if(modo==='explorar'){
  const {pag}=await abrirYunque(navegador,1440,900);
  await pag.locator('.yq-cartas button',{hasText:/^Habilidad/}).first().click();
  await pag.getByRole('button',{name:'Lista',exact:true}).first().click();
  await pag.getByRole('button',{name:'+ Acción'}).first().click();await pag.waitForTimeout(300);
  await pag.locator('.yq-indice [data-indice^="accion:"]').last().click();await pag.waitForTimeout(300);
  await pag.locator('.yq-esqueleto').getByRole('button',{name:/^Puños/}).click();
  await pag.locator('.yq-esqueleto').getByRole('button',{name:/Probar gesto/}).click();await pag.waitForTimeout(60);
  console.log(JSON.stringify(await pag.evaluate(()=>['.yq-esqueleto-escena','.weapon-animation-layer','.weapon-actor','.weapon-held-svg'].map(s=>{const r=document.querySelector(s)?.getBoundingClientRect();return [s,r&&[r.x|0,r.y|0,r.width|0,r.height|0]];}))));
 }
 if(modo==='yunque'||modo==='todo')for(const [ancho,alto,etiqueta] of [[1440,900,'escritorio'],[390,844,'390']]){
  const {ctx,pag,errores}=await abrirYunque(navegador,ancho,alto);
  await pag.locator('.yq-cartas button',{hasText:/^Habilidad/}).first().click();
  await pag.getByRole('button',{name:'Magias',exact:true}).first().click();
  await pag.getByLabel('Nombre de la creación').fill('Escamas de dragón');
  // La vista «Lista» despliega cada editor en una columna desplazable (en 390 px es la vista por defecto).
  await pag.getByRole('button',{name:'Lista',exact:true}).first().click();await pag.waitForTimeout(300);
  const nuevaAccion=async(nombre)=>{await pag.getByRole('button',{name:'+ Acción'}).first().click();await pag.waitForTimeout(300);
   await pag.locator('.yq-indice [data-indice^="accion:"]').last().click();await pag.waitForTimeout(300);
   await pag.getByLabel('Nombre de la acción').fill(nombre);await pag.waitForTimeout(150);
   return pag.locator('.yq-editor').last();};
  const frase=async(sel)=>((await pag.locator(sel).last().textContent())||'').trim();
  // 1 · Defensas (4.6): criatura inmune al fuego pero no a Quemadura.
  let ed=await nuevaAccion('Escamas');
  await ed.getByRole('button',{name:/Rasgo siempre activo/}).click();
  const col=t=>ed.locator(`.yq-defensa-col[data-tipo="${t}"]`);
  await col('dano').getByRole('button',{name:'Añadir inmunidad'}).click();
  comprobar(await frase('.yq-defensa-frase')==='Inmune al fuego; no a Quemadura.',`${etiqueta} · frase «Inmune al fuego; no a Quemadura» (${await frase('.yq-defensa-frase')})`);
  await col('estado').locator('select').selectOption('quemadura');await col('estado').getByRole('button',{name:'Añadir inmunidad'}).click();
  await col('categoria').getByRole('button',{name:'Control',exact:true}).click();await col('categoria').getByRole('button',{name:'Añadir inmunidad'}).click();
  const f2=await frase('.yq-defensa-frase');
  comprobar(/Inmune al fuego/.test(f2)&&/Inmune a Quemadura/.test(f2)&&/mentales de control/.test(f2),`${etiqueta} · dragón inmune al fuego y a Quemadura; mente de control (${f2})`);
  await ed.locator('.yq-defensas').scrollIntoViewIfNeeded();await pag.screenshot({path:`${SALIDA}/conceptos-defensas-${etiqueta}.png`});
  // 2 · Rasgo combinable con recurso propio (no hace falta JSON).
  await ed.getByText(/Concede un rasgo combinable/).click();
  await ed.getByLabel('Nombre del rasgo').fill('Bioelectricidad');
  await ed.getByLabel('Nombre del recurso').fill('Carga Bioeléctrica');
  const fr=await frase('.yq-rasgo-frase');
  comprobar(fr==='Ejemplo: Bola de fuego 2d6 fuego + 2d6 electricidad por 2 CB.',`${etiqueta} · vista previa del potenciador (${fr})`);
  await ed.locator('.yq-rasgo-editor').scrollIntoViewIfNeeded();await pag.screenshot({path:`${SALIDA}/conceptos-rasgo-${etiqueta}.png`});
  // 3 · Concepto básico: mordisco y guardia propios.
  await ed.getByText(/Sustituye un concepto básico/).click();
  const fc=await frase('.yq-concepto-editor .yq-rasgo-frase');
  comprobar(/^Mordisco: 2d6 de daño perforante, alcance 1, sin necesitar las manos\.$/.test(fc),`${etiqueta} · desarmado propio: ${fc}`);
  await ed.locator('.yq-concepto-editor').scrollIntoViewIfNeeded();await pag.screenshot({path:`${SALIDA}/conceptos-desarmado-${etiqueta}.png`});
  await ed.locator('.yq-concepto-editor').getByRole('button',{name:/^Guardia/}).click();
  await ed.getByText(/Se endurece: no puede moverse/).click();
  await ed.getByRole('button',{name:'Subir Bono de ARM'}).click();await ed.getByRole('button',{name:'Subir Bono de ARM'}).click();
  const fg=await frase('.yq-concepto-editor .yq-rasgo-frase');
  comprobar(fg==='Postura defensiva: +4 ARM hasta su siguiente turno; no puede moverse.',`${etiqueta} · guardia propia: ${fg}`);
  await ed.locator('.yq-concepto-editor').scrollIntoViewIfNeeded();await pag.screenshot({path:`${SALIDA}/conceptos-guardia-${etiqueta}.png`});
  // 4 · Estado propio (B.10): perder turno + daño periódico.
  ed=await nuevaAccion('Nube soporífera');
  await ed.getByRole('group',{name:'Qué hace'}).getByRole('button',{name:'Estado',exact:true}).click();
  await ed.getByRole('button',{name:/^Estado propio/}).click();
  await ed.getByLabel('Nombre del estado').fill('Sopor tóxico');
  await ed.locator('.yq-estado-editor').getByRole('button',{name:'Perder turno'}).click();
  await ed.locator('.yq-estado-editor').getByRole('button',{name:'Daño periódico'}).last().click();
  const fe=await frase('.yq-estado-frase');
  comprobar(/^Sopor tóxico: pierde su turno; recibe 1d4 de veneno al inicio de su turno; dura 2 turnos\.$/.test(fe),`${etiqueta} · estado nuevo combinado: ${fe}`);
  await ed.locator('.yq-estado-editor').scrollIntoViewIfNeeded();await pag.screenshot({path:`${SALIDA}/conceptos-estado-${etiqueta}.png`});
  // 5 · Arma con esqueleto nuevo «Guadaña» copiado del hacha (C.5–C.6).
  ed=await nuevaAccion('Siega');
  await ed.locator('.yq-esqueleto').getByRole('button',{name:/^Hacha/}).click();
  await ed.locator('.yq-esqueleto').getByRole('button',{name:/^Nuevo esqueleto/}).click();
  await ed.locator('.yq-esqueleto').getByLabel('Nombre',{exact:true}).fill('Guadaña');
  await ed.locator('.yq-esqueleto').getByRole('button',{name:'Guardar esqueleto'}).click();await pag.waitForTimeout(300);
  comprobar(escritos.some(x=>x.t==='esqueletos'&&x.body?.id==='guadana'&&x.body?.definicion?.familia_gesto==='golpe_pesado'),`${etiqueta} · la Guadaña se guarda en la tabla de esqueletos con el gesto del hacha`);
  await ed.locator('.yq-esqueleto').getByRole('button',{name:/Probar gesto/}).click();await pag.waitForTimeout(250);
  comprobar(await pag.locator('.yq-esqueleto-escena .weapon-animation-layer[data-esqueleto="guadana"][data-familia="golpe_pesado"]').count()===1,`${etiqueta} · la Guadaña anima con el gesto de golpe pesado`);
  await ed.locator('.yq-esqueleto').scrollIntoViewIfNeeded();await pag.screenshot({path:`${SALIDA}/conceptos-guadana-${etiqueta}.png`});
  comprobar(await pag.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${etiqueta} · sin scroll horizontal`);
  comprobar(errores.length===0,`${etiqueta} · sin errores de página ${errores.join(' | ')}`);
  await ctx.close();
 }
 if(modo==='arena'||modo==='todo')for(const [ancho,alto,etiqueta] of [[1440,900,'escritorio'],[390,844,'390']]){
  const {ctx,pag,errores}=await abrirYunque(navegador,ancho,alto);
  await pag.locator('.yq-cartas button',{hasText:/^Habilidad/}).first().click();
  await pag.getByRole('button',{name:'Magias',exact:true}).first().click();
  await pag.getByLabel('Nombre de la creación').fill('Bioelectricidad Kuro');
  await pag.getByRole('button',{name:'Lista',exact:true}).first().click();await pag.waitForTimeout(300);
  const nuevaAccion=async(nombre)=>{await pag.getByRole('button',{name:'+ Acción'}).first().click();await pag.waitForTimeout(300);
   await pag.locator('.yq-indice [data-indice^="accion:"]').last().click();await pag.waitForTimeout(300);
   await pag.getByLabel('Nombre de la acción').fill(nombre);await pag.waitForTimeout(150);return pag.locator('.yq-editor').last();};
  let ed=await nuevaAccion('Carga');
  await ed.getByRole('button',{name:/Rasgo siempre activo/}).click();
  await ed.getByText(/Concede un rasgo combinable/).click();
  await ed.getByLabel('Nombre del rasgo').fill('Bioelectricidad');await ed.getByLabel('Nombre del recurso').fill('Carga Bioeléctrica');
  await ed.getByRole('button',{name:'Subir Valor inicial'}).click();await ed.getByRole('button',{name:'Subir Valor inicial'}).click();
  ed=await nuevaAccion('Tajo');
  // Seis gestos: un esqueleto base cada vez, probado en la vista previa del Yunque (C.4).
  for(const nombre of ['Espada','Hacha','Lanza','Arco','Bastón','Puños']){
   await ed.locator('.yq-esqueleto').getByRole('button',{name:new RegExp('^'+nombre)}).click();
   await ed.locator('.yq-esqueleto').getByRole('button',{name:/Probar gesto/}).click();await pag.waitForTimeout(nombre==='Arco'?420:250);
   const capa=pag.locator('.yq-esqueleto-escena .weapon-animation-layer');
   const id=await capa.getAttribute('data-esqueleto').catch(()=>null);
   comprobar(id===nombre.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(),`${etiqueta} · gesto de ${nombre} (${id}, ${await capa.getAttribute('data-familia').catch(()=>'')})`);
   await ed.locator('.yq-esqueleto-escena').screenshot({path:`${SALIDA}/gesto-${id}-${etiqueta}.png`});
   comprobar(await pag.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${etiqueta} · ${nombre}: sin scroll horizontal`);
  }
  // Calidad visual: con «movimiento reducido» la capa de gestos no se muestra.
  await pag.emulateMedia({reducedMotion:'reduce'});
  await ed.locator('.yq-esqueleto').getByRole('button',{name:/Probar gesto/}).click();await pag.waitForTimeout(120);
  comprobar(await pag.locator('.yq-esqueleto-escena .weapon-animation-layer').evaluate(el=>getComputedStyle(el).display==='none').catch(()=>true),`${etiqueta} · sin gestos con prefers-reduced-motion`);
  await pag.emulateMedia({reducedMotion:'no-preference'});
  await ed.locator('.yq-esqueleto').getByRole('button',{name:/^Hacha/}).click();
  // Arena: el doll lleva la creación; elegir Tajo abre el menú de potenciadores (no window.confirm).
  const arena=pag.locator('.yq-arena');await arena.scrollIntoViewIfNeeded();await pag.waitForTimeout(600);
  await arena.getByRole('button',{name:/Tajo/}).first().click();await pag.waitForTimeout(200);
  await arena.locator('.tactical-cell[aria-label*="Saco"]').first().click();await pag.waitForTimeout(300);
  if(!await pag.locator('.mp-velo').count()){await arena.locator('.tactical-cell[aria-label*="Saco"]').first().click();await pag.waitForTimeout(300);}
  const menu=pag.locator('.mp-carta');
  comprobar(await menu.count()===1,`${etiqueta} · elegir una técnica compatible abre el menú de potenciadores`);
  if(await menu.count()){
   await menu.getByRole('button',{name:/Potenciador/}).first().click();
   await menu.getByRole('group',{name:/Unidades/}).getByRole('button',{name:'2',exact:true}).click();
   const formula=(await menu.locator('.mp-formula').textContent()||'').trim();
   comprobar(formula==='Tajo 1d6 físico + 2d6 electricidad por 2 CB',`${etiqueta} · previsualización por componente (${formula})`);
   await menu.screenshot({path:`${SALIDA}/potenciador-menu-${etiqueta}.png`});
   comprobar(await pag.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${etiqueta} · menú sin scroll horizontal`);
   await menu.getByRole('button',{name:'Lanzar potenciada'}).click();await pag.waitForTimeout(700);
   const registro=await pag.locator('.yq-arena-registro').textContent().catch(()=>'')||'';
   comprobar(registro.includes(`Técnica potenciada: ${formula}.`),`${etiqueta} · el registro coincide con la previsualización`);
   comprobar(/Carga Bioeléctrica 3 → 1|gasta 2 Carga Bioeléctrica/.test(registro),`${etiqueta} · el coste se descuenta una vez`);
   await arena.screenshot({path:`${SALIDA}/potenciador-arena-${etiqueta}.png`});
  }
  comprobar(errores.length===0,`${etiqueta} · sin errores de página ${errores.join(' | ')}`);
  await ctx.close();
 }
}finally{await navegador.close();}
if(fallos.length){console.log(`\n${fallos.length} comprobaciones fallaron.`);process.exit(1);}
