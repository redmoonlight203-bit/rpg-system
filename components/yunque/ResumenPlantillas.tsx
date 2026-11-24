'use client';
// Panel descartable: lo que cambió en las plantillas desde que se guardó la creación. Una línea por nodo; pulsarla lo elige.
import {X} from 'lucide-react';
import {lineaCambio,type CambioPlantilla} from '../../lib/yunque-plantillas-vivas';

type Props={cambios:CambioPlantilla[];onElegir:(nodo:string)=>void;onCerrar:()=>void};
export default function ResumenPlantillas({cambios,onElegir,onCerrar}:Props){
 if(!cambios.length)return null;
 return <aside className="yq-resumen-plantillas" role="status" aria-label="Cambios de plantillas">
  <header>
   <h2>La forja ha cambiado</h2>
   <button type="button" className="yq-resumen-cerrar" aria-label="Cerrar resumen" title="Cerrar" onClick={onCerrar}><X size={14}/></button>
  </header>
  <ul>{cambios.map(c=><li key={c.nodo}><button type="button" data-tipo={c.tipo} onClick={()=>onElegir(c.nodo)}>{lineaCambio(c)}</button></li>)}</ul>
 </aside>;
}
