begin;
do $$
declare p uuid;h uuid;f uuid;negado boolean;config jsonb;
begin
 select id into p from forja_maestra where nombre='Escamas de dragón';if p is null then raise exception 'Pasiva no creada';end if;
 insert into forja_maestra(nombre,tipo,tipo_creacion,configuracion_dados) values('Llama de prueba','habilidades_generales','habilidad','[{"id":"f","nombre":"Llama","efecto":"dano","naturaleza":"magica","elemento":"fuego","cantidad":1,"caras":6,"modificador":0,"coste_ph":1,"duracion":0,"salvacion":{"cd":12,"atributo":"salvacion","exito":"mitad"}}]') returning id into h;
 insert into forja_maestra(nombre,tipo,tipo_creacion,pasivas,habilidades) values('Dragón de prueba','humanos','personaje',jsonb_build_array(p::text),jsonb_build_array(h::text)) returning id into f;
 config:=forja_snapshot_config(f);
 if config->'pasivas'->0->'reglas'->0->>'reduccion_pct'<>'50' or config->'habilidades'->0->'efectos'->0->>'elemento'<>'fuego' then raise exception 'Snapshot perdió reglas';end if;
 negado:=false;begin update forja_maestra set configuracion_dados='[{"nombre":"malo","efecto":"dano","elemento":"inventado","cantidad":1,"caras":6,"modificador":0,"duracion":0,"coste_ph":1}]' where id=h;exception when others then negado:=true;end;if not negado then raise exception 'Elemento inválido aceptado';end if;
 negado:=false;begin update forja_maestra set reglas_pasivas='[{"nombre":"mala","condicion":"ataque_magico","evento":"recibir_ataque","bonos":{},"curacion":0,"recuperar_ph":0,"reducir_fatiga":0,"reduccion_pct":120}]' where id=p;exception when others then negado:=true;end;if not negado then raise exception 'Reducción inválida aceptada';end if;
 negado:=false;begin update forja_maestra set configuracion_dados='[{"nombre":"malo","efecto":"dano","cantidad":1,"caras":6,"modificador":0,"duracion":0,"coste_ph":1,"salvacion":{"cd":0,"atributo":"salvacion","exito":"mitad"}}]' where id=h;exception when others then negado:=true;end;if not negado then raise exception 'CD inválida aceptada';end if;
end;$$;
rollback;
