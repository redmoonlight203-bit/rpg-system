begin;
-- El catálogo aprobado se consulta desde la arena; solo el GM define su contenido y recompensas.
alter table public.forja_maestra enable row level security;
drop policy if exists "Permitir todo forja_maestra" on public.forja_maestra;
create policy forja_catalogo_aprobado on public.forja_maestra for select to authenticated using (
 (select private.tienda_es_gm()) or (estado='aprobado' and exists(select 1 from public.perfiles where id=(select auth.uid()) and rol='REENCARNADO' and estado='aprobado'))
);
create policy forja_escritura_gm on public.forja_maestra for all to authenticated using((select private.tienda_es_gm())) with check((select private.tienda_es_gm()));
grant select,insert,update,delete on public.forja_maestra to authenticated;
notify pgrst,'reload schema';
commit;
