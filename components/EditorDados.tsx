"use client";
import {useState} from 'react';
import {EditorTransformacion} from './EditorTransformacion';
import {dadoSeguro,elementoDe} from '../lib/combate';
import {describirEfecto} from '../lib/descripciones';
import {type Efecto,type FuenteCreacion,ELEMENTOS,formula,nuevoEfecto,validarEfectos} from '../lib/creacion';
import EditorAlcance from './EditorAlcance';
import {TablaArmas} from './TablaArmas';
import {PasoYunque,ResumenYunque} from './AyudaYunque';
const campo='mt-1 w-full rounded-lg border border-neutral-700 bg-black p-2 text-neutral-100';
const tipos:{tipo:Efecto['efecto'];nombre:string;ayuda:string}[]=[
 {tipo:'transformacion',nombre:'Transformarse',ayuda:'Cambia estadísticas y puede tener varias etapas.'},
 {tipo:'dano',nombre:'Atacar',ayuda:'Un golpe, disparo o hechizo que causa daño.'},
 {tipo:'curacion',nombre:'Curar',ayuda:'Recuperar vida sin superar el máximo.'},
 {tipo:'crear_arma',nombre:'Crear un arma',ayuda:'Un arma temporal fija o elegida con un dado.'},
 {tipo:'estado',nombre:'Aplicar un estado',ayuda:'Veneno, regeneración, aturdimiento o un efecto propio.'},
 {tipo:'recuperar_ph',nombre:'Recuperar PH',ayuda:'Devolver puntos de habilidad al objetivo.'},
 {tipo:'reducir_fatiga',nombre:'Reducir Fatiga',ayuda:'Aliviar el cansancio del objetivo.'},
];
function Numero({nombre,value,onChange,min,max,ayuda}:{nombre:string;value:number;onChange:(n:number)=>void;min?:number;max?:number;ayuda?:string}){
 return <label>{nombre}<input className={campo} type="number" min={min} max={max} value={value} onChange={v=>onChange(Number(v.target.value))}/>{ayuda&&<span className="block yunque-ayuda mt-1">{ayuda}</span>}</label>;
}
function Cantidad({e,onChange,arma=false}:{e:Efecto;onChange:(p:Partial<Efecto>)=>void;arma?:boolean}){
 return <><div className="grid gap-3 sm:grid-cols-3"><Numero nombre="Cuántos dados" min={0} max={100} value={e.cantidad} onChange={cantidad=>onChange({cantidad})}/><label>Caras de cada dado<select className={campo} value={e.caras} onChange={v=>onChange({caras:Number(v.target.value)})}>{[...new Set([4,6,8,10,12,20,100,e.caras])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>D{n}</option>)}</select></label><Numero nombre="Cantidad que se suma" value={e.modificador} onChange={modificador=>onChange({modificador})}/></div><p className="yunque-ayuda">{arma?'Daño del arma al atacar':'Resultado'}: <strong className="text-amber-200">{formula(e)}</strong>. {e.cantidad>0?`Lanza ${e.cantidad} ${e.cantidad===1?'dado':'dados'} de ${e.caras} caras${e.modificador?` y ${e.modificador>0?'suma':'resta'} ${Math.abs(e.modificador)}`:''}.`:'Sin tirada: usa directamente la cantidad que se suma.'}</p></>;
}
export function EditorDados({value,onChange,disabled=false,armas=[]}:{value:Efecto[];onChange:(e:Efecto[])=>void;disabled?:boolean;armas?:FuenteCreacion[]}){
 const [prueba,setPrueba]=useState<{id:string;texto:string}|null>(null);
 const [abierta,setAbierta]=useState<string|null>(null);
 function cambiar(id:string,patch:Partial<Efecto>){onChange(value.map(e=>e.id===id?{...e,...patch}:e));setPrueba(null);}
 function agregar(tipo:Efecto['efecto'],embestida=false){
  const e={...nuevoEfecto(),efecto:tipo,nombre:tipos.find(t=>t.tipo===tipo)!.nombre,...(tipo==='estado'?{estado:'Nuevo estado',duracion:1}:{}),...(tipo==='crear_arma'?{arma_nombre:'Nueva arma',arma_slot:'mano_der' as const,duracion:3}:{})};
  if(embestida){e.nombre='Embestida';e.animacion='desplazamiento';e.tablero={alcance:5,forma:'individual',tamano:0,afecta:'enemigos',color:'rojo',movimiento_lanzador:{tipo:'dash',casillas:4,alcance_golpe:1}};}
  if(tipo==='transformacion')e.transformacion={id:e.id,nombre:e.nombre,tipo:'forma',etapas:[{id:'etapa_1',nombre:'Primera etapa',stats:{vida:20}}]};
  onChange([...value,e]);setAbierta(e.id);setPrueba(null);
 }
 function tirar(e:Efecto){
  const error=validarEfectos([e]);if(error){setPrueba({id:e.id,texto:error});return;}
  if(e.efecto==='transformacion'){setPrueba({id:e.id,texto:describirEfecto(e).resumen+' Configuración válida; no se gastaron recursos.'});return;}
  if(e.efecto==='estado'){setPrueba({id:e.id,texto:'Configuración válida. '+describirEfecto({...e,descripcion:undefined}).resumen+' No se aplicaron cambios.'});return;}
  if(e.tabla_armas){const cara=dadoSeguro(e.tabla_armas.caras),r=e.tabla_armas.resultados.find(r=>r.cara===cara)!;setPrueba({id:e.id,texto:`D${e.tabla_armas.caras} → ${cara}: ${r.nombre}. Su ataque causa ${formula(r)}. Dura ${e.duracion} turnos propios. No se gastaron recursos.`});return;}
  const rolls=Array.from({length:e.cantidad},()=>dadoSeguro(e.caras));
  setPrueba({id:e.id,texto:`${e.nombre}: ${rolls.length?`[${rolls.join(', ')}] ${e.modificador>=0?'+':''}${e.modificador}`:e.modificador} = ${rolls.reduce((a,b)=>a+b,0)+e.modificador}. Simulación sin aplicar efectos ni gastar recursos.`});
 }
 return <section className="yunque-editor space-y-5">
  <header><p className="yunque-eyebrow">Acciones del personaje u objeto</p><h2>¿Qué ocurre al usarlo?</h2><p>Una acción se elige durante el turno y consume la acción del personaje. Empieza por el resultado que buscas.</p></header>
  <fieldset disabled={disabled||value.length>=20} className="yunque-opciones" aria-label="Añadir una acción">{tipos.map(t=><button type="button" className="yunque-opcion" key={t.tipo} onClick={()=>agregar(t.tipo)}><strong>+ {t.nombre}</strong><span>{t.ayuda}</span></button>)}<button type="button" className="yunque-opcion" onClick={()=>agregar('dano',true)}><strong>+ Ataque con dash / embestida</strong><span>Se acerca al objetivo y lo golpea en una sola acción. Luego puedes convertirlo en salto o teletransporte.</span></button></fieldset>
  {!value.length&&<p className="yunque-ayuda">Todavía no hay acciones. Los objetos que solo aportan atributos, como una armadura, pueden guardarse así.</p>}
  {value.map((e,index)=>{
   const ayuda=describirEfecto({...e,descripcion:undefined});
   const error=validarEfectos([e]);
   const patch=(p:Partial<Efecto>)=>cambiar(e.id,p);
   const estadoPeriodico=e.efecto==='estado'&&['veneno','regeneracion','quemadura'].includes(e.estado_tipo||'');
   const extras=!!e.salvacion||!!e.requisito_forma;
   return <details className="yunque-tarjeta" key={e.id} open={abierta===e.id||(abierta===null&&value.length===1)} onToggle={v=>{if(v.currentTarget.open)setAbierta(e.id);}}>
    <summary>{index+1}. {e.nombre||'Acción sin nombre'}<small>{ayuda.resumen} · {e.coste_ph?`${e.coste_ph} PH`:'Sin coste de PH'}{e.coste_fatiga?` · +${e.coste_fatiga} Fatiga`:''}{error?' · Falta completar':''}</small></summary>
    <fieldset disabled={disabled} className="yunque-contenido">
     <PasoYunque numero="1" titulo="Qué hace" ayuda="Dale un nombre y elige su efecto principal.">
      <div className="grid gap-3 sm:grid-cols-2"><label>Nombre de la acción<input className={campo} maxLength={120} value={e.nombre} onChange={v=>patch({nombre:v.target.value})} placeholder="Bola de fuego, Arsenal efímero…"/></label><label>Resultado al usarla<select className={campo} value={e.efecto} onChange={v=>patch({efecto:v.target.value as Efecto['efecto'],...(v.target.value==='transformacion'?{transformacion:{id:e.id,nombre:e.nombre||'Transformación',tipo:'poder',etapas:[{id:'etapa_1',nombre:'Primera etapa',stats:{}}]}}:{}),tabla_armas:undefined,...(v.target.value==='crear_arma'?{tablero:undefined}:{})})}>{tipos.map(t=><option key={t.tipo} value={t.tipo}>{t.nombre}</option>)}</select></label></div>
      <label>Descripción que leerá el jugador <span className="yunque-ayuda">(opcional)</span><textarea className={campo} rows={2} maxLength={2000} value={e.descripcion||''} onChange={v=>patch({descripcion:v.target.value})} placeholder="Ej.: Golpea con el puño. La explicación automática aparece abajo."/></label>
     </PasoYunque>
     <PasoYunque numero="2" titulo={e.efecto==='crear_arma'?'Qué arma aparece':e.efecto==='estado'?'Qué provoca el estado':'Cuánto produce'} ayuda={e.efecto==='crear_arma'?'El dado de selección elige el arma. Sus dados de daño se lanzan después, al atacar.':e.efecto==='estado'?'Elige un comportamiento automático o describe un estado narrativo.':'Los dados generan una cantidad al usar la acción. El número adicional se suma al resultado.'}>
      {e.efecto==='transformacion'&&e.transformacion&&<EditorTransformacion efecto={e} acciones={value} onChange={transformacion=>patch({transformacion})}/>}
      {e.efecto==='crear_arma'&&<TablaArmas efecto={e} armas={armas} onChange={tabla_armas=>patch({tabla_armas,...(tabla_armas?{arma_nombre:e.arma_nombre||'Arsenal aleatorio'}:{})})}/>}
      {e.efecto==='crear_arma'&&!e.tabla_armas&&<div className="grid gap-3 sm:grid-cols-2"><label>Nombre del arma<input className={campo} value={e.arma_nombre||''} onChange={v=>patch({arma_nombre:v.target.value})}/></label><label>Mano que ocupa<select className={campo} value={e.arma_slot||'mano_der'} onChange={v=>patch({arma_slot:v.target.value as Efecto['arma_slot']})}><option value="mano_der">Derecha</option><option value="mano_izq">Izquierda</option><option value="dos_manos">Dos manos</option></select></label></div>}
      {e.efecto!=='estado'&&e.efecto!=='transformacion'&&!e.tabla_armas&&<Cantidad e={e} onChange={patch} arma={e.efecto==='crear_arma'}/>}
      {e.efecto==='estado'&&<><label>Comportamiento del estado<select className={campo} value={e.estado_tipo||'narrativo'} onChange={v=>patch({estado_tipo:v.target.value as Efecto['estado_tipo']})}>{Object.entries({narrativo:'Narrativo: el GM interpreta su efecto',veneno:'Veneno: daño al inicio de turno',quemadura:'Quemadura: daño y salvación para apagarla',regeneracion:'Regeneración: curación al inicio de turno',aturdido:'Aturdimiento: pierde su próxima acción'}).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Nombre o explicación del estado<textarea className={campo} value={e.estado} maxLength={1000} onChange={v=>patch({estado:v.target.value})} placeholder="Qué provoca y cómo se reconoce"/></label>{estadoPeriodico&&<Cantidad e={e} onChange={patch}/>}<details className="yunque-avanzado" open={Object.values(e.bonos_estado||{}).some(Boolean)}><summary>Bonos mientras dura el estado</summary><div className="grid gap-3 sm:grid-cols-3">{Object.entries({armadura:'Armadura adicional',bono_impacto:'Bono al ataque',dano:'Daño adicional'}).map(([k,n])=><Numero key={k} nombre={n} value={e.bonos_estado?.[k]||0} onChange={v=>patch({bonos_estado:{...e.bonos_estado,[k]:v}})}/>)}</div></details></>}
      {(['dano','crear_arma'].includes(e.efecto)&&!e.tabla_armas)&&<div className="grid gap-3 sm:grid-cols-2"><label>Elemento<select className={campo} value={elementoDe(e)} onChange={v=>patch({elemento:v.target.value as Efecto['elemento']})}>{ELEMENTOS.map(v=><option key={v} value={v}>{v==='ninguno'?'Sin elemento':v.replaceAll('_',' ')}</option>)}</select><span className="block yunque-ayuda mt-1">Un ataque elemental añade 1d4 y activa las reglas de ese elemento.</span></label><label>Tipo de daño<input className={campo} value={e.tipo_dano} onChange={v=>patch({tipo_dano:v.target.value})} placeholder="Cortante, perforante…"/></label></div>}
      {(e.efecto==='estado'||e.efecto==='crear_arma'||e.efecto==='transformacion'||e.duracion>0)&&<Numero nombre="Cuántos turnos dura" min={e.efecto==='crear_arma'?1:0} value={e.duracion} onChange={duracion=>patch({duracion})} ayuda={e.efecto==='crear_arma'?'Cuenta turnos propios completos posteriores a la creación. Al desaparecer, vuelve el equipo anterior.':e.efecto==='estado'?'0 = sin caducidad por turnos. Algunos estados terminan por su propia regla.':'0 = hasta finalizar el encuentro; las etapas no reinician la duración.'}/>}
     </PasoYunque>
     {e.efecto!=='crear_arma'&&e.efecto!=='transformacion'&&<EditorAlcance efecto={e} onChange={patch}/>}
     <PasoYunque numero="3" titulo="Qué cuesta usarla" ayuda="PH son puntos de habilidad que se gastan. La Fatiga aumenta al usar habilidades naturales.">
      <div className="grid gap-3 sm:grid-cols-3"><label>Tipo de habilidad<select className={campo} value={e.naturaleza||'automatica'} onChange={v=>patch({naturaleza:v.target.value as Efecto['naturaleza'],...(v.target.value==='magica'?{coste_ph:Math.max(1,e.coste_ph)}:v.target.value==='natural'?{coste_ph:0,coste_fatiga:Math.max(1,e.coste_fatiga||0)}:v.target.value==='fisica'?{coste_ph:0,coste_fatiga:0}:{})})}><option value="automatica">Según sus costes</option><option value="fisica">Física</option><option value="magica">Mágica: gasta PH</option><option value="natural">Natural: genera Fatiga</option></select></label><Numero nombre="PH que gasta" min={0} value={e.coste_ph} onChange={coste_ph=>patch({coste_ph})}/><Numero nombre="Fatiga que genera" min={0} value={e.coste_fatiga||0} onChange={coste_fatiga=>patch({coste_fatiga})}/></div>
     </PasoYunque>
     <details className="yunque-avanzado" open={extras}><summary>Opciones avanzadas{extras?' · Hay opciones configuradas':''}</summary><div className="space-y-4">
      <p>Configura una salvación o exige un atributo mínimo. Estos ajustes se conservan al cerrar este panel.</p>
      <label className="yunque-check"><input type="checkbox" checked={!!e.requisito_forma} onChange={v=>patch({requisito_forma:v.target.checked?{atributo:'etapa_phoenix',minimo:2}:undefined})}/>Solo se puede usar al alcanzar un atributo o etapa</label>
      {e.requisito_forma&&<div className="grid gap-3 sm:grid-cols-2"><label>Clave del atributo<input className={campo} value={e.requisito_forma.atributo} onChange={v=>patch({requisito_forma:{...e.requisito_forma!,atributo:v.target.value}})}/><span className="yunque-ayuda">Usa la clave de Estadísticas, por ejemplo etapa_phoenix.</span></label><Numero nombre="Valor mínimo requerido" value={e.requisito_forma.minimo} onChange={minimo=>patch({requisito_forma:{...e.requisito_forma!,minimo}})}/></div>}
      <label className="yunque-check"><input type="checkbox" checked={!!e.salvacion} onChange={v=>patch({salvacion:v.target.checked?{cd:12,atributo:'salvacion',exito:'mitad'}:undefined})}/>El objetivo tira una salvación para resistir</label>
      <p className="yunque-ayuda">Sustituye la tirada de impacto en los ataques. La creación de armas no utiliza esta salvación.</p>
      {e.salvacion&&<div className="grid gap-3 sm:grid-cols-3"><Numero nombre="Dificultad que debe alcanzar" min={1} max={1000} value={e.salvacion.cd} onChange={cd=>patch({salvacion:{...e.salvacion!,cd}})}/><label>Clave del bono a la tirada<input className={campo} value={e.salvacion.atributo} onChange={v=>patch({salvacion:{...e.salvacion!,atributo:v.target.value}})}/></label><label>Si supera la salvación<select className={campo} value={e.salvacion.exito} onChange={v=>patch({salvacion:{...e.salvacion!,exito:v.target.value as 'mitad'|'anula'|'solo_estado'}})}><option value="mitad">Recibe la mitad del daño</option><option value="anula">Evita el efecto</option><option value="solo_estado">Evita el estado, recibe el daño</option></select></label></div>}
      {!['dano','crear_arma'].includes(e.efecto)&&<details><summary>Elemento y tipo de daño guardados</summary><div className="grid gap-3 sm:grid-cols-2"><label>Elemento<select className={campo} value={elementoDe(e)} onChange={v=>patch({elemento:v.target.value as Efecto['elemento']})}>{ELEMENTOS.map(v=><option key={v} value={v}>{v}</option>)}</select></label><label>Tipo de daño<input className={campo} value={e.tipo_dano} onChange={v=>patch({tipo_dano:v.target.value})}/></label></div></details>}
     </div></details>
     <ResumenYunque resumen={ayuda.resumen} detalles={ayuda.detalles}/>
     {error&&<p className="yunque-aviso">Para poder guardar: {error}</p>}
     <div className="yunque-acciones"><button type="button" onClick={()=>tirar(e)}>{e.efecto==='estado'?'Comprobar configuración':e.tabla_armas?'Probar qué arma saldría':'Probar la cantidad'}</button><button type="button" disabled={value.length>=20} onClick={()=>{const copia={...structuredClone(e),id:crypto.randomUUID(),nombre:`${e.nombre} (copia)`};onChange([...value,copia]);setAbierta(copia.id);}}>Duplicar acción</button><button type="button" className="text-red-300" onClick={()=>{onChange(value.filter(v=>v.id!==e.id));setPrueba(null);}}>Quitar acción</button></div>
     {prueba?.id===e.id&&<p role="status" className="yunque-resumen">{prueba.texto}</p>}
    </fieldset>
   </details>;
  })}
  {value.length>=20&&<p className="yunque-aviso">Has llegado al máximo de 20 acciones.</p>}
 </section>;
}
