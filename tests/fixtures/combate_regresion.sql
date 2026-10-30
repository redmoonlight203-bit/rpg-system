begin;
do $$
declare admin_id uuid:=gen_random_uuid(); pasiva uuid; habilidad uuid; armadura uuid; personaje uuid; combate uuid:=gen_random_uuid(); resultado jsonb; preparado jsonb; rechazado boolean;
begin
 insert into perfiles values(admin_id,'KUROI');perform set_config('request.jwt.claim.sub',admin_id::text,true);
 insert into forja_maestra(nombre,tipo,tipo_creacion,reglas_pasivas) values('Estratega','pasivas_generales','pasiva','[{"id":"p","nombre":"Estratega","condicion":"siempre","evento":"permanente","bonos":{"iniciativa":4},"curacion":0,"recuperar_ph":0,"reducir_fatiga":0}]') returning id into pasiva;
 insert into forja_maestra(nombre,tipo,tipo_creacion,configuracion_dados) values('Arsenal','habilidades_generales','habilidad','[{"id":"a","nombre":"Crear","efecto":"crear_arma","cantidad":3,"caras":8,"modificador":6,"duracion":3,"coste_ph":0,"coste_fatiga":1,"arma_nombre":"Lanza","arma_slot":"dos_manos"}]') returning id into habilidad;
 insert into forja_maestra(nombre,tipo,tipo_creacion,slot_tipo,stats) values('Coraza','armas','objeto','pechera','{"armadura":12}') returning id into armadura;
 insert into forja_maestra(nombre,tipo,tipo_creacion,stats,pasivas,habilidades,equipamiento) values('Aurio prueba','humanos','personaje','{"vida":100,"armadura":8,"ph":0,"fatiga":7}',jsonb_build_array(pasiva::text),jsonb_build_array(habilidad::text),jsonb_build_object('pechera',armadura::text)) returning id into personaje;
 preparado:=combate_preparar_personaje(personaje);
 if preparado->'stats'->>'armadura'<>'20' or preparado->'stats'->>'vida'<>'100' then raise exception 'Equipo incorrecto';end if;
 if preparado->'configuracion'->'pasivas'->0->'reglas'->0->'bonos'->>'iniciativa'<>'4' then raise exception 'Pasivas ausentes';end if;
 rechazado:=false;begin perform combate_preparar_personaje(armadura);exception when others then rechazado:=true;end;if not rechazado then raise exception 'Objeto en campo';end if;
 resultado:=combate_guardar(combate,'Prueba',jsonb_build_object('fase','preparacion','miembros',jsonb_build_array(preparado)),0);
 if resultado->>'version'<>'1' then raise exception 'Versión incorrecta';end if;
 rechazado:=false;begin perform combate_guardar(combate,'Obsoleto','{"fase":"preparacion","miembros":[]}',0);exception when others then rechazado:=true;end;if not rechazado then raise exception 'Versión obsoleta aceptada';end if;
 perform forja_eliminar(pasiva);
 if exists(select 1 from forja_maestra where id=pasiva) or (select pasivas from forja_maestra where id=personaje)<>'[]'::jsonb then raise exception 'No eliminó referencias';end if;
 if (select b.datos->'miembros'->0->'configuracion'->'pasivas'->0->>'nombre' from combates_yugen b where b.id=combate)<>'Estratega' then raise exception 'Historial alterado';end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 rechazado:=false;begin perform combate_preparar_personaje(personaje);exception when others then rechazado:=true;end;if not rechazado then raise exception 'No Kuroi autorizado';end if;
end;
$$;
rollback;
