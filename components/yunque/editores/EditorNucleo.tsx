'use client';
// Editor del núcleo: qué es (cartas de tipo), familia, nombre, portada y atributos como medallones.
import PortadaYunque from '../../PortadaYunque';
import IconoYugen from '../../IconoYugen';
import {Medallon} from '../../ui/Juego';
import {Fichas,Rueda,type Opcion} from '../Controles';
import {TIPOS,clasificacionesPara,tipoDe,type TipoCreacion} from '../../../lib/creacion';
import {esMonstruo} from '../../../lib/progresion';
import {CLAVE_PRESUPUESTO,type TipoPresupuesto} from '../../../lib/combate';
import {vacio,type Borrador} from '../../../lib/yunque-borrador';
import {atributosVisibles,cambiosClasificacion,esMonstruoB,mallaActiva,type ContextoTaller} from '../contexto';
import type {EditorNodoProps} from './EditorAccion';
import type {Operacion} from '../../../lib/yunque-operaciones';

export const ICONO_CREACION:Record<TipoCreacion,string>={personaje:'humano',objeto:'espada',habilidad:'fuego',pasiva:'escudo',titulo:'corona',otro:'yugen'};
const GUIA:Record<TipoCreacion,string>={personaje:'Aliado o enemigo con vida, equipo y habilidades.',habilidad:'Una acción para su turno.',objeto:'Arma, armadura, accesorio o consumible.',pasiva:'Funciona sola, sin gastar el turno.',titulo:'Equipable que da atributos y efectos.',otro:'Clasificación y reglas propias.'};
const RANURAS:Opcion<string>[]=[{valor:'ninguno',nombre:'No se equipa'},{valor:'mano',nombre:'Una mano'},{valor:'dos_manos',nombre:'Dos manos'},{valor:'casco',nombre:'Cabeza'},{valor:'pechera',nombre:'Torso'},{valor:'pantalones',nombre:'Piernas'},{valor:'zapatos',nombre:'Botas'},{valor:'capa',nombre:'Capa'},{valor:'accesorio',nombre:'Accesorio'}];

type Props=EditorNodoProps&{ctx:ContextoTaller;
 /** Aplica varias operaciones como un solo paso del historial (un gesto = un Ctrl+Z). */
 ejecutar:(ops:Operacion[])=>boolean;
 /** Empieza un borrador nuevo (un paso del historial: Ctrl+Z vuelve al anterior). */
 reemplazar:(nuevo:Borrador,info?:string)=>void;
 /** Pieza creada dentro de un personaje: no puede convertirse en otra creación. */
 hijo?:boolean;
 /** Hay un guardado en curso: no se puede empezar otro borrador. */
 guardando?:boolean};

export default function EditorNucleo({b,ctx,ejecutar,reemplazar,hijo,guardando}:Props){
 const fijar=(p:Partial<Borrador>)=>{const ops:Operacion[]=Object.entries(p).map(([k,v])=>({op:'fijar',ruta:[k],valor:v}));if(ops.length)ejecutar(ops);};
 const monstruo=esMonstruoB(b,ctx),malla=mallaActiva(b,ctx);
 const familias=clasificacionesPara(b.tipo,ctx.categorias).filter(c=>b.tipo!=='personaje'||esMonstruo(ctx.categorias,c.clave)===b.ramaMonstruo);
 const atributos=atributosVisibles(b,ctx);
 function cambiarTipo(tipo:TipoCreacion){
  fijar({ramaMonstruo:false,tipo,personal_de:tipo==='personaje'?'':b.personal_de||'',malla:tipo==='personaje'?b.malla:b.malla&&!b.ramaMonstruo,
   clasificacion:clasificacionesPara(tipo,ctx.categorias).some(c=>c.clave===b.clasificacion&&!esMonstruo(ctx.categorias,c.clave))?b.clasificacion:'',
   slot:tipo==='objeto'?b.slot:tipo==='titulo'?'titulo':'ninguno',habilidades:tipo==='personaje'?b.habilidades:[],equipamiento:tipo==='personaje'?b.equipamiento:{},efectos:tipo==='personaje'?[]:b.efectos});
 }
 function elegirMonstruos(){
  if(hijo||guardando||b.ramaMonstruo)return;
  // Un monstruo es una creación nueva: borrador limpio (sin `id` ni petición), así «Forjar» nunca pisa la fila abierta.
  const base:Borrador={...vacio(),nombre:b.nombre,imagen:b.imagen,icono:b.icono,tipo:'personaje',ramaMonstruo:true,malla:true};
  const c=clasificacionesPara('personaje',ctx.categorias).find(c=>esMonstruo(ctx.categorias,c.clave));
  reemplazar({...base,...(c?cambiosClasificacion(base,ctx,c.clave):{})},'Nueva especie de monstruo en un borrador limpio. Ctrl+Z vuelve a la creación anterior.');
 }
 // En una especie con malla los atributos viven en `rangos`: el presupuesto es el mismo en todos los niveles.
 function fijarPresupuesto(clave:string,n:number){
  if(malla){const rangos={...b.rangos};if(n)rangos[clave]={min:n,max:n};else delete rangos[clave];fijar({rangos});return;}
  const stats={...b.stats};if(n)stats[clave]=n;else delete stats[clave];fijar({stats});
 }
 const valorFijo=(clave:string,defecto:number)=>b.stats[clave]??defecto;
 const rango=(clave:string,defecto:number)=>b.rangos[clave]??{min:defecto,max:defecto};
 return <div className="yq-editor yq-editor--nucleo">
  <fieldset className="yq-cartas"><legend>Qué es</legend><div>
   {TIPOS.map(t=><button type="button" key={t.valor} aria-pressed={b.tipo===t.valor&&!b.ramaMonstruo} onClick={()=>cambiarTipo(t.valor)}>
    <span className="yq-carta-icono"><IconoCarta id={ICONO_CREACION[t.valor]}/></span><strong>{t.nombre}</strong><small>{GUIA[t.valor]}</small>
   </button>)}
   <button type="button" aria-pressed={b.ramaMonstruo} disabled={hijo||guardando} title={hijo?'Esta pieza se crea para el personaje: no puede ser un monstruo.':guardando?'Espera a que termine la operación en curso.':undefined} onClick={elegirMonstruos}><span className="yq-carta-icono"><IconoCarta id="bestia"/></span><strong>Monstruos</strong><small>Especie con variantes y apariciones por nivel.</small></button>
  </div></fieldset>
  <label className="yq-campo yq-campo--nombre"><span>Nombre</span><input aria-label="Nombre de la creación" maxLength={160} value={b.nombre} placeholder="Espada de Mao, Kion, Bola de fuego…" onChange={e=>fijar({nombre:e.target.value})}/></label>
  {familias.length?<Fichas etiqueta="Familia" opciones={familias.map(c=>({valor:c.clave,nombre:c.nombre}))} valor={b.clasificacion} onChange={clave=>fijar(cambiosClasificacion(b,ctx,clave))} tono="oro"/>
   :<p className="yq-nota">Aún no hay familias para este tipo. Créalas en Estadísticas.</p>}
  {b.tipo!=='personaje'&&(()=>{
   // Creación personal: pertenece a un personaje y no se mezcla con las generales. Otros pueden aprenderla cumpliendo sus requisitos.
   const personajes=ctx.creaciones.filter(c=>(c.tipo_creacion??tipoDe(c,ctx.categorias))==='personaje'&&c.estado!=='rechazado').sort((x,y)=>x.nombre.localeCompare(y.nombre,'es'));
   const huerfana=!!b.personal_de&&!personajes.some(p=>p.id===b.personal_de);
   return <label className="yq-campo yq-campo--personal"><span>Ámbito</span>
    <select aria-label="Ámbito de la creación" value={b.personal_de||''} onChange={e=>fijar({personal_de:e.target.value})}>
     <option value="">General · disponible para todos</option>
     {huerfana&&<option value={b.personal_de}>Personal de un personaje que ya no existe</option>}
     {personajes.map(p=><option key={p.id} value={p.id}>Personal de {p.nombre}</option>)}
    </select>
    <small>{b.personal_de?'Sale con su personaje, no entre las generales. Otros pueden aprenderla si cumplen sus requisitos.':'Aparece en la Forja y al crear cualquier personaje.'}</small>
   </label>;
  })()}
  {b.tipo==='objeto'&&<>
   <Fichas etiqueta="Dónde se equipa" opciones={RANURAS} valor={b.slot} onChange={slot=>fijar({slot})}/>
   <label className="yq-conmutador"><input type="checkbox" role="switch" checked={b.consumible} onChange={e=>fijar({consumible:e.target.checked})}/><span aria-hidden="true"/>Se consume al usarlo</label>
  </>}
  <div className="yq-portada"><PortadaYunque key={`${b.id||'nuevo'}:${b.tipo}`} nombre={b.nombre} imagen={b.imagen} icono={b.icono} onChange={fijar} onProcesando={ctx.onProcesandoImagen}/></div>
  {b.clasificacion&&<section className="yq-atributos" aria-label="Atributos">
   <header>
    <span>Atributos</span>
    <Fichas etiqueta="Cómo se generan sus copias" opciones={[{valor:'fijo',nombre:'Únicos'},{valor:'malla',nombre:'Malla'}]} valor={malla?'malla':'fijo'} onChange={v=>{if(!monstruo)fijar({malla:v==='malla'});}}/>
   </header>
   {malla&&b.tipo==='personaje'&&<label className="yq-nivel"><span>Nivel máximo</span><Rueda nombre="nivelMaximo" etiqueta="Nivel máximo de la especie" valor={b.nivelMaximo} min={1} max={100} onChange={nivelMaximo=>fijar({nivelMaximo})} compacta/></label>}
   <div className="yq-medallones">
    {atributos.map(a=>{
     const d=a.valor_defecto??0;
     if(!malla)return <Medallon key={a.id} etiqueta={a.etiqueta} valor={<CifraMedallon etiqueta={a.etiqueta} valor={valorFijo(a.clave,d)} onChange={n=>fijar({stats:{...b.stats,[a.clave]:n}})}/>}/>;
     const r=rango(a.clave,d);
     return <Medallon key={a.id} etiqueta={a.etiqueta} detalle="mínimo → máximo" valor={<span className="yq-medallon-rango">
      <CifraMedallon etiqueta={`${a.etiqueta} mínimo`} valor={r.min} onChange={min=>fijar({rangos:{...b.rangos,[a.clave]:{...r,min}}})}/>
      <i aria-hidden="true">→</i>
      <CifraMedallon etiqueta={`${a.etiqueta} máximo`} valor={r.max} onChange={max=>fijar({rangos:{...b.rangos,[a.clave]:{...r,max}}})}/>
     </span>}/>;
    })}
   </div>
   {!atributos.length&&<p className="yq-nota">Esta familia no tiene atributos. Defínelos en Estadísticas.</p>}
  </section>}
  {b.tipo==='personaje'&&<section className="yq-atributos yq-presupuesto" aria-label="Acciones por turno">
   <header><span>Acciones por turno</span></header>
   <div className="yq-medallones">
    {PRESUPUESTOS.map(x=><Medallon key={x.tipo} etiqueta={x.etiqueta} detalle={x.detalle} valor={<Rueda nombre={'presupuesto_'+x.tipo} etiqueta={x.etiqueta} valor={(malla?b.rangos[CLAVE_PRESUPUESTO[x.tipo]]?.max:b.stats[CLAVE_PRESUPUESTO[x.tipo]])??0} min={0} max={10} onChange={n=>fijarPresupuesto(CLAVE_PRESUPUESTO[x.tipo],n)} compacta/>}/>)}
   </div>
   <p className="yq-nota">Lo propio del personaje. La raza, el clan, la especie y el equipo suman las suyas en combate.</p>
  </section>}
  {b.tipo==='objeto'&&b.slot!=='ninguno'&&<section className="yq-atributos yq-bonos-portador" aria-label="Bonos al portador">
   <header><span>Mientras esté equipado</span></header>
   <div className="yq-medallones">
    {BONOS_PORTADOR.filter(x=>!atributos.some(a=>a.clave===x.clave)).map(x=><Medallon key={x.clave} etiqueta={x.etiqueta} detalle="máximo del portador" valor={<CifraMedallon etiqueta={x.etiqueta} valor={b.stats[x.clave]??0} onChange={n=>{const stats={...b.stats};if(n)stats[x.clave]=n;else delete stats[x.clave];fijar({stats});}}/>}/>)}
   </div>
   <p className="yq-nota">{frasePortador(b)}</p>
  </section>}
 </div>;
}
const PRESUPUESTOS:{tipo:TipoPresupuesto;etiqueta:string;detalle:string}[]=[{tipo:'principal',etiqueta:'Acciones principales extra',detalle:'además de la 1.ª'},{tipo:'adicional',etiqueta:'Acciones adicionales',detalle:'por turno'},{tipo:'legendaria',etiqueta:'Acciones legendarias por ronda',detalle:'fuera de turno'}];
/** Atributos de supervivencia que cualquier pieza equipable puede sumar al portador (plan maestro 4.5). */
const BONOS_PORTADOR=[{clave:'vida',etiqueta:'Vida máxima'},{clave:'ph',etiqueta:'PH máximo'},{clave:'fatiga',etiqueta:'Fatiga máxima'}];
function frasePortador(b:{nombre:string;slot:string;stats:Record<string,number>}){
 const partes=BONOS_PORTADOR.filter(x=>b.stats[x.clave]).map(x=>`${b.stats[x.clave]>0?'+':''}${b.stats[x.clave]} ${x.etiqueta}`);
 return partes.length?`${b.nombre.trim()||'Este objeto'} · ${partes.join(', ')} mientras esté equipado.`:'Sin bonos de Vida, PH ni Fatiga.';
}
const IconoCarta=({id}:{id:string})=><IconoYugen id={id} size={34}/>;
/** Cifra editable dentro de un medallón: se escribe o se gira con la rueda del ratón. */
function CifraMedallon({etiqueta,valor,onChange}:{etiqueta:string;valor:number;onChange:(n:number)=>void}){
 return <Rueda nombre="atributo" etiqueta={etiqueta} valor={valor} min={-9999} max={99999} onChange={onChange} compacta/>;
}
