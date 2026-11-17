'use client';
// «Naturaleza adquirida» de un personaje: se suma a su raza de origen. Compartido por el formulario de la Forja
// y el cajón Ficha del taller; las clases se inyectan para que cada sitio conserve su estilo.
import type {VinculoNaturaleza} from '../../lib/yunque-borrador';
import type {NaturalezaCatalogo} from './contexto';

type Clases={seccion:string;titulo:string;ayuda:string;etiqueta:string;campo:string;aviso:string};
const FORJA:Clases={seccion:'rounded-xl border border-orange-900/50 bg-neutral-900/50 p-4 space-y-3',titulo:'font-semibold',ayuda:'text-xs text-neutral-400',etiqueta:'block text-sm',campo:'',aviso:'text-amber-300 text-xs'};

export default function NaturalezaAdquirida({valor,onChange,catalogo,campo,clases=FORJA}:{valor:VinculoNaturaleza;onChange:(v:VinculoNaturaleza)=>void;catalogo:NaturalezaCatalogo[];campo?:string;clases?:Clases}){
 const c=campo??clases.campo;
 const poner=(p:Partial<VinculoNaturaleza>)=>onChange({...valor,...p});
 return <section className={clases.seccion}><h3 className={clases.titulo}>Naturaleza adquirida</h3><p className={clases.ayuda}>Se añade a la raza de origen, sin reemplazarla. Se guarda con esta plantilla del Yunque.</p>
  <label className={clases.etiqueta}>Naturaleza<select className={c} value={valor.naturaleza_id} onChange={e=>poner({naturaleza_id:e.target.value})}><option value="">Ninguna</option>{catalogo.map(n=><option key={n.id} value={n.id}>{n.nombre}</option>)}</select></label>
  {valor.naturaleza_id&&<><p className={clases.ayuda}>{catalogo.find(n=>n.id===valor.naturaleza_id)?.descripcion}</p>
   <label className={clases.etiqueta}>Cómo la adquirió<input className={c} value={valor.origen} onChange={e=>poner({origen:e.target.value})}/></label>
   <label className={clases.etiqueta}>Bestia o entidad sellada<input className={c} value={valor.bestia} onChange={e=>poner({bestia:e.target.value})} placeholder="Gor’Veth"/></label>
   <label className={clases.etiqueta}>Sello o marca<input className={c} value={valor.sello} onChange={e=>poner({sello:e.target.value})}/></label>
   <label className={clases.etiqueta}>Notas del vínculo<textarea className={c} rows={3} value={valor.notas} onChange={e=>poner({notas:e.target.value})}/></label></>}
  {!catalogo.length&&<p className={clases.aviso}>Primero crea una naturaleza en Estadísticas y reglas.</p>}
 </section>;
}
