-- Corrección de la plantilla de Aurio: Phoenix pertenece al inventario de Axel.
-- Retira únicamente esa referencia; conserva el resto del equipo y las técnicas.
update public.forja_maestra a
set equipamiento=(select coalesce(jsonb_object_agg(p.key,p.value),'{}'::jsonb)
 from jsonb_each_text(a.equipamiento) p
 where p.value <> 'd6278c0c-4765-4e05-ba59-60bacafd0b01')
where a.id='4dced30f-ead1-4845-8d82-7ef4f6280cda'
and a.nombre='Aurio Magno'
and exists(select 1 from jsonb_each_text(a.equipamiento) p where p.value='d6278c0c-4765-4e05-ba59-60bacafd0b01');
