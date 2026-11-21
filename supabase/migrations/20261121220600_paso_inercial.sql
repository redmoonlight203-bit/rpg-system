-- Amplía la lista del validador existente sin sustituir los demás controles de la Forja.
do $migracion$
declare original text := pg_get_functiondef('public.validar_configuracion_creacion()'::regprocedure);
 firma text := $lista$('dano','curacion','recuperar_ph','reducir_fatiga','estado','crear_arma','transformacion')$lista$;
begin
 if strpos(original,firma)=0 then raise exception 'Revisar lista de efectos admitidos por la Forja'; end if;
 execute replace(original,firma,replace(firma,')',',''desplazamiento'')'));
end
$migracion$;

-- Cambiar únicamente la acción existente de la pieza personal de Kion; conservar arte, costes y otros efectos.
update public.forja_maestra f set configuracion_dados=(
 select jsonb_agg(valor order by i,parte) from jsonb_array_elements(f.configuracion_dados) with ordinality a(e,i)
 cross join lateral (
  select 1 as parte,case when e->>'id'='paso-inercial' then e || '{"efecto":"desplazamiento","estado":"","duracion":0,"animacion":"desplazamiento","tablero":{"alcance":6,"forma":"individual","tamano":0,"afecta":"todos"}}'::jsonb else e end as valor
  union all select 2,(e-'estado_tipo'-'tablero') || '{"id":"paso-inercial-esquiva","nombre":"Esquiva inercial","descripcion":"Al percibir un ataque, puedes gastar la reacción de esta ronda. Si tu d20 iguala o supera el ataque, lo esquivas y contraatacas por 1d6. Si queda por debajo, recibes la mitad del daño.","efecto":"dano","estado":"","duracion":0,"reaccion":{"una_por_ronda":true,"esquiva_opuesta":{"caras":20,"contra_caras":6},"principal":{"reducir":{"modo":"mitad"}}}}'::jsonb
   where e->>'id'='paso-inercial' and not f.configuracion_dados @> '[{"id":"paso-inercial-esquiva"}]'::jsonb
 ) piezas
) where f.id='dd3fec46-61d1-5afc-a85e-95557f56ccfb' and f.configuracion_dados @> '[{"id":"paso-inercial","efecto":"estado"}]'::jsonb;
