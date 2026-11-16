// Paso 3.6 del plan: ningún error técnico crudo llega a la pantalla.
// Los mensajes en español escritos por el servidor (raise exception) o por la aplicación se conservan:
// son los que explican qué hacer. Los técnicos se traducen o se sustituyen por el texto de la pantalla.
const GENERICO='Algo salió mal. Vuelve a intentarlo.';

const REGLAS:Array<[RegExp,string]>=[
 [/failed to fetch|networkerror|load failed|fetch failed|network request failed|err_network|err_internet_disconnected/i,'No hay conexión con el servidor. Comprueba tu conexión y vuelve a intentarlo.'],
 [/jwt|refresh token|auth session missing|session.*(expired|not found)|not authenticated/i,'Tu sesión caducó. Vuelve a iniciar sesión.'],
 [/lock timeout|could not obtain lock|deadlock detected/i,'Otra acción se está guardando. Espera un momento y vuelve a intentarlo.'],
 [/statement timeout|timed? ?out|gateway timeout/i,'La operación tardó demasiado. Vuelve a intentarlo.'],
 [/row-level security|permission denied|insufficient privilege/i,'No tienes permiso para hacer esto.'],
 [/duplicate key|already exists/i,'Ese registro ya existe.'],
 [/foreign key/i,'No se puede completar: hay datos que dependen de este registro.'],
 [/multiple \(or no\) rows|no rows returned|contains 0 rows/i,'No se encontró lo que buscabas. Recarga la página.'],
];
const CODIGOS:Record<string,string>={
 '55P03':REGLAS[2][1],'40P01':REGLAS[2][1],'57014':REGLAS[3][1],
 '23505':REGLAS[5][1],'23503':REGLAS[6][1],'PGRST116':REGLAS[7][1],'PGRST301':REGLAS[1][1],
};
// Un mensaje se considera técnico si tiene forma de texto en inglés o de traza.
// Todo lo demás (los mensajes en español del servidor y de la aplicación) se muestra tal cual.
const TECNICO=/\b(the|of|for|is|was|at|in|to|and|with|not|has|went|wrong|returned|cannot|could|unable|invalid|failed|missing|unknown|undefined|null|violates|column|relation|function|syntax|unexpected|token|status|type|internal|server|bad|request|reading)\b|\w+\.\w+\(|^\w*Error:/i;

function texto(e:unknown):{mensaje:string;codigo:string}{
 if(typeof e==='string')return {mensaje:e,codigo:''};
 if(e&&typeof e==='object'){
  const o=e as {message?:unknown;code?:unknown;error_description?:unknown};
  const mensaje=typeof o.message==='string'?o.message:typeof o.error_description==='string'?o.error_description:'';
  return {mensaje,codigo:typeof o.code==='string'?o.code:''};
 }
 return {mensaje:'',codigo:''};
}

export function mensajeError(e:unknown,respaldo=GENERICO):string{
 const {mensaje,codigo}=texto(e),m=mensaje.trim();
 if(!m)return respaldo;
 for(const [patron,traduccion] of REGLAS)if(patron.test(m))return traduccion;
 if(!TECNICO.test(m))return m;
 return CODIGOS[codigo]||respaldo;
}
