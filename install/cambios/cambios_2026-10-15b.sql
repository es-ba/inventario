-- Versión b de los cambios del día: cada bien guarda su propia subcategoría.
--   * Se corre después de cambios_2026-10-15.sql.
--   * Agrega bienes.subcategoria, que se edita en la ficha, en el alta y en la edición masiva. La categoría sale de la subcategoría.
--   * La carga inicial copia a cada bien la subcategoría equivalente de su grupo (grupos.subcategoria, que queda como referencia).
--     Sólo completa los bienes sin subcategoría: nunca pisa una cargada a mano.
--   * Desactiva la auditoría de bienes durante la carga, como bienes_estado_inicial.sql, para no dejar un evento por bien.
-- No cambia el grupo de ningún bien ni el catálogo de grupos.

set role to inventario_owner;
set search_path = "inventario", public;

begin;

SET LOCAL backend_plus._rol = 'admin';
SET LOCAL backend_plus._mode = 'normal';
SET LOCAL backend_plus._user = '';
SET LOCAL backend_plus._usuario = '';
SET LOCAL backend_plus._responsable = '';
SET LOCAL backend_plus._sector = '';

alter table "bienes" add column "subcategoria" text;
alter table "bienes" add constraint "subcategoria<>''" check ("subcategoria"<>'');
alter table "bienes" add constraint "bienes subcategorias REL" foreign key ("subcategoria") references "subcategorias" ("subcategoria")  on update cascade;
create index "subcategoria 4 bienes IDX" ON "bienes" ("subcategoria");

ALTER TABLE bienes DISABLE TRIGGER bienes_auditar_trg_after;
UPDATE bienes b SET subcategoria = g.subcategoria
  FROM grupos g
 WHERE g.grupo = b.grupo
   AND g.subcategoria IS NOT NULL
   AND b.subcategoria IS NULL;
ALTER TABLE bienes ENABLE TRIGGER bienes_auditar_trg_after;

SELECT count(*) FILTER (WHERE subcategoria IS NOT NULL) AS bienes_con_subcategoria,
       count(*) FILTER (WHERE subcategoria IS NULL) AS bienes_sin_subcategoria
  FROM bienes;

commit;
