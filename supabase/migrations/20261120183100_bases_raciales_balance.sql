create function public.forja_activar_bases_ipe() returns void language plpgsql security invoker set search_path=public,pg_temp as $activar$
begin
 if not coalesce(private.tienda_es_gm(),false) then raise exception 'Solo Kuroi puede activar el balance.' using errcode='42501'; end if;
-- Solo definiciones del catálogo. Las fichas individuales conservan sus valores.
create temporary table balance_semillas on commit drop as
select raza as categoria, clave, atributos[pos] as valor, historicos[pos] as anterior
from (values
 ('personajes',array[20,6,5,5,1,0,0,0,6],array[18,5,4,5,0,0,0,0,6]),
 ('kuro',array[18,5,4,6,1,0,2,0,6],array[16,5,3,6,1,0,2,0,6]),
 ('elfos',array[18,5,7,4,1,0,2,1,7],array[16,4,7,4,1,0,2,1,6]),
 ('enanos',array[22,6,3,7,0,0,-1,2,5],array[22,7,3,7,0,1,-1,1,6]),
 ('dragones',array[26,8,6,7,1,1,0,1,6],array[26,9,6,8,2,2,0,2,6]),
 ('gigantes',array[24,6,2,8,0,1,-1,1,5],array[27,7,2,8,0,2,-1,1,6]),
 ('hombres_bestia',array[20,5,4,6,1,1,2,0,7],array[20,5,4,6,1,1,2,0,6]),
 ('hadas',array[16,4,8,4,1,0,2,2,7],array[14,3,8,4,0,0,2,2,6])
) perfiles(raza,atributos,historicos)
cross join unnest(array['vida','armadura','ph','fatiga','bono_impacto','dano','iniciativa','salvacion','movimiento']) with ordinality claves(clave,pos);
update public.config_estadisticas e set valor_defecto=s.valor, limite_jugador=greatest(e.limite_jugador,abs(s.valor))
from balance_semillas s where e.categoria=s.categoria and e.clave=s.clave and e.valor_defecto=s.anterior;
insert into public.config_estadisticas(categoria,clave,etiqueta,descripcion,valor_defecto,limite_jugador)
select s.categoria,s.clave,r.etiqueta,r.descripcion,s.valor,greatest(r.limite_jugador,abs(s.valor))
from balance_semillas s join public.categorias_forja c on c.clave=s.categoria
join public.config_estadisticas r on r.categoria='razas' and r.clave=s.clave
where not exists(select 1 from public.config_estadisticas e where e.categoria=s.categoria and e.clave=s.clave);

update public.categorias_forja set pasiva_racial=$nuevo${"nombre": "Regeneración Gigantada", "descripcion": "Al inicio de su turno recupera 1 HP si está herido y sigue vivo. Máximo 4 HP por encuentro.", "reglas": [{"id": "gigante_regeneracion_limitada", "nombre": "Regeneración Gigantada", "evento": "inicio_turno", "condicion": {"tipo": "todas", "condiciones": [{"tipo": "comparar", "sujeto": "yo", "atributo": "vida_actual", "operador": ">", "valor": 0}, {"tipo": "comparar", "sujeto": "yo", "atributo": "vida_actual", "operador": "<", "valor": 100, "porcentaje": true}]}, "efectos": [{"tipo": "curar", "destino": "yo", "valor": 1}], "coste_ph": 0, "coste_fatiga": 0, "enfriamiento": 0, "usos": 4, "prioridad": 0}], "reglas_pasivas": []}$nuevo$::jsonb
where clave='gigantes' and pasiva_racial=$original${"nombre":"Regeneración Gigantada","descripcion":"El organismo de un gigante se recupera con rapidez: sana 2 HP al inicio de cada turno mientras siga vivo. Las marcas sagradas anti-magia del Diario se conservan como lore; la inmunidad absoluta aún requiere una regla diferenciada en el motor.","reglas":[],"reglas_pasivas":[{"id":"gigante_regeneracion","nombre":"Regeneración Gigantada","evento":"inicio_turno","condicion":"siempre","bonos":{},"curacion":2,"recuperar_ph":0,"reducir_fatiga":0}]}$original$::jsonb;

update public.categorias_forja set pasiva_racial=$nuevo${"nombre": "Instinto Salvaje", "descripcion": "Una vez por encuentro gasta una acción y 2 Fatiga para ganar +2 daño, +1 impacto y +1 movimiento durante cuatro turnos.", "reglas": [{"id": "bestia_transformacion_parcial", "nombre": "Transformación parcial", "evento": "usar", "condicion": {"tipo": "siempre"}, "efectos": [{"tipo": "transformar", "destino": "yo", "clave": "instinto_salvaje", "nombre": "Instinto Salvaje", "duracion": 4, "cambios": [{"atributo": "dano", "operacion": "sumar", "valor": 2}, {"atributo": "bono_impacto", "operacion": "sumar", "valor": 1}, {"atributo": "movimiento", "operacion": "sumar", "valor": 1}]}], "coste_ph": 0, "coste_fatiga": 2, "enfriamiento": 0, "usos": 1, "prioridad": 0}], "reglas_pasivas": []}$nuevo$::jsonb
where clave='hombres_bestia' and pasiva_racial=$original${"nombre":"Instinto Salvaje","descripcion":"La percepción y fuerza de su linaje animal les permite una transformación parcial: cuesta una acción y 2 Fatiga, aumenta +2 daño y +1 impacto por tres turnos. Las particularidades de cada especie se definen por personaje.","reglas":[{"id":"bestia_transformacion_parcial","nombre":"Transformación parcial","evento":"usar","condicion":{"tipo":"siempre"},"efectos":[{"tipo":"transformar","destino":"yo","clave":"instinto_salvaje","nombre":"Instinto Salvaje","duracion":3,"cambios":[{"atributo":"dano","operacion":"sumar","valor":2},{"atributo":"bono_impacto","operacion":"sumar","valor":1}]}],"coste_ph":0,"coste_fatiga":2,"enfriamiento":0,"usos":1,"prioridad":0}],"reglas_pasivas":[]}$original$::jsonb;
end;$activar$;
revoke all on function public.forja_activar_bases_ipe() from public,anon;
grant execute on function public.forja_activar_bases_ipe() to authenticated;
