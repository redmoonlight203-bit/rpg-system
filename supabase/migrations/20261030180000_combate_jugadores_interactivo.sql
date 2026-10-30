begin;
create or replace function public.combate_preparar_jugador(p_personaje bigint) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.personajes%rowtype; i public.inventario_jugador%rowtype; s jsonb; base jsonb; config jsonb; equipo jsonb:='{}'; bonos jsonb:='{}'; habilidades jsonb:='[]'; pasivas jsonb:='[]'; a record; t text; efectos jsonb; pieza jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.perfiles where id=auth.uid() and rol='KUROI') then raise exception 'Solo Kuroi puede preparar jugadores.' using errcode='42501'; end if;
 select * into p from public.personajes where id=p_personaje and estado_aprobacion='aprobado' and estado_vida='vivo';
 if not found then raise exception 'Selecciona un personaje aprobado y vivo.';end if;
 s:=coalesce(p.atributos,'{}'); if not s ? 'vida' and s ? 'hp' then s:=s||jsonb_build_object('vida',s->'hp');end if;base:=s;
 for i in select * from public.inventario_jugador where personaje_id=p.id and user_id=p.user_id order by created_at,id loop
  t:=coalesce(nullif(i.configuracion->>'tipo_creacion',''),public.forja_tipo_inferido(i.tipo));
  efectos:=coalesce(i.configuracion->'efectos','[]');
  if efectos='[]'::jsonb and not coalesce(i.configuracion,'{}') ? 'efectos' and coalesce((i.stats->>'dados_dano')::int,0)>0 and coalesce((i.stats->>'caras_dano')::int,0)>=2 then
   efectos:=jsonb_build_array(jsonb_build_object('id',i.id::text,'nombre','Ataque','efecto','dano','cantidad',(i.stats->>'dados_dano')::int,'caras',(i.stats->>'caras_dano')::int,'modificador',coalesce((i.stats->>'dano')::numeric,0),'duracion',0,'coste_ph',0,'estado','','tipo_dano','físico'));
  end if;
  pieza:=jsonb_build_object('id',i.id,'nombre',i.nombre,'stats',coalesce(i.stats,'{}'),'efectos',efectos,'slot_tipo',i.slot_tipo,'reglas_pasivas',coalesce(i.configuracion->'reglas_pasivas','[]'));
  if i.slot_equipado is not null and i.slot_equipado<>'' then
   if equipo ? i.slot_equipado then raise exception 'Hay dos piezas en el mismo espacio. Revisa el equipamiento.';end if;
   equipo:=equipo||jsonb_build_object(i.slot_equipado,pieza);
   for a in select * from jsonb_each(coalesce(i.stats,'{}')) loop
    if jsonb_typeof(a.value)='number' and a.key not in ('peso','durabilidad','dados_dano','caras_dano','dano') then bonos:=bonos||jsonb_build_object(a.key,coalesce((bonos->>a.key)::numeric,0)+(a.value::text)::numeric);end if;
   end loop;
  elsif coalesce(i.es_activo,true) then
   if t='habilidad' then habilidades:=habilidades||jsonb_build_array(pieza);end if;
   if t='pasiva' then pasivas:=pasivas||jsonb_build_array(jsonb_build_object('id',i.id,'nombre',i.nombre,'reglas',coalesce(i.configuracion->'reglas_pasivas','[]')));end if;
  end if;
 end loop;
 for a in select * from jsonb_each(bonos) loop s:=s||jsonb_build_object(a.key,coalesce((s->>a.key)::numeric,0)+(a.value::text)::numeric);end loop;
 config:=jsonb_build_object('tipo_creacion','personaje','stats_base',base,'equipamiento',equipo,'bonos_equipamiento',bonos,'habilidades',habilidades,'pasivas',pasivas,'reglas_pasivas','[]'::jsonb);
 return jsonb_build_object('id',gen_random_uuid(),'forja_id',null,'personaje_id',p.id::text,'nombre',p.nombre,'stats',s,'configuracion',config,'requiere_configuracion',not base ? 'vida');
end;$$;
create or replace function public.combate_estado_jugador(p_personaje bigint) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare resultado jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.personajes where id=p_personaje and user_id=auth.uid()) then raise exception 'Este personaje no te pertenece.' using errcode='42501';end if;
 select jsonb_build_object('nombre',m->>'nombre','vida',m->'vida','max_vida',coalesce(m->'stats'->'vida',m->'stats'->'hp','1'::jsonb),'es_turno',b.datos->>'actual'=m->>'id','fase',b.datos->>'fase','encuentro',b.nombre)
 into resultado from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') m
 where m->>'personaje_id'=p_personaje::text and b.datos->>'fase'='en_curso'
 order by b.updated_at desc limit 1;
 return resultado;
end;$$;
revoke all on function public.combate_preparar_jugador(bigint),public.combate_estado_jugador(bigint) from public,anon;
grant execute on function public.combate_preparar_jugador(bigint),public.combate_estado_jugador(bigint) to authenticated;
commit;
