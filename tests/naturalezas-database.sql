-- Transactional integration check against an existing character; leaves no changes.
begin;
do $$
declare n uuid;p bigint;antes jsonb;despues jsonb;snap jsonb;gm uuid;
begin
select id into gm from public.perfiles where rol='KUROI' limit 1;
perform set_config('request.jwt.claim.sub',gm::text,true);
select id,to_jsonb(c) into p,antes from public.personajes c where estado_vida='vivo' order by id limit 1;
if p is null then raise exception 'Se necesita un personaje vivo para la prueba';end if;
insert into public.naturalezas(clave,nombre,modificadores,pasivas,habilidades,reglas) values('__test_integracion','Prueba Kemono','{"fisico":2}',
'[{"nombre":"Instinto","reglas":[{"id":"instinto","nombre":"Instinto","evento":"permanente","condicion":"siempre","bonos":{"armadura":3},"curacion":0,"recuperar_ph":0,"reducir_fatiga":0}]}]',
'[{"nombre":"Garra","stats":{},"efectos":[{"id":"garra","nombre":"Garra","efecto":"dano","cantidad":1,"caras":6,"modificador":0,"coste_ph":0,"duracion":0,"estado":"","tipo_dano":"fisico"}]}]',
'{"motor":[{"id":"forma","nombre":"Forma bestial","evento":"usar","condicion":{"tipo":"siempre"},"efectos":[{"tipo":"atributo","destino":"yo","atributo":"dano","valor":5,"operacion":"sumar","duracion":2}],"coste_ph":0,"coste_fatiga":0,"enfriamiento":0,"usos":0,"prioridad":0}]}') returning id into n;
insert into public.personaje_naturalezas(personaje_id,naturaleza_id) values(p,n);
snap:=yugen_interno.preparar_jugador(p);
if snap->'configuracion'->>'raza' <> antes->>'raza' then raise exception 'Raza reemplazada';end if;
if jsonb_array_length(snap->'configuracion'->'naturalezas')<>1 then raise exception 'Naturaleza ausente';end if;
if not exists(select 1 from jsonb_array_elements(snap->'configuracion'->'habilidades') h where h->>'nombre'='Garra') then raise exception 'Habilidad ausente';end if;
if not exists(select 1 from jsonb_array_elements(snap->'configuracion'->'pasivas') h where h->>'nombre'='Instinto') then raise exception 'Pasiva ausente';end if;
if not exists(select 1 from jsonb_array_elements(snap->'configuracion'->'pasivas') h where h->'reglas_motor'->0->>'nombre'='Forma bestial') then raise exception 'Transformación ausente';end if;
if (snap->'stats'->>'fisico')::numeric<>coalesce((antes->'atributos'->>'fisico')::numeric,0)+2 then raise exception 'Bonos incorrectos';end if;
update public.personaje_naturalezas set activa=false where personaje_id=p and naturaleza_id=n;
if jsonb_array_length(public.naturalezas_combate_snapshot(p)->'naturalezas')<>0 then raise exception 'Suspensión fallida';end if;
update public.personaje_naturalezas set activa=true where personaje_id=p and naturaleza_id=n;
delete from public.personaje_naturalezas where personaje_id=p and naturaleza_id=n;
select to_jsonb(c) into despues from public.personajes c where id=p;
if antes->'atributos'<>despues->'atributos' then raise exception 'No revirtió atributos';end if;
end $$;
rollback;
