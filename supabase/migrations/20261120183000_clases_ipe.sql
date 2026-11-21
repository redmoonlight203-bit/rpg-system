alter table public.forja_maestra add column balance_ipe double precision
 check (balance_ipe >= 0 and balance_ipe < 'Infinity'::double precision);

create function public.forja_puede_clasificar() returns boolean language sql stable security invoker
 set search_path='' as $$ select private.tienda_es_gm() $$;
revoke all on function public.forja_puede_clasificar() from public,anon;
grant execute on function public.forja_puede_clasificar() to authenticated;

create or replace function public.forja_validar_carga_y_clase() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare refid text;item public.forja_maestra%rowtype;base jsonb;
begin
 perform public.forja_validar_requisitos(new.requisitos_uso);
 base:=new.stats;
 if new.es_grupo then select coalesce(jsonb_object_agg(key,value->'min'),'{}') into base from jsonb_each(new.stats_rango);end if;
 if new.tipo_creacion='personaje' then
  for refid in select jsonb_array_elements_text(coalesce(new.habilidades,'[]')||coalesce(new.pasivas,'[]')) union all select value from jsonb_each_text(new.equipamiento) loop
   select * into item from public.forja_maestra where forja_maestra.id::text=refid;
   if found and not public.forja_cumple_requisitos(item.requisitos_uso,new.tipo,base) then raise exception '%: el personaje no cumple los requisitos de raza o atributos base.',item.nombre;end if;
  end loop;
 end if;
 if new.balance_ipe is not null then
  new.clase := (array['F','D','C','B','A','S','Z','KUROI'])[width_bucket(new.balance_ipe,array[0,.5,1,2,4,8,16,32]::double precision[])];
 end if;
 return new;
end;$$;

drop trigger aa_forja_carga_y_clase on public.forja_maestra;
create trigger aa_forja_carga_y_clase before insert or update of balance_ipe,clase,stats,stats_rango,es_grupo,configuracion_dados,reglas,reglas_pasivas,requisitos_uso,habilidades,pasivas,equipamiento,tipo
on public.forja_maestra for each row execute function public.forja_validar_carga_y_clase();

drop function public.forja_puntuacion_calculada(jsonb,jsonb,jsonb,jsonb);
drop function public.forja_clase_calculada(jsonb,jsonb,jsonb,jsonb);

-- Reconciliación optimista del catálogo anterior. Reintentar las filas editadas durante la prueba.
create function public.forja_reconciliar_ipe(p_original jsonb,p_ipe double precision,p_vinculos jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare actual public.forja_maestra%rowtype; vinculo jsonb;
begin
 if not coalesce(private.tienda_es_gm(), false) then raise exception 'Solo el GM puede reclasificar.' using errcode='42501'; end if;
 for vinculo in select value from jsonb_array_elements(p_vinculos) order by value->>'id' loop
  select * into actual from public.forja_maestra where id=(vinculo->>'id')::uuid for share;
  if not found or (to_jsonb(actual)-'balance_ipe'-'clase') is distinct from (vinculo-'balance_ipe'-'clase') then return false; end if;
 end loop;
 update public.forja_maestra f set balance_ipe=p_ipe
 where f.id=(p_original->>'id')::uuid and to_jsonb(f)=p_original and f.balance_ipe is null;
 return found;
end;$$;
revoke all on function public.forja_reconciliar_ipe(jsonb,double precision,jsonb) from public,anon;
grant execute on function public.forja_reconciliar_ipe(jsonb,double precision,jsonb) to authenticated;
