begin;
set lock_timeout='1500ms';
-- Seguridad, segundo paso (sigue a 20261116160000_tablas_abiertas_sin_anon.sql).
-- Estas 17 tablas tenían «Permitir todo <tabla>»: cualquier jugador con sesión podía cambiar o
-- borrar, por ejemplo, las razas (categorias_forja) o los atributos (config_estadisticas).
-- Comprobado el 21-11 qué escribe en cada una:
--   · Las pantallas solo escriben desde el GM: Estadísticas (categorias_forja, config_estadisticas,
--     pasiva racial, rangos de criatura) y Forja (creaciones_forja: aprobar petición).
--   · Las demás escrituras pasan por funciones SECURITY DEFINER (raza única, personaje_solicitar,
--     forja_crear_copias, forja_eliminar…), que no dependen de estas políticas.
--   · Las funciones SECURITY INVOKER que tocan estas tablas solo leen.
-- Reglas nuevas (una política por operación, sin políticas permisivas duplicadas):
--   · Catálogos del mundo: todos los usuarios con sesión leen; solo Kuroi escribe.
--     tablero_tokens: el jugador solo ve las fichas visibles.
--   · Tablas de cada jugador: el jugador ve lo suyo y Kuroi todo. El jugador puede pedir una
--     creación o abrir una negociación (siempre nacen pendientes) y gestionar su lista de deseos.
--     Lo demás solo Kuroi.

do $$declare t text;p record;
 catalogos text[]:=array['articulos_alma','categorias_forja','codex_entradas','config_estadisticas',
  'linea_tiempo_eras','mapas','mercado_objetos','tablero_tokens','tableros','tiempo_juego','tienda_items'];
 propias text[]:=array['codex_descubrimientos','creaciones_forja','jugador_mapas','jugador_vinculos',
  'lista_deseos','negociaciones_tienda'];
 gm constant text:='(select private.tienda_es_gm())';
 propio constant text:='user_id=(select auth.uid())';
 lectura text;alta text;baja text;
begin
 foreach t in array catalogos||propias loop
  if to_regclass('public.'||t) is null then continue;end if;
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
   execute format('drop policy %I on public.%I',p.policyname,t);
  end loop;

  lectura:=case when t='tablero_tokens' then 'coalesce(visible_jugadores,false) or '||gm
               when t=any(catalogos) then 'true'
               else propio||' or '||gm end;
  alta:=case t when 'creaciones_forja' then gm||' or ('||propio||' and coalesce(estado,''pendiente'')=''pendiente'' and comentarios_kuroi is null)'
               when 'negociaciones_tienda' then gm||' or ('||propio||' and coalesce(estado,''pendiente'')=''pendiente'')'
               when 'lista_deseos' then gm||' or '||propio
               else gm end;
  baja:=case when t='lista_deseos' then gm||' or '||propio else gm end;

  execute format('create policy %I on public.%I for select to authenticated using (%s)',t||'_lectura',t,lectura);
  execute format('create policy %I on public.%I for insert to authenticated with check (%s)',t||'_alta',t,alta);
  execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)',t||'_cambio',t,gm,gm);
  execute format('create policy %I on public.%I for delete to authenticated using (%s)',t||'_baja',t,baja);
 end loop;
end$$;

notify pgrst,'reload schema';
commit;
