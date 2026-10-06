set role to inventario_owner;
set search_path = "inventario", public;

begin;

alter table "roles" add column "puede_gestionar_datos" boolean;

update "roles" set "puede_gestionar_datos" = "rol" in ('admin', 'administrador');

commit;
