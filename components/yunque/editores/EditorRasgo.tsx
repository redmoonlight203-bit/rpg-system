'use client';
// Editor de rasgos combinables (plan maestro, Apéndice C · pasos 4 y 7): recursos del catálogo y potenciadores con
// etiquetas, coste y componentes. Vista previa de fórmula: «Bola de fuego 2d6 fuego + 2d6 electricidad por 2 CB».
import {Trash2} from 'lucide-react';
import IconoYugen from '../../IconoYugen';
import {Fichas,Rueda,Texto,Interruptor,type Opcion} from '../Controles';
import {ETIQUETAS,NOMBRE_ETIQUETA,validarRasgo,potenciar,describirPotenciado,type Rasgo,type Potenciador} from '../../../lib/rasgos';
import {EVENTOS_RECURSO,recursoVacio,type DefinicionRecurso,type EventoRecurso} from '../../../lib/recursos';
import type {Efecto,Elemento} from '../../../lib/creacion';
import './defensas.css';

const ORIGENES:Opcion<Rasgo['origen']>[]=[{valor:'linaje',nombre:'Linaje',icono:'linaje'},{valor:'clan',nombre:'Clan',icono:'corona'},{valor:'adquirido',nombre:'Adquirido',icono:'libro'}];
const ELEMENTOS:Opcion<Elemento>[]=[{valor:'electricidad',nombre:'Rayo',icono:'rayo'},{valor:'fuego',nombre:'Fuego',icono:'fuego'},{valor:'hielo',nombre:'Hielo',icono:'hielo'},{valor:'agua',nombre:'Agua',icono:'agua'},{valor:'luz_sagrada',nombre:'Luz',icono:'corona'},{valor:'ninguno',nombre:'Físico',icono:'espada'}];
const idDe=(t:string)=>t.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/^(\d)/,'r_$1').slice(0,40)||'rasgo';
/** Técnica de muestra para la vista previa del potenciador. */
const MUESTRA:Efecto={id:'muestra',nombre:'Bola de fuego',efecto:'dano',cantidad:2,caras:6,modificador:0,tipo_dano:'fuego',elemento:'fuego',estado:'',duracion:0,coste_ph:2,naturaleza:'magica'};
export const rasgoVacio=():Rasgo=>{const r=recursoVacio('carga');return {id:'rasgo_nuevo',nombre:'Nuevo rasgo',origen:'linaje',recursos:[r],potenciadores:[{id:'potenciador',nombre:'Potenciador',acepta:['ataque'],coste:{recurso:{id:r.id,min:1,max:3}},componentes_anadidos:[{elemento:'electricidad',cantidad:1,caras:6,por_unidad:true}],limite_por_uso:1}]};};

export default function EditorRasgo({valor,onChange}:{valor:Rasgo;onChange:(r:Rasgo)=>void}){
 const r=valor,error=validarRasgo(r);
 const set=(p:Partial<Rasgo>)=>onChange({...r,...p});
 const setRecurso=(i:number,p:Partial<DefinicionRecurso>)=>{
  const antes=r.recursos[i],nuevo={...antes,...p} as DefinicionRecurso;
  // Al renombrar un recurso, sus potenciadores lo siguen por id.
  set({recursos:r.recursos.map((x,j)=>j===i?nuevo:x),potenciadores:nuevo.id===antes.id?r.potenciadores:r.potenciadores.map(q=>q.coste.recurso?.id===antes.id?{...q,coste:{...q.coste,recurso:{...q.coste.recurso,id:nuevo.id}}}:q)});
 };
 const setPot=(i:number,p:Partial<Potenciador>)=>set({potenciadores:r.potenciadores.map((x,j)=>j===i?{...x,...p}:x)});
 let muestra='';
 try{if(!error&&r.potenciadores[0]){const k=r.potenciadores[0].coste.recurso;const x=potenciar({...MUESTRA,etiquetas:[...r.potenciadores[0].acepta]},[r],[{rasgo:r.id,potenciador:r.potenciadores[0].id,unidades:k?Math.min(k.max,Math.max(k.min,2)):undefined}]);muestra=describirPotenciado(MUESTRA.nombre,x.efecto,x.coste);}}catch(e){muestra=e instanceof Error?e.message:'';}
 return <section className="yq-rasgo-editor" aria-label="Rasgo combinable">
  <Texto etiqueta="Nombre del rasgo" valor={r.nombre} onChange={nombre=>set({nombre,id:idDe(nombre)})} placeholder="Bioelectricidad, Sangre de dragón…"/>
  <Fichas etiqueta="Origen" opciones={ORIGENES} valor={r.origen} onChange={origen=>set({origen})}/>
  <h4 className="yq-ficha-titulo">Recursos</h4>
  {r.recursos.map((d,i)=><fieldset key={i} className="yq-recurso" style={{['--recurso' as string]:d.color||'var(--color-gold)'}}>
   <header><span className="yq-recurso-gema" aria-hidden="true"/>{d.nombre||'Recurso'}<button type="button" aria-label={`Quitar ${d.nombre}`} onClick={()=>set({recursos:r.recursos.filter((_,j)=>j!==i)})}><Trash2 size={14} aria-hidden="true"/></button></header>
   <Texto etiqueta="Nombre del recurso" valor={d.nombre} onChange={nombre=>setRecurso(i,{nombre,id:idDe(nombre)})} max={60}/>
   <div className="yq-fila">
    <label>Tope<Rueda nombre="tope" etiqueta="Tope del recurso" valor={d.tope.tipo==='fijo'?d.tope.valor:1} min={1} max={1000} onChange={valor=>setRecurso(i,{tope:{tipo:'fijo',valor}})} compacta/></label>
    <label>Inicial<Rueda nombre="inicial" etiqueta="Valor inicial" valor={d.inicial} min={0} max={1000} onChange={inicial=>setRecurso(i,{inicial})} compacta/></label>
    <label>Color<input type="color" value={d.color||'#d6a84a'} onChange={e=>setRecurso(i,{color:e.target.value})}/></label>
   </div>
   {d.generacion.map((g,k)=><div key={k} className="yq-fila">
    <label>Se genera<select value={g.evento} onChange={e=>setRecurso(i,{generacion:d.generacion.map((x,j)=>j===k?{...x,evento:e.target.value as EventoRecurso,etiqueta:e.target.value==='usar_etiqueta'?x.etiqueta||'ataque':undefined}:x)})}>{(Object.keys(EVENTOS_RECURSO) as EventoRecurso[]).map(ev=><option key={ev} value={ev}>{EVENTOS_RECURSO[ev]}</option>)}</select></label>
    {g.evento==='usar_etiqueta'&&<label>Etiqueta<select value={g.etiqueta} onChange={e=>setRecurso(i,{generacion:d.generacion.map((x,j)=>j===k?{...x,etiqueta:e.target.value}:x)})}>{ETIQUETAS.map(t=><option key={t} value={t}>{NOMBRE_ETIQUETA[t]}</option>)}</select></label>}
    <label>Cantidad<Rueda nombre="cantidad_gen" etiqueta="Cantidad generada" valor={g.cantidad} min={-100} max={100} onChange={cantidad=>setRecurso(i,{generacion:d.generacion.map((x,j)=>j===k?{...x,cantidad:cantidad||1}:x)})} compacta/></label>
   </div>)}
   {d.generacion.length<8&&<button type="button" className="yq-boton-suave" onClick={()=>setRecurso(i,{generacion:[...d.generacion,{evento:'recibir_dano',cantidad:1}]})}>Otra forma de generarlo</button>}
   <Fichas etiqueta="Al terminar el combate" opciones={[{valor:'inicial',nombre:'Vuelve al inicial'},{valor:'vaciar',nombre:'Se vacía'},{valor:'conservar',nombre:'Se conserva'}]} valor={d.recuperacion||'inicial'} onChange={recuperacion=>setRecurso(i,{recuperacion})}/>
   <Fichas etiqueta="Quién lo ve" opciones={[{valor:'todos',nombre:'Todos'},{valor:'propio',nombre:'Su jugador'},{valor:'gm',nombre:'Solo el GM'}]} valor={d.visible||'todos'} onChange={visible=>setRecurso(i,{visible})}/>
  </fieldset>)}
  {r.recursos.length<4&&<button type="button" className="yq-boton-suave" onClick={()=>set({recursos:[...r.recursos,recursoVacio('recurso_'+(r.recursos.length+1))]})}>Añadir recurso</button>}
  <h4 className="yq-ficha-titulo">Potenciadores</h4>
  {r.potenciadores.map((p,i)=><fieldset key={i} className="yq-potenciador">
   <header><IconoYugen id="rayo" size={16}/>{p.nombre||'Potenciador'}<button type="button" aria-label={`Quitar ${p.nombre}`} onClick={()=>set({potenciadores:r.potenciadores.filter((_,j)=>j!==i)})}><Trash2 size={14} aria-hidden="true"/></button></header>
   <Texto etiqueta="Nombre del potenciador" valor={p.nombre} onChange={nombre=>setPot(i,{nombre,id:idDe(nombre)})} max={80}/>
   <fieldset className="yq-fichas"><legend>Acepta técnicas con</legend><div>{ETIQUETAS.map(t=>{const on=p.acepta.includes(t);return <button key={t} type="button" aria-pressed={on} onClick={()=>setPot(i,{acepta:on?p.acepta.filter(x=>x!==t):[...p.acepta,t]})}><span>{NOMBRE_ETIQUETA[t]}</span></button>;})}</div></fieldset>
   <div className="yq-fila">
    <label>Recurso<select value={p.coste.recurso?.id||''} onChange={e=>setPot(i,{coste:{...p.coste,recurso:e.target.value?{id:e.target.value,min:p.coste.recurso?.min??1,max:p.coste.recurso?.max??3}:undefined}})}><option value="">Sin recurso</option>{r.recursos.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}</select></label>
    {p.coste.recurso&&<><label>Mínimo<Rueda nombre="min" etiqueta="Unidades mínimas" valor={p.coste.recurso.min} min={0} max={100} onChange={min=>setPot(i,{coste:{...p.coste,recurso:{...p.coste.recurso!,min}}})} compacta/></label>
     <label>Máximo<Rueda nombre="max" etiqueta="Unidades máximas" valor={p.coste.recurso.max} min={1} max={100} onChange={max=>setPot(i,{coste:{...p.coste,recurso:{...p.coste.recurso!,max}}})} compacta/></label></>}
    <label>PH<Rueda nombre="ph" etiqueta="PH del potenciador" valor={p.coste.ph||0} min={0} max={999} onChange={ph=>setPot(i,{coste:{...p.coste,ph:ph||undefined}})} compacta/></label>
   </div>
   {p.componentes_anadidos.map((c,k)=><div key={k} className="yq-componente">
    <Fichas etiqueta={`Componente ${k+1}`} opciones={ELEMENTOS} valor={c.elemento} onChange={elemento=>setPot(i,{componentes_anadidos:p.componentes_anadidos.map((x,j)=>j===k?{...x,elemento}:x)})} tono="arcano"/>
    <div className="yq-fila">
     <label>Dados<Rueda nombre="cantidad" etiqueta="Dados del componente" valor={c.cantidad} min={1} max={20} onChange={cantidad=>setPot(i,{componentes_anadidos:p.componentes_anadidos.map((x,j)=>j===k?{...x,cantidad}:x)})} compacta/></label>
     <label>Caras<Rueda nombre="caras" etiqueta="Caras del componente" valor={c.caras} valores={[4,6,8,10,12]} onChange={caras=>setPot(i,{componentes_anadidos:p.componentes_anadidos.map((x,j)=>j===k?{...x,caras}:x)})} compacta/></label>
    </div>
    <Interruptor etiqueta="Por cada unidad de recurso gastada (1 unidad = estos dados)" valor={!!c.por_unidad} onChange={v=>setPot(i,{componentes_anadidos:p.componentes_anadidos.map((x,j)=>j===k?{...x,por_unidad:v||undefined}:x)})}/>
   </div>)}
   {p.componentes_anadidos.length<2&&<button type="button" className="yq-boton-suave" onClick={()=>setPot(i,{componentes_anadidos:[...p.componentes_anadidos,{elemento:'fuego',cantidad:1,caras:4}]})}>Otro componente</button>}
  </fieldset>)}
  {r.potenciadores.length<6&&<button type="button" className="yq-boton-suave" onClick={()=>set({potenciadores:[...r.potenciadores,{id:'potenciador_'+(r.potenciadores.length+1),nombre:'Nuevo potenciador',acepta:['ataque'],coste:{ph:1},componentes_anadidos:[{elemento:'fuego',cantidad:1,caras:6}],limite_por_uso:1}]})}>Añadir potenciador</button>}
  <p className="yq-rasgo-frase" role="status">{error?`⚠ ${error}`:muestra?`Ejemplo: ${muestra}.`:'Añade un potenciador para ver la fórmula.'}</p>
 </section>;
}
