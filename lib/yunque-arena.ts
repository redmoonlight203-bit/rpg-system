import type {Borrador,Creacion} from "./yunque-borrador";
import {vigente,type Grafo} from "./yunque-grafo";
import {nuevoCombate,agregar,cambiarEquipo,seleccionEquipo,iniciar,siguiente,actuar,desplazar,levantarse,posicionesTablero,registrarCambiosVida,maxVida,dadoSeguro,reaccionDe,type Combate,type Combatiente,type Config,type Fuente,type MapaCombate,type Posicion,type RNG} from "./combate";
import {SLOTS,validarEfectos,type Efecto,type Elemento} from "./creacion";
import {validarReglas} from "./reglas";
import {validarPasivas} from "./pasivas";
/**
 * Arena de dolls del Yunque: un combate aislado en el navegador sobre `lib/combate.ts`.
 * Nunca guarda nada ni toca la red. El portador («doll») lleva la creación del borrador;
 * los sacos de golpes (hasta tres: «saco», «saco-2», «saco-3») no actúan nunca por su cuenta; el primero devuelve
 * un golpe solo cuando se pulsa «Golpéame». Todo ocurre en un tablero pequeño (ARENA) con las mismas reglas de
 * alcance, áreas, empujes y movimiento que el combate de la app.
 */
export type AjustesDoll={vida:number;ph:number;fatiga:number;armadura:number;salvacion:number};
export const DOLL_BASE:AjustesDoll={vida:40,ph:20,fatiga:10,armadura:0,salvacion:0};
export const SACO_BASE:AjustesDoll={vida:60,ph:0,fatiga:0,armadura:0,salvacion:0};
export type ContextoArena={creaciones:Creacion[];stats:Record<string,number>}; // stats: valores del borrador ya resueltos (valoresBorrador)
export type Golpe={cantidad:number;caras:number;naturaleza:'fisica'|'magica';elemento?:string};
const DOLL='doll',SACO='saco',NOMBRE_SACO='Saco de golpes';
/** Tablero de la arena: 9×7 cabe en el panel (casillas de ~32 px) y deja sitio a empujes, conos y áreas de radio 3. */
export const ARENA={columnas:9,filas:7} as const;
export const SACOS=[SACO,'saco-2','saco-3'] as const;
export const esSaco=(id:string|null|undefined)=>!!id&&(SACOS as readonly string[]).includes(id);
export const POSICION_DOLL:Posicion={x:2,y:3};
/** Dónde entra cada saco nuevo si la casilla está libre: el primero junto al doll; los demás, a su alrededor (para áreas). */
const PREFERIDAS:Posicion[]=[{x:3,y:3},{x:4,y:2},{x:4,y:4},{x:5,y:3},{x:4,y:3},{x:5,y:1},{x:5,y:5}];
const MAPA:MapaCombate={id:'arena-yunque',version:1,nombre:'Arena del Yunque',columnas:ARENA.columnas,filas:ARENA.filas,celdas:{}};
const nombreSaco=(id:string)=>id===SACO?NOMBRE_SACO:`${NOMBRE_SACO} ${id.slice(SACO.length+1)}`;
const dentro=(p:Posicion|undefined):p is Posicion=>!!p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<ARENA.columnas&&p.y<ARENA.filas;
const clave=(p:Posicion)=>`${p.x},${p.y}`;
function fuenteSaco(id:string,saco:Partial<AjustesDoll>){
 return {id,forja_id:null,nombre:nombreSaco(id),stats:{...SACO_BASE,...saco},configuracion:{tipo_creacion:'personaje' as const}};
}
/** Primera casilla libre: la pedida si vale; si no, la siguiente preferida; si no, cualquiera. */
function libre(ocupadas:Set<string>,pedida?:Posicion):Posicion{
 if(dentro(pedida)&&!ocupadas.has(clave(pedida)))return {x:pedida.x,y:pedida.y};
 const p=PREFERIDAS.find(q=>!ocupadas.has(clave(q)));if(p)return {...p};
 for(let y=0;y<ARENA.filas;y++)for(let x=0;x<ARENA.columnas;x++)if(!ocupadas.has(`${x},${y}`))return {x,y};
 throw Error('No queda sitio en la arena.');
}
const GOLPE_HABILIDAD='golpeame',GOLPE_EFECTO='golpeame';
// Mismas exclusiones que lib/monstruos.ts al sumar el equipo a los atributos.
const SIN_BONO=['peso','durabilidad','dados_dano','caras_dano','dano','nivel'];
const copia=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const PREFIJO='La prueba no puede empezar: ';
function ranuraDe(tipo:string|undefined,slot:string):string{
 if(tipo==='titulo')return 'titulo';
 if(SLOTS.some(s=>s.clave===slot))return slot;
 return SLOTS.find(s=>s.tipos.includes(slot))?.clave||slot||'ninguno';
}
const ranura=(b:Borrador)=>ranuraDe(b.tipo,b.slot);
function fuenteObjeto(c:Creacion):Fuente{
 return {id:c.id,forja_id:c.id,nombre:c.nombre,stats:{...(c.stats||{})},efectos:c.configuracion_dados||[],slot_tipo:c.slot_tipo,tipo_creacion:c.tipo_creacion,consumible:c.consumible,reglas:c.reglas||[],reglas_pasivas:c.reglas_pasivas||[],requisitos_uso:c.requisitos_uso};
}
function conEquipo(stats:Record<string,number>,equipo:Record<string,Fuente>){
 const bonos:Record<string,number>={};
 for(const p of Object.values(equipo))for(const [k,v] of Object.entries(p.stats||{}))if(!SIN_BONO.includes(k)&&typeof v==='number')bonos[k]=(bonos[k]||0)+v;
 const total={...stats};for(const [k,v] of Object.entries(bonos))total[k]=(total[k]||0)+v;
 return {stats:total,bonos};
}
/** Portador según el tipo del borrador. Los requisitos de uso de la propia creación se ignoran: es un banco de pruebas. */
function portador(b:Borrador,ctx:ContextoArena,doll:Partial<AjustesDoll>){
 const id=b.id||'borrador',nombre=b.nombre.trim()||'Creación en pruebas';
 const config:Config={tipo_creacion:'personaje'};
 if(b.tipo==='personaje'){
  // Solo lo que sigue en La Creación (aprobado): lo archivado se omite, como en el grafo.
  const buscar=(cid:string)=>ctx.creaciones.find(c=>c.id===cid&&vigente(c));
  config.habilidades=b.habilidades.map(buscar).filter((c):c is Creacion=>!!c).map(fuenteObjeto);
  config.pasivas=b.pasivas.map(buscar).filter((c):c is Creacion=>!!c).map(c=>({id:c.id,nombre:c.nombre,requisitos_uso:c.requisitos_uso,reglas:c.reglas_pasivas||[],reglas_motor:c.reglas||[]}));
  const equipo:Record<string,Fuente>={};
  for(const [slot,cid] of Object.entries(b.equipamiento||{})){const c=cid?buscar(cid):undefined;if(c)equipo[slot]=fuenteObjeto(c);}
  config.equipamiento=equipo;
  config.reglas=b.reglas;config.reglas_pasivas=b.reglas_pasivas;
  const base={...(Object.keys(ctx.stats||{}).length?ctx.stats:b.stats),...doll};
  const {stats,bonos}=conEquipo(base,equipo);
  config.stats_base=base;config.bonos_equipamiento=bonos;
  return {id:DOLL,forja_id:null,nombre:b.nombre.trim()||'Portador',stats,configuracion:config};
 }
 const base:Record<string,number>={...DOLL_BASE,...doll};
 if(b.tipo==='habilidad')config.habilidades=[{id,forja_id:b.id,nombre,stats:{...b.stats},efectos:b.efectos,reglas:b.reglas,tipo_creacion:'habilidad'}];
 else if(b.tipo==='pasiva')config.pasivas=[{id,nombre,reglas:b.reglas_pasivas,reglas_motor:b.reglas}];
 else{
  // objeto, título u otro: la pieza va en su ranura.
  // El motor solo acepta tipos de pieza en `slot_tipo`: si el borrador guarda la ranura (mano_der), se pasa a su tipo y la ranura queda aparte para volver a equiparla.
  const sitio=ranura(b),espacio=SLOTS.find(s=>s.clave===b.slot);
  const pieza:Fuente&{ranura:string}={ranura:sitio,id,forja_id:b.id,nombre,stats:{...b.stats},efectos:b.efectos,slot_tipo:espacio?espacio.tipos[0]:b.slot,tipo_creacion:b.tipo,consumible:b.consumible,reglas:b.reglas,reglas_pasivas:b.reglas_pasivas};
  config.equipamiento={[sitio]:pieza};
 }
 const {stats,bonos}=conEquipo(base,config.equipamiento||{});
 config.stats_base=base;config.bonos_equipamiento=bonos;
 return {id:DOLL,forja_id:null,nombre:'Doll portador',stats,configuracion:config};
}
/** Disposición de la arena que sobrevive a los reinicios: dónde está cada saco (uno por posición, como mucho tres). */
export type Disposicion={sacos?:Posicion[]};
export function prepararArena(b:Borrador,ctx:ContextoArena,doll:Partial<AjustesDoll>={},saco:Partial<AjustesDoll>={},disposicion:Disposicion={},rng:RNG=dadoSeguro):{combate:Combate}|{error:string}{
 try{
  const fallo=validarEfectos(b.efectos||[])||validarReglas(b.reglas||[])||validarPasivas(b.reglas_pasivas||[]);
  if(fallo)return {error:PREFIJO+fallo};
  // La iniciativa del portador siempre va primero; el resto de tiradas son normales.
  const iniciativa=(v:number):RNG=>{let usada=false;return caras=>usada?rng(caras):(usada=true,v);};
  let c=nuevoCombate();
  c.regla='directo';
  c.politica={...c.politica!,modo:'entrenamiento',automatico:false};
  c.mapa={...MAPA,celdas:{}};
  c=agregar(c,portador(b,ctx,doll),'jugador',iniciativa(20));
  const pedidas=(disposicion.sacos?.length?disposicion.sacos:[undefined]).slice(0,SACOS.length);
  const ocupadas=new Set([clave(POSICION_DOLL)]);
  for(const [i,pedida] of pedidas.entries()){
   c=agregar(c,fuenteSaco(SACOS[i],saco),'enemigo',iniciativa(1));
   const s=c.miembros.find(m=>m.id===SACOS[i])!;
   s.posicion=libre(ocupadas,pedida);ocupadas.add(clave(s.posicion));
  }
  const d=c.miembros.find(m=>m.id===DOLL)!;
  d.iniciativa=Math.max(d.iniciativa,...c.miembros.filter(m=>m.id!==DOLL).map(m=>m.iniciativa+1));
  d.posicion={...POSICION_DOLL};
  return {combate:c};
 }catch(e){return {error:PREFIJO+(e instanceof Error?e.message:String(e))};}
}
export function crearArena(...args:Parameters<typeof prepararArena>):{combate:Combate}|{error:string}{
 const preparado=prepararArena(...args);
 if('error' in preparado)return preparado;
 try{
  const n=iniciar(preparado.combate,args[5]);
  recomponer(n);
  return {combate:{...n,historial:[]}};
 }catch(e){return {error:PREFIJO+(e instanceof Error?e.message:String(e))};}
}
function recomponer(c:Combate){
 for(const s of c.miembros){
  if(!esSaco(s.id)||s.vida>0)continue;
  s.vida=maxVida(s);if(s.situacion)s.situacion='activo';
  c.registro=[`El ${s.id===SACO?'saco':'saco '+s.id.slice(SACO.length+1)} se recompone.`,...c.registro].slice(0,300);
 }
}
/** Ningún saco juega su turno: se pasan todos hasta que vuelve a tocarle al portador. */
function pasarSaco(c:Combate,rng:RNG){
 let n=c;
 for(let i=0;i<2*SACOS.length+2&&n.fase==='en_curso'&&esSaco(n.actual);i++){n=siguiente(n,rng);recomponer(n);}
 return n;
}
/** Todo un paso de la arena es un único punto de «deshacer» del motor. */
function unPaso(antes:Combate,despues:Combate,visual:Combate):Combate{
 const {historial,...previo}=antes;
 return {...despues,evento_visual:visual.evento_visual,historial:[...(historial||[]),copia(previo) as Combate].slice(-10)};
}
/**
 * Acción del portador, por el mismo `actuar` que el combate de la app (con la casilla apuntada para áreas y
 * movimientos del lanzador). Como en el combate, el turno sigue: el doll puede moverse con lo que le quede y el
 * turno termina con «Terminar turno» (`turno`). Solo si el motor ya pasó el turno a un saco, los sacos pasan solos.
 */
export function usar(c:Combate,accionId:string,objetivo:string=SACO,rng:RNG=dadoSeguro,forzar=false,centro?:Posicion):Combate{
 const hecho=actuar(c,DOLL,accionId,objetivo,rng,forzar,centro);
 recomponer(hecho);
 const n=hecho.fase==='en_curso'&&esSaco(hecho.actual)?pasarSaco(hecho,rng):hecho;
 return unPaso(c,n,hecho);
}
/** «Terminar turno» (`siguiente`, como en el combate): los sacos pasan sin actuar y vuelve a tocarle al portador. Un único paso de deshacer. */
export function turno(c:Combate,rng:RNG=dadoSeguro):Combate{
 const n=pasarSaco(siguiente(c,rng),rng);
 return unPaso(c,n,n);
}
/** La pieza de la creación en pruebas (objeto o título) del portador, equipada o en reserva; null si la creación no es una pieza equipable. */
function piezaDe(c:Combate):{pieza:Fuente&{ranura?:string};equipada:boolean}|null{
 const d=c.miembros.find(m=>m.id===DOLL);if(!d)return null;
 // Solo las creaciones que son una pieza (el portador de un objeto o título no lleva habilidades ni pasivas; el de un personaje, sí).
 if(d.configuracion.habilidades!==undefined||d.configuracion.pasivas!==undefined)return null;
 const eq=Object.values(d.configuracion.equipamiento||{}).find(p=>p.id&&['objeto','titulo'].includes(p.tipo_creacion||''));
 if(eq)return {pieza:eq,equipada:true};
 const r=(d.configuracion.reserva||[]).find(p=>p.id&&['objeto','titulo'].includes(p.tipo_creacion||''));
 return r?{pieza:r,equipada:false}:null;
}
/** ¿Está puesta la pieza que se crea? null si la creación no es una pieza (habilidad, pasiva, personaje u otro). */
export function piezaEquipada(c:Combate):boolean|null{return piezaDe(c)?.equipada??null;}
/** Nombre de la pieza que alterna `alternarPieza`, o null. */
export function nombrePieza(c:Combate):string|null{return piezaDe(c)?.pieza.nombre??null;}
/**
 * Quita o pone la pieza en pruebas (el «Inventario» de la barra) con `cambiarEquipo` del motor: dispara «Al desequipar» /
 * «Al equipar», retira los modificadores que vinieron de ella y consume la acción. Los errores del motor (no es tu turno,
 * sin acción) se propagan tal cual. Un único paso de deshacer.
 */
export function alternarPieza(c:Combate,rng:RNG=dadoSeguro):Combate{
 const p=piezaDe(c);
 if(!p)throw Error('Esta creación no es una pieza que se pueda quitar o poner.');
 const d=c.miembros.find(m=>m.id===DOLL)!;
 const sel=seleccionEquipo(d);
 if(p.equipada){for(const [k,id] of Object.entries(sel))if(id===p.pieza.id)delete sel[k];}
 else sel[p.pieza.ranura||ranuraDe(p.pieza.tipo_creacion,p.pieza.slot_tipo||'')]=p.pieza.id!;
 const hecho=cambiarEquipo(c,DOLL,sel,rng);
 recomponer(hecho);
 const n=hecho.fase==='en_curso'&&esSaco(hecho.actual)?pasarSaco(hecho,rng):hecho;
 return unPaso(c,n,hecho);
}
/** Movimiento del portador (el mismo `desplazar` del combate): conserva su acción y su turno. */
export function mover(c:Combate,p:Posicion):Combate{
 const n=desplazar(c,DOLL,p);
 return unPaso(c,n,n);
}
/** El portador derribado se levanta (gasta la mitad de su movimiento), como en el combate. */
export function levantar(c:Combate):Combate{
 const n=levantarse(c,DOLL);
 return unPaso(c,n,n);
}
/** Posiciones de los sacos en orden («saco», «saco-2», «saco-3»): la disposición que se conserva al reiniciar. */
export function sacosDe(c:Combate):Posicion[]{
 const p=posicionesTablero(c);
 return SACOS.filter(id=>p[id]).map(id=>({...p[id]}));
}
/** Añade el siguiente saco (hasta tres) en una casilla libre; nunca actúa, como el primero. Un paso de deshacer. */
export function agregarSaco(c:Combate,saco:Partial<AjustesDoll>={},donde?:Posicion):Combate{
 if(c.fase!=='en_curso')throw Error('La prueba no está en curso.');
 const id=SACOS.find(x=>!c.miembros.some(m=>m.id===x));
 if(!id)throw Error(`Como mucho ${SACOS.length} sacos en la arena.`);
 const posiciones=posicionesTablero(c);
 const ocupadas=new Set(Object.values(posiciones).map(clave));
 // El saco se prepara aparte (agregar solo admite la preparación) y entra ya en pie, con iniciativa por debajo del portador.
 const solo=agregar({...nuevoCombate(),mapa:{...MAPA,celdas:{}}},fuenteSaco(id,saco),'enemigo',()=>1);
 const s=solo.miembros[0] as Combatiente;
 const n=copia({...c,historial:[]}) as Combate;
 for(const m of n.miembros)m.posicion=posiciones[m.id];
 s.posicion=libre(ocupadas,donde);
 s.iniciativa=Math.min(...n.miembros.filter(m=>m.id!==DOLL).map(m=>m.iniciativa))-1;
 n.miembros.push(s);
 n.registro=[`${s.nombre} entra en la arena en (${s.posicion.x+1}, ${s.posicion.y+1}).`,...n.registro].slice(0,300);
 const v=registrarCambiosVida(c,n);
 return unPaso(c,v,v);
}
/** Retira un saco añadido («saco-2» o «saco-3»); el primero siempre se queda. */
export function quitarSaco(c:Combate,id:string):Combate{
 if(!esSaco(id)||id===SACO)throw Error('El primer saco no se puede retirar.');
 const s=c.miembros.find(m=>m.id===id);
 if(!s)throw Error('Ese saco no está en la arena.');
 if(c.actual===id)throw Error('Ese saco está en su turno.');
 const posiciones=posicionesTablero(c);
 const n=copia({...c,historial:[]}) as Combate;
 n.miembros=n.miembros.filter(m=>m.id!==id);
 for(const m of n.miembros)m.posicion=posiciones[m.id];
 n.registro=[`${s.nombre} sale de la arena.`,...n.registro].slice(0,300);
 const v=registrarCambiosVida(c,n);
 return unPaso(c,v,v);
}
/** Coloca un saco en una casilla libre del tablero (preparar una prueba de área); el portador se mueve jugando. */
export function colocar(c:Combate,id:string,p:Posicion):Combate{
 if(!esSaco(id))throw Error('Solo se colocan sacos: el doll se mueve con «Mover».');
 const s=c.miembros.find(m=>m.id===id);
 if(!s)throw Error('Ese saco no está en la arena.');
 if(!dentro(p))throw Error('Esa casilla no está en la arena.');
 const posiciones=posicionesTablero(c);
 if(Object.entries(posiciones).some(([k,q])=>k!==id&&q.x===p.x&&q.y===p.y))throw Error('Esa casilla está ocupada.');
 const n=copia({...c,historial:[]}) as Combate;
 for(const m of n.miembros)m.posicion=posiciones[m.id];
 n.miembros.find(m=>m.id===id)!.posicion={x:p.x,y:p.y};
 n.registro=[`${s.nombre} se coloca en (${p.x+1}, ${p.y+1}).`,...n.registro].slice(0,300);
 const v=registrarCambiosVida(c,n);
 return unPaso(c,v,v);
}
function efectoGolpe(g:Golpe):Efecto{
 return {id:GOLPE_EFECTO,nombre:`Golpéame ${g.cantidad}d${g.caras}`,efecto:'dano',cantidad:g.cantidad,caras:g.caras,modificador:0,tipo_dano:g.naturaleza==='magica'?'mágico':'físico',estado:'',duracion:0,coste_ph:0,
  ...(g.naturaleza==='magica'?{naturaleza:'magica' as const}:{}),...(g.elemento?{elemento:g.elemento as Elemento}:{}),
  tablero:{alcance:60,forma:'individual',tamano:0,afecta:'todos'}};
}
/** El saco ataca al portador una vez, por el camino normal de `actuar` (reacciones y pasivas incluidas). */
export function golpeame(c:Combate,g:Golpe,rng:RNG=dadoSeguro):Combate{
 const e=efectoGolpe(g);
 // No pasa por validarEfectos: un golpe mágico del saco no gasta PH (el saco no tiene).
 if(!Number.isInteger(g.cantidad)||g.cantidad<1||g.cantidad>100||!Number.isInteger(g.caras)||g.caras<2||g.caras>1000)throw Error('Golpéame: usa de 1 a 100 dados de 2 a 1000 caras.');
 const turno=copia({...c,historial:[]}) as Combate;
 const s=turno.miembros.find(m=>m.id===SACO);
 if(!s)throw Error('La arena no tiene saco.');
 const previo=turno.actual;
 // Se le presta el turno al saco y un golpe sintético solo durante esta acción.
 turno.actual=SACO;s.accion_usada=false;
 s.configuracion={...s.configuracion,habilidades:[{id:GOLPE_HABILIDAD,nombre:NOMBRE_SACO,stats:{},efectos:[e]}]};
 const n=actuar(turno,SACO,`hab:${GOLPE_HABILIDAD}:${GOLPE_EFECTO}`,DOLL,rng);
 const saco=n.miembros.find(m=>m.id===SACO)!;
 delete saco.configuracion.habilidades;
 saco.accion_usada=false;
 if(n.fase==='en_curso')n.actual=previo;
 recomponer(n);
 return unPaso(c,n,n);
}
/** Entradas del registro que aparecieron entre dos pasos (el registro va de la más nueva a la más vieja). */
export function lineasNuevas(antes:Combate,despues:Combate):string[]{
 const a=antes.registro,d=despues.registro;
 if(!a.length)return d.slice();
 for(let k=0;k<d.length;k++){
  const solape=Math.min(d.length-k,a.length);
  let igual=true;
  for(let i=0;i<solape;i++)if(d[k+i]!==a[i]){igual=false;break;}
  if(igual)return d.slice(0,k);
 }
 return d.slice();
}
/** Ids de nodo a encender: busca en las entradas nuevas del registro los nombres de acciones, reglas y pasivas. */
export function activados(antes:Combate,despues:Combate,g:Grafo):string[]{
 const lineas=lineasNuevas(antes,despues);
 if(!lineas.length)return [];
 const existe=new Set(g.nodos.map(n=>n.id));
 const ids=new Set<string>();
 const reactivas=lineas.flatMap(l=>{const r=/defensas reactivas (.+); ARM/.exec(l);return r?r[1].split(', '):[];});
 for(const nodo of g.nodos){
  const x=nodo.titulo;
  if(!x)continue;
  if(nodo.tipo==='accion'){
   if(lineas.some(l=>l.startsWith(x+': ')||l.includes(' · '+x+': ')))ids.add(nodo.id);
   if(lineas.some(l=>l.includes(' activa '+x+' ('))){
    ids.add(nodo.id);
    const reaccion='reaccion:'+nodo.id.slice('accion:'.length);
    if(existe.has(reaccion))ids.add(reaccion);
   }
  }else if(nodo.tipo==='cuando'){
   if(lineas.some(l=>l.endsWith(' · '+x)))ids.add(nodo.id);
  }else if(nodo.tipo==='pasiva'){
   if(reactivas.includes(x)||lineas.some(l=>(l.includes(': '+x+' (')&&l.endsWith(').'))||l.endsWith(': '+x+' al iniciar turno.')))ids.add(nodo.id);
  }
 }
 return [...ids];
}
export type Flotante={id:string;quien:'doll'|'saco';tipo:'dano'|'cura'|'absorbido';valor:number};
/** Lo que una reacción detendría de `total` según su configuración (sin contar una salvación fallida). */
function detenidoPor(c:Combate,quien:string,nombre:string,total:number):number{
 const m=c.miembros.find(x=>x.id===quien);
 const e=(m?.configuracion.habilidades||[]).flatMap(h=>h.efectos||[]).find(x=>x.nombre===nombre);
 const r=e?reaccionDe(e)?.principal:undefined;
 if(!r)return 0;
 return r.reducir.modo==='mitad'?total-Math.floor(total/2):Math.min(total,r.reducir.valor||0);
}
/**
 * Lee del registro lo que pasó en un paso: daño recibido por cada uno, lo que una reacción detuvo («absorbido»),
 * la curación del doll y los dados tirados. Solo interpreta frases que escribe `lib/combate.ts`: el total del golpe
 * («Daño: … = N.»), lo que lo cambia antes de llegar al blanco (× 2, «Tras ARM», reducciones de pasivas), la reacción
 * que se activa (y su salvación) y lo recibido. Si el golpe deja al blanco a 0, lo recibido está topado por su vida:
 * entonces lo absorbido es lo que la reacción detiene según su configuración, nunca más que la diferencia.
 */
export function leerPaso(antes:Combate,despues:Combate,n:number):{flotantes:Flotante[];dados:{caras:number;valor:number}[]}{
 const lineas=lineasNuevas(antes,despues).slice().reverse();
 const doll=antes.miembros.find(m=>m.id===DOLL),saco=antes.miembros.find(m=>m.id===SACO);
 const quien=(nombre:string)=>nombre===doll?.nombre?'doll':nombre===saco?.nombre?'saco':null;
 const flotantes:Flotante[]=[],dados:{caras:number;valor:number}[]=[];
 const recibido={doll:0,saco:0};
 let total:number|null=null,reaccion:{nombre:string;fallida:boolean}|null=null,k=0;
 const poner=(q:Flotante['quien'],tipo:Flotante['tipo'],valor:number)=>{if(valor>0)flotantes.push({id:`${n}:${k++}`,quien:q,tipo,valor});};
 for(const l of lineas){
  const t=/^Daño: .*= (-?\d+)\.$/.exec(l);if(t){total=Number(t[1]);reaccion=null;continue;}
  if(total!==null){
   if(/× 2\.$/.test(l)&&!l.startsWith('Daño:')){total*=2;continue;}
   const arm=/^Tras ARM: (-?\d+)\.$/.exec(l);if(arm){total=Number(arm[1]);continue;}
   const red=/: reducción \d+% \((-?\d+) → (-?\d+)\)/.exec(l);if(red){total=Number(red[2]);continue;}
   const act=/ activa (.+) \(\d+ PH\)\.$/.exec(l);if(act){reaccion??={nombre:act[1],fallida:false};continue;}
   if(reaccion&&/: salvación d20 .*: fallida\.$/.test(l)){reaccion.fallida=true;continue;}
  }
  const r=/^(.+) recibe (\d+) daño; vida (-?\d+)\.$/.exec(l);
  if(r){
   const q=quien(r[1]),v=Number(r[2]),vida=Number(r[3]);
   if(q){
    recibido[q]+=v;poner(q,'dano',v);
    if(reaccion&&!reaccion.fallida&&total!==null&&total>v){
     const id=q==='doll'?DOLL:SACO;
     poner(q,'absorbido',vida>0?total-v:Math.min(total-v,detenidoPor(antes,id,reaccion.nombre,total)));
    }
   }
   total=null;reaccion=null;continue;
  }
  const d=/: \d+d(\d+) \[([^\]]*)\]/.exec(l);
  if(d)for(const v of d[2].split(',').map(x=>Number(x.trim())).filter(Number.isFinite))if(dados.length<8)dados.push({caras:Number(d[1]),valor:v});
 }
 const vidaAntes=doll?.vida??0,vidaDespues=despues.miembros.find(m=>m.id===DOLL)?.vida??0;
 poner('doll','cura',vidaDespues-vidaAntes+recibido.doll);
 return {flotantes,dados};
}
