'use client';
// Editor del núcleo: qué es (cartas de tipo), familia, nombre, portada y atributos como medallones.
import PortadaYunque from '../../PortadaYunque';
import IconoYugen from '../../IconoYugen';
import {Medallon} from '../../ui/Juego';
import {Fichas,Rueda,type Opcion} from '../Controles';
import {TIPOS,clasificacionesPara,type TipoCreacion} from '../../../lib/creacion';
import {esMonstruo} from '../../../lib/progresion';
import {vacio,type Borrador} from '../../../lib/yunque-borrador';
import {atributosVisibles,cambiosClasificacion,esMonstruoB,mallaActiva,type ContextoTaller} from '../contexto';
import type {EditorNodoProps} from './EditorAccion';

export const ICONO_CREACION:Record<TipoCreacion,string>={personaje:'humano',objeto:'espada',habilidad:'fuego',pasiva:'escudo',titulo:'corona',otro:'yugen'};
const GUIA:Record<TipoCreacion,string>={personaje:'Aliado o enemigo con vida, equipo y habilidades.',habilidad:'Una acción para su turno.',objeto:'Arma, armadura, accesorio o consumible.',pasiva:'Funciona sola, sin gastar el turno.',titulo:'Equipable que da atributos y efectos.',otro:'Clasificación y reglas propias.'};
const RANURAS:Opcion<string>[]=[{valor:'ninguno',nombre:'No se equipa'},{valor:'mano',nombre:'Una mano'},{valor:'dos_manos',nombre:'Dos manos'},{valor:'casco',nombre:'Cabeza'},{valor:'pechera',nombre:'Torso'},{valor:'pantalones',nombre:'Piernas'},{valor:'zapatos',nombre:'Botas'},{valor:'capa',nombre:'Capa'},{valor:'accesorio',nombre:'Accesorio'}];

export default function EditorNucleo({b,operar,ctx}:EditorNodoProps&{ctx:ContextoTaller}){
 const fijar=(p:Partial<Borrador>)=>{for(const [k,v] of Object.entries(p))operar({op:'fijar',ruta:[k],valor:v});};
 const monstruo=esMonstruoB(b,ctx),malla=mallaActiva(b,ctx);
 const familias=clasificacionesPara(b.tipo,ctx.categorias).filter(c=>b.tipo!=='personaje'||esMonstruo(ctx.categorias,c.clave)===b.ramaMonstruo);
 const atributos=atributosVisibles(b,ctx);
 function cambiarTipo(tipo:TipoCreacion){
  fijar({ramaMonstruo:false,tipo,malla:tipo==='personaje'?b.malla:b.malla&&!b.ramaMonstruo,
   clasificacion:clasificacionesPara(tipo,ctx.categorias).some(c=>c.clave===b.clasificacion&&!esMonstruo(ctx.categorias,c.clave))?b.clasificacion:'',
   slot:tipo==='objeto'?b.slot:tipo==='titulo'?'titulo':'ninguno',habilidades:tipo==='personaje'?b.habilidades:[],equipamiento:tipo==='personaje'?b.equipamiento:{},efectos:tipo==='personaje'?[]:b.efectos});
 }
 function elegirMonstruos(){
  const base={...vacio(),nombre:b.nombre,imagen:b.imagen,icono:b.icono,tipo:'personaje' as const,ramaMonstruo:true,malla:true};
  const c=clasificacionesPara('personaje',ctx.categorias).find(c=>esMonstruo(ctx.categorias,c.clave));
  fijar({...base,...(c?cambiosClasificacion(base,ctx,c.clave):{})});
 }
 const valorFijo=(clave:string,defecto:number)=>b.stats[clave]??defecto;
 const rango=(clave:string,defecto:number)=>b.rangos[clave]??{min:defecto,max:defecto};
 return <div className="yq-editor yq-editor--nucleo">
  <fieldset className="yq-cartas"><legend>Qué es</legend><div>
   {TIPOS.map(t=><button type="button" key={t.valor} aria-pressed={b.tipo===t.valor&&!b.ramaMonstruo} onClick={()=>cambiarTipo(t.valor)}>
    <span className="yq-carta-icono"><IconoCarta id={ICONO_CREACION[t.valor]}/></span><strong>{t.nombre}</strong><small>{GUIA[t.valor]}</small>
   </button>)}
   <button type="button" aria-pressed={b.ramaMonstruo} onClick={elegirMonstruos}><span className="yq-carta-icono"><IconoCarta id="bestia"/></span><strong>Monstruos</strong><small>Especie con variantes y apariciones por nivel.</small></button>
  </div></fieldset>
  <label className="yq-campo yq-campo--nombre"><span>Nombre</span><input aria-label="Nombre de la creación" maxLength={160} value={b.nombre} placeholder="Espada de Mao, Kion, Bola de fuego…" onChange={e=>fijar({nombre:e.target.value})}/></label>
  {familias.length?<Fichas etiqueta="Familia" opciones={familias.map(c=>({valor:c.clave,nombre:c.nombre}))} valor={b.clasificacion} onChange={clave=>fijar(cambiosClasificacion(b,ctx,clave))} tono="oro"/>
   :<p className="yq-nota">Aún no hay familias para este tipo. Créalas en Estadísticas.</p>}
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
 </div>;
}
const IconoCarta=({id}:{id:string})=><IconoYugen id={id} size={34}/>;
/** Cifra editable dentro de un medallón: se escribe o se gira con la rueda del ratón. */
function CifraMedallon({etiqueta,valor,onChange}:{etiqueta:string;valor:number;onChange:(n:number)=>void}){
 return <Rueda nombre="atributo" etiqueta={etiqueta} valor={valor} min={-9999} max={99999} onChange={onChange} compacta/>;
}
