// Capturas del lienzo del Yunque con una sesión de GM simulada y Supabase interceptado.
// Uso: node scripts/capturar-yunque.mjs   (servidor de desarrollo en el puerto 3100 con
// NEXT_PUBLIC_SUPABASE_URL=https://ejemplo.supabase.co). Escribe en capturas/ y sale con código 1 si algo falta.
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
const forja=[{id:'f1',nombre:'Espada de ceniza',tipo:'espadas',tipo_creacion:'objeto',estado:'aprobado',clase:'C',stats:{filo:3},descripcion:'',created_at:ahora,habilidades:[],pasivas:[],equipamiento:{},configuracion_dados:[],reglas:[],slot_tipo:'mano',ligado_al_alma:false,es_grupo:false,stats_rango:{},requisitos_uso:{}}];
const perfiles=[{id:GM,rol:'KUROI',estado:'aprobado',nombre:'Kuroi',email:'kuroi@ejemplo.test',mente_colmena:false,lugares_conocidos:[],created_at:ahora}];
const tablas={categorias_forja:cat,config_estadisticas:atr,forja_maestra:forja,perfiles};
function filtrar(tabla,url){let filas=tablas[tabla];if(!filas)return [];
 for(const [k,v] of url.searchParams){if(['select','order','limit','offset','on_conflict','columns'].includes(k))continue;const m=/^(eq|neq|in)\.(.*)$/.exec(v);if(!m)continue;
  const [,op,val]=m;filas=filas.filter(f=>{const x=String(f[k]);return op==='eq'?x===val:op==='neq'?x!==val:val.replace(/[()]/g,'').split(',').includes(x);});}
 return filas;}
const fallos=[];const comprobar=(ok,msg)=>{console.log(`${ok?'✓':'✗'} ${msg}`);if(!ok)fallos.push(msg);};
const navegador=await chromium.launch();
try{
 const ctx=await navegador.newContext({viewport:{width:ANCHO,height:ALTO},deviceScaleFactor:1,reducedMotion:process.env.REDUCIDO==='1'?'reduce':'no-preference'});
 await ctx.addInitScript(s=>{localStorage.setItem('sb-ejemplo-auth-token',s);},JSON.stringify(sesion));
 await ctx.route('https://ejemplo.supabase.co/**',async route=>{const req=route.request(),url=new URL(req.url());const p=url.pathname;
  const json=(b,s=200)=>route.fulfill({status:s,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-range':'0-0/*'},body:JSON.stringify(b)});
  if(req.method()==='OPTIONS')return json({});
  if(p.startsWith('/auth/v1/user'))return json(user);
  if(p.startsWith('/auth/v1/'))return json(sesion);
  if(p.startsWith('/rest/v1/rpc/'))return json(null);
  if(p.startsWith('/rest/v1/')){const t=p.split('/').pop();const filas=req.method()==='GET'||req.method()==='HEAD'?filtrar(t,url):[];
   const uno=(req.headers()['accept']||'').includes('vnd.pgrst.object');return json(uno?(filas[0]??null):filas);}
  return json({});});
 const pagina=await ctx.newPage();const errores=[];pagina.on('pageerror',e=>errores.push(e.message));
 const r=await pagina.goto(BASE+'/dm/forja/taller',{waitUntil:'networkidle',timeout:90000}).catch(e=>{fallos.push('No se pudo abrir la página: '+e.message);return null;});
 comprobar(!!r&&r.ok(),`la ruta /dm/forja/taller responde (${r?.status()})`);
 if(r&&r.ok()){
  const nucleo=pagina.locator('[data-nodo="nucleo"]');
  await nucleo.waitFor({timeout:20000}).catch(()=>{});
  comprobar(await nucleo.count()===1,'existe el nodo núcleo');
  await pagina.waitForTimeout(600);
  await pagina.screenshot({path:`${SALIDA}/yunque-inicio-${ANCHO}.png`});
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
   await pagina.mouse.move(lienzo.x+170,lienzo.y+lienzo.height-170,{steps:10});
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
    await pagina.mouse.move(ob.x+6,ob.y+6);await pagina.mouse.down();
    await pagina.mouse.move(lienzo.x+30,lienzo.y+lienzo.height/2,{steps:10});await pagina.mouse.up();
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
  await pagina.mouse.move(lz.x+40,lz.y+40);await pagina.mouse.wheel(0,300);await pagina.waitForTimeout(150);
  const despues=await pagina.locator('.yq-lienzo-barra output').textContent();
  comprobar(antes!==despues,`la rueda sobre el fondo cambia el zoom (${antes} → ${despues})`);
  const encuadrar=pagina.getByRole('button',{name:'Encuadrar todo'});
  if(await encuadrar.count())await encuadrar.click();
  await pagina.waitForTimeout(500);
  await pagina.screenshot({path:`${SALIDA}/yunque-encuadre-${ANCHO}.png`});
  // Tarea 7: una regla arrastrando «Al impactar», «Vida < 50 %» y «Curar» desde el Grimorio.
  const busqueda=pagina.getByLabel('Buscar en el Grimorio');
  const vacio=()=>pagina.evaluate(()=>{const l=document.querySelector('.yq-lienzo').getBoundingClientRect();
   for(let fy=.7;fy>.1;fy-=.07)for(let fx=.08;fx<.9;fx+=.07){const x=l.left+l.width*fx,y=l.top+l.height*fy;
    if(!document.elementsFromPoint(x,y).some(e=>e.closest('.yq-nodo-pos,.yq-lienzo-barra,.yq-aviso,.yq-menu-forja')))return {x,y};}return null;});
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
  await pagina.getByRole('button',{name:/Forjar/}).click();await pagina.waitForTimeout(200);
  const avisoForjar=await pagina.locator('.yq-aviso').textContent().catch(()=>'');
  comprobar(antesForjar===1&&await pagina.locator('.yq-nodo.is-suelto').count()===0&&/descart/i.test(avisoForjar||''),`al forjar, las piezas sueltas se descartan con un aviso (${avisoForjar})`);
  if(process.env.REDUCIDO==='1'){
   await pagina.waitForTimeout(500);
   const vivas=await pagina.evaluate(()=>document.getAnimations().filter(a=>a.effect?.target?.closest?.('.yq-taller')).length);
   comprobar(vivas===0,`con movimiento reducido no hay animaciones en el taller (${vivas})`);
  }
  const desborde=await pagina.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  comprobar(desborde<=0,`sin desborde horizontal (${desborde}px)`);
 }
 comprobar(!errores.length,`sin errores de página${errores.length?': '+errores.slice(0,4).join(' | '):''}`);
}finally{await navegador.close();}
if(fallos.length){console.error(`FALLO: ${fallos.length} comprobación(es).`);process.exit(1);}
console.log(`OK · capturas en ${SALIDA}/`);
