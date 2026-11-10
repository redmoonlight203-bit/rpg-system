CREATE OR REPLACE FUNCTION private.encuentro_validar_ciclo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare pol jsonb:=coalesce(new.datos->'politica','{}');m jsonb;v numeric;mapa jsonb:=new.datos->'mapa';celda record;xy text[];
begin
 if tg_op='UPDATE' then
 if old.datos->>'fase'<>'preparacion' and (new.datos->'mapa' is distinct from old.datos->'mapa' or new.datos->'fuentes_botin' is distinct from old.datos->'fuentes_botin') then raise exception 'El mapa y las fuentes de botín se configuran antes de iniciar.';end if;
 if old.datos->>'fase'<>'preparacion' and pol is distinct from coalesce(old.datos->'politica','{}') then raise exception 'Configura las reglas antes de iniciar.';end if;
 if exists(select 1 from public.resultados_encuentro where combate_id=new.id and aprobado) and new.datos is distinct from old.datos then raise exception 'Las recompensas ya fueron aprobadas; el encuentro es inmutable.';end if;
 end if;
 if new.datos ? 'fuentes_botin' and (tg_op='INSERT' or new.datos->'fuentes_botin' is distinct from old.datos->'fuentes_botin') then
 if jsonb_typeof(new.datos->'fuentes_botin')<>'array' or jsonb_array_length(new.datos->'fuentes_botin')>50 then raise exception 'Fuentes de botín inválidas.';end if;
 for m in select value from jsonb_array_elements(new.datos->'fuentes_botin') loop if coalesce(m->>'id','')='' or coalesce(m->>'nombre','')='' or not exists(select 1 from public.tablas_botin where id=(m->>'tabla_botin_id')::uuid) then raise exception 'Fuente de botín inválida.';end if;end loop;
 end if;
 if mapa is not null and (tg_op='INSERT' or mapa is distinct from old.datos->'mapa') then
 if jsonb_typeof(mapa)<>'object' or (mapa->>'columnas')::int not between 8 and 24 or (mapa->>'filas')::int not between 8 and 24 or jsonb_typeof(mapa->'celdas') is distinct from 'object' then raise exception 'Mapa de combate inválido.';end if;
 for celda in select * from jsonb_each_text(mapa->'celdas') loop
 xy:=string_to_array(celda.key,',');if celda.key!~'^\d+,\d+$' or celda.value not in ('muro','dificil','cobertura','peligro') or xy[1]::int not between 0 and (mapa->>'columnas')::int-1 or xy[2]::int not between 0 and (mapa->>'filas')::int-1 then raise exception 'Casilla de terreno inválida.';end if;
 end loop;
 end if;
 if coalesce(pol->>'modo','oficial') not in ('oficial','entrenamiento') or coalesce(pol->>'reparto','replicar') not in ('replicar','repartir','participacion') then raise exception 'Política de encuentro inválida.';end if;
 if coalesce((pol->>'exp_base')::numeric,0) not between 0 and 1000000 or coalesce((pol->>'exp_objetivo')::numeric,0) not between 0 and 1000000 or coalesce((pol->>'dificultad')::numeric,1) not between 0 and 10 or coalesce((pol->>'limite_rondas')::int,0) not between 0 and 1000 then raise exception 'Recompensas o límite de rondas fuera de rango.';end if;
 for m in select value from jsonb_array_elements(new.datos->'miembros') loop
 if coalesce(m->>'situacion','activo') not in ('activo','inconsciente','muerto','retirado','rendido','capturado') then raise exception 'Situación de combatiente inválida.';end if;
 if (m->>'situacion'='muerto' or coalesce((m->>'neutral')::boolean,false)) and auth.uid() is not null and not private.tienda_es_gm() then raise exception 'Solo el GM puede decidir muertes o neutralidad.';end if;
 end loop;return new;
end;$function$;

CREATE OR REPLACE FUNCTION private.arena_actualizar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin if tg_op='UPDATE' and new.datos->>'fase' is not distinct from old.datos->>'fase' then return new;end if;update public.salas_arena set estado=new.datos->>'fase' where combate_id=new.id and estado is distinct from new.datos->>'fase';return new;end;$function$;

