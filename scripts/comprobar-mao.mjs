// Aceptación de la Parte 3 (plan «Yunque · una más», paso 3.6): Mao se crea en el Yunque solo con la interfaz.
// Objeto → «Despertar como artefacto» → dos niveles → formas → voces. Se lee el borrador que se guardaría, se valida
// con la Forja y se escribe en tests/fixtures/mao.json para la partida de prueba (tests/mao-aceptacion.test.mjs).
import {createRequire} from 'node:module';import {mkdirSync,writeFileSync} from 'node:fs';
import {cargarDependencia} from '../tests/helpers/cargar-ts.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const {validarArtefacto}=cargarDependencia('artefactos');
const BASE=process.env.BASE||'http://localhost:3100',SALIDA=process.env.SALIDA||'docs/metricas/capturas';
mkdirSync(SALIDA,{recursive:true});
const GM='00000000-0000-4000-8000-00000000000a',ahora=new Date().toISOString();
const user={id:GM,aud:'authenticated',role:'authenticated',email:'kuroi@ejemplo.test',app_metadata:{},user_metadata:{},created_at:ahora};
const sesion={access_token:'x.eyJzdWIiOiJ4In0.x',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'r',user};
const tablas={perfiles:[{id:GM,rol:'KUROI',estado:'aprobado'}],categorias_forja:[{id:'c6',clave:'armas',nombre:'Armas',parent_id:null,created_at:ahora},{id:'c7',clave:'espadas',nombre:'Espadas',parent_id:'c6',created_at:ahora}],
 config_estadisticas:['filo','peso','durabilidad'].map((c,i)=>({id:'b'+i,categoria:'armas',clave:c,etiqueta:c[0].toUpperCase()+c.slice(1),descripcion:'',valor_defecto:3})),forja_maestra:[]};
const interceptar=async route=>{const req=route.request(),p=new URL(req.url()).pathname;
 const json=b=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-range':'0-0/*'},body:JSON.stringify(b)});
 if(req.method()==='OPTIONS')return json({});if(p.startsWith('/auth/v1/user'))return json(user);if(p.startsWith('/auth/v1/'))return json(sesion);
 if(p.startsWith('/rest/v1/rpc/'))return json(null);
 if(p.startsWith('/rest/v1/')){const f=tablas[p.split('/').pop()]||[];return json((req.headers()['accept']||'').includes('pgrst.object')?(f[0]??null):f);}return json({});};
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
  await pag.locator('.yq-cartas button',{hasText:/^Objeto/}).first().waitFor({timeout:20000});
  const nombre=pag.getByLabel('Nombre de la creación');if(await nombre.count())await nombre.first().fill('Mao');
  await pag.getByRole('button',{name:'Ficha',exact:true}).first().click();
  const cajon=pag.locator('#yq-ficha-artefacto');await cajon.waitFor({timeout:10000});
  await cajon.getByRole('button',{name:'Despertar como artefacto'}).click();
  await cajon.getByRole('button',{name:'Añadir nivel'}).click();
  await cajon.getByLabel('Nombre del nivel').fill('Mao saciado');
  await cajon.getByRole('tab',{name:'Formas y portadores'}).click();
  await cajon.getByLabel('Forma 1',{exact:true}).fill('Colmillo de obsidiana');
  await cajon.getByLabel('Forma 2',{exact:true}).fill('Hoja de cien ojos');
  await cajon.getByLabel('Buscar forma').fill('ojos');
  comprobar(await cajon.locator('.ya-tabla li').count()===1,`${etiqueta} · la búsqueda de formas filtra la tabla de 100`);
  await cajon.getByLabel('Buscar forma').fill('');
  await cajon.getByRole('tab',{name:'Absorción'}).click();
  comprobar(await cajon.locator('.ya-tramos li').count()===6,`${etiqueta} · seis tramos editables`);
  await cajon.getByRole('tab',{name:'Voces'}).click();
  await cajon.getByRole('button',{name:'Dar voz al artefacto'}).click();
  comprobar(await pag.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${etiqueta} · sin scroll horizontal`);
  await cajon.scrollIntoViewIfNeeded();await pag.screenshot({path:`${SALIDA}/mao-yunque-${etiqueta}.png`});
  await cajon.getByRole('tab',{name:'Niveles'}).click();await pag.waitForTimeout(200);
  await pag.screenshot({path:`${SALIDA}/mao-niveles-${etiqueta}.png`});
  const b=await pag.locator('#yq-ficha-artefacto').evaluate(el=>{const k=Object.keys(el).find(x=>x.startsWith('__reactFiber'));let f=el[k];while(f){const p=f.memoizedProps;if(p&&p.valor&&Array.isArray(p.valor.niveles))return JSON.parse(JSON.stringify(p.valor));f=f.return;}return null;});
  comprobar(b&&b.niveles.length===2&&b.formas?.[1]==='Hoja de cien ojos'&&b.voces?.voces.length>=1,`${etiqueta} · el borrador lleva dos niveles, formas y voces`);
  comprobar(b&&validarArtefacto(b)===null,`${etiqueta} · Mao pasa el validador de la Forja (${b&&validarArtefacto(b)})`);
  if(b&&etiqueta==='escritorio')writeFileSync('tests/fixtures/mao.json',JSON.stringify({nombre:'Mao',tipo_creacion:'objeto',configuracion_artefacto:b},null,1)+'\n');
  comprobar(errores.length===0,`${etiqueta} · sin errores de página ${errores.join(' | ')}`);
  await ctx.close();
 }
}finally{await navegador.close();}
if(fallos.length){console.log(`\n${fallos.length} comprobaciones fallaron.`);process.exit(1);}
console.log('\nTodo correcto.');
