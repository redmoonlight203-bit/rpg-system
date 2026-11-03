import type {AyudaClara} from '../lib/descripciones';
export default function ContenidoAyuda({ayuda}:{ayuda:AyudaClara}){
 return <><span className="help-summary">{ayuda.resumen}</span>{!!ayuda.detalles.length&&<span className="help-details">{[...new Set(ayuda.detalles)].map((linea,i)=><span key={i}>{linea}</span>)}</span>}</>;
}
