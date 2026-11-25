'use client';
// Editor de estados (plan maestro, Apéndice B · paso 10): elige un estado del catálogo o crea uno nuevo combinando
// primitivas. La vista previa usa la misma frase que el tooltip de combate (describirEstado). Sin JSON ni SQL.
import {Trash2} from 'lucide-react';
import IconoYugen from '../../IconoYugen';
import {Fichas,Rueda,Texto,Interruptor,type Opcion} from '../Controles';
import EditorDefensas from './EditorDefensas';
import {CATALOGO_ESTADOS,NOMBRE_PRIMITIVA,ICONO_PRIMITIVA,describirEstado,validarDefinicionEstado,type DefinicionEstado,type Primitiva,type TipoPrimitiva,type CategoriaEstado,type DuracionEstado} from '../../../lib/estados';
import {useGrimorioEstados} from '../../../lib/useGrimorioEstados';
import './defensas.css';

const CATEGORIAS:Opcion<CategoriaEstado>[]=[{valor:'mental',nombre:'Mental',icono:'alma'},{valor:'fisico',nombre:'Físico',icono:'espada'},{valor:'elemental',nombre:'Elemental',icono:'fuego'},{valor:'narrativo',nombre:'Narrativo',icono:'libro'}];
const ICONOS=['fuego','hielo','rayo','agua','pocion','alma','ojo','escudo','vida','corona','libro','espada'].map(i=>({valor:i,nombre:'',icono:i}));
const DURACIONES:Opcion<DuracionEstado['tipo']>[]=[{valor:'turnos',nombre:'Turnos'},{valor:'combate',nombre:'Hasta que se consuma'},{valor:'salvacion',nombre:'Hasta superar salvación'},{valor:'hasta_su_turno',nombre:'Hasta su turno'}];
const ELEMENTOS=[['fuego','Fuego'],['agua','Agua'],['electricidad','Rayo'],['hielo','Hielo'],['luz_sagrada','Luz sagrada'],['veneno','Veneno']] as const;
const NUEVA:Record<TipoPrimitiva,Primitiva>={
 perder_turno:{tipo:'perder_turno'},movimiento_forzado:{tipo:'movimiento_forzado',sentido:'alejar',min:1,max:2,no_ataca_fuente:true},
 cesion_control:{tipo:'cesion_control',controlador:'fuente'},percepcion_alterada:{tipo:'percepcion_alterada',probabilidad:50},
 dano_periodico:{tipo:'dano_periodico',cantidad:1,caras:4,tipo_dano:'veneno',momento:'inicio'},curacion_periodica:{tipo:'curacion_periodica',cantidad:1,caras:4,momento:'inicio'},
 modificador_movimiento:{tipo:'modificador_movimiento',modo:'cero'},vulnerabilidad_elemental:{tipo:'vulnerabilidad_elemental',consume:true,reacciones:[{elemento:'electricidad',nombre:'Descarga',multiplicador:2}]},
 bonos:{tipo:'bonos',bonos:{armadura:2}},inmunidad:{tipo:'inmunidad',inmunidades:[{tipo:'dano',valor:'fuego',modo:'bloquear_dano'}]},
};
const idDe=(nombre:string)=>nombre.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/^(\d)/,'e_$1').slice(0,60)||'estado';
const CD=({etiqueta,valor,onChange}:{etiqueta:string;valor:{cd:number;atributo:string};onChange:(v:{cd:number;atributo:string})=>void})=>
 <label className="yq-campo"><span>{etiqueta}</span><Rueda nombre="cd" etiqueta={etiqueta} valor={valor.cd} min={1} max={100} onChange={cd=>onChange({...valor,cd})} compacta/></label>;

export default function EditorEstados({valor,onChange}:{valor:DefinicionEstado;onChange:(d:DefinicionEstado)=>void}){
 const d=valor,error=validarDefinicionEstado(d),{estados:grimorio}=useGrimorioEstados(false);
 const set=(p:Partial<DefinicionEstado>)=>onChange({...d,...p});
 const prim=(i:number,p:Partial<Primitiva>)=>set({efectos:d.efectos.map((x,j)=>j===i?{...x,...p} as Primitiva:x)});
 return <section className="yq-estado-editor" aria-label="Editor de estado">
  <label className="yq-campo"><span>Partir del catálogo</span><select value="" onChange={e=>{const propio=grimorio.find(x=>'g:'+x.id===e.target.value);if(propio){onChange(structuredClone(propio.def));return;}const base=CATALOGO_ESTADOS.find(x=>x.id===e.target.value);if(base)onChange({...structuredClone(base),id:base.id+'_propio',nombre:base.nombre.split(':')[0]+' (variante)'});}}>
   <option value="">Elegir un estado base…</option>{grimorio.length>0&&<optgroup label="Tu grimorio">{grimorio.map(x=><option key={x.id} value={'g:'+x.id}>{x.def.nombre}</option>)}</optgroup>}<optgroup label="Catálogo base">{CATALOGO_ESTADOS.map(x=><option key={x.id} value={x.id}>{x.nombre.split(':')[0]}</option>)}</optgroup></select></label>
  <Texto etiqueta="Nombre del estado" valor={d.nombre} onChange={nombre=>set({nombre,id:idDe(nombre)})} placeholder="Sopor tóxico, Pánico…"/>
  <Fichas etiqueta="Icono" opciones={ICONOS} valor={d.icono||'fuego'} onChange={icono=>set({icono})}/>
  <Fichas etiqueta="Categoría" opciones={CATEGORIAS} valor={d.categoria} onChange={categoria=>set({categoria,subcategoria:categoria==='mental'?d.subcategoria||'control':undefined})} tono="arcano"/>
  {d.categoria==='mental'&&<Fichas etiqueta="Tipo de efecto mental" opciones={['control','miedo','ilusion','confusion','memoria','posesion'].map(s=>({valor:s,nombre:s.replace('ilusion','ilusión').replace('confusion','confusión').replace('posesion','posesión')}))} valor={d.subcategoria} onChange={subcategoria=>set({subcategoria})}/>}
  <label className="yq-campo"><span>Origen (inmunidades)</span><select value={d.origen||''} onChange={e=>set({origen:e.target.value||undefined})}><option value="">Sin origen elemental</option>{ELEMENTOS.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
  <Fichas etiqueta="Duración" opciones={DURACIONES} valor={d.duracion.tipo} onChange={t=>set({duracion:t==='turnos'?{tipo:'turnos',turnos:2}:t==='salvacion'?{tipo:'salvacion',salvacion:{cd:12,atributo:'salvacion'}}:{tipo:t}})}/>
  {d.duracion.tipo==='turnos'&&<label className="yq-campo"><span>Turnos</span><Rueda nombre="turnos" etiqueta="Turnos que dura" valor={d.duracion.turnos} min={1} max={99} onChange={turnos=>set({duracion:{tipo:'turnos',turnos}})} compacta/></label>}
  {d.duracion.tipo==='salvacion'&&<CD etiqueta="CD para terminarlo" valor={d.duracion.salvacion} onChange={salvacion=>set({duracion:{tipo:'salvacion',salvacion}})}/>}
  <div className="yq-primitivas">
   {d.efectos.map((p,i)=><fieldset key={i} className="yq-primitiva">
    <header><IconoYugen id={ICONO_PRIMITIVA[p.tipo]} size={16}/>{NOMBRE_PRIMITIVA[p.tipo]}<button type="button" aria-label={`Quitar ${NOMBRE_PRIMITIVA[p.tipo]}`} onClick={()=>set({efectos:d.efectos.filter((_,j)=>j!==i)})}><Trash2 size={14} aria-hidden="true"/></button></header>
    <ParametrosPrimitiva p={p} onChange={x=>prim(i,x)}/>
   </fieldset>)}
  </div>
  {d.efectos.length<8&&<Fichas etiqueta="Añadir primitiva" opciones={(Object.keys(NOMBRE_PRIMITIVA) as TipoPrimitiva[]).map(t=>({valor:t,nombre:NOMBRE_PRIMITIVA[t],icono:ICONO_PRIMITIVA[t]}))} valor={undefined} onChange={t=>set({efectos:[...d.efectos,structuredClone(NUEVA[t])]})} columnas={2}/>}
  <Interruptor etiqueta="Despierta al recibir daño" valor={!!d.despertar?.recibir_dano} onChange={v=>set({despertar:{...d.despertar,recibir_dano:v||undefined}})}/>
  <Interruptor etiqueta="Salvación al inicio de cada turno para terminarlo" valor={!!d.despertar?.salvacion} onChange={v=>set({despertar:{...d.despertar,salvacion:v?{cd:12,atributo:'salvacion'}:undefined}})}/>
  {d.despertar?.salvacion&&<CD etiqueta="CD para despertar" valor={d.despertar.salvacion} onChange={salvacion=>set({despertar:{...d.despertar,salvacion}})}/>}
  <p className="yq-estado-frase" role="status">{error?`⚠ ${error}`:describirEstado(d)}</p>
 </section>;
}

function ParametrosPrimitiva({p,onChange}:{p:Primitiva;onChange:(p:Partial<Primitiva>)=>void}){
 const dados=(cantidad:number,caras:number)=><div className="yq-fila">
  <label>Dados<Rueda nombre="cantidad" etiqueta="Dados" valor={cantidad} min={1} max={20} onChange={v=>onChange({cantidad:v} as Partial<Primitiva>)} compacta/></label>
  <label>Caras<Rueda nombre="caras" etiqueta="Caras" valor={caras} valores={[2,4,6,8,10,12,20]} onChange={v=>onChange({caras:v} as Partial<Primitiva>)} compacta/></label></div>;
 const momento=(m:'inicio'|'fin')=><Fichas etiqueta="Cuándo" opciones={[{valor:'inicio',nombre:'Al iniciar su turno'},{valor:'fin',nombre:'Al terminar su turno'}]} valor={m} onChange={v=>onChange({momento:v} as Partial<Primitiva>)}/>;
 switch(p.tipo){
  case 'perder_turno':return <>
   <Interruptor etiqueta="Pierde el primer turno siempre (100 %)" valor={!!p.primer_turno} onChange={v=>onChange({primer_turno:v||undefined})}/>
   <Interruptor etiqueta="Puede usar reacciones" valor={p.permite_reacciones!==false} onChange={v=>onChange({permite_reacciones:v?undefined:false})}/>
   <Interruptor etiqueta="Se gasta al perder el turno" valor={!!p.consumir} onChange={v=>onChange({consumir:v||undefined})}/></>;
  case 'movimiento_forzado':return <>
   <Fichas etiqueta="Sentido" opciones={[{valor:'alejar',nombre:'Huye de la fuente'},{valor:'acercar',nombre:'Se acerca a la fuente'}]} valor={p.sentido} onChange={sentido=>onChange({sentido})}/>
   <div className="yq-fila"><label>Mínimo<Rueda nombre="min" etiqueta="Casillas mínimas" valor={p.min} min={0} max={12} onChange={min=>onChange({min})} compacta/></label>
    <label>Máximo<Rueda nombre="max" etiqueta="Casillas máximas" valor={p.max} min={1} max={12} onChange={max=>onChange({max})} compacta/></label></div>
   <Interruptor etiqueta="No puede atacar a la fuente" valor={!!p.no_ataca_fuente} onChange={v=>onChange({no_ataca_fuente:v||undefined})}/></>;
  case 'cesion_control':return <Fichas etiqueta="Quién decide" opciones={[{valor:'fuente',nombre:'Quien lo lanzó'},{valor:'gm',nombre:'El GM'}]} valor={p.controlador} onChange={controlador=>onChange({controlador})}/>;
  case 'percepcion_alterada':return <label className="yq-campo"><span>Probabilidad de ver los bandos invertidos (%)</span><Rueda nombre="probabilidad" etiqueta="Probabilidad" valor={p.probabilidad} min={0} max={100} paso={5} onChange={probabilidad=>onChange({probabilidad})} compacta/></label>;
  case 'dano_periodico':return <>{dados(p.cantidad,p.caras)}
   <label className="yq-campo"><span>Tipo de daño</span><select value={p.tipo_dano} onChange={e=>onChange({tipo_dano:e.target.value})}>{[...ELEMENTOS,['necrotico','Necrótico'],['fisico','Físico']].map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
   {momento(p.momento)}
   <Interruptor etiqueta="Salvación tras el daño para apagarlo" valor={!!p.salvacion_termina} onChange={v=>onChange({salvacion_termina:v?{cd:12,atributo:'salvacion'}:undefined})}/></>;
  case 'curacion_periodica':return <>{dados(p.cantidad,p.caras)}{momento(p.momento)}</>;
  case 'modificador_movimiento':return <><Fichas etiqueta="Movimiento" opciones={[{valor:'cero',nombre:'No se mueve'},{valor:'mitad',nombre:'A la mitad'},{valor:'restar',nombre:'Resta casillas'}]} valor={p.modo} onChange={modo=>onChange({modo,valor:modo==='restar'?p.valor||2:undefined})}/>
   {p.modo==='restar'&&<Rueda nombre="valor" etiqueta="Casillas que resta" valor={p.valor||2} min={1} max={30} onChange={valor=>onChange({valor})} compacta/>}</>;
  case 'vulnerabilidad_elemental':return <>
   {p.reacciones.map((r,i)=><div key={i} className="yq-fila">
    <label>Elemento<select value={r.elemento} onChange={e=>onChange({reacciones:p.reacciones.map((x,j)=>j===i?{...x,elemento:e.target.value}:x)})}>{ELEMENTOS.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
    <label>Nombre<input value={r.nombre} maxLength={60} onChange={e=>onChange({reacciones:p.reacciones.map((x,j)=>j===i?{...x,nombre:e.target.value}:x)})}/></label>
    <label>× daño<Rueda nombre="multiplicador" etiqueta="Multiplicador" valor={r.multiplicador||1} min={1} max={5} onChange={v=>onChange({reacciones:p.reacciones.map((x,j)=>j===i?{...x,multiplicador:v>1?v:undefined}:x)})} compacta/></label>
   </div>)}
   <button type="button" className="yq-boton-suave" onClick={()=>onChange({reacciones:[...p.reacciones,{elemento:'fuego',nombre:'Reacción',multiplicador:2}]})}>Otra reacción elemental</button>
   <Interruptor etiqueta="Se consume al reaccionar" valor={!!p.consume} onChange={v=>onChange({consume:v||undefined})}/></>;
  case 'bonos':return <div className="yq-fila">{(['armadura','bono_impacto','salvacion','dano'] as const).map(k=><label key={k}>{k.replace('_',' ')}<Rueda nombre={k} etiqueta={k} valor={p.bonos[k]||0} min={-20} max={20} onChange={v=>{const bonos={...p.bonos};if(v)bonos[k]=v;else delete bonos[k];onChange({bonos});}} compacta/></label>)}</div>;
  case 'inmunidad':return <EditorDefensas valor={p.inmunidades} onChange={inmunidades=>onChange({inmunidades})} sinDuracion/>;
 }
}
