'use client';
// Límite de errores del Yunque: si el taller falla al pintarse (p. ej. datos antiguos malformados),
// Kuroi lo dice y se puede volver a La creación en vez de dejar la Forja en blanco.
import {catchError,type ErrorInfo} from 'next/error';
import IconoYugen from '../IconoYugen';
import {mensajeError} from '../../lib/errores';

function Respaldo({onVolver}:{onVolver:()=>void},{error,reset}:ErrorInfo){
 const detalle=mensajeError(error,'');
 return <div className="yq-limite" role="alert">
  <IconoYugen id="yugen" size={34}/>
  <p><b>Kuroi aparta el martillo: este yunque se ha agrietado.</b>
   Algo de esta creación no encaja con la forja actual{detalle?` («${detalle}»)`:''}. Tu colección está a salvo.</p>
  <button type="button" onClick={()=>{onVolver();reset();}}>Volver a La creación</button>
 </div>;
}
export default catchError(Respaldo);
