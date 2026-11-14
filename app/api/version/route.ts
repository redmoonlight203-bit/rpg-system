export const dynamic='force-dynamic';
/** Solo metadatos de entrega; nunca credenciales ni configuración de la campaña. */
export function GET(){
 return Response.json({commit:process.env.VERCEL_GIT_COMMIT_SHA||null,rama:process.env.VERCEL_GIT_COMMIT_REF||null,entorno:process.env.VERCEL_ENV||'local'}, {headers:{'Cache-Control':'no-store'}});
}
