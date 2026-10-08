set role to inventario_owner;
set search_path = "inventario", public;

begin;

alter table "adjuntos_bienes" add column "es_foto" boolean default false;
alter table "adjuntos_bienes" alter column "es_foto" set not null;

commit;
