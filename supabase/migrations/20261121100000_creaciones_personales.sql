-- Creaciones personales y generales.
-- Una creación es general (personal_de nulo) o personal de un personaje de la Forja. Solo el GM la marca
-- (la escritura de forja_maestra ya es exclusiva del GM). Las personales se pueden aprender cumpliendo
-- sus requisitos; la interfaz las muestra aparte de las generales.
alter table public.forja_maestra add column if not exists personal_de uuid references public.forja_maestra(id) on delete set null;
create index if not exists forja_maestra_personal_de on public.forja_maestra(personal_de) where personal_de is not null;
comment on column public.forja_maestra.personal_de is 'Personaje de la Forja dueño de esta creación personal. Nulo: creación general.';

create or replace function public.forja_personal_valido() returns trigger language plpgsql set search_path='' as $$
begin
 if new.personal_de is null then return new; end if;
 if new.personal_de=new.id then raise exception 'Una creación no puede ser personal de sí misma.'; end if;
 if new.tipo_creacion='personaje' then raise exception 'Un personaje no puede ser personal de otro.'; end if;
 if not exists(select 1 from public.forja_maestra p where p.id=new.personal_de and p.tipo_creacion='personaje') then
  raise exception 'Una creación personal debe pertenecer a un personaje de la Forja.';
 end if;
 return new;
end $$;
drop trigger if exists forja_personal_valido on public.forja_maestra;
create trigger forja_personal_valido before insert or update of personal_de,tipo_creacion on public.forja_maestra
 for each row execute function public.forja_personal_valido();
revoke execute on function public.forja_personal_valido() from public, anon, authenticated;

-- Kion Vaelthorne: todas sus creaciones son personales salvo Bola de Fuego, Azul, Rojo y Morado.
-- Cubre las que se sembraron con él y las que hoy lleva en sus habilidades y pasivas.
with kion as (
 select id,habilidades,pasivas from public.forja_maestra where id='aa386a13-fec2-59b5-bd77-1fa6424fec28' and tipo_creacion='personaje'
), suyas as (
 select jsonb_array_elements_text(coalesce(habilidades,'[]'::jsonb)||coalesce(pasivas,'[]'::jsonb)) as id from kion
 union select unnest(array[
  'd5d77de7-f784-53aa-a54c-615191edb0df',
  'dd3fec46-61d1-5afc-a85e-95557f56ccfb',
  'f12b0b17-eab0-5303-a6a2-ece1b6a1d498',
  '9c36e696-3df8-580b-b6e5-304f13fed9a7',
  '410991a7-1124-5aee-9fe3-e863519f3be7',
  '05c9623f-52c9-5a63-a00a-98fabe7fbb73',
  '333059a6-63e7-56a1-ae61-6c4724677939',
  '26f44ff1-88b0-5df1-92cd-505f11b85ee6',
  'e541ba15-6361-5f12-8c95-615096256bfc',
  'a852e5a1-cfe3-516e-a653-d550888cf789',
  '3f5a22b7-7f27-5dfe-bbfb-e3e6c6126dab',
  '469b58ed-d45b-52a7-94e1-e027bb9d79ad',
  'c26a61c9-2e76-5272-9df5-06f70be2128e',
  '4725cd1a-9a9e-58fc-bf79-04e0f263cb72',
  '8bd3617d-3482-5de5-844f-bbae30682a10',
  '8973619e-bca8-55d3-81ee-baa853dde805',
  'f512318d-327a-57e5-a532-951dc1efde53',
  'c657713f-b017-599a-bc3e-44b869fa25b0',
  '48b372fd-6811-5d31-b650-c5ac3e1f448e',
  'e3fc7aa5-129d-5a28-abf5-447f5ade1824',
  '4fc3e1ff-e0dd-572c-8bcc-f59df1f56633',
  '3d5b0e5a-9ffb-5c53-b4a8-fa663a535e11',
  '93a8eca0-cac8-5b84-b9d0-b9b08f774e6a',
  '62e45737-cbf4-5d1f-a537-876f3888368e',
  'f3b017a2-1ab8-558b-91f9-c643beee572c',
  '57e23aca-ef04-54ce-8188-46f3e7b8512c',
  '859736b2-f90a-5fe6-8630-32a799123c4c',
  'bf447cea-a317-5669-b3ce-ba687108369f',
  'ba5bda7e-e1f7-5224-87ee-344007488bee',
  'ed2c9c64-1443-5e82-88a2-b73d861b54fe',
  '46744a09-aa81-5679-9835-edc2f9d674f0',
  '084a0eaf-98d7-5478-a083-4210077683c8',
  '7815e42c-2c7f-5ec2-8f72-724779e67e07',
  'eb17bcdd-6259-5f74-b7c2-b52b8850639e',
  '970370a3-a1ff-559c-a6d3-09f62c7be1e4',
  '2b6737ca-aa37-53d9-b432-b011d745fbef',
  '6d5e5c9d-a703-5711-b13e-c95222480165',
  'ca48669e-a56d-5a44-9f2a-78341bf0f3d5',
  '578046ed-096d-5b7a-8987-b78e10c37081',
  '1c37df9d-00e5-50d1-87a9-cee5e443f037',
  '6a5690c0-46c0-5a24-a08b-06fe6364bc9d',
  'faa492bf-b29d-5579-a941-27a02baa4a46',
  '9de36aaa-705a-571d-afaa-69e34e74a455',
  'e37a244e-62c5-5e30-9bc9-61d426321544',
  '3e2c3896-d832-5b06-8d63-35eabaefa087',
  'c0786ceb-b6e9-5223-ba0e-743e34968542',
  '84e3c816-1761-5ee6-9fb1-47b7a2ac2a36'
 ]::text[]) from kion
)
update public.forja_maestra f set personal_de=(select id from kion)
 where f.id::text in (select id from suyas)
  and f.tipo_creacion is distinct from 'personaje'
  and f.nombre not in ('Bola de Fuego','Azul','Rojo','Morado')
  and f.personal_de is null;
