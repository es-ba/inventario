-- Columnas de los reportes «Bienes por categoría», «Bienes por sector» y «Bienes por marca y modelo»:
--   * «En movimiento» y «Baja en trámite» dejan de tener columna propia (sin orden en estados_bien); si hay bienes en esos estados, se cuentan en «Otros».
--   * Se agregan las columnas de tipo de asignación con orden: «Comodato» y «Acta» (tipo_asignacion.orden), según el último movimiento de cada bien.
-- No toca ningún bien ni movimiento.

set role to inventario_owner;
set search_path = "inventario", public;

begin;

UPDATE estados_bien SET orden = NULL WHERE estado_bien IN ('EN_MOVIMIENTO', 'BAJA_EN_TRAMITE');

alter table "tipo_asignacion" add column "orden" integer;
UPDATE tipo_asignacion t SET orden = v.orden FROM (VALUES
('COMODATO', 1),
('ACTA', 2)
) AS v(tipo_asignacion, orden) WHERE t.tipo_asignacion = v.tipo_asignacion;

SELECT estado_bien, etiqueta, orden FROM estados_bien ORDER BY orden NULLS LAST, estado_bien;
SELECT tipo_asignacion, descripcion, orden FROM tipo_asignacion ORDER BY orden NULLS LAST, tipo_asignacion;

commit;
