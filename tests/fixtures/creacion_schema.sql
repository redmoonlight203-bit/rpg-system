-- Extensión del esquema vacío de prueba; nunca se ejecuta contra la base real.
create table categorias_forja(id uuid primary key default gen_random_uuid(),clave text unique not null,nombre text,descripcion text,parent_id uuid references categorias_forja);
create table config_estadisticas(id uuid primary key default gen_random_uuid(),categoria text,clave text,etiqueta text,descripcion text,valor_defecto numeric);
alter table forja_maestra add column habilidades jsonb default '[]';
insert into categorias_forja(clave,nombre) values('objetos','Objetos'),('razas','Razas'),('titulos','Títulos');
insert into categorias_forja(clave,nombre,parent_id)select 'humanos','Humanos',id from categorias_forja where clave='razas';
insert into categorias_forja(clave,nombre,parent_id)select 'armas','Armas',id from categorias_forja where clave='objetos';
insert into categorias_forja(clave,nombre,parent_id)select 'armadura','Armadura',id from categorias_forja where clave='objetos';
