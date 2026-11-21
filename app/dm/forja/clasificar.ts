'use server';

import { createClient } from '@supabase/supabase-js';
import { evaluarBalance, REPETICIONES_CLASE } from '../../../lib/balance-laboratorio';
import { perfilRacial } from '../../../lib/estadisticas';
import { vacio, type Borrador } from '../../../lib/yunque-borrador';

type Perfil = Pick<Borrador, 'tipo'|'clasificacion'|'stats'|'efectos'|'reglas'|'reglas_pasivas'|'habilidades'|'pasivas'|'equipamiento'|'slot'|'consumible'|'id'|'nombre'>;

export async function clasificarForja(token: string, perfil: Perfil) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: {headers: {Authorization: 'Bearer ' + token}},
    auth: {persistSession: false, autoRefreshToken: false},
  });
  const permiso = await db.rpc('forja_puede_clasificar');
  if (permiso.error || permiso.data !== true) throw Error('Se necesita una sesión de GM y la migración de balance.');
  const ids = [...new Set([...perfil.habilidades, ...perfil.pasivas, ...Object.values(perfil.equipamiento)])];
  const catalogo = ids.length ? await db.from('forja_maestra').select('*').in('id', ids).eq('estado','aprobado') : {data: [], error: null};
  if (catalogo.error || !catalogo.data || catalogo.data.length !== ids.length) throw Error('Revisa los vínculos del borrador.');
  const categorias = perfil.tipo === 'personaje' ? await db.from('categorias_forja').select('id,clave,nombre,parent_id,pasiva_racial') : {data:[],error:null};
  if (categorias.error) throw Error(categorias.error.message);
  const racial=perfilRacial(categorias.data||[],perfil.clasificacion);
  const evaluacion = evaluarBalance({...vacio(), ...perfil}, {...racial, stats: perfil.stats, creaciones: catalogo.data}, {repeticiones: REPETICIONES_CLASE});
  if (!evaluacion.clase || evaluacion.ipe === null) throw Error('No se pudo medir la clase.');
  return {clase: evaluacion.clase, balance_ipe: evaluacion.ipe};
}
