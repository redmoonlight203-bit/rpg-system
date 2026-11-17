// Mide el rendimiento del lienzo del Yunque con una creación grande (~170 nodos): latencia por tecla al escribir
// en un nodo, fotogramas al arrastrar un nodo, al desplazar y al hacer zoom, commits de React y coste en reposo.
// Misma sesión de GM simulada y Supabase interceptado que scripts/capturar-yunque.mjs.
// Requisitos: Playwright con Chromium (global, como en capturar-yunque.mjs) y un servidor en el puerto 3100:
//   NEXT_PUBLIC_SUPABASE_URL=https://ejemplo.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=clave-publica-de-prueba npx next dev -p 3100
//   (o `npx next build --webpack` y `npx next start -p 3100` con las mismas variables, para medir producción).
// Uso: node scripts/medir-yunque.mjs   Variables: BASE, ACCIONES (30), REGLAS (20), PASIVAS (6), JSON=1 (salida JSON),
//   UMBRAL_TECLA (ms, p95 máximo; si se da, sale con código 1 al superarlo), REDUCIDO=1 (movimiento reducido),
//   PERFIL=1 (funciones con más tiempo al escribir), TRAZA=1 (fases del navegador), CSS_EXTRA='…' (probar estilos),
//   CAPAS=1 (capas compuestas y sus motivos), FOTO=ruta.png (captura tras escribir).
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const BASE=process.env.BASE||'http://localhost:3100';
const N_ACCIONES=Number(process.env.ACCIONES||30),N_REGLAS=Number(process.env.REGLAS||20),N_PASIVAS=Number(process.env.PASIVAS||6);
const GM='00000000-0000-4000-8000-00000000000a',ahora=new Date().toISOString();
const user={id:GM,aud:'authenticated',role:'authenticated',email:'kuroi@ejemplo.test',app_metadata:{},user_metadata:{},created_at:ahora};
const sesion={access_token:'x.eyJzdWIiOiJ4In0.x',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'r',user};
const cat=[{id:'c1',clave:'razas',nombre:'Razas',parent_id:null,created_at:ahora},{id:'c2',clave:'humano',nombre:'Humano',parent_id:'c1',created_at:ahora},{id:'c6',clave:'armas',nombre:'Armas',parent_id:null,created_at:ahora},{id:'c7',clave:'espadas',nombre:'Espadas',parent_id:'c6',created_at:ahora}];
const atr=[...['vida','ph','fuerza','destreza','mente'].map((c,i)=>({id:'a'+i,categoria:'razas',clave:c,etiqueta:c,descripcion:'',valor_defecto:10})),
 ...['filo','peso','durabilidad'].map((c,i)=>({id:'b'+i,categoria:'armas',clave:c,etiqueta:c,descripcion:'',valor_defecto:3}))];

/** Creación grande: acciones con módulos, reglas de 3–5 nodos (algunas con condiciones compuestas y ramas) y pasivas. */
function grande(){
 const efectos=Array.from({length:N_ACCIONES},(_,i)=>({id:`e${i}`,nombre:`Acción ${i}`,efecto:'dano',cantidad:1+i%3,caras:[6,8,10][i%3],modificador:i%4,tipo_dano:'fuego',estado:'',duracion:0,coste_ph:i%3,
  elemento:'fuego',naturaleza:'magica',tablero:{alcance:3+i%4,forma:'individual',tamano:0,afecta:'enemigos'},
  ...(i%2?{salvacion:{cd:12,atributo:'destreza',exito:'mitad'}}:{}),...(i%3===0?{vfx:{impacto:'golpe'}}:{})}));
 const comparar={tipo:'comparar',sujeto:'yo',atributo:'vida_actual',operador:'<',valor:50,porcentaje:true};
 const reglas=Array.from({length:N_REGLAS},(_,i)=>({id:`r${i}`,nombre:`Regla ${i}`,evento:['impactar','recibir_dano','matar','usar'][i%4],
  condicion:i%3===0?{tipo:'todas',condiciones:[comparar,{tipo:'probabilidad',porcentaje:50}]}:comparar,
  efectos:[{tipo:'curar',destino:'yo',valor:{dados:1,caras:6}},...(i%2?[{tipo:'dano',destino:'objetivo',valor:{dados:1,caras:4}}]:[])],
  coste_ph:0,coste_fatiga:0,enfriamiento:0,usos:0,limite_por_turno:0,prioridad:0}));
 const reglas_pasivas=Array.from({length:N_PASIVAS},(_,i)=>({id:`p${i}`,nombre:`Pasiva ${i}`,evento:'permanente',condicion:'siempre',bonos:{armadura:1+i},curacion:0,recuperar_ph:0,reducir_fatiga:0}));
 return {id:'grande',nombre:'Arsenal enorme',tipo:'espadas',tipo_creacion:'objeto',estado:'aprobado',clase:'C',stats:{filo:3},descripcion:'',historia:'',requisitos:'',defectos:'',imagen_url:'',created_at:ahora,
  habilidades:[],pasivas:[],equipamiento:{},configuracion_dados:efectos,reglas,reglas_pasivas,slot_tipo:'mano',ligado_al_alma:false,es_grupo:false,stats_rango:{},requisitos_uso:{}};
}
const tablas={categorias_forja:cat,config_estadisticas:atr,forja_maestra:[grande()],perfiles:[{id:GM,rol:'KUROI',estado:'aprobado',nombre:'Kuroi',email:'kuroi@ejemplo.test',mente_colmena:false,lugares_conocidos:[],created_at:ahora}],creaciones_forja:[],naturalezas:[],forja_almas_unicas:[]};
function filtrar(tabla,url){let filas=tablas[tabla];if(!filas)return [];
 for(const [k,v] of url.searchParams){if(['select','order','limit','offset','on_conflict','columns'].includes(k))continue;const m=/^(eq|neq|in)\.(.*)$/.exec(v);if(!m)continue;
  const [,op,val]=m;filas=filas.filter(f=>{const x=String(f[k]);return op==='eq'?x===val:op==='neq'?x!==val:val.replace(/[()]/g,'').split(',').includes(x);});}
 return filas;}
const interceptar=async route=>{const req=route.request(),url=new URL(req.url());const p=url.pathname;
 const json=(b,s=200)=>route.fulfill({status:s,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-range':'0-0/*'},body:JSON.stringify(b)});
 if(req.method()==='OPTIONS')return json({});
 if(p.startsWith('/auth/v1/user'))return json(user);
 if(p.startsWith('/auth/v1/'))return json(sesion);
 if(p.startsWith('/rest/v1/rpc/'))return json(null);
 if(p.startsWith('/rest/v1/')){const filas=req.method()==='GET'||req.method()==='HEAD'?filtrar(p.split('/').pop(),url):[];
  const uno=(req.headers()['accept']||'').includes('vnd.pgrst.object');return json(uno?(filas[0]??null):filas);}
 return json({});};

/** Antes de cargar React: un «DevTools» mínimo que cuenta commits y cuántos NodoYunque se renderizaron en cada uno. */
function ganchoReact(){
 const m={commits:0,nodos:0,funciones:0,porNombre:{}};window.__yqReact=m;
 // Un NodoYunque es el componente cuyo primer hijo es <article class="yq-nodo …">.
 const esNodo=f=>f.child&&f.child.tag===5&&f.child.type==='article'&&typeof f.child.memoizedProps?.className==='string'&&f.child.memoizedProps.className.startsWith('yq-nodo ');
 const FUNCION=new Set([0,11,14,15]);// FunctionComponent, ForwardRef, MemoComponent, SimpleMemoComponent
 // Igual que DevTools: un hijo se volvió a renderizar si es nuevo o tiene PerformedWork; si su lista de hijos no cambió, no se baja.
 const recorrer=f=>{for(let h=f.child;h;h=h.sibling){
  const nuevo=!h.alternate,hecho=nuevo||(h.flags&1)===1;
  if(hecho&&FUNCION.has(h.tag)){m.funciones++;if(esNodo(h))m.nodos++;
   const t=h.type?.type??h.type?.render??h.type,n=t?.displayName||t?.name||'?';m.porNombre[n]=(m.porNombre[n]||0)+1;}
  if(nuevo||h.child!==h.alternate.child)recorrer(h);}};
 window.__REACT_DEVTOOLS_GLOBAL_HOOK__={supportsFiber:true,renderers:new Map(),isDisabled:false,checkDCE(){},inject(r){this.renderers.set(1,r);return 1;},
  onScheduleFiberRoot(){},onCommitFiberUnmount(){},onPostCommitFiberRoot(){},
  onCommitFiberRoot(_id,raiz){m.commits++;const c=raiz.current;if(!c.alternate||c.child!==c.alternate.child)recorrer(c);}};
}
/** Utilidades de medida dentro de la página. */
function instalarMedidas(){
 const M={largas:[],eventos:[]};window.__yq=M;
 try{new PerformanceObserver(l=>{for(const e of l.getEntries())M.largas.push({t:e.startTime,d:e.duration});}).observe({type:'longtask'});}catch{}
 try{new PerformanceObserver(l=>{for(const e of l.getEntries())M.eventos.push({n:e.name,t:e.startTime,d:e.duration,id:e.interactionId});}).observe({type:'event',durationThreshold:16});}catch{}
 // Tecla: desde keydown (marca del evento) hasta después del siguiente pintado (rAF + mensaje).
 M.teclas=[];
 document.addEventListener('keydown',e=>{const t0=e.timeStamp;requestAnimationFrame(()=>{const c=new MessageChannel();c.port1.onmessage=()=>M.teclas.push(performance.now()-t0);c.port2.postMessage(0);});},true);
 M.grabar=()=>{const f=[];M.fotos=f;let vivo=true;const paso=t=>{f.push(t);if(vivo)requestAnimationFrame(paso);};requestAnimationFrame(paso);M.parar=()=>{vivo=false;return f;};};
}
const pct=(a,p)=>{if(!a.length)return NaN;const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.ceil(p/100*s.length)-1)];};
const r1=n=>Math.round(n*10)/10;
function resumenFotos(f){
 const d=f.slice(1).map((t,i)=>t-f[i]);const total=f.at(-1)-f[0];
 return {fps:r1((f.length-1)/total*1000),p50:r1(pct(d,50)),p95:r1(pct(d,95)),max:r1(Math.max(...d)),fotogramas:f.length,'≥50fps':`${Math.round(d.filter(x=>x<=20.5).length/d.length*100)}%`};
}

/** Funciones con más tiempo propio (PERFIL=1): nombre · archivo → ms. */
function topFunciones(p){
 const dt=new Map();for(let i=0;i<p.samples.length;i++)dt.set(p.samples[i],(dt.get(p.samples[i])||0)+(p.timeDeltas[i]||0));
 const por=new Map();for(const n of p.nodes){const f=n.callFrame;const k=`${f.functionName||'(anónima)'} · ${(f.url||'').split('/').pop()}:${f.lineNumber}`;por.set(k,(por.get(k)||0)+(dt.get(n.id)||0)/1000);}
 return [...por].filter(([k])=>!/^\((idle|program|garbage collector)\)/.test(k)).sort((a,b)=>b[1]-a[1]).slice(0,25).map(([k,v])=>`${Math.round(v)}ms ${k}`);
}
/** TRAZA=1: tiempo por tipo de evento en el hilo principal del renderizador (ms por tecla, eventos de primer nivel y anidados). */
function resumirTraza(ev,n=20){
 const hilo=ev.find(e=>e.name==='thread_name'&&e.args?.name==='CrRendererMain'&&ev.some(x=>x.pid===e.pid&&x.name==='FunctionCall'));
 const por=new Map();
 for(const e of ev)if(hilo&&e.pid===hilo.pid&&e.tid===hilo.tid&&e.ph==='X'&&e.dur)por.set(e.name,(por.get(e.name)||0)+e.dur/1000);
 return [...por].sort((a,b)=>b[1]-a[1]).slice(0,18).map(([k,v])=>`${r1(v/n)}ms ${k}`);
}
const navegador=await chromium.launch();
const resultado={base:BASE};
try{
 const contexto=await navegador.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:process.env.REDUCIDO==='1'?'reduce':'no-preference'});
 await contexto.addInitScript(s=>{localStorage.setItem('sb-ejemplo-auth-token',s);},JSON.stringify(sesion));
 await contexto.addInitScript(ganchoReact);
 await contexto.route('https://ejemplo.supabase.co/**',interceptar);
 const pagina=await contexto.newPage();const errores=[];pagina.on('pageerror',e=>errores.push(e.message));
 const cdp=await contexto.newCDPSession(pagina);await cdp.send('Performance.enable');
 const metricas=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 await pagina.goto(BASE+'/dm/forja',{waitUntil:'networkidle',timeout:120000});
 await pagina.getByRole('button',{name:'Ver detalles de Arsenal enorme'}).click({timeout:30000});
 await pagina.getByRole('button',{name:'Editar ficha'}).click();
 await pagina.locator('[data-nodo="nucleo"]').waitFor({timeout:30000});
 await pagina.waitForTimeout(1500);
 // CSS_EXTRA: estilos para probar una hipótesis sin recompilar (p. ej. CSS_EXTRA='.yq-cables{will-change:auto}').
 if(process.env.CSS_EXTRA)await pagina.addStyleTag({content:process.env.CSS_EXTRA});
 await pagina.evaluate(instalarMedidas);
 if(process.env.CAPAS==='1'){
  let capas=[];cdp.on('LayerTree.layerTreeDidChange',e=>{if(e.layers)capas=e.layers;});
  await cdp.send('LayerTree.enable');await pagina.waitForTimeout(600);
  const razones={};for(const l of capas.slice(0,400)){try{const r=await cdp.send('LayerTree.compositingReasons',{layerId:l.layerId});for(const k of r.compositingReasonIds||[])razones[k]=(razones[k]||0)+1;}catch{}}
  resultado.capas={total:capas.length,razones};await cdp.send('LayerTree.disable');
 }
 const nNodos=await pagina.locator('.yq-nodo-pos').count(),nCables=await pagina.locator('g[data-cable]').count();
 resultado.nodos=nNodos;resultado.cables=nCables;
 const react=()=>pagina.evaluate(()=>({...window.__yqReact,porNombre:{...window.__yqReact.porNombre}}));
 const delta=(a,b)=>({commits:b.commits-a.commits,nodoRenders:b.nodos-a.nodos,componentes:b.funciones-a.funciones});
 /** Componentes que más se renderizaron entre dos lecturas (nombres reales solo en desarrollo). */
 const masRenders=(a,b)=>Object.entries(b.porNombre).map(([k,v])=>[k,v-(a.porNombre[k]||0)]).filter(([,v])=>v>0).sort((x,y)=>y[1]-x[1]).slice(0,12).map(([k,v])=>`${k}×${v}`).join(' ');
 const largas=async(desde)=>pagina.evaluate(t=>window.__yq.largas.filter(x=>x.t>=t).map(x=>Math.round(x.d)),desde);
 const ahoraPag=()=>pagina.evaluate(()=>performance.now());

 // Reposo: coste de las animaciones ambientales (brasas + flujo de cables) con nada elegido.
 await pagina.locator('.yq-lienzo').click({position:{x:12,y:12}}).catch(()=>{});
 await pagina.waitForTimeout(800);
 const m0=await metricas();await pagina.evaluate(()=>window.__yq.grabar());await pagina.waitForTimeout(4000);
 const fr=await pagina.evaluate(()=>window.__yq.parar());const m1=await metricas();
 const seg=(m1.Timestamp-m0.Timestamp);
 resultado.reposo={...resumenFotos(fr),cpuPrincipal:`${Math.round((m1.TaskDuration-m0.TaskDuration)/seg*100)}%`,estilo_ms_s:r1((m1.RecalcStyleDuration-m0.RecalcStyleDuration)/seg*1000),layout_ms_s:r1((m1.LayoutDuration-m0.LayoutDuration)/seg*1000),
  animaciones:await pagina.evaluate(()=>document.getAnimations().length)};

 // (a) Escribir 20 caracteres en el nombre de una acción.
 await pagina.locator('.yq-indice [data-indice="accion:e5"]').click();await pagina.waitForTimeout(700);
 const campo=pagina.locator('[data-nodo="accion:e5"]').getByLabel('Nombre de la acción');
 await campo.click();await pagina.keyboard.press('End');await pagina.waitForTimeout(400);
 await pagina.evaluate(()=>{window.__yq.teclas.length=0;window.__yq.eventos.length=0;});
 const perfil=process.env.PERFIL==='1';
 if(perfil){await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:200});await cdp.send('Profiler.start');}
 const traza=process.env.TRAZA==='1',eventosTraza=[];
 const juntar=d=>eventosTraza.push(...d.value);
 if(traza){cdp.on('Tracing.dataCollected',juntar);await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline',transferMode:'ReportEvents'});}
 const t0=await ahoraPag(),ra=await react(),mt0=await metricas();
 const texto=' de brasas y ceniza';
 for(const ch of texto.padEnd(20,'!').slice(0,20)){await pagina.keyboard.press(ch===' '?'Space':ch);await pagina.waitForTimeout(120);}
 await pagina.waitForTimeout(150);
 const rb=await react(),mt1=await metricas();
 const fase=k=>r1((mt1[k]-mt0[k])*1000/20);
 const fasesTecla={script:fase('ScriptDuration'),estilo:fase('RecalcStyleDuration'),layout:fase('LayoutDuration'),tareas:fase('TaskDuration')};
 if(traza){const fin=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');await fin;cdp.off('Tracing.dataCollected',juntar);resultado.trazaTecla=resumirTraza(eventosTraza);}
 if(perfil){const {profile}=await cdp.send('Profiler.stop');resultado.perfilTecla=topFunciones(profile);}
 const teclas=await pagina.evaluate(()=>window.__yq.teclas.slice());
 const ev=await pagina.evaluate(()=>{const m=new Map();for(const e of window.__yq.eventos)if(e.id)m.set(e.id,Math.max(m.get(e.id)||0,e.d));return [...m.values()];});
 const largasTeclas=await largas(t0);
 await pagina.waitForTimeout(1200);// la arena se reconstruye después de dejar de escribir
 const largasTras=(await largas(t0)).slice(largasTeclas.length);
 resultado.tecla={p50:r1(pct(teclas,50)),p95:r1(pct(teclas,95)),max:r1(Math.max(...teclas)),n:teclas.length,eventTimingP95:ev.length?r1(pct(ev,95)):'<16',
  react:{...delta(ra,rb),porTecla:r1((rb.nodos-ra.nodos)/teclas.length),mas:masRenders(ra,rb)},msPorTecla:fasesTecla,tareasLargas:largasTeclas,tareasLargasAlParar:largasTras,valor:await campo.inputValue()};

 if(process.env.FOTO)await pagina.screenshot({path:process.env.FOTO});// FOTO=ruta.png: captura con el nodo elegido
 // (b) Arrastrar un nodo (ya elegido) por su cabecera.
 const cab=await pagina.locator('[data-nodo="accion:e5"] .yq-nodo-cab').boundingBox();
 const arrastrar=async(x,y,pasos,dx,dy)=>{
  await pagina.mouse.move(x,y);await pagina.mouse.down();
  const ev=[];const fn=d=>ev.push(...d.value);
  if(traza){cdp.on('Tracing.dataCollected',fn);await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline',transferMode:'ReportEvents'});}
  const a=await react(),t=await ahoraPag();await pagina.evaluate(()=>window.__yq.grabar());
  for(let k=1;k<=pasos;k++)await pagina.mouse.move(x+dx*k/pasos,y+dy*k/pasos);
  const f=await pagina.evaluate(()=>window.__yq.parar());const b=await react();
  let resumen;
  if(traza){const fin=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');await fin;cdp.off('Tracing.dataCollected',fn);resumen=resumirTraza(ev,f.length).slice(0,10).join(' · ');}
  await pagina.mouse.up();
  return {...resumenFotos(f),react:{...delta(a,b),porMovimiento:r1((b.nodos-a.nodos)/pasos)},tareasLargas:(await largas(t)).length,...(resumen?{trazaPorFotograma:resumen}:{})};
 };
 resultado.arrastreNodo=await arrastrar(cab.x+70,cab.y+cab.height/2,80,320,160);
 await pagina.waitForTimeout(500);
 // (c) Desplazar el fondo (desde un punto vacío) y zoom con la rueda.
 const vacio=await pagina.evaluate(()=>{const l=document.querySelector('.yq-lienzo').getBoundingClientRect();
  for(let fy=.9;fy>.1;fy-=.05)for(let fx=.05;fx<.95;fx+=.05){const x=l.left+l.width*fx,y=l.top+l.height*fy;
   if(!document.elementsFromPoint(x,y).some(e=>e.closest('.yq-nodo-pos,.yq-lienzo-barra,.yq-aviso')))return {x,y};}return null;});
 resultado.desplazar=vacio?await arrastrar(vacio.x,vacio.y,80,-400,-250):'sin hueco';
 await pagina.waitForTimeout(500);
 {
  const l=await pagina.locator('.yq-lienzo').boundingBox();
  const p=vacio??{x:l.x+l.width/2,y:l.y+l.height/2};
  await pagina.mouse.move(p.x,p.y);
  const a=await react(),t=await ahoraPag();await pagina.evaluate(()=>window.__yq.grabar());
  for(let k=0;k<30;k++){await pagina.mouse.wheel(0,k<15?60:-60);await pagina.waitForTimeout(16);}
  await pagina.waitForTimeout(100);
  const f=await pagina.evaluate(()=>window.__yq.parar());const b=await react();
  resultado.zoomRueda={...resumenFotos(f),react:delta(a,b),tareasLargas:(await largas(t)).length};
 }
 // Reposo con un nodo elegido (cables iluminados con resplandor).
 await pagina.waitForTimeout(600);
 const n0=await metricas();await pagina.evaluate(()=>window.__yq.grabar());await pagina.waitForTimeout(3000);
 const fr2=await pagina.evaluate(()=>window.__yq.parar());const n1=await metricas();
 resultado.reposoElegido={...resumenFotos(fr2),cpuPrincipal:`${Math.round((n1.TaskDuration-n0.TaskDuration)/(n1.Timestamp-n0.Timestamp)*100)}%`};
 resultado.errores=errores;
}finally{await navegador.close();}
if(process.env.JSON==='1')console.log(JSON.stringify(resultado,null,1));
else{
 console.log(`Yunque · ${resultado.base} · ${resultado.nodos} nodos, ${resultado.cables} cables`);
 for(const [k,v] of Object.entries(resultado))if(v&&typeof v==='object'&&!Array.isArray(v))console.log(`${k.padEnd(14)} ${JSON.stringify(v)}`);
 if(resultado.trazaTecla)console.log('traza (ms por tecla):\n  '+resultado.trazaTecla.join('\n  '));
 if(resultado.perfilTecla)console.log('perfil (20 teclas):\n  '+resultado.perfilTecla.join('\n  '));
 if(resultado.errores?.length)console.log('errores de página:',resultado.errores.slice(0,3).join(' | '));
}
const umbral=Number(process.env.UMBRAL_TECLA||0);
if(umbral&&!(resultado.tecla?.p95<=umbral)){console.error(`FALLO: p95 por tecla ${resultado.tecla?.p95} ms > ${umbral} ms`);process.exit(1);}
