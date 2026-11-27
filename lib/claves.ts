/**
 * Claves internas (identificadores) de Yugen. Una clave se crea UNA vez, al nacer el dato, y no cambia aunque se
 * renombre: el nombre es solo la etiqueta visible. Así un renombre nunca rompe lo que apunta a esa clave
 * (reglas, inmunidades, potenciadores, saldos guardados).
 * Módulo puro (sin React ni Supabase) para poder probarlo en Node.
 */
export const CLAVE_VALIDA=/^[a-z_][a-z0-9_]{0,63}$/;

/** «Sopor tóxico» → «sopor_toxico». Siempre devuelve una clave válida (o `respaldo`). */
export function claveDesdeNombre(nombre:string,respaldo='clave'):string{
 const limpio=String(nombre||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
  .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/^(\d)/,'_$1').slice(0,56);
 return limpio||respaldo;
}

/** Clave derivada del nombre que no choca con las ocupadas: furia → furia_2 → furia_3… */
export function claveLibre(nombre:string,ocupadas:Iterable<string>,respaldo='clave'):string{
 const usadas=new Set(ocupadas),base=claveDesdeNombre(nombre,respaldo);
 if(!usadas.has(base))return base;
 for(let i=2;;i++){const c=`${base}_${i}`;if(!usadas.has(c))return c;}
}

/** Clave única para un dato nuevo cuyo nombre aún no se conoce (estado propio, recurso, potenciador…). */
export function claveNueva(prefijo:string):string{
 const sufijo=Math.random().toString(36).slice(2,8).padEnd(6,'0');
 return `${claveDesdeNombre(prefijo,'dato').slice(0,30)}_${sufijo}`;
}
