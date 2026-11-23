-- Artefactos con nivel (plan «Yunque · una más», paso 3.1): un objeto puede llevar niveles, tabla de formas,
-- tramos de absorción, voces y espejo mental. Es configuración de la creación: la valida lib/artefactos.ts.
alter table public.forja_maestra add column if not exists configuracion_artefacto jsonb;
alter table public.forja_maestra drop constraint if exists forja_artefacto_objeto;
alter table public.forja_maestra add constraint forja_artefacto_objeto
  check (configuracion_artefacto is null or (tipo_creacion = 'objeto' and jsonb_typeof(configuracion_artefacto) = 'object'));
