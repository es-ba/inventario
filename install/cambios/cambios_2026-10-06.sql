set role to inventario_owner;
set search_path = "inventario", public;

begin;

drop policy "bp select" on "bienes";
CREATE POLICY "bp select" ON "bienes" AS RESTRICTIVE FOR select TO inventario_admin USING ( ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ficha IN (SELECT ficha FROM bienes_alcance())) AND (activo OR (SELECT coalesce(puede_guardar, false) FROM roles WHERE rol = get_app_user('rol')) OR (SELECT coalesce(puede_aprobar_baja, false) FROM roles WHERE rol = get_app_user('rol')) OR (SELECT coalesce(puede_restaurar_baja, false) FROM roles WHERE rol = get_app_user('rol'))) );

commit;
