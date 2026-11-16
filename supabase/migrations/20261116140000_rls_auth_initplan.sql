begin;
set lock_timeout='1500ms';
-- Paso 2.3/2.6: Advisors Performance «auth_rls_initplan». auth.uid() dentro de una política se evaluaba
-- por cada fila; con (select auth.uid()) se evalúa una vez por consulta. La condición es la misma:
-- no cambia quién puede leer o escribir. ALTER POLICY conserva roles, comando y modo permisivo.
-- Guarda: si alguna política no es exactamente la observada en producción el 16-11, aborta sin cambios.
do $$declare esperado text:='(EXISTS ( SELECT 1
   FROM perfiles
  WHERE ((perfiles.id = auth.uid()) AND (perfiles.rol = ''KUROI''::text))))';
begin
 if (select count(*) from pg_policies where schemaname='public' and (
      (tablename='forja_operaciones' and policyname='forja_operaciones_kuroi' and qual=esperado and with_check is null)
   or (tablename='forja_instancias' and policyname='forja_instancias_kuroi_lectura' and qual=esperado and with_check is null)
   or (tablename='forja_instancias' and policyname='forja_instancias_kuroi_estado' and qual=esperado and with_check=esperado)
   or (tablename='combates_yugen' and policyname='combates_kuroi' and qual='((creador_id = auth.uid()) AND '||esperado||')' and with_check is null)))<>4
 then raise exception 'RLS initplan: alguna política difiere de la observada. No se aplica nada.';end if;
end$$;

alter policy forja_operaciones_kuroi on public.forja_operaciones
 using (exists(select 1 from public.perfiles where perfiles.id=(select auth.uid()) and perfiles.rol='KUROI'));
alter policy forja_instancias_kuroi_lectura on public.forja_instancias
 using (exists(select 1 from public.perfiles where perfiles.id=(select auth.uid()) and perfiles.rol='KUROI'));
alter policy forja_instancias_kuroi_estado on public.forja_instancias
 using (exists(select 1 from public.perfiles where perfiles.id=(select auth.uid()) and perfiles.rol='KUROI'))
 with check (exists(select 1 from public.perfiles where perfiles.id=(select auth.uid()) and perfiles.rol='KUROI'));
alter policy combates_kuroi on public.combates_yugen
 using (creador_id=(select auth.uid()) and exists(select 1 from public.perfiles where perfiles.id=(select auth.uid()) and perfiles.rol='KUROI'));
commit;
