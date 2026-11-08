begin;
-- Resolve the actual prepared encounter when opening equipment from a party member.
do $$declare d text;begin
 d:=pg_get_functiondef('yugen_interno.contexto_equipo(uuid,bigint,uuid,text)'::regprocedure);
 if position('c.datos->>''fase''=''en_curso''' in d)=0 then raise exception 'No se reconoce la búsqueda del encuentro de equipamiento.';end if;
 d:=replace(d,'c.datos->>''fase''=''en_curso''','c.datos->>''fase'' in (''preparacion'',''en_curso'')');execute d;
 d:=pg_get_functiondef('yugen_interno.confirmar_equipo(uuid,bigint,uuid,text,integer,text,jsonb,jsonb)'::regprocedure);
 if position('if not coalesce((ctx->>''gm'')::boolean,false) then raise exception ''Solo el GM prepara el encuentro.'';end if;' in d)=0 then raise exception 'No se reconoce el permiso de preparación de equipamiento.';end if;
 -- contexto_equipo already validates ownership before returning a personaje_id.
 d:=replace(d,'if not coalesce((ctx->>''gm'')::boolean,false) then raise exception ''Solo el GM prepara el encuentro.'';end if;',
 'if not coalesce((ctx->>''gm'')::boolean,false) and ctx->>''personaje_id'' is null then raise exception ''Solo puedes preparar el equipo de tus personajes o compañeros.'';end if;');execute d;
end;$$;
notify pgrst,'reload schema';
commit;
