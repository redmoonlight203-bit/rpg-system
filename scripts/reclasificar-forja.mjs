// Usar una sesión GM. Sin --aplicar solo muestra el recuento de filas evaluables.
import { createClient } from '@supabase/supabase-js';
import { cargarDependencia } from '../tests/helpers/cargar-ts.mjs';
const { evaluarBalance, REPETICIONES_CLASE } = cargarDependencia('balance-laboratorio');
const { vacio } = cargarDependencia('yunque-borrador');
const { efectosDe, tipoDe } = cargarDependencia('creacion');
const { atributosEfectivos, perfilRacial } = cargarDependencia('estadisticas');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  global: {headers: {Authorization: 'Bearer '+process.env.YUGEN_GM_TOKEN}},
});
async function leer(consulta) {
  const {data,error} = await consulta;
  if (error) throw Error(error.message);
  return data;
}
if (!await leer(db.rpc('forja_puede_clasificar'))) throw Error('Se requiere una sesión de GM.');
async function todas(tabla) {
  const filas = [];
  for (;;) {
    let consulta = db.from(tabla).select('*').order('id').limit(100);
    if (filas.length) consulta = consulta.gt('id',filas.at(-1).id);
    const pagina = await leer(consulta);
    if (!pagina.length) return filas;
    filas.push(...pagina);
  }
}
const [catalogo,categorias,atributos] = await Promise.all(['forja_maestra','categorias_forja','config_estadisticas'].map(todas));
let evaluadas=0, guardadas=0, pendientes=0;
for (const f of catalogo.filter(c=>c.balance_ipe==null)) {
  try {
    const stats={...f.stats};
    for (const a of atributosEfectivos(categorias,atributos,f.tipo)) stats[a.clave] ??= a.valor_defecto??0;
    if (f.es_grupo) for (const [k,r] of Object.entries(f.stats_rango||{})) stats[k]=(r.min+r.max)/2;
    const b={...vacio(),id:f.id,clasificacion:f.tipo,nombre:f.nombre,tipo:tipoDe(f,categorias),slot:f.slot_tipo,stats,
      efectos:efectosDe(f),reglas:f.reglas||[],reglas_pasivas:f.reglas_pasivas||[],
      habilidades:f.habilidades||[],pasivas:f.pasivas||[],equipamiento:f.equipamiento||{},consumible:!!f.consumible};
    const ids=new Set([...b.habilidades,...b.pasivas,...Object.values(b.equipamiento)]);
    const vinculos=catalogo.filter(c=>ids.has(c.id));
    const {ipe}=evaluarBalance(b,{...perfilRacial(categorias,f.tipo),stats,creaciones:vinculos},{repeticiones:REPETICIONES_CLASE});
    if (ipe===null) throw Error('Evaluación indeterminada');
    evaluadas++;
    if (process.argv.includes('--aplicar')) {
      if (!await leer(db.rpc('forja_reconciliar_ipe',{p_original:f,p_ipe:ipe,p_vinculos:vinculos}))) throw Error('Cambió durante la evaluación');
      guardadas++;
    }
  } catch (error) { pendientes++; console.error(f.id,error.message); }
}
console.log({evaluadas,guardadas,pendientes});
if (pendientes) process.exitCode=1;
