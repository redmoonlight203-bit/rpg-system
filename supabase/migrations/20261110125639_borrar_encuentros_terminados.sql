-- Definición completa observada en producción; conserva recompensas oficiales y logros auditados.
CREATE OR REPLACE FUNCTION public.combate_eliminar(p_id uuid, p_version integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare fila public.combates_yugen%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then raise exception 'Solo Kuroi puede borrar encuentros.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into fila from public.combates_yugen where id=p_id for update;
 if not found then raise exception 'El encuentro ya no existe.';end if;
 if fila.creador_id<>auth.uid() then raise exception 'Este encuentro pertenece a otro director.' using errcode='42501';end if;
 if p_version is null or fila.version<>p_version then raise exception 'El encuentro cambió en otra sesión. Recárgalo antes de borrarlo.';end if;

 if exists(select 1 from public.resultados_encuentro r where r.combate_id=p_id and r.aprobado and coalesce(r.datos->'politica'->>'modo','oficial')<>'entrenamiento') then
  raise exception 'Este encuentro ya repartió recompensas oficiales y se conserva como registro.';
 end if;
 if exists(select 1 from public.logros_auditoria a join public.eventos_dominio e on e.id=a.evento_id where e.combate_id=p_id) then
  raise exception 'Este encuentro generó logros auditados y se conserva como registro.';
 end if;
 delete from public.registro_experiencia where combate_id=p_id;
 delete from public.saqueos_encuentro where combate_id=p_id;
 delete from public.eventos_dominio where combate_id=p_id;
 delete from public.resultados_encuentro where combate_id=p_id;
 delete from private.combate_acciones where combate_id=p_id;
 delete from public.combates_yugen where id=p_id;
end;$function$;

revoke all on function public.combate_eliminar(uuid,integer) from public, anon;
grant execute on function public.combate_eliminar(uuid,integer) to authenticated;
