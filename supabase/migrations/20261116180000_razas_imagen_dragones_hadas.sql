begin;
-- Figuras entregadas por el propietario el 16-11-2026 para las dos razas que faltaban.
update public.categorias_forja set imagen_url='/arte/razas/dragones.webp' where clave='dragones' and imagen_url is null;
update public.categorias_forja set imagen_url='/arte/razas/hadas.webp' where clave='hadas' and imagen_url is null;
commit;
