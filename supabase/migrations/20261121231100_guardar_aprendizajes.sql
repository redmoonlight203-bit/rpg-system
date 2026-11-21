-- La aprobación oficial del GM es el mismo punto de confirmación que las recompensas.
create or replace function private.encuentro_guardar_aprendizajes() returns trigger
language plpgsql security definer set search_path='' as $$
declare m jsonb; p public.personajes%rowtype; f public.forja_maestra%rowtype;
begin
 if new.datos#>>'{politica,modo}' is distinct from 'oficial' then return new;end if;
 for m in select value from jsonb_array_elements(new.datos->'miembros')
   where not value ? 'invocacion' and jsonb_typeof(value->'hechizos_aprendidos')='array' order by value->>'personaje_id',value->>'id'
 loop
  if coalesce(m->>'personaje_id','')<>'' then
   select * into p from public.personajes where id::text=m->>'personaje_id' for update;
   if not found then continue; end if;
  end if;
  for f in select h.* from public.forja_maestra h where h.tipo_creacion='habilidad'
    and h.estado='aprobado' and not coalesce(h.ligado_al_alma,false)
    and m->'hechizos_aprendidos' ? h.id::text
  loop
   if coalesce(m->>'personaje_id','')<>'' then
    if not exists(select 1 from public.inventario_jugador i where i.personaje_id=p.id and i.forja_id=f.id) then
     insert into public.inventario_jugador(user_id,personaje_id,forja_id,nombre,tipo,descripcion,imagen_url,clase,stats,ligado_al_alma,es_activo,slot_tipo,motivo_entrega,configuracion)
     values(p.user_id,p.id,f.id,f.nombre,'habilidad',f.descripcion,f.imagen_url,f.clase,f.stats,false,true,'ninguno','Aprendizaje en combate',
      jsonb_build_object('tipo_creacion','habilidad','efectos',f.configuracion_dados,'reglas',f.reglas,'reglas_pasivas',f.reglas_pasivas,'requisitos_uso',f.requisitos_uso));
    end if;
   elsif m->>'forja_id'='aa386a13-fec2-59b5-bd77-1fa6424fec28' then
    update public.forja_maestra set habilidades=coalesce(habilidades,'[]')||jsonb_build_array(f.id::text)
    where id='aa386a13-fec2-59b5-bd77-1fa6424fec28' and not coalesce(habilidades,'[]') ? f.id::text;
   end if;
  end loop;
 end loop;
 return new;
end;$$;
revoke all on function private.encuentro_guardar_aprendizajes() from public,anon,authenticated;
create trigger guardar_aprendizaje after update of aprobado on public.resultados_encuentro
 for each row when (new.aprobado and not old.aprobado) execute function private.encuentro_guardar_aprendizajes();
