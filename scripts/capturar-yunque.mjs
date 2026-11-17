// Capturas del lienzo del Yunque (pestaña «El yunque» de /dm/forja) con una sesión de GM simulada y Supabase interceptado.
// Requisitos: Playwright con Chromium instalados de forma GLOBAL (no es una dependencia de package.json;
// el proyecto no añade dependencias para esto). Por ejemplo: `npm i -g playwright && npx playwright install chromium`,
// y que Node los encuentre: `NODE_PATH="$(npm root -g)"` (o la carpeta global donde esté `playwright`).
// Uso:
//   1. Servidor de desarrollo en el puerto 3100 con un Supabase de mentira (todas sus peticiones se interceptan):
//      NEXT_PUBLIC_SUPABASE_URL=https://ejemplo.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=clave-publica-de-prueba npx next dev -p 3100
//   2. NODE_PATH="$(npm root -g)" node scripts/capturar-yunque.mjs
//      Variables opcionales: ANCHO/ALTO (1440×900 por defecto), REDUCIDO=1 (movimiento reducido), BASE, SALIDA.
// Escribe en capturas/ y sale con código 1 si algo falta.
import {createRequire} from 'node:module';import {mkdirSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const BASE=process.env.BASE||'http://localhost:3100',SALIDA=process.env.SALIDA||'capturas';
const ANCHO=Number(process.env.ANCHO||1440),ALTO=Number(process.env.ALTO||900);
mkdirSync(SALIDA,{recursive:true});
const GM='00000000-0000-4000-8000-00000000000a',ahora=new Date().toISOString();
const user={id:GM,aud:'authenticated',role:'authenticated',email:'kuroi@ejemplo.test',app_metadata:{},user_metadata:{},created_at:ahora};
const sesion={access_token:'x.eyJzdWIiOiJ4In0.x',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'r',user};
const cat=[{id:'c1',clave:'razas',nombre:'Razas',parent_id:null,created_at:ahora},{id:'c2',clave:'humano',nombre:'Humano',parent_id:'c1',created_at:ahora},{id:'c4',clave:'monstruos',nombre:'Monstruos',parent_id:null,created_at:ahora},{id:'c5',clave:'goblin',nombre:'Goblin',parent_id:'c4',created_at:ahora},{id:'c6',clave:'armas',nombre:'Armas',parent_id:null,created_at:ahora},{id:'c7',clave:'espadas',nombre:'Espadas',parent_id:'c6',created_at:ahora},{id:'c8',clave:'hachas',nombre:'Hachas',parent_id:'c6',created_at:ahora}];
const atr=[...['vida','ph','fuerza','destreza','mente'].map((c,i)=>({id:'a'+i,categoria:'razas',clave:c,etiqueta:c[0].toUpperCase()+c.slice(1),descripcion:'',valor_defecto:10})),
 ...['filo','peso','durabilidad'].map((c,i)=>({id:'b'+i,categoria:'armas',clave:c,etiqueta:c[0].toUpperCase()+c.slice(1),descripcion:'',valor_defecto:3}))];
const forja=[{id:'f1',nombre:'Espada de ceniza',tipo:'espadas',tipo_creacion:'objeto',estado:'aprobado',clase:'C',stats:{filo:3},descripcion:'',created_at:ahora,habilidades:[],pasivas:[],equipamiento:{},configuracion_dados:[{id:'e-ceniza',nombre:'Tajo de ceniza',efecto:'dano',cantidad:1,caras:8,modificador:0,tipo_dano:'físico',estado:'',duracion:0,coste_ph:0}],reglas:[],slot_tipo:'mano',ligado_al_alma:false,es_grupo:false,stats_rango:{},requisitos_uso:{}}];
const perfiles=[{id:GM,rol:'KUROI',estado:'aprobado',nombre:'Kuroi',email:'kuroi@ejemplo.test',mente_colmena:false,lugares_conocidos:[],created_at:ahora}];
const tablas={categorias_forja:cat,config_estadisticas:atr,forja_maestra:forja,perfiles,creaciones_forja:[],naturalezas:[],forja_almas_unicas:[]};
let guardados=0,demoraEscritura=0;
/** Escrituras de la Forja: insertar o actualizar en forja_maestra devuelve la fila guardada (y la colección la recoge). */
function escribir(tabla,url,metodo,cuerpo){
 if(tabla!=='forja_maestra')return [];
 const datos=Array.isArray(cuerpo)?cuerpo[0]:cuerpo||{};
 if(metodo==='POST'){const fila={...datos,id:`guardada-${++guardados}`,created_at:ahora};tablas.forja_maestra=[fila,...tablas.forja_maestra];return [fila];}
 const id=/^eq\.(.*)$/.exec(url.searchParams.get('id')||'')?.[1];
 tablas.forja_maestra=tablas.forja_maestra.map(f=>f.id===id?{...f,...datos}:f);
 return tablas.forja_maestra.filter(f=>f.id===id);
}
function filtrar(tabla,url){let filas=tablas[tabla];if(!filas)return [];
 for(const [k,v] of url.searchParams){if(['select','order','limit','offset','on_conflict','columns'].includes(k))continue;const m=/^(eq|neq|in)\.(.*)$/.exec(v);if(!m)continue;
  const [,op,val]=m;filas=filas.filter(f=>{const x=String(f[k]);return op==='eq'?x===val:op==='neq'?x!==val:val.replace(/[()]/g,'').split(',').includes(x);});}
 return filas;}
const fallos=[];const comprobar=(ok,msg)=>{console.log(`${ok?'✓':'✗'} ${msg}`);if(!ok)fallos.push(msg);};
const navegador=await chromium.launch();
try{
 const contexto=async(width,height)=>{
  const c=await navegador.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:process.env.REDUCIDO==='1'?'reduce':'no-preference'});
  await c.addInitScript(s=>{localStorage.setItem('sb-ejemplo-auth-token',s);},JSON.stringify(sesion));
  await c.route('https://ejemplo.supabase.co/**',interceptar);
  return c;
 };
 /** Abre /dm/forja y entra en la pestaña «El yunque». */
 const abrirYunque=async pag=>{
  const r=await pag.goto(BASE+'/dm/forja',{waitUntil:'networkidle',timeout:90000});
  const pestana=pag.getByRole('button',{name:'El yunque',exact:true});
  await pestana.waitFor({timeout:20000});await pestana.click();
  return r;
 };
 const interceptar=async route=>{const req=route.request(),url=new URL(req.url());const p=url.pathname;
  const json=(b,s=200)=>route.fulfill({status:s,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-range':'0-0/*'},body:JSON.stringify(b)});
  if(req.method()==='OPTIONS')return json({});
  if(p.startsWith('/auth/v1/user'))return json(user);
  if(p.startsWith('/auth/v1/'))return json(sesion);
  if(p.startsWith('/rest/v1/rpc/'))return json(null);
  if(p.startsWith('/rest/v1/')){const t=p.split('/').pop();
   if(demoraEscritura&&t==='forja_maestra'&&!['GET','HEAD'].includes(req.method()))await new Promise(r=>setTimeout(r,demoraEscritura));const filas=req.method()==='GET'||req.method()==='HEAD'?filtrar(t,url):escribir(t,url,req.method(),req.postDataJSON());
   const uno=(req.headers()['accept']||'').includes('vnd.pgrst.object');return json(uno?(filas[0]??null):filas);}
  return json({});};
 const ctx=await contexto(ANCHO,ALTO);
 const pagina=await ctx.newPage();const errores=[];pagina.on('pageerror',e=>errores.push(e.message));
 const r=await abrirYunque(pagina).catch(e=>{fallos.push('No se pudo abrir la página: '+e.message);return null;});
 comprobar(!!r&&r.ok(),`la ruta /dm/forja responde (${r?.status()})`);
 if(r&&r.ok()){
  const nucleo=pagina.locator('[data-nodo="nucleo"]');
  await nucleo.waitFor({timeout:20000}).catch(()=>{});
  comprobar(await nucleo.count()===1,'desde /dm/forja → «El yunque» se ve el lienzo con el núcleo');
  comprobar(await pagina.locator('form.yunque-form').count()===0,'el formulario antiguo ya no está');
  await pagina.waitForTimeout(600);
  await pagina.screenshot({path:`${SALIDA}/yunque-inicio-${ANCHO}.png`});
  // Tarea 11: «Forjar» con el nombre vacío no guarda: lleva el foco al núcleo y muestra el error.
  await pagina.getByRole('button',{name:/Forjar/}).click();await pagina.waitForTimeout(400);
  const focoNucleo=await pagina.evaluate(()=>document.activeElement?.closest('[data-nodo]')?.getAttribute('data-nodo')??null);
  const errorVacio=await pagina.locator('.yq-error-global').textContent().catch(()=>'');
  comprobar(focoNucleo==='nucleo'&&/nombre/i.test(errorVacio||''),`«Forjar» sin nombre lleva el foco al núcleo y muestra el error (${focoNucleo} · ${errorVacio})`);
  comprobar(await pagina.locator('.yq-sello').count()===0,'sin guardar no aparece el sello');
  await pagina.screenshot({path:`${SALIDA}/yunque-forjar-error-${ANCHO}.png`});
  // Teclado: Tab llega a un nodo (no elegido) e Intro lo elige.
  await pagina.locator('.yq-indice button').last().focus();
  let alcanzado=null;
  for(let k=0;k<120&&!alcanzado;k++){
   await pagina.keyboard.press('Tab');
   alcanzado=await pagina.evaluate(()=>{const a=document.activeElement;return a?.matches('.yq-nodo[data-nodo]:not([aria-current])')?a.getAttribute('data-nodo'):null;});
  }
  comprobar(!!alcanzado,`Tab llega a un nodo del lienzo (${alcanzado})`);
  if(alcanzado){
   await pagina.keyboard.press('Enter');await pagina.waitForTimeout(250);
   comprobar(await pagina.locator(`[data-nodo="${alcanzado}"][aria-current="true"]`).count()===1,'Intro elige el nodo enfocado');
   await pagina.screenshot({path:`${SALIDA}/yunque-teclado-${ANCHO}.png`});
  }
  // Elegir familia «Espadas» para que el núcleo muestre medallones.
  // Elegirlo desde el índice lo trae a la vista (el editor de requisitos, ya abierto, desplaza el lienzo).
  await pagina.locator('.yq-indice button').first().click();await pagina.waitForTimeout(500);
  const familia=pagina.getByRole('button',{name:'Espadas',exact:true});
  if(await familia.count())await familia.first().click();
  const nombre=pagina.getByLabel('Nombre de la creación');
  if(await nombre.count())await nombre.fill('Espada de Mao');
  const mas=pagina.getByRole('button',{name:'+ Acción'});
  comprobar(await mas.count()>0,'el núcleo tiene el botón «+ Acción»');
  if(await mas.count())await mas.first().click();
  await pagina.waitForTimeout(300);
  comprobar(await pagina.locator('[data-nodo^="accion:"]').count()>=1,'se añadió un nodo de acción');
  comprobar(await pagina.locator('path.yq-cable').count()>=1,'hay al menos un cable');
  /** Un punto vacío del lienzo (sin nodos, barra ni avisos alrededor). */
  const vacio=()=>pagina.evaluate(()=>{const l=document.querySelector('.yq-lienzo').getBoundingClientRect();
   for(let fy=.7;fy>.1;fy-=.07)for(let fx=.08;fx<.9;fx+=.07){const x=l.left+l.width*fx,y=l.top+l.height*fy;
    // Con margen: al arrastrar, los nodos compatibles crecen un poco y no deben quedar bajo el cursor.
    if([[0,0],[-28,0],[28,0],[0,-28],[0,28]].every(([dx,dy])=>!document.elementsFromPoint(x+dx,y+dy).some(e=>e.closest('.yq-nodo-pos,.yq-lienzo-barra,.yq-aviso,.yq-menu-forja'))))return {x,y};}return null;});
  // Tarea 10: Ctrl+D duplica la acción elegida y Ctrl+Z la quita (el foco en el nodo, no en un campo).
  const acciones=()=>pagina.locator('[data-nodo^="accion:"]').count();
  const nAcciones=await acciones();
  await pagina.locator('[data-nodo^="accion:"] .yq-nodo-cab').first().click({position:{x:40,y:10}}).catch(()=>{});
  await pagina.keyboard.press('Control+d');await pagina.waitForTimeout(350);
  const duplicadas=await acciones();
  await pagina.screenshot({path:`${SALIDA}/yunque-duplicar-${ANCHO}.png`});
  comprobar(duplicadas===nAcciones+1,`Ctrl+D duplica la acción (${nAcciones} → ${duplicadas})`);
  comprobar(await pagina.getByRole('button',{name:'Deshacer',exact:true}).isEnabled().catch(()=>false),'el botón «Deshacer» de la barra se activa');
  await pagina.keyboard.press('Control+z');await pagina.waitForTimeout(350);
  comprobar(await acciones()===nAcciones,`Ctrl+Z quita la acción duplicada (${await acciones()})`);
  await pagina.keyboard.press('Control+y');await pagina.waitForTimeout(250);
  const rehecha=await acciones();
  await pagina.keyboard.press('Control+z');await pagina.waitForTimeout(250);
  comprobar(rehecha===nAcciones+1&&await acciones()===nAcciones,'Ctrl+Y rehace y Ctrl+Z vuelve a deshacer');
  // Las flechas mueven el nodo enfocado (y guardan su posición).
  const idAccion=await pagina.locator('[data-nodo^="accion:"]').first().getAttribute('data-nodo');
  await pagina.locator(`[data-nodo="${idAccion}"]`).focus();
  const posAntes=await pagina.locator(`.yq-nodo-pos[data-id="${idAccion}"]`).getAttribute('style');
  await pagina.keyboard.press('ArrowDown');await pagina.keyboard.press('ArrowRight');await pagina.waitForTimeout(200);
  const posDespues=await pagina.locator(`.yq-nodo-pos[data-id="${idAccion}"]`).getAttribute('style');
  comprobar(posAntes!==posDespues&&(await pagina.evaluate(()=>localStorage.getItem('yunque:posiciones:nuevo')||'')).includes(idAccion),'las flechas mueven el nodo enfocado');
  // Una plantilla del Grimorio se suma al núcleo con sus nodos; Ctrl+Z la retira entera.
  const plantilla=pagina.locator('.yq-grimorio [data-pieza="plantilla:furia-temporal"]');
  comprobar(await plantilla.count()===1,'el Grimorio ofrece la plantilla «Furia temporal»');
  const reglasAntes=await pagina.locator('[data-nodo^="cuando:"]').count();
  await plantilla.click().catch(()=>{});await pagina.waitForTimeout(600);
  const reglasPlantilla=await pagina.locator('[data-nodo^="cuando:"]').count();
  await pagina.screenshot({path:`${SALIDA}/yunque-plantilla-${ANCHO}.png`});
  await pagina.keyboard.press('Control+z');await pagina.waitForTimeout(350);
  comprobar(reglasPlantilla===reglasAntes+2&&await pagina.locator('[data-nodo^="cuando:"]').count()===reglasAntes,`la plantilla añade sus 2 reglas y Ctrl+Z las quita (${reglasAntes} → ${reglasPlantilla})`);
  await pagina.locator('.yq-indice [data-indice^="accion:"]').first().click().catch(()=>{});await pagina.waitForTimeout(400);
  // Editar la acción desde sus fichas: nombre, dados con la rueda y elemento.
  const accionNombre=pagina.getByLabel('Nombre de la acción');
  if(await accionNombre.count())await accionNombre.fill('Tajo de brasas');
  const caras=pagina.locator('[data-rueda="caras"]');
  // La rueda del ratón sobre las caras sube el dado (d6 → d8 → d10) sin mover el lienzo.
  for(let k=0;k<2&&await caras.count();k++){await caras.evaluate(el=>el.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,bubbles:true,cancelable:true})));await pagina.waitForTimeout(80);}
  const fuego=pagina.getByRole('button',{name:'Fuego',exact:true});
  if(await fuego.count())await fuego.first().click();
  await pagina.waitForTimeout(400);
  const valorCaras=await pagina.locator('[data-rueda="caras"] input').first().inputValue().catch(()=>'');
  comprobar(valorCaras==='10',`la rueda del ratón cambia las caras del dado (d${valorCaras})`);
  // Añadir un segundo nodo desde el Grimorio para ver varios cables.
  const pieza=pagina.locator('.yq-grimorio [data-pieza="accion:ataque"]');
  if(await pieza.count())await pieza.click();
  await pagina.waitForTimeout(700);
  await pagina.screenshot({path:`${SALIDA}/yunque-${ANCHO}.png`});
  // Arrastrar un cable desde la salida «Módulos» hasta el vacío abre el menú de forja.
  const salida=pagina.locator('[data-nodo^="accion:"][aria-current] [data-puerto="modulos"]').first();
  if(await salida.count()){
   const caja=await salida.boundingBox();
   await pagina.mouse.move(caja.x+caja.width/2,caja.y+caja.height/2);await pagina.mouse.down();
   const lienzo=await pagina.locator('.yq-lienzo').boundingBox();
   const hueco=await vacio()??{x:lienzo.x+170,y:lienzo.y+lienzo.height-170};
   await pagina.mouse.move(hueco.x,hueco.y,{steps:10});
   const atenuados=await pagina.locator('.yq-nodo-pos[data-cable="incompatible"]').count();
   comprobar(atenuados>=1,`al arrastrar un cable se atenúan los nodos incompatibles (${atenuados})`);
   await pagina.screenshot({path:`${SALIDA}/yunque-cable-${ANCHO}.png`});
   await pagina.mouse.up();
   const menu=pagina.locator('.yq-menu-forja');
   comprobar(await menu.count()===1,'soltar el cable en el vacío abre el menú de forja');
   const salv=menu.getByRole('button',{name:/Salvación/});
   if(await salv.count())await salv.first().click();
   await pagina.waitForTimeout(500);
   comprobar(await pagina.locator('[data-nodo^="salvacion:"]').count()===1,'el menú crea el módulo conectado');
   // Repetirlo es inválido (`aplicar` lanza): se avisa sin romper la página.
   // El editor de la salvación desplaza el lienzo: se elige la otra acción desde el índice para verla.
   await pagina.locator('.yq-indice button',{hasText:/^Ataque$/}).first().click().catch(()=>{});await pagina.waitForTimeout(450);
   const otra=pagina.locator('[data-nodo^="accion:"] [data-puerto="modulos"]').last();
   await pagina.locator('[data-nodo^="accion:"] .yq-nodo-cab').last().click({position:{x:40,y:10}}).catch(()=>{});
   const ob=await otra.boundingBox().catch(()=>null);
   if(ob){
    const hueco2=await vacio()??{x:lienzo.x+30,y:lienzo.y+lienzo.height/2};
    await pagina.mouse.move(ob.x+6,ob.y+6);await pagina.mouse.down();
    await pagina.mouse.move(hueco2.x,hueco2.y,{steps:10});await pagina.mouse.up();
    const repetir=pagina.locator('.yq-menu-forja').getByRole('button',{name:/Salvación/});
    if(await repetir.count())await repetir.first().click();
    await pagina.waitForTimeout(200);
    comprobar(await pagina.locator('.yq-aviso.is-error').count()===1,'una operación inválida se muestra como aviso');
    await pagina.screenshot({path:`${SALIDA}/yunque-aviso-${ANCHO}.png`});
   }
  }
  // Mover un nodo por su cabecera guarda su posición al soltar.
  const cab=pagina.locator('[data-nodo^="salvacion:"] .yq-nodo-cab').first();
  if(await cab.count()){
   const c=await cab.boundingBox();
   await pagina.mouse.move(c.x+60,c.y+c.height/2);await pagina.mouse.down();
   await pagina.mouse.move(c.x+140,c.y+c.height/2+50,{steps:6});await pagina.mouse.up();
   const guardado=await pagina.evaluate(()=>localStorage.getItem('yunque:posiciones:nuevo')||'');
   comprobar(guardado.includes('salvacion:'),'la posición del nodo movido se guarda al soltar');
  }
  // La rueda sobre el fondo cambia el zoom.
  const antes=await pagina.locator('.yq-lienzo-barra output').textContent();
  const lz=await pagina.locator('.yq-lienzo').boundingBox();
  const fondo=await vacio()??{x:lz.x+40,y:lz.y+40};
  await pagina.mouse.move(fondo.x,fondo.y);await pagina.mouse.wheel(0,300);await pagina.waitForTimeout(150);
  const despues=await pagina.locator('.yq-lienzo-barra output').textContent();
  comprobar(antes!==despues,`la rueda sobre el fondo cambia el zoom (${antes} → ${despues})`);
  const encuadrar=pagina.getByRole('button',{name:'Encuadrar todo'});
  if(await encuadrar.count())await encuadrar.click();
  await pagina.waitForTimeout(500);
  await pagina.screenshot({path:`${SALIDA}/yunque-encuadre-${ANCHO}.png`});
  // Tarea 7: una regla arrastrando «Al impactar», «Vida < 50 %» y «Curar» desde el Grimorio.
  const busqueda=pagina.getByLabel('Buscar en el Grimorio');
  /** Centro de la cabecera de un nodo; si queda fuera de la vista, se elige desde el índice para traerlo. */
  const visible=async id=>{
   const caja=await pagina.locator(`[data-nodo="${id}"]`).boundingBox().catch(()=>null),l=await pagina.locator('.yq-lienzo').boundingBox();
   if(caja&&caja.x>=l.x&&caja.y>=l.y&&caja.x+120<=l.x+l.width&&caja.y+40<=l.y+l.height)return;
   await pagina.locator(`.yq-indice [data-indice="${id}"]`).click();await pagina.waitForTimeout(500);
  };
  const centroDe=async id=>{await visible(id);const c=await pagina.locator(`[data-nodo="${id}"] .yq-nodo-cab`).first().boundingBox();return c&&{x:c.x+Math.min(80,c.width/2),y:c.y+c.height/2};};
  /** Arrastra la pieza `clave` (buscándola) hasta `destino()`; `foto` captura a mitad del gesto. */
  async function arrastrar(clave,texto,destino,foto){
   await busqueda.fill(texto);
   const p=pagina.locator(`.yq-grimorio [data-pieza="${clave}"]`).first();
   if(!await p.count())return false;
   await p.scrollIntoViewIfNeeded();
   const a=await p.boundingBox();
   await pagina.mouse.move(a.x+a.width/2,a.y+a.height/2);await pagina.mouse.down();
   await pagina.mouse.move(a.x+a.width/2+40,a.y+a.height/2+6,{steps:5});
   const d=await destino();if(!d){await pagina.mouse.up();return false;}
   await pagina.mouse.move(d.x,d.y,{steps:14});await pagina.waitForTimeout(120);
   if(foto)await pagina.screenshot({path:`${SALIDA}/${foto}-${ANCHO}.png`});
   await pagina.mouse.up();await pagina.waitForTimeout(450);
   await busqueda.fill('');
   return true;
  }
  const flotaba=await arrastrar('evento:impactar','impactar',vacio,'yunque-arrastre');
  comprobar(flotaba&&await pagina.locator('.yq-pieza-flotante').count()===0,'se arrastra «Al impactar» desde el Grimorio hasta el lienzo');
  const cuando=pagina.locator('[data-nodo^="cuando:"]');
  comprobar(await cuando.count()===1,'soltar un evento en el vacío crea la regla unida al núcleo');
  const rid=((await cuando.first().getAttribute('data-nodo').catch(()=>''))||'').slice('cuando:'.length);
  await arrastrar('condicion:vida','vida <',()=>centroDe(`cuando:${rid}`));
  await arrastrar('efecto:curar','curar',()=>centroDe(`si:${rid}`),'yunque-arrastre-curar');
  const cableEntre=(d,pd,h)=>pagina.locator(`g[data-cable="${d}:${pd}>${h}:entrada"]`).count();
  const conectados=await cableEntre('nucleo','reglas',`cuando:${rid}`)===1&&await cableEntre(`cuando:${rid}`,'si',`si:${rid}`)===1&&await cableEntre(`si:${rid}`,'entonces',`entonces:${rid}:0`)===1;
  comprobar(conectados,'la regla tiene 3 nodos cuando → si → entonces conectados');
  const fraseSi=await pagina.locator(`[data-nodo="si:${rid}"] .yq-nodo-frase`).textContent().catch(()=>'');
  comprobar(/vida actual menor que 50%/.test(fraseSi||''),`el nodo «Si» dice la condición (${fraseSi})`);
  const fraseCuando=await pagina.locator(`[data-nodo="cuando:${rid}"] .yq-nodo-frase`).textContent().catch(()=>'');
  comprobar(/Al impactar/.test(fraseCuando||'')&&/Recupera 1d6 de vida al portador/.test(fraseCuando||''),`el nodo «Cuándo» lleva la frase de describirRegla (${fraseCuando})`);
  await visible(`cuando:${rid}`);
  if(!await pagina.locator(`[data-nodo="cuando:${rid}"][aria-current]`).count())await pagina.locator(`[data-nodo="cuando:${rid}"] .yq-nodo-cab`).click({position:{x:60,y:12}}).catch(()=>{});
  await pagina.waitForTimeout(400);
  comprobar(await pagina.locator(`[data-nodo="cuando:${rid}"] .yq-fichas button[aria-pressed="true"]`).filter({hasText:'Impactar'}).count()===1,'el editor de «Cuándo» muestra los eventos como fichas');
  await pagina.screenshot({path:`${SALIDA}/yunque-regla-${ANCHO}.png`});
  // Una pieza soltada en el vacío queda «sin conectar» hasta que un cable la engancha.
  await arrastrar('efecto:dano','daño directo',vacio);
  const suelto=pagina.locator('.yq-nodo.is-suelto');
  comprobar(await suelto.count()===1&&/sin conectar/.test(await suelto.first().textContent()||''),'un efecto soltado en el vacío queda «sin conectar»');
  await pagina.screenshot({path:`${SALIDA}/yunque-suelto-${ANCHO}.png`});
  await visible(`si:${rid}`);
  const salidaSi=pagina.locator(`[data-nodo="si:${rid}"] [data-puerto="entonces"]`).first();
  const sb=await salidaSi.boundingBox().catch(()=>null),gb=await suelto.first().boundingBox().catch(()=>null);
  if(sb&&gb){
   await pagina.mouse.move(sb.x+sb.width/2,sb.y+sb.height/2);await pagina.mouse.down();
   await pagina.mouse.move(gb.x+Math.min(90,gb.width/2),gb.y+16,{steps:12});await pagina.screenshot({path:`${SALIDA}/yunque-cable-suelto-${ANCHO}.png`});await pagina.mouse.up();await pagina.waitForTimeout(450);
  }
  comprobar(await suelto.count()===0&&await pagina.locator(`[data-nodo="entonces:${rid}:1"]`).count()===1,'un cable hasta la pieza suelta la convierte en parte de la regla');
  await arrastrar('modulo:alcance','alcance',vacio);
  const antesForjar=await pagina.locator('.yq-nodo.is-suelto').count();
  await pagina.getByRole('button',{name:/Forjar/}).click();
  // El guardado pasa por la red (simulada): se espera al sello antes de mirar el aviso.
  await pagina.locator('.yq-sello').waitFor({timeout:8000}).catch(()=>{});await pagina.waitForTimeout(150);
  const avisoForjar=await pagina.locator('.yq-aviso').textContent().catch(()=>'');
  const sello=await pagina.locator('.yq-sello .y3-sello').count();
  await pagina.screenshot({path:`${SALIDA}/yunque-sello-${ANCHO}.png`});
  comprobar(antesForjar===1&&await pagina.locator('.yq-nodo.is-suelto').count()===0&&/descart/i.test(avisoForjar||''),`al forjar, las piezas sueltas se descartan con un aviso (${avisoForjar} · ${await pagina.locator('.yq-error-global').textContent().catch(()=>'')})`);
  comprobar(sello===1&&tablas.forja_maestra.some(f=>f.nombre==='Espada de Mao'),'forjar guarda la creación y muestra el sello');
  comprobar(/Creación guardada/.test(await pagina.locator('[role="status"]',{hasText:'Creación guardada'}).first().textContent().catch(()=>'')||''),'aparece el aviso «Creación guardada…»');
  await pagina.waitForTimeout(1500);
  comprobar(await pagina.locator('.yq-sello').count()===0&&await pagina.locator('[data-nodo="nucleo"]').count()===1,'el sello se va y el taller sigue abierto con la creación guardada');
  // «Monstruos» empieza un borrador limpio (sin id: «Forjar» no pisaría la creación guardada) y un solo Ctrl+Z la recupera.
  const taller=pagina.locator('.yq-taller');
  const idGuardada=await taller.getAttribute('data-creacion');
  await pagina.locator('.yq-indice [data-indice="nucleo"]').click();await pagina.waitForTimeout(400);
  // Con un guardado en curso, «Monstruos» está desactivado: el id de la fila guardada no puede acabar en el monstruo.
  const cartaMonstruos=pagina.locator('[data-nodo="nucleo"] .yq-cartas button',{hasText:'Monstruos'}).first();
  demoraEscritura=1500;
  await pagina.getByRole('button',{name:/Forjar/}).click();await pagina.waitForTimeout(250);
  const bloqueada=await cartaMonstruos.isDisabled().catch(()=>false);
  await cartaMonstruos.click({force:true,timeout:1000}).catch(()=>{});
  // Ctrl+Z durante el guardado tampoco cambia el borrador (ni el botón «Deshacer» está activo).
  const indiceAntes=await pagina.locator('.yq-indice').textContent();
  const deshacerActivo=await pagina.locator('.yq-historial').getByRole('button',{name:'Deshacer',exact:true}).isEnabled().catch(()=>true);
  await pagina.locator('[data-nodo="nucleo"]').focus().catch(()=>{});
  await pagina.keyboard.press('Control+z');await pagina.waitForTimeout(200);
  const indiceDurante=await pagina.locator('.yq-indice').textContent(),tituloDurante=await pagina.locator('.yq-barra-titulo h1').textContent(),idDurante=await taller.getAttribute('data-creacion');
  await pagina.getByRole('button',{name:'Forjar',exact:true}).waitFor({timeout:8000}).catch(()=>{});await pagina.waitForTimeout(400);
  demoraEscritura=0;
  comprobar(!deshacerActivo&&indiceDurante===indiceAntes&&idDurante===idGuardada,`mientras se forja, Ctrl+Z no cambia el borrador y «Deshacer» está desactivado (${tituloDurante} · ${idDurante} · deshacer ${deshacerActivo?'activo':'desactivado'} · índice ${indiceDurante===indiceAntes?'igual':'cambió'})`);
  comprobar(bloqueada&&await taller.getAttribute('data-creacion')===idGuardada&&/Objeto/.test(await pagina.locator('.yq-barra-tipo').textContent()||''),`mientras se forja, «Monstruos» está desactivado y el borrador conserva su id (${await taller.getAttribute('data-creacion')})`);
  await cartaMonstruos.click().catch(()=>{});await pagina.waitForTimeout(400);
  const idMonstruo=await taller.getAttribute('data-creacion'),tipoMonstruo=await pagina.locator('.yq-barra-tipo').textContent();
  comprobar(/^guardada-/.test(idGuardada||'')&&idMonstruo==='nueva'&&/Monstruo/.test(tipoMonstruo||'')&&await pagina.locator('[data-nodo^="accion:"]').count()===0,`«Monstruos» abre un borrador nuevo sin id (${idGuardada} → ${idMonstruo} · ${tipoMonstruo})`);
  await pagina.locator('[data-nodo="nucleo"]').focus();
  await pagina.keyboard.press('Control+z');await pagina.waitForTimeout(400);
  const idDeshecho=await taller.getAttribute('data-creacion');
  comprobar(idDeshecho===idGuardada&&/Objeto/.test(await pagina.locator('.yq-barra-tipo').textContent()||'')&&await pagina.locator('.yq-barra-titulo h1').textContent()==='Espada de Mao'&&await pagina.locator('[data-nodo^="accion:"]').count()>0,`un solo Ctrl+Z vuelve a la creación guardada con su id (${idDeshecho})`);
  // Cambiar el tipo en el núcleo toca varios campos, pero es un solo paso del historial.
  await pagina.locator('[data-nodo="nucleo"] .yq-cartas button',{hasText:/^Habilidad/}).first().click().catch(()=>{});await pagina.waitForTimeout(300);
  const tipoCambiado=await pagina.locator('.yq-barra-tipo').textContent();
  await pagina.keyboard.press('Control+z');await pagina.waitForTimeout(350);
  comprobar(/Habilidad/.test(tipoCambiado||'')&&/Objeto/.test(await pagina.locator('.yq-barra-tipo').textContent()||''),`cambiar el tipo en el núcleo se deshace con un solo Ctrl+Z (${tipoCambiado} → Objeto)`);
  // Tarea 8: arena de dolls. «Tajo de brasas» pasa a 2d8; «Usar» baja la vida del saco y enciende su nodo; «Golpéame» baja la del doll.
  await pagina.locator('.yq-indice button',{hasText:/^Tajo de brasas$/}).first().click().catch(()=>{});await pagina.waitForTimeout(450);
  const tajo=await pagina.locator('[data-nodo^="accion:"][aria-current]').first().getAttribute('data-nodo').catch(()=>null);
  const carasTajo=pagina.locator(`[data-nodo="${tajo}"] [data-rueda="caras"]`);
  if(await carasTajo.count())await carasTajo.evaluate(el=>el.dispatchEvent(new WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true})));
  const cantidadTajo=pagina.locator(`[data-nodo="${tajo}"] [data-rueda="cantidad"] input`);
  if(await cantidadTajo.count()){await cantidadTajo.fill('2');await cantidadTajo.press('Tab');}
  await pagina.waitForTimeout(700);
  const dadosTajo=`${await cantidadTajo.inputValue().catch(()=>'?')}d${await pagina.locator(`[data-nodo="${tajo}"] [data-rueda="caras"] input`).first().inputValue().catch(()=>'?')}`;
  comprobar(dadosTajo==='2d8',`la acción de la arena es de 2d8 (${dadosTajo})`);
  const arena=pagina.locator('.yq-arena');
  const usar=arena.locator('[data-accion]',{hasText:'Tajo de brasas'}).first();
  comprobar(await usar.count()===1,'la arena ofrece «Usar» para «Tajo de brasas»');
  const vidaDe=async nombre=>Number(await arena.getByRole('progressbar',{name:nombre}).first().getAttribute('aria-valuenow').catch(()=>NaN));
  const sacoAntes=await vidaDe('Vida del saco');
  let sacoDespues=sacoAntes,encendido=false;
  for(let k=0;k<4&&sacoDespues>=sacoAntes;k++){
   await usar.click().catch(()=>{});await pagina.waitForTimeout(120);
   encendido||=await pagina.locator(`[data-nodo="${tajo}"][data-encendido="true"]`).count()===1;
   sacoDespues=await vidaDe('Vida del saco');
  }
  comprobar(sacoDespues<sacoAntes,`«Usar» baja la vida del saco (${sacoAntes} → ${sacoDespues})`);
  comprobar(encendido,'el nodo de la acción usada se enciende (data-encendido="true")');
  await pagina.waitForTimeout(350);
  await pagina.screenshot({path:`${SALIDA}/yunque-arena-${ANCHO}.png`});
  const dollAntes=await vidaDe('Vida del doll');
  await arena.getByRole('button',{name:/^Golpéame/}).first().click().catch(()=>{});await pagina.waitForTimeout(200);
  const dollDespues=await vidaDe('Vida del doll');
  comprobar(dollDespues<dollAntes,`«Golpéame» baja la vida del doll (${dollAntes} → ${dollDespues})`);
  await pagina.waitForTimeout(300);
  await pagina.screenshot({path:`${SALIDA}/yunque-arena-golpe-${ANCHO}.png`});
  // Si «Golpéame» tumba al doll, las acciones se retiran y se ofrece reiniciar.
  await arena.locator('.yq-arena-ajustes summary').click().catch(()=>{});
  await arena.locator('input[aria-label="Vida del doll"]').fill('1').catch(()=>{});await pagina.waitForTimeout(500);
  await arena.getByLabel('Cuántos dados').fill('20').catch(()=>{});
  await arena.getByRole('button',{name:/^Golpéame/}).first().click().catch(()=>{});await pagina.waitForTimeout(250);
  const reiniciarCaido=arena.getByRole('button',{name:'Reiniciar la prueba'});
  comprobar(await arena.locator('.yq-escenario-fin').count()===1&&await reiniciarCaido.count()===1&&await arena.locator('[data-accion]').count()===0,'con el doll caído se retiran las acciones y se ofrece «Reiniciar la prueba»');
  await pagina.screenshot({path:`${SALIDA}/yunque-arena-caido-${ANCHO}.png`});
  await reiniciarCaido.click().catch(()=>{});await pagina.waitForTimeout(250);
  comprobar(await vidaDe('Vida del doll')===1&&await arena.locator('[data-accion]').count()>0,'«Reiniciar la prueba» vuelve a poner en pie al doll con sus ajustes');
  if(process.env.REDUCIDO==='1'){
   await pagina.waitForTimeout(500);
   const vivas=await pagina.evaluate(()=>document.getAnimations().filter(a=>a.effect?.target?.closest?.('.yq-taller')).length);
   comprobar(vivas===0,`con movimiento reducido no hay animaciones en el taller (${vivas})`);
  }
  // Tarea 9: un personaje con la figura de su raza; equipar una espada desde la Colección; Ficha; vista de lista.
  await pagina.locator('.yq-indice [data-indice="nucleo"]').click();await pagina.waitForTimeout(450);
  await pagina.locator('[data-nodo="nucleo"] .yq-cartas button',{hasText:'Personaje'}).first().click().catch(()=>{});await pagina.waitForTimeout(300);
  const humano=pagina.locator('[data-nodo="nucleo"] .yq-fichas button',{hasText:/^Humano$/});
  if(await humano.count())await humano.first().click();
  await pagina.locator('.yq-indice [data-indice="nucleo"]').click();await pagina.waitForTimeout(500);
  comprobar(await pagina.locator('[data-nodo="nucleo"] .yq-maniqui [data-hueco="mano_der"]').count()===1,'el núcleo del personaje muestra su figura con huecos de equipo');
  comprobar(await pagina.locator('.yq-grimorio [data-pieza="vinculo:f1"]').count()===1,'la Colección ofrece «Espada de ceniza» para enlazar');
  const equipada=await arrastrar('vinculo:f1','ceniza',async()=>{const c=await pagina.locator('[data-nodo="nucleo"] [data-hueco="mano_der"]').boundingBox();return c&&{x:c.x+c.width/2,y:c.y+c.height/2};},'yunque-equipar');
  comprobar(equipada&&await pagina.locator('[data-nodo="vinculo:mano_der:f1"]').count()===1,'arrastrar la espada al hueco de la mano derecha crea vinculo:mano_der:f1');
  comprobar(await pagina.locator('[data-nodo="nucleo"] [data-hueco="mano_der"].is-lleno').count()===1,'el hueco de la mano derecha queda lleno');
  await pagina.waitForTimeout(600);
  await pagina.screenshot({path:`${SALIDA}/yunque-personaje-${ANCHO}.png`});
  comprobar(await pagina.locator('.yq-arena [data-accion="equipo:mano_der:e-ceniza"]',{hasText:'Tajo de ceniza'}).count()===1,'la arena ofrece el ataque de la espada equipada («Tajo de ceniza»)');
  // Cajón Ficha: se abre con el foco dentro, guarda la descripción y se cierra con Escape.
  const botonFicha=pagina.locator('.yq-barra-ficha');
  await botonFicha.click();await pagina.waitForTimeout(400);
  const cajon=pagina.locator('.yq-cajon.is-abierto');
  const focoDentro=await pagina.evaluate(()=>!!document.activeElement?.closest('.yq-cajon'));
  comprobar(await cajon.count()===1&&focoDentro,'«Ficha» abre el cajón con el foco dentro');
  await cajon.getByLabel('Descripción').fill('Un guardián de ceniza.').catch(()=>{});
  await pagina.screenshot({path:`${SALIDA}/yunque-ficha-${ANCHO}.png`});
  await pagina.keyboard.press('Escape');await pagina.waitForTimeout(400);
  const cerrada=await pagina.locator('.yq-cajon.is-abierto').count()===0&&await botonFicha.getAttribute('aria-expanded')==='false';
  await botonFicha.click();await pagina.waitForTimeout(300);
  const guardada=await pagina.locator('.yq-cajon').getByLabel('Descripción').inputValue().catch(()=>'');
  comprobar(cerrada&&guardada==='Un guardián de ceniza.',`Escape cierra la Ficha y la descripción se conserva (${guardada})`);
  await pagina.keyboard.press('Escape');await pagina.waitForTimeout(300);
  comprobar(await pagina.evaluate(()=>document.activeElement?.classList.contains('yq-barra-ficha')),'al cerrar la Ficha el foco vuelve a su botón');
  // Escape también la cierra con el foco en el lienzo.
  await botonFicha.click();await pagina.waitForTimeout(350);
  await pagina.locator('[data-nodo="nucleo"]').focus().catch(()=>{});
  const focoLienzo=await pagina.evaluate(()=>!!document.activeElement?.closest('.yq-lienzo'));
  await pagina.keyboard.press('Escape');await pagina.waitForTimeout(350);
  comprobar(focoLienzo&&await pagina.locator('.yq-cajon.is-abierto').count()===0,'Escape cierra la Ficha aunque el foco esté en el lienzo');
  // Conmutador Lienzo/Lista: la lista muestra los mismos nodos como bloques editables.
  await pagina.locator('.yq-conmutador-vista').getByRole('button',{name:'Lista'}).click();await pagina.waitForTimeout(400);
  comprobar(await pagina.locator('.yq-vlista [data-bloque="vinculo:mano_der:f1"]').count()===1&&await pagina.locator('.yq-vlista [data-bloque]').count()===await pagina.locator('.yq-indice [data-indice]').count(),'la vista de lista tiene un bloque por nodo');
  const bloqueVinculo=pagina.locator('[data-bloque="vinculo:mano_der:f1"] .yq-bloque-boton');
  if(await bloqueVinculo.getAttribute('aria-expanded')!=='true')await bloqueVinculo.click();await pagina.waitForTimeout(300);
  comprobar(await pagina.locator('[data-bloque="vinculo:mano_der:f1"]').getByRole('button',{name:'Desenlazar'}).count()===1,'el bloque del vínculo abre su editor');
  await pagina.screenshot({path:`${SALIDA}/yunque-lista-${ANCHO}.png`});
  const desborde=await pagina.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  comprobar(desborde<=0,`sin desborde horizontal (${desborde}px)`);
  // A 390 px la lista es la vista por defecto y no hay desplazamiento horizontal, ni con el núcleo abierto.
  const movil=await (await contexto(390,844)).newPage();movil.on('pageerror',e=>errores.push(e.message));
  await abrirYunque(movil).catch(()=>{});
  await movil.locator('.yq-vlista [data-bloque="nucleo"]').waitFor({timeout:20000}).catch(()=>{});
  comprobar(await movil.locator('.yq-vlista').count()===1&&await movil.locator('.yq-lienzo').count()===0,'a 390 px se ve la lista por defecto');
  const ancho390=await movil.evaluate(()=>document.documentElement.scrollWidth);
  if(!await movil.locator('[data-bloque="nucleo"] .yq-bloque-boton[aria-expanded="true"]').count())await movil.locator('[data-bloque="nucleo"] .yq-bloque-boton').click().catch(()=>{});
  await movil.waitForTimeout(400);
  const ancho390Abierto=await movil.evaluate(()=>document.documentElement.scrollWidth);
  comprobar(ancho390<=390&&ancho390Abierto<=390,`a 390 px sin desplazamiento horizontal (${ancho390} / ${ancho390Abierto} con el núcleo abierto)`);
  // La página se desplaza dentro de su contenedor: se captura por tramos.
  for(let k=0;k<4;k++){
   await movil.screenshot({path:`${SALIDA}/yunque-lista-390${k?'-'+k:''}.png`});
   const mas=await movil.evaluate(()=>{let e=document.querySelector('.yq-taller');while(e&&!(e.scrollHeight>e.clientHeight+4&&/(auto|scroll)/.test(getComputedStyle(e).overflowY)))e=e.parentElement;e??=document.scrollingElement;const antes=e.scrollTop;e.scrollTop+=e.clientHeight*.85;return e.scrollTop>antes;});
   if(!mas)break;await movil.waitForTimeout(200);
  }
 }
 comprobar(!errores.length,`sin errores de página${errores.length?': '+errores.slice(0,4).join(' | '):''}`);
}finally{await navegador.close();}
if(fallos.length){console.error(`FALLO: ${fallos.length} comprobación(es).`);process.exit(1);}
console.log(`OK · capturas en ${SALIDA}/`);
