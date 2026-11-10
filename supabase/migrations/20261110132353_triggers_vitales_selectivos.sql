CREATE OR REPLACE FUNCTION private.combate_persistir_vitales()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare m jsonb;p public.personajes%rowtype;v numeric;anterior jsonb;antes jsonb;despues jsonb;
begin
 if new.datos->'politica'->>'modo'='entrenamiento' then return new;end if;
 if tg_op='UPDATE' then
  if old.datos->>'fase'='finalizado' then
   if new.datos->>'fase'<>'finalizado' then raise exception 'Un encuentro terminado no se puede reabrir. Crea uno nuevo.';end if;
   return new;
  end if;
 end if;
 -- No bloquear fichas cuando solo cambian posición, turno o el registro visual.
 if tg_op='UPDATE' and (new.datos->'fase',new.datos->'politica') is not distinct from (old.datos->'fase',old.datos->'politica') then
  select coalesce(jsonb_agg(jsonb_build_array(m->'id',m->'personaje_id',m->'vida',m->'ph',m->'fatiga',m->'stats',m->'transformacion',m->'situacion') order by n),'[]') into antes from jsonb_array_elements(old.datos->'miembros') with ordinality a(m,n);
  select coalesce(jsonb_agg(jsonb_build_array(m->'id',m->'personaje_id',m->'vida',m->'ph',m->'fatiga',m->'stats',m->'transformacion',m->'situacion') order by n),'[]') into despues from jsonb_array_elements(new.datos->'miembros') with ordinality a(m,n);
  if antes is not distinct from despues then return new;end if;
 end if;
 -- Lock in a deterministic order; a character cannot belong to two active encounters.
 for p in select x.* from public.personajes x where exists(select 1 from jsonb_array_elements(new.datos->'miembros') z where case when z->>'personaje_id' ~ '^[0-9]{1,18}$' then (z->>'personaje_id')::bigint end=x.id) order by x.id for update loop
  select z into m from jsonb_array_elements(new.datos->'miembros') z where z->>'personaje_id'=p.id::text limit 1;
  if (select count(*) from jsonb_array_elements(new.datos->'miembros') z where z->>'personaje_id'=p.id::text)>1 then raise exception 'Un personaje no puede aparecer dos veces en el encuentro.';end if;
  if new.datos->>'fase' in ('preparacion','en_curso') and exists(select 1 from public.combates_yugen b cross join lateral jsonb_array_elements(b.datos->'miembros') z where b.id<>new.id and b.datos->>'fase' in ('preparacion','en_curso') and z->>'personaje_id'=p.id::text) then raise exception '% ya está en otro encuentro activo.',p.nombre;end if;
  anterior:=null;
  if tg_op='UPDATE' then select z into anterior from jsonb_array_elements(old.datos->'miembros') z where z->>'personaje_id'=p.id::text limit 1;end if;
  if p.estado_vida='muerto' then
   if anterior is null or new.datos->>'fase'='preparacion' or (m->>'vida')::numeric>0 then raise exception '% permanece en el cementerio.',p.nombre;end if;
   continue;
  end if;
  if p.estado_vida<>'vivo' or p.estado_aprobacion<>'aprobado' then raise exception '% no está disponible.',p.nombre;end if;
  if new.datos->>'fase' not in ('en_curso','finalizado') then continue;end if;
  if jsonb_typeof(m->'vida') is distinct from 'number' or jsonb_typeof(m->'ph') is distinct from 'number' or jsonb_typeof(m->'fatiga') is distinct from 'number' then raise exception 'Recursos inválidos para %.',p.nombre;end if;

 if tg_op='UPDATE' and anterior is not null and
  (m->'vida',m->'ph',m->'fatiga',m->'stats',m->'transformacion',m->'situacion') is not distinct from
  (anterior->'vida',anterior->'ph',anterior->'fatiga',anterior->'stats',anterior->'transformacion',anterior->'situacion') then continue;end if;
  -- Store current resources separately; base statistics never become remaining HP.
  v:=greatest(0,case when m->'transformacion'->>'tipo'='forma' then (m->'transformacion'->>'vida_original')::numeric else (m->>'vida')::numeric end);
  update public.personajes set estado_vida=case when m->>'situacion'='muerto' then 'muerto' else estado_vida end,vida_actual=v,vida_maxima_actual=greatest(1,coalesce((m->'transformacion'->'stats_originales'->>'vida')::numeric,(m->'transformacion'->'stats_originales'->>'hp')::numeric,(m->'stats'->>'vida')::numeric,(m->'stats'->>'hp')::numeric,1)),ph_actual=(m->>'ph')::numeric,fatiga_actual=(m->>'fatiga')::numeric where id=p.id;
  if v=0 then update public.cementerio_personajes set combate_id=new.id,snapshot=snapshot||jsonb_build_object('combatiente',m,'encuentro',jsonb_build_object('nombre',new.nombre,'ronda',new.datos->'ronda')) where personaje_id=p.id and combate_id is null and resucitado_at is null;end if;
 end loop;
 return new;
end;$function$;

