import type {Borrador} from "./yunque-borrador";
import {nuevoEfecto,EFECTOS_NOMBRE,type Efecto} from "./creacion";
import {nuevaRegla,type Regla,type EfectoRegla,type CondicionRegla} from "./reglas";
import type {ReglaPasiva} from "./pasivas";
import {reaccionDe} from "./combate";
import {aGrafo,type Nodo,type Puerto,type Ruta,type TipoNodo} from "./yunque-grafo";
/**
 * Operaciones PURAS sobre el Borrador: cada gesto del lienzo es una `Operacion`.
 * `aplicar` nunca muta su entrada y lanza `Error` con un mensaje claro si no aplica.
 */
export type Fragmento={tipo:TipoNodo;datos:unknown};
export type Operacion=
 |{op:'fijar';ruta:Ruta;valor:unknown}
 |{op:'agregar';tipo:TipoNodo;padre?:string;rama?:'exito'|'fallo'}
 |{op:'quitar';nodo:string}
 |{op:'duplicar';nodo:string}
 |{op:'pegar';fragmento:Fragmento;padre?:string;rama?:'exito'|'fallo'};
const MODULOS:TipoNodo[]=['alcance','salvacion','estado','reaccion','transformacion','recurso','vfx','tabla_armas'];
const PELIGROSAS=['__proto__','constructor','prototype'];
const uuid=()=>crypto.randomUUID();
const falla=(m:string):never=>{throw new Error(m);};
/** Un puerto de salida conecta con un nodo del tipo destino si lo acepta y el destino es una entrada. */
// El `acepta` del destino no se comprueba a propósito: un Puerto no lleva el tipo de su nodo propietario.
export function conexionValida(origen:Puerto,destino:Puerto,tipoDestino:TipoNodo):boolean{
 return origen.lado==='salida'&&destino.lado==='entrada'&&origen.acepta.includes(tipoDestino);
}
const clon=<T,>(x:T):T=>structuredClone(x);
const buscar=(b:Borrador,id:string):Nodo=>aGrafo(b,{creaciones:[]}).nodos.find(n=>n.id===id)??falla(`No existe el nodo «${id}».`);
const leer=(b:Borrador,ruta:Ruta):any=>ruta.reduce<any>((x,k)=>x?.[k],b);
/** Ruta de la lista que contiene al nodo + su posición (para quitar/duplicar elementos de listas). */
const enLista=(n:Nodo):{lista:Ruta;i:number}|null=>{
 const i=n.ruta[n.ruta.length-1];
 return typeof i==='number'?{lista:n.ruta.slice(0,-1),i}:null;
};
// ---- Regeneración de ids ----
function nuevosIdsEfecto(e:Efecto):Efecto{
 const c=clon(e);c.id=uuid();
 if(c.transformacion){
  const mapa:Record<string,string>={};
  c.transformacion.id=uuid();
  c.transformacion.etapas.forEach(et=>{const n=uuid();mapa[et.id]=n;et.id=n;});
  if(c.transformacion.posesion)c.transformacion.posesion.etapa_id=mapa[c.transformacion.posesion.etapa_id]??c.transformacion.posesion.etapa_id;
 }
 return c;
}
function nuevosIdsEfectoRegla(e:EfectoRegla):EfectoRegla{
 const c=clon(e);
 if(c.accion)c.accion=nuevosIdsEfecto(c.accion);
 if(c.exito)c.exito=c.exito.map(nuevosIdsEfectoRegla);
 if(c.fallo)c.fallo=c.fallo.map(nuevosIdsEfectoRegla);
 return c;
}
function nuevosIdsRegla(r:Regla):Regla{const c=clon(r);c.id=uuid();c.efectos=c.efectos.map(nuevosIdsEfectoRegla);return c;}
// ---- Valores por defecto mínimos y válidos de cada módulo ----
const NOMBRE_MODULO:Record<string,string>={estado:'un estado',transformacion:'una transformación',tabla_armas:'una tabla de armas'};
function aplicarModulo(e:Efecto,tipo:TipoNodo,datos:unknown):void{
 const d=datos as any;
 // Estado, transformación y tabla de armas fijan `efecto`: solo sobre una acción de daño (excluyentes entre sí).
 if(NOMBRE_MODULO[tipo]&&e.efecto!=='dano')falla(`Esta acción ya es de tipo ${EFECTOS_NOMBRE[e.efecto]??e.efecto}; crea otra acción para añadir ${NOMBRE_MODULO[tipo]}.`);
 switch(tipo){
  case 'alcance':
   if(e.efecto==='crear_arma')falla('Crear un arma no usa un alcance en el tablero.');
   e.tablero=d;return;
  case 'salvacion':e.salvacion=d;return;
  case 'estado':
   e.efecto='estado';e.estado=d.estado;e.duracion=d.duracion;
   if(d.estado_tipo!==undefined)e.estado_tipo=d.estado_tipo;
   if(d.bonos_estado!==undefined)e.bonos_estado=d.bonos_estado;
   return;
  case 'reaccion':e.reaccion=d;return;
  case 'transformacion':e.efecto='transformacion';e.transformacion=d;return;
  case 'recurso':e.recurso=d;return;
  case 'vfx':e.vfx=d;return;
  case 'tabla_armas':
   if(e.tablero)falla('Una tabla de armas no se combina con un alcance en el tablero: quita el alcance primero.');
   e.efecto='crear_arma';e.tabla_armas=d;if(e.duracion<1)e.duracion=1;if(e.cantidad<1)e.cantidad=1;return;
 }
}
function defectoModulo(tipo:TipoNodo):unknown{
 switch(tipo){
  case 'alcance':return {alcance:1,forma:'individual',tamano:0,afecta:'enemigos'};
  case 'salvacion':return {cd:10,atributo:'salvacion',exito:'mitad'};
  case 'estado':return {estado:'Nuevo estado',duracion:1};
  case 'reaccion':return {principal:{reducir:{modo:'mitad'}}};
  case 'transformacion':return {id:uuid(),nombre:'Transformación',tipo:'forma',etapas:[{id:uuid(),nombre:'Etapa 1',stats:{vida:10}}]};
  case 'recurso':return {nombre:'Recurso',inicial:0,cambio:1};
  case 'vfx':return {};
  case 'tabla_armas':return {caras:2,resultados:[1,2].map(cara=>({cara,nombre:`Arma ${cara}`,cantidad:1,caras:6,modificador:0,tipo_dano:'',arma_slot:'mano_der'}))};
 }
 return falla('Módulo desconocido.');
}
const tieneModulo=(e:Efecto,tipo:TipoNodo):boolean=>{
 switch(tipo){
  case 'alcance':return !!e.tablero;case 'salvacion':return !!e.salvacion;case 'estado':return e.efecto==='estado';
  case 'reaccion':return !!reaccionDe(e);case 'transformacion':return !!e.transformacion||e.efecto==='transformacion';
  case 'recurso':return !!e.recurso;case 'vfx':return !!e.vfx;case 'tabla_armas':return !!e.tabla_armas;
 }
 return false;
};
const CONDICION_NUEVA:CondicionRegla={tipo:'probabilidad',porcentaje:50};
const EFECTO_REGLA_NUEVO:EfectoRegla={tipo:'perder_accion',destino:'yo'};
const pasivaNueva=():ReglaPasiva=>({id:uuid(),nombre:'Nueva pasiva',condicion:'siempre',evento:'permanente',bonos:{},curacion:0,recuperar_ph:0,reducir_fatiga:0});
const invocacionNueva=()=>({claseMaxima:'C',maxHabilidades:1,modo:'jugador_en_combate',duracionTurnos:3});
function datosNuevos(tipo:TipoNodo):unknown{
 switch(tipo){
  case 'accion':return nuevoEfecto();
  case 'cuando':return nuevaRegla();
  case 'si':return clon(CONDICION_NUEVA);
  case 'entonces':return clon(EFECTO_REGLA_NUEVO);
  case 'pasiva':return pasivaNueva();
  case 'invocacion':return invocacionNueva();
  case 'vinculo':return falla('Usa la colección para enlazar creaciones.');
  case 'nucleo':return falla('El núcleo no se puede agregar.');
  case 'requisitos':return falla('Los requisitos ya existen en el núcleo; edítalos en su nodo.');
 }
 return defectoModulo(tipo);
}
/** Inserta `datos` (ya con ids nuevos si procede) como un nodo `tipo` bajo `padre`. Muta `b` (que es un clon). */
function insertar(b:Borrador,tipo:TipoNodo,datos:unknown,padre:string|undefined,rama?:'exito'|'fallo'):void{
 if(tipo==='nucleo')falla('El núcleo no se puede agregar.');
 if(tipo==='vinculo')falla('Usa la colección para enlazar creaciones.');
 if(rama&&tipo!=='entonces')falla('Solo los efectos «entonces» van en una rama de éxito o fallo.');
 const nodoPadre=padre&&padre!=='nucleo'?buscar(b,padre):null;
 if(tipo==='accion'||tipo==='cuando'||tipo==='pasiva'||tipo==='invocacion'){
  if(nodoPadre&&!(tipo==='invocacion'&&nodoPadre.tipo==='accion'))falla(`«${tipo}» solo cuelga del núcleo.`);
  if(tipo==='accion')b.efectos.push(datos as Efecto);
  else if(tipo==='cuando')b.reglas.push(datos as Regla);
  else if(tipo==='pasiva')b.reglas_pasivas.push(datos as ReglaPasiva);
  else{if(b.invocacion)falla('Ya hay una invocación.');b.invocacion=datos as Borrador['invocacion'];}
  return;
 }
 if(tipo==='requisitos')falla('Los requisitos ya existen en el núcleo; edítalos en su nodo.');
 if(!nodoPadre)falla(`Indica bajo qué nodo va «${tipo}».`);
 const np=nodoPadre as Nodo;
 if(MODULOS.includes(tipo)){
  if(np.tipo!=='accion')falla('Los módulos solo se añaden a una acción.');
  const e=leer(b,np.ruta) as Efecto;
  if(tieneModulo(e,tipo))falla('Esa acción ya tiene ese módulo.');
  aplicarModulo(e,tipo,datos);return;
 }
 if(tipo==='si'){
  if(np.tipo==='cuando'){
   const r=leer(b,np.ruta) as Regla;
   if(r.condicion.tipo!=='siempre')falla('La regla ya tiene condición; añade la nueva dentro de un grupo «Todas»/«Alguna».');
   r.condicion=datos as CondicionRegla;return;
  }
  if(np.tipo==='si'){
   const c=leer(b,np.ruta) as CondicionRegla;
   if(c.tipo==='todas'||c.tipo==='alguna'){c.condiciones.push(datos as CondicionRegla);return;}
   if(c.tipo==='no'&&c.condicion.tipo==='siempre'){c.condicion=datos as CondicionRegla;return;}
   falla('Solo un grupo «Todas», «Alguna» o «No» vacío admite más condiciones.');
  }
  falla('Una condición solo cuelga de una regla o de un grupo de condiciones.');
 }
 if(tipo==='entonces'){
  if(np.tipo==='cuando'||(np.tipo==='si'&&np.id.startsWith('si:')&&np.ruta.length===3&&np.ruta[0]==='reglas')){
   (leer(b,[np.ruta[0],np.ruta[1]]) as Regla).efectos.push(datos as EfectoRegla);return;
  }
  if(np.tipo==='entonces'){
   const e=leer(b,np.ruta) as EfectoRegla;
   if(e.tipo!=='salvacion'&&e.tipo!=='condicional')falla('Solo una salvación o un condicional tienen ramas de éxito y fallo.');
   if(!rama)falla('Indica la rama («exito» o «fallo»).');
   (e[rama as 'exito'|'fallo']??=[]).push(datos as EfectoRegla);return;
  }
  falla('Un efecto «entonces» cuelga de una condición o de la rama de otro efecto.');
 }
 falla(`No se puede agregar «${tipo}».`);
}
const RAICES_SI=(n:Nodo)=>n.tipo==='si'&&n.ruta.length===3&&n.ruta[2]==='condicion';
/** Lo que representa un nodo, listo para copiar (sin ids regenerados). */
export function copiar(b:Borrador,nodo:string):Fragmento{
 const n=buscar(b,nodo);
 const v=leer(b,n.ruta);
 switch(n.tipo){
  case 'nucleo':return falla('El núcleo no se puede copiar.');
  case 'vinculo':return falla('Usa la colección para enlazar creaciones.');
  case 'estado':return {tipo:'estado',datos:clon({estado:(v as Efecto).estado,duracion:(v as Efecto).duracion,estado_tipo:(v as Efecto).estado_tipo,bonos_estado:(v as Efecto).bonos_estado})};
  case 'reaccion':return {tipo:'reaccion',datos:clon(reaccionDe(leer(b,n.ruta.slice(0,2)) as Efecto))};
  case 'transformacion':{const e=leer(b,n.ruta.slice(0,2)) as Efecto;return {tipo:'transformacion',datos:clon(e.transformacion??falla('La acción no tiene transformación configurada.'))};}
  default:return {tipo:n.tipo,datos:clon(v)};
 }
}
function regenerar(f:Fragmento):unknown{
 switch(f.tipo){
  case 'accion':return nuevosIdsEfecto(f.datos as Efecto);
  case 'cuando':return nuevosIdsRegla(f.datos as Regla);
  case 'entonces':return nuevosIdsEfectoRegla(f.datos as EfectoRegla);
  case 'pasiva':return {...clon(f.datos as ReglaPasiva),id:uuid()};
  case 'transformacion':{const e=nuevosIdsEfecto({...nuevoEfecto(),transformacion:f.datos as Efecto['transformacion']});return e.transformacion;}
  default:return clon(f.datos);
 }
}
export function aplicar(b:Borrador,o:Operacion):Borrador{
 const r=clon(b);
 switch(o.op){
  case 'fijar':{
   if(!o.ruta.length)falla('La ruta está vacía.');
   if(o.ruta.some(k=>typeof k==='string'&&PELIGROSAS.includes(k)))falla('Ruta no permitida.');
   let x:any=r;
   for(const k of o.ruta.slice(0,-1)){
    if(x===null||typeof x!=='object'||!(k in x))falla(`La ruta «${o.ruta.join('.')}» no existe en el borrador.`);
    x=x[k];
   }
   if(x===null||typeof x!=='object')falla(`La ruta «${o.ruta.join('.')}» no existe en el borrador.`);
   x[o.ruta[o.ruta.length-1]]=clon(o.valor);
   return r;
  }
  case 'agregar':insertar(r,o.tipo,datosNuevos(o.tipo),o.padre,o.rama);return r;
  case 'pegar':{
   if(!o.fragmento||!o.fragmento.tipo)falla('Fragmento inválido.');
   insertar(r,o.fragmento.tipo,regenerar(o.fragmento),o.padre,o.rama);return r;
  }
  case 'quitar':{
   if(o.nodo==='nucleo')falla('El núcleo no se puede quitar.');
   const n=buscar(r,o.nodo);
   const e=n.ruta.length>=2&&n.ruta[0]==='efectos'?leer(r,n.ruta.slice(0,2)) as Efecto:null;
   switch(n.tipo){
    case 'accion':case 'cuando':case 'pasiva':case 'entonces':{
     const l=enLista(n)??falla('No se puede quitar ese nodo.');
     (leer(r,l!.lista) as unknown[]).splice(l!.i,1);return r;
    }
    case 'si':{
     if(RAICES_SI(n)){(leer(r,n.ruta.slice(0,2)) as Regla).condicion={tipo:'siempre'};return r;}
     // Hijo de «Todas»/«Alguna» (lista) o de «No» (campo condicion).
     const l=enLista(n);
     if(l)(leer(r,l.lista) as unknown[]).splice(l.i,1);
     else leer(r,n.ruta.slice(0,-1)).condicion={tipo:'siempre'};
     return r;
    }
    case 'alcance':delete e!.tablero;return r;
    case 'salvacion':delete e!.salvacion;return r;
    case 'estado':e!.efecto='dano';e!.estado='';e!.duracion=0;delete e!.estado_tipo;delete e!.bonos_estado;return r;
    case 'reaccion':delete e!.reaccion;delete e!.defensa;return r;
    case 'transformacion':delete e!.transformacion;e!.efecto='dano';return r;
    case 'recurso':delete e!.recurso;return r;
    case 'vfx':delete e!.vfx;return r;
    case 'tabla_armas':delete e!.tabla_armas;e!.efecto='dano';return r;
    case 'invocacion':r.invocacion=null;return r;
    case 'requisitos':r.requisitos_uso={};return r;
    case 'vinculo':return falla('Usa la colección para desenlazar creaciones.');
   }
   return falla('No se puede quitar ese nodo.');
  }
  case 'duplicar':{
   if(o.nodo==='nucleo')falla('El núcleo no se puede duplicar.');
   const n=buscar(r,o.nodo);
   if(n.tipo==='vinculo')falla('Usa la colección para enlazar creaciones.');
   if(MODULOS.includes(n.tipo)||n.tipo==='invocacion'||n.tipo==='requisitos'||RAICES_SI(n))falla('Ese nodo es único en su acción o creación y no se puede duplicar.');
   const f=copiar(r,o.nodo),copia=regenerar(f);
   const l=enLista(n)??falla('No se puede duplicar ese nodo.');
   const lista=leer(r,l!.lista) as unknown[];
   // Acciones, reglas y pasivas se añaden al final; condiciones y efectos, justo tras el original.
   if(n.tipo==='accion'||n.tipo==='cuando'||n.tipo==='pasiva')lista.push(copia);else lista.splice(l!.i+1,0,copia);
   return r;
  }
 }
 return falla('Operación desconocida.');
}
