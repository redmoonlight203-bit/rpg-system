begin;
set lock_timeout='1500ms';
-- Seguridad, primer paso. Estas 17 tablas tienen la política heredada «Permitir todo <tabla>»
-- (rol public, using true, with check true) y el rol anon tenía SELECT/INSERT/UPDATE/DELETE:
-- cualquiera con la clave pública de la web podía leerlas y modificarlas sin iniciar sesión.
-- Aquí solo se retira el acceso sin sesión. Para los usuarios con sesión no cambia nada, así que
-- ninguna pantalla deja de funcionar (antes del login la aplicación solo consulta perfiles).
-- Pendiente: sustituir cada «Permitir todo» por reglas propias de la tabla (jugador frente a Kuroi).
do $$declare t text;begin
 foreach t in array array['articulos_alma','categorias_forja','codex_descubrimientos','codex_entradas',
  'config_estadisticas','creaciones_forja','jugador_mapas','jugador_vinculos','linea_tiempo_eras',
  'lista_deseos','mapas','mercado_objetos','negociaciones_tienda','tablero_tokens','tableros',
  'tiempo_juego','tienda_items'] loop
  if to_regclass('public.'||t) is not null then
   execute format('revoke all on public.%I from anon',t);
  end if;
 end loop;
end$$;
notify pgrst,'reload schema';
commit;
