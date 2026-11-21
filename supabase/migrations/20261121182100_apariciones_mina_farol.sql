-- Perfiles iniciales de la Mina. Los combates guardados tienen sus propias copias.
do $$
declare
 daga constant text := '97618e6c-4779-43df-be88-45db4ce6a730';
 maza constant text := 'f263acfd-ba7a-4aa5-8dfe-607fddce280b';
 escudo constant text := '7ed5e6a7-84fc-4c38-a336-236e7be4876f';
 garrote constant text := 'a6adb124-83cf-4295-96bd-e7d56d23e5f0';
 especie record;
 perfil jsonb;
 perfiles jsonb;
 rangos jsonb;
 mano jsonb;
 armado jsonb;
 base_foto text;
begin
 for especie in select * from public.forja_maestra where id in
 ('d1af0000-4aa1-4321-8471-000000000001','d1af0000-4aa1-4321-8471-000000000004')
 and configuracion_monstruo is not null for update loop
  if exists(select 1 from jsonb_array_elements(especie.configuracion_monstruo->'variantes') v where v->>'id'='original') then continue; end if;
  if (select count(*) from public.forja_maestra where id::text in (daga,maza,escudo,garrote) and estado='aprobado')<>4 then continue; end if;
  perfiles:='[]';base_foto:=especie.imagen_url;
  for perfil in select value from jsonb_array_elements(especie.configuracion_monstruo->'variantes') loop
   rangos:=null;mano:=null;
   case perfil->>'id'
    when 'd1af0000-4aa1-4321-8471-000000000051' then
     rangos:='{"vida":{"min":10,"max":20}}';mano:=jsonb_build_object(maza,80);
     if base_foto=perfil->>'imagen_url' then
      select coalesce((select nullif(imagen_url,'') from public.forja_maestra where id='f2f65672-7ac8-4075-8e0f-a84b4e124aec'),base_foto) into base_foto;
     end if;
    when 'd1af0000-4aa1-4321-8471-000000000052' then
     rangos:='{"iniciativa":{"min":0,"max":4}}';
     if not ((perfil->'equipamiento') ? 'mano_der') then
      perfil:=jsonb_set(perfil,'{equipamiento,mano_der}',jsonb_build_object('modo','catalogo','opciones',jsonb_build_array(daga))); end if;
     mano:=jsonb_build_object(daga,35);
    when 'd1af0000-4aa1-4321-8471-000000000053' then
     rangos:='{"armadura":{"min":4,"max":8}}';mano:=jsonb_build_object(daga,100);
     if perfil#>'{equipamiento,mano_izq,opciones}'=jsonb_build_array(escudo) and perfil#>'{equipamiento,mano_izq,porcentajes}' is null then
      perfil:=jsonb_set(perfil,'{equipamiento,mano_izq,porcentajes}',jsonb_build_object(escudo,80));end if;
    when 'd1af0000-4aa1-4321-8471-000000000054' then
     rangos:='{"vida":{"min":45,"max":75}}';mano:=jsonb_build_object(garrote,100);
    else null;
   end case;
   if rangos is not null then perfil:=jsonb_set(perfil,'{rangos}',rangos||coalesce(perfil->'rangos','{}'));end if;
   if mano is not null and perfil#>'{equipamiento,mano_der,porcentajes}' is null
     and perfil#>'{equipamiento,mano_der,opciones}'=(select jsonb_agg(k) from jsonb_object_keys(mano) k) then
    perfil:=jsonb_set(perfil,'{equipamiento,mano_der,porcentajes}',mano);
   end if;
   perfiles:=perfiles||jsonb_build_array(perfil);
  end loop;
  armado:=case when especie.id='d1af0000-4aa1-4321-8471-000000000004' then jsonb_build_object(garrote,60) else jsonb_build_object(daga,50,maza,25) end;
  perfil:=jsonb_build_object('id','original','nombre','Original','peso',1,'bonos','{}'::jsonb,'habilidades','[]'::jsonb,'pasivas','[]'::jsonb,
    'equipamiento',jsonb_build_object('mano_der',jsonb_build_object('modo','catalogo','opciones',(select jsonb_agg(k order by k) from jsonb_object_keys(armado) k),'porcentajes',armado)));
  update public.forja_maestra set configuracion_monstruo=jsonb_set(configuracion_monstruo,'{variantes}',perfiles||jsonb_build_array(perfil)),imagen_url=base_foto where id=especie.id;
 end loop;
end $$;
