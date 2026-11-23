'use client';
// «Defensas e inmunidades» (plan maestro 4.6): tres columnas —Daño, Estado y Categoría— sin JSON ni SQL.
// Cada columna elige un valor y un modo; la vista previa usa la frase del motor («Inmune al fuego; no a Quemadura»).
import {useState} from 'react';
import {X} from 'lucide-react';
import IconoYugen from '../../IconoYugen';
import {Fichas,Rueda,type Opcion} from '../Controles';
import {describirInmunidades,SUBCATEGORIAS_MENTALES,type Inmunidad,type ModoInmunidad,type TipoInmunidad,type DuracionInmunidad} from '../../../lib/inmunidades';
import {CATALOGO_ESTADOS} from '../../../lib/estados';
import './defensas.css';

const DANOS:Opcion<string>[]=[
 {valor:'fuego',nombre:'Fuego',icono:'fuego'},{valor:'agua',nombre:'Agua',icono:'agua'},{valor:'electricidad',nombre:'Rayo',icono:'rayo'},
 {valor:'hielo',nombre:'Hielo',icono:'hielo'},{valor:'luz_sagrada',nombre:'Luz sagrada',icono:'corona'},{valor:'veneno',nombre:'Veneno',icono:'pocion'},
 {valor:'fisico',nombre:'Físico',icono:'espada'},{valor:'magico',nombre:'Mágico',icono:'libro'},
];
const NOMBRE_SUB:Record<string,string>={control:'Control',miedo:'Miedo',ilusion:'Ilusión',confusion:'Confusión',memoria:'Memoria',posesion:'Posesión'};
const CATEGORIAS:Opcion<string>[]=[{valor:'mental',nombre:'Toda la mente',icono:'alma'},...SUBCATEGORIAS_MENTALES.map(s=>({valor:'mental:'+s,nombre:NOMBRE_SUB[s],icono:'ojo'}))];
const MODOS:Record<TipoInmunidad,Opcion<ModoInmunidad>[]>={
 dano:[{valor:'bloquear_dano',nombre:'Sin daño',ayuda:'No recibe ese daño; sus estados sí le afectan.'},{valor:'bloquear_todo',nombre:'Daño y estados',ayuda:'Tampoco sufre los estados de ese origen.'},{valor:'resistir',nombre:'Resiste',ayuda:'Recibe la mitad.'}],
 estado:[{valor:'bloquear_aplicacion',nombre:'Inmune',ayuda:'No se le aplica, sin tirada.'},{valor:'resistir',nombre:'Resiste',ayuda:'Dura la mitad.'}],
 categoria:[{valor:'bloquear_aplicacion',nombre:'Inmune',ayuda:'Bloquea sus estados antes de la salvación.'},{valor:'bloquear_todo',nombre:'Inmune a todo',ayuda:'También a su daño.'},{valor:'resistir',nombre:'Resiste',ayuda:'Efecto acortado.'}],
};
const COLUMNAS:{tipo:TipoInmunidad;titulo:string;icono:string}[]=[{tipo:'dano',titulo:'Daño',icono:'escudo'},{tipo:'estado',titulo:'Estado',icono:'fuego'},{tipo:'categoria',titulo:'Categoría',icono:'alma'}];
const DURACIONES:Opcion<DuracionInmunidad>[]=[{valor:'permanente',nombre:'Permanente'},{valor:'equipada',nombre:'Mientras esté equipada'},{valor:'turnos',nombre:'Por turnos'}];
const etiquetaValor=(i:Inmunidad)=>i.tipo==='dano'?DANOS.find(d=>d.valor===i.valor)?.nombre||i.valor:i.tipo==='estado'?CATALOGO_ESTADOS.find(d=>d.id===i.valor)?.nombre.split(':')[0]||i.valor:CATEGORIAS.find(c=>c.valor===i.valor)?.nombre||i.valor;

/** `porTurnos=false` en rasgos pasivos: la inmunidad por turnos se crea con un estado (primitiva «Inmunidad temporal»). */
export default function EditorDefensas({valor,onChange,objeto=false,porTurnos=true,sinDuracion=false}:{valor:Inmunidad[];onChange:(v:Inmunidad[])=>void;objeto?:boolean;porTurnos?:boolean;sinDuracion?:boolean}){
 const [elegido,setElegido]=useState<Record<TipoInmunidad,{valor:string;modo:ModoInmunidad}>>({dano:{valor:'fuego',modo:'bloquear_dano'},estado:{valor:'quemadura',modo:'bloquear_aplicacion'},categoria:{valor:'mental',modo:'bloquear_aplicacion'}});
 const duracion=valor[0]?.duracion||(objeto?'equipada':'permanente'),turnos=valor[0]?.turnos||2;
 const conDuracion=(i:Inmunidad):Inmunidad=>sinDuracion?i:({...i,duracion,...(duracion==='turnos'?{turnos}:{})});
 function anadir(tipo:TipoInmunidad){
  const e=elegido[tipo];
  const resto=valor.filter(i=>!(i.tipo===tipo&&i.valor===e.valor));
  onChange([...resto,conDuracion({tipo,valor:e.valor,modo:e.modo})]);
 }
 return <section className="yq-defensas" aria-label="Defensas e inmunidades">
  <div className="yq-defensas-columnas">
   {COLUMNAS.map(col=>{const e=elegido[col.tipo];const set=(p:Partial<typeof e>)=>setElegido({...elegido,[col.tipo]:{...e,...p}});
    return <fieldset key={col.tipo} className="yq-defensa-col" data-tipo={col.tipo}>
     <legend><IconoYugen id={col.icono} size={16}/>{col.titulo}</legend>
     {col.tipo==='dano'&&<Fichas etiqueta="Tipo de daño" opciones={DANOS} valor={e.valor} onChange={v=>set({valor:v})} tono="arcano"/>}
     {col.tipo==='estado'&&<label className="yq-campo"><span>Estado</span><select value={e.valor} onChange={v=>set({valor:v.target.value})}>{CATALOGO_ESTADOS.map(d=><option key={d.id} value={d.id}>{d.nombre.split(':')[0]}</option>)}</select></label>}
     {col.tipo==='categoria'&&<Fichas etiqueta="Efectos mentales" opciones={CATEGORIAS} valor={e.valor} onChange={v=>set({valor:v})} tono="arcano"/>}
     <Fichas etiqueta="Modo" opciones={MODOS[col.tipo]} valor={MODOS[col.tipo].some(m=>m.valor===e.modo)?e.modo:MODOS[col.tipo][0].valor} onChange={modo=>set({modo})}/>
     <button type="button" className="yq-defensa-anadir" onClick={()=>anadir(col.tipo)}>Añadir inmunidad</button>
    </fieldset>;})}
  </div>
  {!sinDuracion&&<Fichas etiqueta="Duración" opciones={DURACIONES.filter(d=>(porTurnos||d.valor!=='turnos')&&(objeto||d.valor!=='equipada'))} valor={duracion} onChange={d=>onChange(valor.map(i=>{const x={...i,duracion:d};if(d==='turnos')x.turnos=turnos;else delete x.turnos;return x;}))}/>}
  {!porTurnos&&!sinDuracion&&<p className="yq-nota">¿Inmunidad durante unos turnos? Crea una acción «Estado» con la primitiva «Inmunidad temporal».</p>}
  {!sinDuracion&&duracion==='turnos'&&<label className="yq-campo"><span>Turnos</span><Rueda nombre="turnos_inmunidad" etiqueta="Turnos de inmunidad" valor={turnos} min={1} max={99} onChange={t=>onChange(valor.map(i=>({...i,turnos:t})))} compacta/></label>}
  {valor.length>0&&<ul className="yq-defensa-lista">{valor.map((i,k)=><li key={i.tipo+i.valor} data-modo={i.modo}>
   <span>{i.modo==='resistir'?'Resiste':'Inmune'} · {etiquetaValor(i)}</span>
   <button type="button" aria-label={`Quitar ${etiquetaValor(i)}`} onClick={()=>onChange(valor.filter((_,j)=>j!==k))}><X size={14} aria-hidden="true"/></button>
  </li>)}</ul>}
  <p className="yq-defensa-frase" role="status">{describirInmunidades(valor)}</p>
 </section>;
}
