'use client';
// Editor de un efecto de regla («Entonces»): los 13 tipos y los 6 destinos como fichas, y el valor como
// «2d6 + atributo × escala» con ruedas. Las ramas de éxito y fallo son las salidas del propio nodo.
import {SelectorRegla} from '../../SelectorRegla';
import {Fichas,Interruptor,Rueda,Texto,type Opcion} from '../Controles';
import {FormCondicion,SUJETOS} from './EditorSi';
import {DESTINOS,EFECTOS_REGLA,type CambioRegla,type DestinoRegla,type EfectoRegla,type Sujeto,type ValorRegla} from '../../../lib/reglas';
import {ICONO_EFECTO_REGLA,cambiarTipoEfecto} from '../../../lib/yunque-grimorio';
import {mensajeError} from '../../../lib/errores';
import {leerRuta} from '../../../lib/yunque-grafo';
import type {EditorNodoProps} from './EditorAccion';

const TIPOS:Opcion<EfectoRegla['tipo']>[]=(Object.keys(EFECTOS_REGLA) as EfectoRegla['tipo'][]).map(t=>({valor:t,nombre:{atributo:'Atributo',transformar:'Transformar',estado:'Estado',quitar_estado:'Quitar estado',dano:'Daño',curar:'Curar',ph:'PH',fatiga:'Fatiga',perder_accion:'Perder acción',salvacion:'Salvación',condicional:'Si / si no',habilidad:'Acción temporal',mensaje:'Mensaje'}[t],icono:ICONO_EFECTO_REGLA[t],ayuda:EFECTOS_REGLA[t]}));
const CORTOS:Record<DestinoRegla,string>={yo:'Portador',actor:'Autor',objetivo:'Objetivo',aliados:'Aliados',enemigos:'Enemigos',todos:'Todos'};
const ICONO_DESTINO:Record<DestinoRegla,string>={yo:'humano',actor:'espada',objetivo:'ojo',aliados:'escudo',enemigos:'bestia',todos:'yugen'};
const DESTINOS_OP:Opcion<DestinoRegla>[]=(Object.keys(DESTINOS) as DestinoRegla[]).map(d=>({valor:d,nombre:CORTOS[d],icono:ICONO_DESTINO[d],ayuda:DESTINOS[d]}));
const OPERACIONES:Opcion<CambioRegla['operacion']>[]=[{valor:'sumar',nombre:'Sumar / restar'},{valor:'multiplicar',nombre:'Multiplicar'},{valor:'fijar',nombre:'Reemplazar'}];
const CARAS=[2,3,4,6,8,10,12,20,100];
const CON_VALOR=['atributo','dano','curar','ph','fatiga'];
const CON_DURACION=['atributo','estado','transformar','habilidad'];
const limpio=<T extends object,>(x:T):T=>Object.fromEntries(Object.entries(x).filter(([,v])=>v!==undefined)) as T;
const leer=leerRuta;
const coma=(n:number)=>String(n).replace('.',',');

/** Texto de la fórmula: «2d6 + 3 + fuerza × 1,5 + daño del evento». */
export function textoValor(v:ValorRegla|undefined):string{
 if(v===undefined)return '0';
 if(typeof v==='number')return String(v);
 const partes=[v.dados?`${v.dados}d${v.caras??6}`:'',v.bono?String(v.bono):'',v.atributo?`${v.atributo.replaceAll('_',' ')}${v.desde&&v.desde!=='yo'?` (${CORTOS[v.desde]})`:''}${v.escala!==undefined&&v.escala!==1?` × ${coma(v.escala)}`:''}`:'',v.evento?'cantidad del evento':''].filter(Boolean);
 return partes.join(' + ').replace('+ -','− ')||'0';
}
/** Valor de un efecto de regla: un número fijo o la fórmula «NdC + bono + atributo × escala». */
export function EditorValor({valor,onChange,etiqueta='Cantidad'}:{valor:ValorRegla|undefined;onChange:(v:ValorRegla)=>void;etiqueta?:string}){
 const formula=typeof valor==='object';
 const v=formula?valor:{};
 const set=(p:Partial<Exclude<ValorRegla,number>>)=>onChange(limpio({...v,...p}));
 return <div className="yq-valor">
  <div className="yq-valor-cab">
   <span className="yq-dados-etiqueta">{etiqueta}</span>
   <Fichas etiqueta="Cómo se calcula" opciones={[{valor:'fijo',nombre:'Número'},{valor:'formula',nombre:'Fórmula'}]} valor={formula?'formula':'fijo'} onChange={m=>{if(m==='fijo'&&formula)onChange(v.bono??0);if(m==='formula'&&!formula)onChange({dados:1,caras:6,...(valor?{bono:valor as number}:{})});}}/>
  </div>
  {!formula?<div className="yq-dados-linea"><Rueda nombre="valor" etiqueta={`${etiqueta} (negativo para restar)`} valor={(valor as number|undefined)??0} min={-999999} max={999999} onChange={onChange}/></div>
   :<>
    <div className="yq-dados-linea" aria-label={`Fórmula: ${textoValor(valor)}`}>
     <Rueda nombre="dados" etiqueta="Cuántos dados" valor={v.dados??0} min={0} max={100} onChange={dados=>set({dados:Math.round(dados),caras:v.caras??6})}/>
     <b aria-hidden="true">d</b>
     <Rueda nombre="caras" etiqueta="Caras del dado" valor={v.caras??6} valores={CARAS} onChange={caras=>set({caras})}/>
     <b aria-hidden="true">+</b>
     <Rueda nombre="bono" etiqueta="Cantidad que se suma" valor={v.bono??0} min={-999999} max={999999} onChange={bono=>set({bono:bono||undefined})}/>
    </div>
    <div className="yq-valor-atributo">
     <b aria-hidden="true">+</b>
     <SelectorRegla tipo="atributo" opcional etiqueta="Atributo" valor={v.atributo??''} onChange={atributo=>set({atributo:atributo||undefined,...(atributo?{}:{desde:undefined,escala:undefined})})}/>
     {v.atributo!==undefined&&<>
      <div className="yq-valor-escala">
       <Fichas etiqueta="De quién" opciones={SUJETOS} valor={v.desde??'yo'} onChange={(desde:Sujeto)=>set({desde:desde==='yo'?undefined:desde})}/>
       <label><span>× Escala</span><Rueda nombre="escala" etiqueta="Multiplicador del atributo" valor={v.escala??1} min={-100} max={100} paso={0.5} onChange={escala=>set({escala:escala===1?undefined:escala})} compacta/></label>
      </div>
     </>}
    </div>
    <Interruptor etiqueta="Sumar la cantidad del evento (p. ej. el daño recibido)" valor={!!v.evento} onChange={evento=>set({evento:evento||undefined})}/>
   </>}
  <p className="yq-formula" aria-hidden="true">= {textoValor(valor)}</p>
 </div>;
}

export default function EditorEntonces({b,nodo,operar,avisar}:EditorNodoProps&{avisar?:(texto:string)=>void}){
 const e=leer(b,nodo.ruta) as EfectoRegla|undefined;
 if(!e)return null;
 const fijar=(v:EfectoRegla)=>operar({op:'fijar',ruta:nodo.ruta,valor:limpio(v)});
 const patch=(p:Partial<EfectoRegla>)=>fijar({...e,...p});
 function cambiarTipo(t:EfectoRegla['tipo']){
  if(t===e!.tipo)return;
  // Las ramas pasan entre salvación y condicional; nunca se borran en silencio.
  try{fijar(cambiarTipoEfecto(e!,t));}catch(err){avisar?.(mensajeError(err,'No se pudo cambiar el tipo.'));}
 }
 const cambios=e.cambios??[];
 return <div className="yq-editor">
  <Fichas etiqueta="Qué ocurre" opciones={TIPOS} valor={e.tipo} onChange={cambiarTipo} columnas={3} tono="carmesi"/>
  {e.tipo!=='mensaje'&&<Fichas etiqueta="A quién" opciones={DESTINOS_OP} valor={e.destino} onChange={destino=>patch({destino})} columnas={3}/>}
  {e.tipo==='atributo'&&<>
   <SelectorRegla tipo="atributo" etiqueta="Atributo que cambia" valor={e.atributo||'armadura'} onChange={atributo=>patch({atributo})}/>
   <Fichas etiqueta="Operación" opciones={OPERACIONES} valor={e.operacion} onChange={operacion=>patch({operacion,...(operacion!=='sumar'?{permanente:undefined,limite:undefined}:{})})}/>
  </>}
  {CON_VALOR.includes(e.tipo)&&<EditorValor valor={e.valor} onChange={valor=>patch({valor})} etiqueta={({dano:'Daño',curar:'Vida que recupera',ph:'PH (negativo quita)',fatiga:'Fatiga (negativo alivia)'} as Record<string,string>)[e.tipo]??'Cantidad'}/>}
  {['estado','quitar_estado','transformar'].includes(e.tipo)&&<div className="yq-dos">
   <SelectorRegla tipo="estado" etiqueta="Estado o forma" crear={e.tipo!=='quitar_estado'} valor={e.clave||''} onChange={(clave,nombre)=>patch({clave,nombre})}/>
   <Texto etiqueta="Nombre visible" valor={e.nombre||''} max={120} placeholder="Furia" onChange={nombre=>patch({nombre:nombre||undefined})}/>
  </div>}
  {e.tipo==='transformar'&&<section className="yq-lista" aria-label="Cambios de la forma">
   <header><span>Cambios de la forma</span><button type="button" className="yq-boton" disabled={cambios.length>=30} onClick={()=>patch({cambios:[...cambios,{atributo:'armadura',operacion:'sumar',valor:1}]})}>+ Atributo</button></header>
   {cambios.map((c,k)=><div key={k} className="yq-lista-fila">
    <SelectorRegla tipo="atributo" etiqueta={`Cambio ${k+1}`} valor={c.atributo} onChange={atributo=>patch({cambios:cambios.map((x,j)=>j===k?{...x,atributo}:x)})}/>
    <Fichas etiqueta="Operación" opciones={OPERACIONES} valor={c.operacion} onChange={operacion=>patch({cambios:cambios.map((x,j)=>j===k?{...x,operacion}:x)})}/>
    <EditorValor valor={c.valor} onChange={valor=>patch({cambios:cambios.map((x,j)=>j===k?{...x,valor}:x)})}/>
    <button type="button" className="yq-boton is-peligro" disabled={cambios.length<=1} onClick={()=>patch({cambios:cambios.filter((_,j)=>j!==k)})}>Quitar este cambio</button>
   </div>)}
  </section>}
  {e.tipo==='salvacion'&&<div className="yq-dos">
   <label className="yq-campo"><span>Dificultad (CD)</span><Rueda nombre="cd" etiqueta="Dificultad de la salvación" valor={e.cd??12} min={1} max={1000} onChange={cd=>patch({cd:Math.round(cd)})}/></label>
   <SelectorRegla tipo="atributo" etiqueta="Bono para resistir" valor={e.atributo||'salvacion'} onChange={atributo=>patch({atributo})}/>
  </div>}
  {e.tipo==='condicional'&&<div className="yq-subcondicion">
   <Fichas etiqueta="Condición" opciones={[{valor:'probabilidad',nombre:'Probabilidad',icono:'ojo'},{valor:'comparar',nombre:'Comparar',icono:'vida'},{valor:'estado',nombre:'Tiene estado',icono:'alma'},{valor:'elemento',nombre:'Elemento',icono:'fuego'}] as Opcion<string>[]} valor={e.condicion?.tipo} onChange={t=>patch({condicion:t==='probabilidad'?{tipo:'probabilidad',porcentaje:50}:t==='comparar'?{tipo:'comparar',sujeto:'yo',atributo:'vida_actual',operador:'<',valor:50,porcentaje:true}:t==='estado'?{tipo:'estado',sujeto:'yo',estado:'furia'}:{tipo:'elemento',elemento:'fuego'}})}/>
   {e.condicion&&<FormCondicion c={e.condicion} onChange={condicion=>patch({condicion})}/>}
  </div>}
  {(e.tipo==='salvacion'||e.tipo==='condicional')&&<p className="yq-nota">Lo que ocurre en cada caso cuelga de las salidas <b className="is-exito">Éxito</b> y <b className="is-fallo">Fallo</b>: arrastra efectos hasta ellas.</p>}
  {e.tipo==='habilidad'&&e.accion&&<div className="yq-subaccion">
   <Texto etiqueta="Nombre de la acción" valor={e.accion.nombre} max={120} onChange={nombre=>patch({accion:{...e.accion!,nombre}})}/>
   <div className="yq-dados-linea">
    <Rueda nombre="cantidad" etiqueta="Dados de la acción" valor={e.accion.cantidad} min={0} max={100} onChange={cantidad=>patch({accion:{...e.accion!,cantidad:Math.round(cantidad)}})}/>
    <b aria-hidden="true">d</b><Rueda nombre="caras" etiqueta="Caras de la acción" valor={e.accion.caras} valores={CARAS} onChange={caras=>patch({accion:{...e.accion!,caras}})}/>
    <b aria-hidden="true">+</b><Rueda nombre="modificador" etiqueta="Modificador de la acción" valor={e.accion.modificador} min={-999} max={999} onChange={modificador=>patch({accion:{...e.accion!,modificador:Math.round(modificador)}})}/>
   </div>
  </div>}
  {e.tipo==='mensaje'&&<Texto etiqueta="Mensaje para el registro" valor={e.nombre||''} max={120} placeholder="¡La hoja arde!" onChange={nombre=>patch({nombre:nombre||undefined})}/>}
  {CON_DURACION.includes(e.tipo)&&!e.permanente&&<div className="yq-costes">
   <label><span>Turnos</span><Rueda nombre="duracion" etiqueta="Duración en turnos (0 = hasta el fin del combate)" valor={e.duracion??0} min={0} max={999} onChange={duracion=>patch({duracion:Math.round(duracion)})} compacta/></label>
   <Interruptor etiqueta="Se acumula" valor={!!e.acumular} onChange={acumular=>patch({acumular:acumular||undefined})}/>
  </div>}
  {e.tipo==='atributo'&&e.operacion==='sumar'&&<Interruptor etiqueta="Permanente (se conserva tras el combate)" valor={!!e.permanente} onChange={permanente=>patch({permanente:permanente||undefined,...(permanente?{acumular:true,duracion:undefined}:{limite:undefined})})}/>}
  {e.tipo==='atributo'&&e.permanente&&<label className="yq-campo"><span>Límite por encuentro (0 = sin límite)</span><Rueda nombre="limite" etiqueta="Límite de aumento por encuentro" valor={e.limite??0} min={0} max={9999} onChange={limite=>patch({limite:Math.round(limite)||undefined})} compacta/></label>}
 </div>;
}
