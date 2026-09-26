set role to inventario_owner;
set search_path = "inventario", public;
set client_encoding = 'UTF8';

begin;

alter table "items_control" drop constraint "tipo_valor invalid option";
alter table "items_control" add constraint "tipo_valor invalid option" check ("tipo_valor" in ('si_no','texto','opcion','atributo') );

create table "items_control_atributos" (
  "item" text,
  "atributo" text
, primary key ("item")
);
grant select, insert, update, delete on "items_control_atributos" to inventario_admin;
grant all on "items_control_atributos" to inventario_owner;
alter table "items_control_atributos" add constraint "item<>''" check ("item"<>'');
alter table "items_control_atributos" add constraint "atributo<>''" check ("atributo"<>'');
alter table "items_control_atributos" add unique ("atributo");
alter table "items_control_atributos" add constraint "items_control_atributos items_control REL" foreign key ("item") references "items_control" ("item")  on delete cascade on update cascade;
alter table "items_control_atributos" add constraint "items_control_atributos bienes_atributos REL" foreign key ("atributo") references "bienes_atributos" ("atributo")  on update cascade;
create index "item 4 items_control_atributos IDX" ON "items_control_atributos" ("item");
create index "atributo 4 items_control_atributos IDX" ON "items_control_atributos" ("atributo");

insert into "bienes_atributos" ("atributo", "nombre", "tipo_valor") values
('caja', 'Caja', 'texto'),
('funda', 'Funda', 'texto'),
('protector_pantalla', 'Protector de pantalla', 'texto'),
('tamanio_protector', 'Tamaño del protector', 'texto'),
('cargador', 'Cargador', 'texto'),
('cable', 'Cable', 'texto'),
('ficha_cable', 'Ficha del cable', 'texto'),
('adaptador', 'Adaptador', 'texto'),
('tipo_adaptador', 'Tipo de adaptador', 'texto')
on conflict ("atributo") do nothing;

insert into "bienes_atributo_valores" ("atributo", "valor", "orden") values
('adaptador', 'N/C', 1),
('adaptador', 'NECESITA', 2),
('adaptador', 'NO', 3),
('adaptador', 'SI', 4),
('cable', 'NO', 1),
('cable', 'SI', 2),
('caja', 'NO', 1),
('caja', 'SI', 2),
('cargador', 'NO', 1),
('cargador', 'SI', 2),
('ficha_cable', 'FICHA ANCHA', 1),
('ficha_cable', 'LIGHTNING', 2),
('ficha_cable', 'MICRO USB', 3),
('ficha_cable', 'MINI TIPO A', 4),
('ficha_cable', 'TIPO C', 5),
('funda', 'NO', 1),
('funda', 'SI', 2),
('protector_pantalla', 'NO', 1),
('protector_pantalla', 'SI', 2),
('tamanio_protector', '7"', 1),
('tamanio_protector', '7.9"', 2),
('tamanio_protector', '8"', 3),
('tamanio_protector', '8.3"', 4),
('tamanio_protector', '8.7"', 5),
('tamanio_protector', '10"', 6),
('tamanio_protector', '10.2"', 7),
('tamanio_protector', '10.3"', 8),
('tamanio_protector', '10.5"', 9),
('almacenamiento', '128 GB', 7),
('ram', '2 GB', 3),
('ram', '3 GB', 4),
('ram', '8 GB', 5),
('tipo_adaptador', 'DOS PATAS PLANAS', 1),
('tipo_adaptador', 'DOS PATAS REDONDAS', 2),
('tipo_adaptador', 'N/C', 3)
on conflict ("atributo", "valor") do nothing;

update "items_control" set "tipo_valor" = 'atributo' where "item" in ('CARGADOR', 'FUNDA');

insert into "items_control" ("item", "descripcion", "tipo_valor", "orden", "activo") values
('CAJA', 'Tiene caja', 'atributo', 62, true),
('CABLE', 'Tiene cable', 'atributo', 64, true),
('ADAPTADOR', 'Adaptador', 'atributo', 66, true),
('PROTECTOR_PANTALLA', 'Tiene protector de pantalla', 'atributo', 68, true)
on conflict ("item") do nothing;

insert into "items_control_atributos" ("item", "atributo") values
('CARGADOR', 'cargador'),
('FUNDA', 'funda'),
('CAJA', 'caja'),
('CABLE', 'cable'),
('ADAPTADOR', 'adaptador'),
('PROTECTOR_PANTALLA', 'protector_pantalla');

insert into "items_control_grupos" ("item", "grupo") values
('CAJA', '1019'),
('CAJA', '1197'),
('CABLE', '1019'),
('CABLE', '1197'),
('ADAPTADOR', '1019'),
('ADAPTADOR', '1197'),
('PROTECTOR_PANTALLA', '1019'),
('PROTECTOR_PANTALLA', '1197')
on conflict ("item", "grupo") do nothing;

update "estados_baja_acciones" set "campos_requeridos" = null
 where "accion_baja" = 'restaurar' and "campos_requeridos" = 'motivo_restauracion';

commit;
