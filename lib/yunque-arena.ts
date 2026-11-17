import type {Borrador,Creacion} from "./yunque-borrador";
import type {Grafo} from "./yunque-grafo";
import {nuevoCombate,agregar,iniciar,siguiente,actuar,maxVida,dadoSeguro,type Combate,type Config,type Fuente,type RNG} from "./combate";
import {SLOTS,validarEfectos,type Efecto,type Elemento} from "./creacion";
import {validarReglas} from "./reglas";
import {validarPasivas} from "./pasivas";
/**
 * Arena de dolls del Yunque: un combate aislado en el navegador sobre `lib/combate.ts`.
 * Nunca guarda nada ni toca la red. El portador («doll») lleva la creación del borrador;
 * el saco de golpes no actúa nunca por su cuenta, solo cuando se pulsa «Golpéame».
 */
export type AjustesDoll={vida:number;ph:number;fatiga:number;armadura:number;salvacion:number};
export const DOLL_BASE:AjustesDoll={vida:40,ph:20,fatiga:10,armadura:0,salvacion:0};
export const SACO_BASE:AjustesDoll={vida:60,ph:0,fatiga:0,armadura:0,salvacion:0};
export type ContextoArena={creaciones:Creacion[];stats:Record<string,number>}; // stats: valores del borrador ya resueltos (valoresBorrador)
export type Golpe={cantidad:number;caras:number;naturaleza:'fisica'|'magica';elemento?:string};
const DOLL='doll',SACO='saco',NOMBRE_SACO='Saco de golpes';
const GOLPE_HABILIDAD='golpeame',GOLPE_EFECTO='golpeame';
// Mismas exclusiones que lib/monstruos.ts al sumar el equipo a los atributos.
const SIN_BONO=['peso','durabilidad','dados_dano','caras_dano','dano','nivel'];
const copia=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const PREFIJO='La prueba no puede empezar: ';
function ranura(b:Borrador):string{
 if(b.tipo==='titulo')return 'titulo';
 if(SLOTS.some(s=>s.clave===b.slot))return b.slot;
 return SLOTS.find(s=>s.tipos.includes(b.slot))?.clave||b.slot||'ninguno';
}
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
  const buscar=(cid:string)=>ctx.creaciones.find(c=>c.id===cid);
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
  config.equipamiento={[ranura(b)]:{id,forja_id:b.id,nombre,stats:{...b.stats},efectos:b.efectos,slot_tipo:b.slot,tipo_creacion:b.tipo,consumible:b.consumible,reglas:b.reglas,reglas_pasivas:b.reglas_pasivas}};
 }
 const {stats,bonos}=conEquipo(base,config.equipamiento||{});
 config.stats_base=base;config.bonos_equipamiento=bonos;
 return {id:DOLL,forja_id:null,nombre:'Doll portador',stats,configuracion:config};
}
export function crearArena(b:Borrador,ctx:ContextoArena,doll:Partial<AjustesDoll>={},saco:Partial<AjustesDoll>={}):{combate:Combate}|{error:string}{
 try{
  const fallo=validarEfectos(b.efectos||[])||validarReglas(b.reglas||[])||validarPasivas(b.reglas_pasivas||[]);
  if(fallo)return {error:PREFIJO+fallo};
  // La iniciativa del portador siempre va primero; el resto de tiradas son normales.
  const iniciativa=(v:number):RNG=>{let usada=false;return caras=>usada?dadoSeguro(caras):(usada=true,v);};
  let c=nuevoCombate();
  c.regla='directo';
  c.politica={...c.politica!,modo:'entrenamiento',automatico:false};
  c=agregar(c,portador(b,ctx,doll),'jugador',iniciativa(20));
  c=agregar(c,{id:SACO,forja_id:null,nombre:NOMBRE_SACO,stats:{...SACO_BASE,...saco},configuracion:{tipo_creacion:'personaje'}},'enemigo',iniciativa(1));
  const d=c.miembros.find(m=>m.id===DOLL)!,s=c.miembros.find(m=>m.id===SACO)!;
  if(d.iniciativa<=s.iniciativa)d.iniciativa=s.iniciativa+1;
  d.posicion={x:4,y:3};s.posicion={x:5,y:3};
  const n=iniciar(c);
  recomponer(n);
  return {combate:{...n,historial:[]}};
 }catch(e){return {error:PREFIJO+(e instanceof Error?e.message:String(e))};}
}
function recomponer(c:Combate){
 const s=c.miembros.find(m=>m.id===SACO);
 if(!s||s.vida>0)return;
 s.vida=maxVida(s);if(s.situacion)s.situacion='activo';
 c.registro=['El saco se recompone.',...c.registro].slice(0,300);
}
function pasarSaco(c:Combate,rng:RNG){
 let n=c;
 for(let i=0;i<4&&n.fase==='en_curso'&&n.actual===SACO;i++){n=siguiente(n,rng);recomponer(n);}
 return n;
}
/** Todo un paso de la arena es un único punto de «deshacer» del motor. */
function unPaso(antes:Combate,despues:Combate,visual:Combate):Combate{
 const {historial,...previo}=antes;
 return {...despues,evento_visual:visual.evento_visual,historial:[...(historial||[]),copia(previo) as Combate].slice(-10)};
}
/** Acción del portador; tras ella pasa los turnos del saco. */
export function usar(c:Combate,accionId:string,objetivo:string=SACO,rng:RNG=dadoSeguro):Combate{
 const hecho=actuar(c,DOLL,accionId,objetivo,rng);
 recomponer(hecho);
 const n=hecho.fase==='en_curso'&&hecho.actual===DOLL?pasarSaco(siguiente(hecho,rng),rng):pasarSaco(hecho,rng);
 return unPaso(c,n,hecho);
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
function lineasNuevas(antes:Combate,despues:Combate):string[]{
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
