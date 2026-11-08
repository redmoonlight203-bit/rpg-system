begin;
-- Same defaults as conAlcance in the shared combat engine. Explicit settings are preserved.
create function private.completar_alcances(p jsonb,p_contexto text default '') returns jsonb language plpgsql immutable set search_path='' as $$
declare resultado jsonb;par record;contexto text;distancia integer:=1;
begin
 if jsonb_typeof(p)='array' then
  select coalesce(jsonb_agg(private.completar_alcances(value,p_contexto) order by ord),'[]') into resultado from jsonb_array_elements(p) with ordinality x(value,ord);return resultado;
 elsif jsonb_typeof(p)<>'object' then return p;end if;
 contexto:=translate(lower(p_contexto||' '||coalesce(p->>'nombre','')||' '||coalesce(p->>'arma_nombre','')),'áéíóúüñ','aeiouun');
 select coalesce(jsonb_object_agg(key,private.completar_alcances(value,contexto)),'{}') into resultado from jsonb_each(p);
 if p->>'efecto' in ('dano','estado') and not p ? 'tablero' then
  if contexto~'\m(arco|ballesta|flecha|disparo)\M' then distancia:=8;
  elsif contexto~'\m(lanza|alabarda|pica)\M' then distancia:=2;
  elsif contexto!~'desarmado|puno|punetazo|patada|mordisco|golpe|filo|espada|daga|martillo|hacha|mazo|corte' and (p->>'naturaleza'='magica' or coalesce((p->>'coste_ph')::numeric,0)>0 or translate(lower(coalesce(p->>'tipo_dano','')),'áéíóúüñ','aeiouun')~'fuego|hielo|frio|plasma|energia|electri|arcano|magico' or contexto~'proyectil|rayo|bola de|llamas|cadenas') then distancia:=6;end if;
  resultado:=resultado||jsonb_build_object('tablero',jsonb_build_object('alcance',distancia,'forma','individual','tamano',0,'afecta','todos'));
 end if;
 return resultado;
end;$$;
revoke all on function private.completar_alcances(jsonb,text) from public,anon,authenticated;
update public.forja_maestra set configuracion_dados=private.completar_alcances(configuracion_dados,nombre) where configuracion_dados is distinct from private.completar_alcances(configuracion_dados,nombre);
update public.inventario_jugador set configuracion=private.completar_alcances(configuracion,nombre) where configuracion is not null and configuracion is distinct from private.completar_alcances(configuracion,nombre);
update public.forja_instancias set configuracion=private.completar_alcances(configuracion,nombre) where configuracion is not null and configuracion is distinct from private.completar_alcances(configuracion,nombre);

-- Ordinary, editable examples. They enter the catalogue, not any player's inventory.
insert into public.forja_maestra(nombre,tipo,tipo_creacion,descripcion,stats,slot_tipo,estado,es_grupo,ligado_al_alma,es_vendible,clase,configuracion_dados)
select 'Lanza normal','armas','objeto','Lanza de madera con punta de hierro. Estocada a un objetivo hasta 2 bloques, 1d6 de daño físico. Ocupa dos manos.',
 '{"peso":2,"durabilidad":30,"dados_dano":1,"caras_dano":6,"bono_impacto":0,"dano":0}'::jsonb,'dos_manos','aprobado',false,false,true,'D',
 '[{"id":"estocada-lanza","nombre":"Estocada de lanza","descripcion":"Clava la punta de la lanza en un objetivo a un máximo de 2 bloques.","efecto":"dano","cantidad":1,"caras":6,"modificador":0,"tipo_dano":"perforante","naturaleza":"fisica","coste_ph":0,"coste_fatiga":0,"duracion":0,"estado":"","tablero":{"alcance":2,"forma":"individual","tamano":0,"afecta":"todos"}}]'::jsonb
where not exists(select 1 from public.forja_maestra where nombre='Lanza normal' and tipo_creacion='objeto');
insert into public.forja_maestra(nombre,tipo,tipo_creacion,descripcion,stats,slot_tipo,estado,es_grupo,ligado_al_alma,es_vendible,clase,configuracion_dados)
select 'Arco normal','armas','objeto','Arco de madera. Dispara a un objetivo hasta 8 bloques, 1d6 de daño físico. Ocupa dos manos.',
 '{"peso":1,"durabilidad":25,"dados_dano":1,"caras_dano":6,"bono_impacto":0,"dano":0}'::jsonb,'dos_manos','aprobado',false,false,true,'D',
 '[{"id":"disparo-arco","nombre":"Disparo de arco","descripcion":"Dispara una flecha a un objetivo a un máximo de 8 bloques.","efecto":"dano","cantidad":1,"caras":6,"modificador":0,"tipo_dano":"perforante","naturaleza":"fisica","coste_ph":0,"coste_fatiga":0,"duracion":0,"estado":"","tablero":{"alcance":8,"forma":"individual","tamano":0,"afecta":"todos"}}]'::jsonb
where not exists(select 1 from public.forja_maestra where nombre='Arco normal' and tipo_creacion='objeto');
insert into public.forja_maestra(nombre,tipo,tipo_creacion,descripcion,stats,slot_tipo,estado,es_grupo,ligado_al_alma,es_vendible,clase,configuracion_dados)
select 'Bastón normal','armas','objeto','Bastón de aprendiz: proyectil arcano a 6 bloques por 1 PH (1d6); golpe a 1 bloque sin PH (1d4). Ocupa dos manos.',
 '{"peso":1.5,"durabilidad":25,"bono_impacto":0,"dano":0}'::jsonb,'dos_manos','aprobado',false,false,true,'D',
 '[{"id":"proyectil-baston","nombre":"Proyectil arcano del bastón","descripcion":"Dispara energía arcana a un objetivo a un máximo de 6 bloques. Consume 1 PH.","efecto":"dano","cantidad":1,"caras":6,"modificador":0,"tipo_dano":"arcano","naturaleza":"magica","coste_ph":1,"coste_fatiga":0,"duracion":0,"estado":"","tablero":{"alcance":6,"forma":"individual","tamano":0,"afecta":"todos"}},{"id":"golpe-baston","nombre":"Golpe de bastón","descripcion":"Golpea con la madera a un objetivo a 1 bloque sin gastar PH.","efecto":"dano","cantidad":1,"caras":4,"modificador":0,"tipo_dano":"contundente","naturaleza":"fisica","coste_ph":0,"coste_fatiga":0,"duracion":0,"estado":"","tablero":{"alcance":1,"forma":"individual","tamano":0,"afecta":"todos"}}]'::jsonb
where not exists(select 1 from public.forja_maestra where nombre='Bastón normal' and tipo_creacion='objeto');
commit;
