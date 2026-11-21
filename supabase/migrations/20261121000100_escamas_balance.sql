create function public.forja_activar_escamas_ipe() returns void language plpgsql security invoker set search_path=public,pg_temp as $activar$
begin
 if not coalesce(private.tienda_es_gm(),false) then raise exception 'Solo Kuroi puede activar el balance.' using errcode='42501'; end if;
-- Cambiar exclusivamente la definición racial original. Respetar variantes del GM.
update public.categorias_forja set pasiva_racial=$nuevo${"nombre": "Escamas de Dragón", "descripcion": "Al recibir un ataque mágico gana +2 ARM solo contra ese ataque.", "reglas": [], "reglas_pasivas": [{"id": "dragon_escamas_ipe", "nombre": "Escamas de Dragón", "evento": "recibir_ataque", "condicion": "ataque_magico", "bonos": {"armadura": 2}, "curacion": 0, "recuperar_ph": 0, "reducir_fatiga": 0}]}$nuevo$::jsonb
where clave='dragones' and pasiva_racial=$original${"nombre":"Escamas de Dragón","descripcion":"Frente a ataques mágicos que consumen PH: +5 ARM solo contra ese ataque y reducción del 50 % del daño recibido si impacta. No concede +5 ARM permanente. El simulador prioriza esta versión racial frente a pasivas equipadas con el mismo nombre.","reglas":[],"reglas_pasivas":[{"id":"dragon_escamas_magicas","nombre":"Escamas de Dragón","evento":"recibir_ataque","condicion":"ataque_magico","bonos":{"armadura":5},"curacion":0,"recuperar_ph":0,"reducir_fatiga":0,"reduccion_pct":50}]}$original$::jsonb;
end;$activar$;
revoke all on function public.forja_activar_escamas_ipe() from public,anon;
grant execute on function public.forja_activar_escamas_ipe() to authenticated;
