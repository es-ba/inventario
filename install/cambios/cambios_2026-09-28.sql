set role to inventario_owner;
set search_path = "inventario", public;

begin;

insert into "roles" ("rol", "descripcion", "puede_ver_todo", "puede_ver_propio", "puede_ver_dependientes",
  "puede_ver_claves", "puede_aprobar_baja", "puede_restaurar_baja",
  "puede_eliminar", "puede_guardar", "puede_mover", "puede_controlar") values
('administrador', 'administrador', true, true, false, false, true, true, true, true, true, true)
on conflict ("rol") do nothing;

commit;
