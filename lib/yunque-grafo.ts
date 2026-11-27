import type {Borrador} from "./yunque-borrador";
import {EFECTOS_NOMBRE,SLOTS,validarEfectos,validarReaccion,type Efecto} from "./creacion";
import {EVENTOS,EFECTOS_REGLA,validarReglas,type Regla,type EfectoRegla,type CondicionRegla} from "./reglas";
import {describirEfecto,describirRegla,describirReaccion,condicionClara} from "./descripciones";
import {validarPasivas,EVENTOS_PASIVA,CONDICIONES_PASIVA} from "./pasivas";
import {reaccionDe,validarTactica,validarRequisitos,presupuestoDeStats} from "./combate";
import {describirVision,validarVision} from "./vision";
import {normalizarReaccion,lineaCosteReaccion} from "./reacciones";
import {leerOrigen,MENSAJE_ORIGEN} from "./yunque-origen";
import {plantillaPorId} from "./yunque-plantillas";
import {definicionBase,definicionAplicada,describirEstado,TIPOS_ESTADO_LEGADO} from "./estados";
/**
 * Grafo DERIVADO del Borrador (solo lectura): `aGrafo` nunca modifica `b`.
 * El Borrador es la única fuente de verdad; las ediciones son operaciones puras sobre él.
 */
export type TipoNodo='nucleo'|'accion'|'alcance'|'salvacion'|'estado'|'reaccion'|'transformacion'|'recurso'|'vfx'|'tabla_armas'|'vision'|'cuando'|'si'|'entonces'|'pasiva'|'vinculo'|'invocacion'|'requisitos';
export type Ruta=(string|number)[];
export type Puerto={id:string;lado:'entrada'|'salida';acepta:TipoNodo[];etiqueta?:string};
/** Vínculo del nodo con su plantilla viva; `huerfana`: la plantilla ya no existe en el catálogo. */
export type SelloPlantilla={id:string;nombre:string;version:number;huerfana:boolean};
export type Nodo={id:string;tipo:TipoNodo;ruta:Ruta;titulo:string;frase:string;error:string|null;puertos:Puerto[];
 /** Línea corta siempre visible bajo la frase (coste y usos de una reacción). */
 insignia?:string;
 /** Solo en acciones, reglas y pasivas desplegadas desde una plantilla. */
 plantilla?:SelloPlantilla};
export type Cable={id:string;desde:{nodo:string;puerto:string};hasta:{nodo:string;puerto:string}};
export type Grafo={nodos:Nodo[];cables:Cable[]};
/** `estado`: solo las creaciones aprobadas (o sin estado, p. ej. en pruebas) cuentan como presentes en La Creación. */
export type ContextoGrafo={creaciones:{id:string;nombre:string;tipo_creacion?:string;estado?:string}[]};
/** Una creación archivada o pendiente ya no está en La Creación: sus vínculos se marcan como rotos. */
export const vigente=(c:{estado?:string}):boolean=>!c.estado||c.estado==='aprobado';
const MODULOS:TipoNodo[]=['alcance','salvacion','estado','reaccion','transformacion','recurso','vfx','tabla_armas','vision'];
const entrada=(acepta:TipoNodo[],etiqueta?:string):Puerto=>({id:'entrada',lado:'entrada',acepta,...(etiqueta?{etiqueta}:{})});
const salida=(id:string,acepta:TipoNodo[],etiqueta?:string):Puerto=>({id,lado:'salida',acepta,...(etiqueta?{etiqueta}:{})});
const SIEMPRE:CondicionRegla={tipo:'siempre'};
const RELLENO:EfectoRegla={tipo:'perder_accion',destino:'yo'};
/** Datos antiguos o incompletos: un validador o una descripción que fallan marcan el nodo, nunca rompen el grafo. */
const ROTO='Datos antiguos o incompletos: revisa este nodo.';
const fallo=(f:()=>string|null|undefined):string|null=>{try{return f()||null;}catch{return ROTO;}};
const texto=(f:()=>string,defecto:string):string=>{try{return f();}catch{return defecto;}};
export function aGrafo(b:Borrador,ctx:ContextoGrafo):Grafo{
 const nodos:Nodo[]=[];const cables:Cable[]=[];
 const nodo=(id:string,tipo:TipoNodo,ruta:Ruta,titulo:string,frase:string,error:string|null,puertos:Puerto[])=>{nodos.push({id,tipo,ruta,titulo,frase,error,puertos});};
 /** Rellena `plantilla` desde el `origen` del dato; un origen dañado marca el nodo (si no tenía otro error). */
 const sellar=(id:string,dato:{origen?:unknown})=>{
  if(dato.origen===undefined)return;
  const n=nodos.find(x=>x.id===id);if(!n)return;
  const o=leerOrigen(dato.origen);
  if(!o){n.error=n.error||MENSAJE_ORIGEN;return;}
  const p=plantillaPorId(o.plantilla);
  n.plantilla={id:o.plantilla,nombre:p?p.nombre:o.plantilla,version:o.version,huerfana:!p};
 };
 const cable=(d:string,pd:string,h:string,ph='entrada')=>{cables.push({id:`${d}:${pd}>${h}:${ph}`,desde:{nodo:d,puerto:pd},hasta:{nodo:h,puerto:ph}});};
 const ofertaRequisitos=b.tipo!=='personaje'||Object.keys(b.requisitos_uso||{}).length>0;
 // Núcleo
 nodo('nucleo','nucleo',[],String(b.nombre??'').trim()||'Sin nombre',`${b.tipo}${b.clasificacion?' · '+b.clasificacion:''}`,null,[
  salida('acciones',b.tipo==='habilidad'?['accion','invocacion']:['accion'],b.tipo==='personaje'?'Acciones del personaje':'Acciones'),salida('reglas',['cuando'],'Reglas'),salida('pasivas',['pasiva'],'Pasivas'),
  salida('vinculos',['vinculo'],'Vínculos'),salida('requisitos',['requisitos'],'Requisitos')]);
 if(b.tipo==='personaje'){
  const n=nodos[nodos.length-1];let p:ReturnType<typeof presupuestoDeStats>|null=null;
  try{const s:Record<string,number>={...(b.stats||{})};if(b.malla)for(const [k,r] of Object.entries(b.rangos||{}))if(k.startsWith('acciones_')&&r)s[k]=r.max;p=presupuestoDeStats(s);}catch{p=null;}
  if(p)n.insignia=`Acciones: ${p.principal} principal · ${p.adicional} ${p.adicional===1?'adicional':'adicionales'} · ${p.legendaria} ${p.legendaria===1?'legendaria':'legendarias'}`;
 }
 // Acciones y módulos
 b.efectos.forEach((e:Efecto,i)=>{
  if(!e||typeof e!=='object')return;
  const id='accion:'+e.id,ruta:Ruta=['efectos',i];
  const error=fallo(()=>validarEfectos([e])||validarTactica(e));
  // La acción dice qué hace; el detalle de cada módulo (p. ej. qué hace el estado) solo aparece en su propio nodo.
  const resumen=e.efecto==='estado'&&!e.solo_pasivo?`Aplica ${e.estado_def?.nombre||e.estado||'un estado'}.`:texto(()=>describirEfecto(e).resumen,'Acción sin describir.');
  nodo(id,'accion',ruta,String(e.nombre??'').trim()||EFECTOS_NOMBRE[e.efecto]||'Acción',resumen,error,[entrada(['nucleo']),salida('modulos',MODULOS,'Módulos')]);
  sellar(id,e);
  cable('nucleo','acciones',id);
  const modulo=(tipo:TipoNodo,sub:string|null,titulo:string,frase:string,err:string|null=null)=>{
   const mid=`${tipo}:${e.id}`;
   nodo(mid,tipo,sub?[...ruta,sub]:ruta,titulo,frase,err,[entrada(['accion'])]);cable(id,'modulos',mid);
  };
  if(e.tablero)modulo('alcance','tablero','Alcance',`${e.tablero.forma}${e.tablero.tamano?` de ${e.tablero.tamano}`:''}, alcance ${e.tablero.alcance}, afecta a ${e.tablero.afecta}.`);
  if(e.salvacion)modulo('salvacion','salvacion','Salvación',`CD ${e.salvacion.cd} de ${e.salvacion.atributo}; si la supera: ${e.salvacion.exito}.`);
  if(e.efecto==='estado'&&!e.solo_pasivo){const d=e.estado_def||definicionBase(e.estado_tipo);const legado=!e.estado_def&&TIPOS_ESTADO_LEGADO.includes(e.estado_tipo||'narrativo');modulo('estado',null,'Estado',d?texto(()=>describirEstado(definicionAplicada(e.estado_def?d:{...d,nombre:e.estado||d.nombre.split(':')[0]},e.duracion,legado)),`Aplica ${e.estado}.`):e.estado?`${e.estado}: estado narrativo (solo bonos).`:'Estado sin nombre.');}
  const reaccion=(()=>{try{return reaccionDe(normalizarReaccion(e));}catch{return null;}})();
  if(reaccion)modulo('reaccion',e.reaccion?'reaccion':'defensa','Reacción',texto(()=>describirReaccion(reaccion,e.coste_ph||0),'Reacción.'),fallo(()=>validarReaccion(reaccion)));
  if(reaccion){const n=nodos.find(x=>x.id===`reaccion:${e.id}`);if(n)n.insignia=texto(()=>lineaCosteReaccion(reaccion,e.coste_ph||0),'Sin coste');}
  if(e.transformacion||e.efecto==='transformacion')modulo('transformacion','transformacion','Transformación',e.transformacion?.nombre||'Transformación sin configurar.');
  if(e.recurso)modulo('recurso','recurso','Recurso',`${e.recurso.nombre}: inicia en ${e.recurso.inicial}, cambia ${e.recurso.cambio}.`);
  if(e.vfx)modulo('vfx','vfx','Animación','Animación configurada.');
  if(e.tabla_armas)modulo('tabla_armas','tabla_armas','Tabla de armas',`d${e.tabla_armas.caras}: un arma por cara.`);
  if(e.vision)modulo('vision','vision','Visión',texto(()=>describirVision(e.vision!).resumen,'Ojo sin describir.'),fallo(()=>validarVision(e.vision)));
 });
 // Reglas: cuando → si (→ si anidados) → entonces (→ ramas éxito/fallo)
 b.reglas.forEach((r:Regla,i)=>{
  if(!r||typeof r!=='object')return;
  const ruta:Ruta=['reglas',i];
  const cuando='cuando:'+r.id;
  // Datos antiguos o malformados: sin efectos ni condición no rompen el grafo (los validadores los señalan).
  r={...r,efectos:Array.isArray(r.efectos)?r.efectos:[],condicion:r.condicion&&typeof r.condicion==='object'?r.condicion:SIEMPRE};
  const cabecera=fallo(()=>r.efectos.length?validarReglas([{...r,condicion:SIEMPRE,efectos:[RELLENO]}]):validarReglas([r]));
  nodo(cuando,'cuando',ruta,r.nombre||'Regla',`${EVENTOS[r.evento]||r.evento} → ${texto(()=>describirRegla(r).resumen,'…')}`,cabecera,[entrada(['nucleo']),salida('si',['si'],'Si')]);
  sellar(cuando,r);
  cable('nucleo','reglas',cuando);
  const condicion=(c:CondicionRegla,id:string,rutaC:Ruta,padre:string,puertoPadre:string)=>{
   if(!c||typeof c!=='object')c=SIEMPRE;
   const compuesta=c.tipo==='todas'||c.tipo==='alguna'||c.tipo==='no';
   nodo(id,'si',rutaC,c.tipo==='todas'?'Todas':c.tipo==='alguna'?'Alguna':c.tipo==='no'?'No':'Si',texto(()=>condicionClara(c),'Condición sin describir.'),fallo(()=>validarReglas([{...r,condicion:c,efectos:[RELLENO]}])),
    [entrada(['cuando','si']),...(id===`si:${r.id}`?[salida('entonces',['entonces'],'Entonces')]:[]),...(compuesta?[salida('condiciones',['si'],'Condiciones')]:[])]);
   cable(padre,puertoPadre,id);
   if(c.tipo==='todas'||c.tipo==='alguna')(c.condiciones??[]).forEach((h,k)=>condicion(h,`${id}:${k}`,[...rutaC,'condiciones',k],id,'condiciones'));
   if(c.tipo==='no')condicion(c.condicion??SIEMPRE,`${id}:0`,[...rutaC,'condicion'],id,'condiciones');
  };
  const raiz=`si:${r.id}`;
  condicion(r.condicion,raiz,[...ruta,'condicion'],cuando,'si');
  const efectos=(lista:EfectoRegla[],prefijo:string,rutaL:Ruta,padre:string,puertoPadre:string)=>lista.forEach((ef,j)=>{
   if(!ef||typeof ef!=='object')return;
   const id=`${prefijo}:${j}`,rutaE:Ruta=[...rutaL,j];
   const ramas=ef.tipo==='salvacion'||ef.tipo==='condicional';
   nodo(id,'entonces',rutaE,EFECTOS_REGLA[ef.tipo]||ef.tipo||'Efecto',texto(()=>describirRegla({...r,descripcion:'',condicion:SIEMPRE,efectos:[ef],coste_ph:0,coste_fatiga:0,enfriamiento:0,limite_por_turno:0}).resumen,'Efecto sin describir.'),
    fallo(()=>validarReglas([{...r,condicion:SIEMPRE,efectos:[ef]}])),
    [entrada(['si','entonces']),...(ramas?[salida('exito',['entonces'],'Éxito'),salida('fallo',['entonces'],'Fallo')]:[])]);
   cable(padre,puertoPadre,id);
   if(ramas){efectos(ef.exito||[],`${id}:exito`,[...rutaE,'exito'],id,'exito');efectos(ef.fallo||[],`${id}:fallo`,[...rutaE,'fallo'],id,'fallo');}
  });
  efectos(r.efectos,`entonces:${r.id}`,[...ruta,'efectos'],raiz,'entonces');
 });
 // Pasivas
 b.reglas_pasivas.forEach((p,i)=>{
  if(!p||typeof p!=='object')return;
  const id='pasiva:'+p.id;
  nodo(id,'pasiva',['reglas_pasivas',i],p.nombre||'Pasiva',`${EVENTOS_PASIVA[p.evento]??p.evento}, ${CONDICIONES_PASIVA[p.condicion]??p.condicion}.`,fallo(()=>validarPasivas([p])),[entrada(['nucleo'])]);
  sellar(id,p);
  cable('nucleo','pasivas',id);
 });
 // Vínculos con otras creaciones
 const vincular=(grupo:string,creacionId:string,ruta:Ruta,etiqueta:string)=>{
  const c=ctx.creaciones.find(x=>x.id===creacionId&&vigente(x));
  const id=`vinculo:${grupo}:${creacionId}`;
  nodo(id,'vinculo',ruta,c?c.nombre:'Creación desconocida',c?`${etiqueta}${c.tipo_creacion?' · '+c.tipo_creacion:''}`:etiqueta,c?null:'Esta creación ya no está en La Creación.',[entrada(['nucleo'])]);
  cable('nucleo','vinculos',id);
 };
 b.habilidades.forEach((id,i)=>vincular('habilidad',id,['habilidades',i],'Habilidad'));
 b.pasivas.forEach((id,i)=>vincular('pasiva',id,['pasivas',i],'Pasiva'));
 for(const [slot,id] of Object.entries(b.equipamiento))if(id)vincular(slot,id,['equipamiento',slot],`Equipo · ${SLOTS.find(x=>x.clave===slot)?.nombre??slot}`);
 // Invocación y requisitos
 if(b.invocacion){
  nodo('invocacion','invocacion',['invocacion'],'Invocación',`Modo ${b.invocacion.modo}, hasta clase ${b.invocacion.claseMaxima}, ${b.invocacion.duracionTurnos} turnos.`,null,[entrada(['nucleo','accion'])]);
  cable('nucleo','acciones','invocacion');
 }
 // Requisitos: siempre presentes salvo en personajes sin requisitos, para poder editarlos.
 if(ofertaRequisitos){
  const q=b.requisitos_uso||{};
  const partes=[q.nivel_minimo?`Nivel ${q.nivel_minimo}`:'',q.razas?.length?`Razas: ${q.razas.join(', ')}`:'',q.habilidades?.length?`${q.habilidades.length} habilidad(es) previa(s)`:'',Object.keys(q.minimos||{}).length?'Mínimos de atributos':''].filter(Boolean);
  nodo('requisitos','requisitos',['requisitos_uso'],'Requisitos',partes.join(' · ')||'Sin requisitos.',fallo(()=>validarRequisitos(q)),[entrada(['nucleo'])]);
  cable('nucleo','requisitos','requisitos');
 }
 return {nodos,cables};
}
/** Valor del borrador en una ruta de nodo (o `undefined` si la ruta ya no existe). */
export const leerRuta=(b:unknown,ruta:Ruta):unknown=>ruta.reduce<unknown>((x,k)=>x!==null&&typeof x==='object'?(x as Record<string|number,unknown>)[k]:undefined,b);
const mismoNodo=(a:Nodo,b:Nodo)=>a.id===b.id&&a.tipo===b.tipo&&a.titulo===b.titulo&&a.frase===b.frase&&a.error===b.error
 &&a.ruta.length===b.ruta.length&&a.ruta.every((k,i)=>k===b.ruta[i])&&JSON.stringify(a.puertos)===JSON.stringify(b.puertos)
 &&JSON.stringify(a.plantilla)===JSON.stringify(b.plantilla);
/**
 * Reutiliza los nodos y cables de `previo` que no cambiaron (mismos datos) y, si nada cambió, devuelve `previo` tal cual.
 * Así la interfaz puede memorizar por identidad: al escribir en un nodo, los demás conservan su objeto y no se repintan.
 */
export function estabilizar(previo:Grafo|null|undefined,nuevo:Grafo):Grafo{
 if(!previo)return nuevo;
 const nodos=new Map(previo.nodos.map(n=>[n.id,n])),cables=new Map(previo.cables.map(c=>[c.id,c]));
 let igual=previo.nodos.length===nuevo.nodos.length&&previo.cables.length===nuevo.cables.length;
 const ns=nuevo.nodos.map((n,i)=>{const p=nodos.get(n.id);const r=p&&mismoNodo(p,n)?p:n;if(r!==previo.nodos[i])igual=false;return r;});
 // El id de un cable ya dice qué une: el mismo id es el mismo cable.
 const cs=nuevo.cables.map((c,i)=>{const r=cables.get(c.id)??c;if(r!==previo.cables[i])igual=false;return r;});
 return igual?previo:{nodos:ns,cables:cs};
}
