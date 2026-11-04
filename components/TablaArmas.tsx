"use client";
import {type Efecto, type ArmaResultado, type FuenteCreacion, efectosDe, ELEMENTOS, formula} from '../lib/creacion';
const campo='w-full rounded border border-neutral-700 bg-black p-2 text-sm text-neutral-100';
export function TablaArmas({efecto:e, armas, onChange}:{efecto:Efecto;armas:FuenteCreacion[];onChange:(tabla:Efecto['tabla_armas'])=>void}){
 const tabla=e.tabla_armas;
 function dimension(caras:number){onChange({caras,resultados:Array.from({length:caras},(_,i)=>tabla?.resultados.find(r=>r.cara===i+1)||{cara:i+1,nombre:'',cantidad:e.cantidad||1,caras:e.caras,modificador:e.modificador,tipo_dano:e.tipo_dano,elemento:e.elemento,arma_slot:e.arma_slot||'mano_der'})});}
 function cambiar(cara:number,patch:Partial<ArmaResultado>){if(tabla)onChange({...tabla,resultados:tabla.resultados.map(r=>r.cara===cara?{...r,...patch}:r)});}
 return <section className="space-y-3 rounded-lg border border-orange-900 bg-orange-950/10 p-3">
  <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={!!tabla} onChange={v=>v.target.checked?dimension(20):onChange(undefined)}/> Elegir el arma con un dado</label>
  <p className="text-sm text-neutral-400">Una sola tirada decide qué arma creas. El coste y la duración son los de esta habilidad; los dados de cada arma indican su daño al atacar.</p>
  {tabla&&<>
   <label className="block text-sm">1. Dado de selección<select className={campo} value={tabla.caras} onChange={v=>dimension(Number(v.target.value))}>{[4,6,8,10,12,20,100].map(n=><option value={n} key={n}>D{n} · {n} resultados</option>)}</select></label>
   <p className="text-sm text-orange-200">2. Asigna un arma a cada cara · {tabla.resultados.filter(r=>r.nombre.trim()).length}/{tabla.caras} con nombre. Cada cara tiene la misma probabilidad; repite un arma para que sea más frecuente.</p>
   <p className="text-xs text-neutral-400">Puedes copiar un ataque de un arma aprobada o definirlo aquí. Se guarda una copia de nombre, daño, elemento y mano; los atributos, las pasivas y los otros ataques del objeto no se copian.</p>
   <div className="max-h-[38rem] space-y-2 overflow-y-auto pr-1">
    {tabla.resultados.map(r=><details key={r.cara} className="rounded border border-neutral-800 p-3" open={r.cara===1}>
     <summary className="cursor-pointer text-sm"><strong className="text-orange-300">{r.cara}</strong> → {r.nombre||'Elige o define un arma'} {r.nombre&&`· ${formula(r)} · ${r.arma_slot==='dos_manos'?'dos manos':r.arma_slot==='mano_izq'?'izquierda':'derecha'}`}</summary>
     <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-sm sm:col-span-2">Copiar ataque de un arma existente<select className={campo} value="" onChange={v=>{const [id,ataque]=v.target.value.split(':');const f=armas.find(a=>a.id===id),a=f&&efectosDe(f).find(a=>a.id===ataque);if(f&&a)cambiar(r.cara,{origen_id:f.id,nombre:f.nombre,cantidad:a.cantidad,caras:a.caras,modificador:a.modificador,tipo_dano:a.tipo_dano,elemento:a.elemento,arma_slot:f.slot_tipo==='dos_manos'?'dos_manos':r.arma_slot==='mano_izq'?'mano_izq':'mano_der'});}}><option value="">Seleccionar arma y ataque…</option>{armas.flatMap(f=>efectosDe(f).filter(a=>a.efecto==='dano').map(a=><option key={`${f.id}:${a.id}`} value={`${f.id}:${a.id}`}>{f.nombre} · {a.nombre} ({formula(a)})</option>))}</select></label>
      <label className="text-sm">Nombre del arma<input className={campo} maxLength={120} value={r.nombre} onChange={v=>cambiar(r.cara,{nombre:v.target.value})}/></label>
      <label className="text-sm">Mano que ocupa<select className={campo} value={r.arma_slot} onChange={v=>cambiar(r.cara,{arma_slot:v.target.value as ArmaResultado['arma_slot']})}><option value="mano_der">Derecha</option><option value="mano_izq">Izquierda</option><option value="dos_manos">Dos manos</option></select></label>
      <div className="grid grid-cols-3 gap-2 sm:col-span-2">{([{clave:'cantidad',nombre:'Dados de daño',min:1,max:100},{clave:'caras',nombre:'Caras de daño',min:2,max:1000},{clave:'modificador',nombre:'Daño adicional',min:-1000000,max:1000000}] as const).map(c=><label className="text-xs" key={c.clave}>{c.nombre}<input type="number" className={campo} min={c.min} max={c.max} value={r[c.clave]} onChange={v=>cambiar(r.cara,{[c.clave]:Number(v.target.value)})}/></label>)}</div>
      <label className="text-sm">Tipo de daño<input className={campo} value={r.tipo_dano} onChange={v=>cambiar(r.cara,{tipo_dano:v.target.value})} placeholder="Cortante, perforante…"/></label>
      <label className="text-sm">Elemento<select className={campo} value={r.elemento||'ninguno'} onChange={v=>cambiar(r.cara,{elemento:v.target.value as ArmaResultado['elemento']})}>{ELEMENTOS.map(v=><option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select></label>
      <button type="button" className="text-left text-xs text-orange-300 sm:col-span-2" onClick={()=>{if(tabla)onChange({...tabla,resultados:tabla.resultados.map(x=>x.cara>r.cara?{...r,cara:x.cara}:x)});}}>Copiar esta arma a las caras siguientes</button>
     </div>
    </details>)}
   </div>
  </>}
 </section>;
}
