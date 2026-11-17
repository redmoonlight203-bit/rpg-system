import type {Borrador} from "./yunque-borrador";
import {EFECTOS_NOMBRE,validarEfectos,validarReaccion,type Efecto} from "./creacion";
import {EVENTOS,EFECTOS_REGLA,validarReglas,type Regla,type EfectoRegla,type CondicionRegla} from "./reglas";
import {describirEfecto,describirRegla,describirReaccion,condicionClara} from "./descripciones";
import {validarPasivas,EVENTOS_PASIVA,CONDICIONES_PASIVA} from "./pasivas";
import {reaccionDe,validarTactica,validarRequisitos} from "./combate";
/**
 * Grafo DERIVADO del Borrador (solo lectura): `aGrafo` nunca modifica `b`.
 * El Borrador es la única fuente de verdad; las ediciones son operaciones puras sobre él.
 */
export type TipoNodo='nucleo'|'accion'|'alcance'|'salvacion'|'estado'|'reaccion'|'transformacion'|'recurso'|'vfx'|'tabla_armas'|'cuando'|'si'|'entonces'|'pasiva'|'vinculo'|'invocacion'|'requisitos';
export type Ruta=(string|number)[];
export type Puerto={id:string;lado:'entrada'|'salida';acepta:TipoNodo[];etiqueta?:string};
export type Nodo={id:string;tipo:TipoNodo;ruta:Ruta;titulo:string;frase:string;error:string|null;puertos:Puerto[]};
export type Cable={id:string;desde:{nodo:string;puerto:string};hasta:{nodo:string;puerto:string}};
export type Grafo={nodos:Nodo[];cables:Cable[]};
export type ContextoGrafo={creaciones:{id:string;nombre:string;tipo_creacion?:string}[]};
const MODULOS:TipoNodo[]=['alcance','salvacion','estado','reaccion','transformacion','recurso','vfx','tabla_armas'];
const entrada=(acepta:TipoNodo[],etiqueta?:string):Puerto=>({id:'entrada',lado:'entrada',acepta,...(etiqueta?{etiqueta}:{})});
const salida=(id:string,acepta:TipoNodo[],etiqueta?:string):Puerto=>({id,lado:'salida',acepta,...(etiqueta?{etiqueta}:{})});
const SIEMPRE:CondicionRegla={tipo:'siempre'};
const RELLENO:EfectoRegla={tipo:'perder_accion',destino:'yo'};
export function aGrafo(b:Borrador,ctx:ContextoGrafo):Grafo{
 const nodos:Nodo[]=[];const cables:Cable[]=[];
 const nodo=(id:string,tipo:TipoNodo,ruta:Ruta,titulo:string,frase:string,error:string|null,puertos:Puerto[])=>{nodos.push({id,tipo,ruta,titulo,frase,error,puertos});};
 const cable=(d:string,pd:string,h:string,ph='entrada')=>{cables.push({id:`${d}:${pd}>${h}:${ph}`,desde:{nodo:d,puerto:pd},hasta:{nodo:h,puerto:ph}});};
 const ofertaRequisitos=b.tipo!=='personaje'||Object.keys(b.requisitos_uso||{}).length>0;
 // Núcleo
 nodo('nucleo','nucleo',[],b.nombre.trim()||'Sin nombre',`${b.tipo}${b.clasificacion?' · '+b.clasificacion:''} · clase ${b.clase}`,null,[
  salida('acciones',['accion'],'Acciones'),salida('reglas',['cuando'],'Reglas'),salida('pasivas',['pasiva'],'Pasivas'),
  salida('vinculos',['vinculo'],'Vínculos'),salida('invocacion',['invocacion'],'Invocación'),salida('requisitos',['requisitos'],'Requisitos')]);
 // Acciones y módulos
 b.efectos.forEach((e:Efecto,i)=>{
  const id='accion:'+e.id,ruta:Ruta=['efectos',i];
  const error=validarEfectos([e])||validarTactica(e);
  nodo(id,'accion',ruta,e.nombre.trim()||EFECTOS_NOMBRE[e.efecto]||'Acción',describirEfecto(e).resumen,error,[entrada(['nucleo']),salida('modulos',MODULOS,'Módulos'),...(b.tipo==='habilidad'&&i===0?[salida('invocacion',['invocacion'],'Invocación')]:[])]);
  cable('nucleo','acciones',id);
  const modulo=(tipo:TipoNodo,sub:string|null,titulo:string,frase:string,err:string|null=null)=>{
   const mid=`${tipo}:${e.id}`;
   nodo(mid,tipo,sub?[...ruta,sub]:ruta,titulo,frase,err,[entrada(['accion'])]);cable(id,'modulos',mid);
  };
  if(e.tablero)modulo('alcance','tablero','Alcance',`${e.tablero.forma}${e.tablero.tamano?` de ${e.tablero.tamano}`:''}, alcance ${e.tablero.alcance}, afecta a ${e.tablero.afecta}.`);
  if(e.salvacion)modulo('salvacion','salvacion','Salvación',`CD ${e.salvacion.cd} de ${e.salvacion.atributo}; si la supera: ${e.salvacion.exito}.`);
  if(e.efecto==='estado')modulo('estado',null,'Estado',e.estado?`Aplica ${e.estado}.`:'Estado sin nombre.');
  const reaccion=reaccionDe(e);
  if(reaccion)modulo('reaccion',e.reaccion?'reaccion':'defensa','Reacción',describirReaccion(reaccion),validarReaccion(reaccion));
  if(e.transformacion||e.efecto==='transformacion')modulo('transformacion','transformacion','Transformación',e.transformacion?.nombre||'Transformación sin configurar.');
  if(e.recurso)modulo('recurso','recurso','Recurso',`${e.recurso.nombre}: inicia en ${e.recurso.inicial}, cambia ${e.recurso.cambio}.`);
  if(e.vfx)modulo('vfx','vfx','Animación','Animación configurada.');
  if(e.tabla_armas)modulo('tabla_armas','tabla_armas','Tabla de armas',`d${e.tabla_armas.caras}: un arma por cara.`);
 });
 // Reglas: cuando → si (→ si anidados) → entonces (→ ramas éxito/fallo)
 b.reglas.forEach((r:Regla,i)=>{
  const ruta:Ruta=['reglas',i];
  const cuando='cuando:'+r.id;
  const cabecera=r.efectos.length?validarReglas([{...r,condicion:SIEMPRE,efectos:[RELLENO]}]):validarReglas([r]);
  nodo(cuando,'cuando',ruta,r.nombre||'Regla',`${EVENTOS[r.evento]||r.evento} → ${describirRegla(r).resumen}`,cabecera,[entrada(['nucleo']),salida('si',['si'],'Si')]);
  cable('nucleo','reglas',cuando);
  const condicion=(c:CondicionRegla,id:string,rutaC:Ruta,padre:string,puertoPadre:string)=>{
   const compuesta=c.tipo==='todas'||c.tipo==='alguna'||c.tipo==='no';
   nodo(id,'si',rutaC,c.tipo==='todas'?'Todas':c.tipo==='alguna'?'Alguna':c.tipo==='no'?'No':'Si',condicionClara(c),validarReglas([{...r,condicion:c,efectos:[RELLENO]}]),
    [entrada(['cuando','si']),...(id===`si:${r.id}`?[salida('entonces',['entonces'],'Entonces')]:[]),...(compuesta?[salida('condiciones',['si'],'Condiciones')]:[])]);
   cable(padre,puertoPadre,id);
   if(c.tipo==='todas'||c.tipo==='alguna')c.condiciones.forEach((h,k)=>condicion(h,`${id}:${k}`,[...rutaC,'condiciones',k],id,'condiciones'));
   if(c.tipo==='no')condicion(c.condicion,`${id}:0`,[...rutaC,'condicion'],id,'condiciones');
  };
  const raiz=`si:${r.id}`;
  condicion(r.condicion,raiz,[...ruta,'condicion'],cuando,'si');
  const efectos=(lista:EfectoRegla[],prefijo:string,rutaL:Ruta,padre:string,puertoPadre:string)=>lista.forEach((ef,j)=>{
   const id=`${prefijo}:${j}`,rutaE:Ruta=[...rutaL,j];
   const ramas=ef.tipo==='salvacion'||ef.tipo==='condicional';
   nodo(id,'entonces',rutaE,EFECTOS_REGLA[ef.tipo]||ef.tipo,describirRegla({...r,descripcion:'',condicion:SIEMPRE,efectos:[ef],coste_ph:0,coste_fatiga:0,enfriamiento:0,limite_por_turno:0}).resumen,
    validarReglas([{...r,condicion:SIEMPRE,efectos:[ef]}]),
    [entrada(['si','entonces']),...(ramas?[salida('exito',['entonces'],'Éxito'),salida('fallo',['entonces'],'Fallo')]:[])]);
   cable(padre,puertoPadre,id);
   if(ramas){efectos(ef.exito||[],`${id}:exito`,[...rutaE,'exito'],id,'exito');efectos(ef.fallo||[],`${id}:fallo`,[...rutaE,'fallo'],id,'fallo');}
  });
  efectos(r.efectos,`entonces:${r.id}`,[...ruta,'efectos'],raiz,'entonces');
 });
 // Pasivas
 b.reglas_pasivas.forEach((p,i)=>{
  const id='pasiva:'+p.id;
  nodo(id,'pasiva',['reglas_pasivas',i],p.nombre||'Pasiva',`${EVENTOS_PASIVA[p.evento]??p.evento}, ${CONDICIONES_PASIVA[p.condicion]??p.condicion}.`,validarPasivas([p])||null,[entrada(['nucleo'])]);
  cable('nucleo','pasivas',id);
 });
 // Vínculos con otras creaciones
 const vincular=(grupo:string,creacionId:string,ruta:Ruta,etiqueta:string)=>{
  const c=ctx.creaciones.find(x=>x.id===creacionId);
  const id=`vinculo:${grupo}:${creacionId}`;
  nodo(id,'vinculo',ruta,c?c.nombre:'Creación desconocida',c?`${etiqueta}${c.tipo_creacion?' · '+c.tipo_creacion:''}`:etiqueta,c?null:'Esta creación ya no está en La Creación.',[entrada(['nucleo'])]);
  cable('nucleo','vinculos',id);
 };
 b.habilidades.forEach((id,i)=>vincular('habilidad',id,['habilidades',i],'Habilidad'));
 b.pasivas.forEach((id,i)=>vincular('pasiva',id,['pasivas',i],'Pasiva'));
 for(const [slot,id] of Object.entries(b.equipamiento))if(id)vincular(slot,id,['equipamiento',slot],`Equipo · ${slot}`);
 // Invocación y requisitos
 if(b.invocacion){
  nodo('invocacion','invocacion',['invocacion'],'Invocación',`Modo ${b.invocacion.modo}, hasta clase ${b.invocacion.claseMaxima}, ${b.invocacion.duracionTurnos} turnos.`,null,[entrada(['nucleo','accion'])]);
  if(b.tipo==='habilidad'&&b.efectos.length)cable('accion:'+b.efectos[0].id,'invocacion','invocacion');else cable('nucleo','invocacion','invocacion');
 }
 // Requisitos: siempre presentes salvo en personajes sin requisitos, para poder editarlos.
 if(ofertaRequisitos){
  const q=b.requisitos_uso||{};
  const partes=[q.nivel_minimo?`Nivel ${q.nivel_minimo}`:'',q.razas?.length?`Razas: ${q.razas.join(', ')}`:'',q.habilidades?.length?`${q.habilidades.length} habilidad(es) previa(s)`:'',Object.keys(q.minimos||{}).length?'Mínimos de atributos':''].filter(Boolean);
  nodo('requisitos','requisitos',['requisitos_uso'],'Requisitos',partes.join(' · ')||'Sin requisitos.',validarRequisitos(q),[entrada(['nucleo'])]);
  cable('nucleo','requisitos','requisitos');
 }
 return {nodos,cables};
}
/** Valor del borrador en una ruta de nodo (o `undefined` si la ruta ya no existe). */
export const leerRuta=(b:unknown,ruta:Ruta):unknown=>ruta.reduce<unknown>((x,k)=>x!==null&&typeof x==='object'?(x as Record<string|number,unknown>)[k]:undefined,b);
