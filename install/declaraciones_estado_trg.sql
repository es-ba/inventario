CREATE OR REPLACE FUNCTION declaraciones_estado_trg()
  RETURNS trigger
  LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_permitido boolean;
BEGIN
  IF old.estado IS NOT DISTINCT FROM new.estado THEN
    RETURN new;
  END IF;

  v_permitido := CASE
    WHEN old.estado = 'BORRADOR'  AND new.estado IN ('EMITIDA', 'ANULADA')             THEN true
    WHEN old.estado = 'EMITIDA'   AND new.estado IN ('FIRMADA', 'OBSERVADA', 'ANULADA') THEN true
    WHEN old.estado = 'FIRMADA'   AND new.estado = 'OBSERVADA'                          THEN true
    WHEN old.estado = 'OBSERVADA' AND new.estado IN ('BORRADOR', 'ANULADA')             THEN true
    ELSE false
  END;

  IF NOT v_permitido THEN
    RAISE EXCEPTION 'Cambio de estado no permitido para la declaración %: % -> %',
      new.declaracion, old.estado, new.estado;
  END IF;

  IF new.estado = 'OBSERVADA' AND coalesce(btrim(new.motivo_observacion), '') = '' THEN
    RAISE EXCEPTION 'Para observar la declaración % hay que indicar el motivo', new.declaracion;
  END IF;

  IF new.estado = 'EMITIDA' AND NOT EXISTS (
    SELECT 1 FROM declaraciones_bienes WHERE declaracion = new.declaracion
  ) THEN
    RAISE EXCEPTION 'La declaración % no tiene bienes y no puede emitirse', new.declaracion;
  END IF;

  RETURN new;
END;
$BODY$;

DROP TRIGGER IF EXISTS declaraciones_estado_trg ON declaraciones;
CREATE TRIGGER declaraciones_estado_trg
  BEFORE UPDATE OF estado
  ON declaraciones
  FOR EACH ROW
  EXECUTE FUNCTION declaraciones_estado_trg();


-- Congelamiento de la lista de bienes.
--
-- Una vez emitido el documento, lo que el responsable firma tiene que coincidir para
-- siempre con lo que el sistema guarda. Si hay que corregir, se observa la declaración,
-- vuelve a BORRADOR y se re-emite como una versión nueva.

CREATE OR REPLACE FUNCTION declaraciones_bienes_bloqueo_trg()
  RETURNS trigger
  LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_declaracion bigint;
  v_estado text;
BEGIN
  v_declaracion := CASE WHEN TG_OP = 'DELETE' THEN old.declaracion ELSE new.declaracion END;

  SELECT estado INTO v_estado
    FROM declaraciones
    WHERE declaracion = v_declaracion;

  IF v_estado IS NOT NULL AND v_estado <> 'BORRADOR' THEN
    RAISE EXCEPTION 'La declaración % está en estado % y su lista de bienes no puede modificarse',
      v_declaracion, v_estado;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN old ELSE new END;
END;
$BODY$;

DROP TRIGGER IF EXISTS declaraciones_bienes_bloqueo_trg ON declaraciones_bienes;
CREATE TRIGGER declaraciones_bienes_bloqueo_trg
  BEFORE INSERT OR UPDATE OR DELETE
  ON declaraciones_bienes
  FOR EACH ROW
  EXECUTE FUNCTION declaraciones_bienes_bloqueo_trg();


-- Carga automática de los bienes del responsable.
--
-- Al asignar (o cambiar) el responsable de una declaración en BORRADOR, se rearma la
-- lista con los bienes que esa persona tiene a cargo hoy. "A cargo" es el responsable
-- del último movimiento de cada bien, la misma definición que usa la grilla de bienes.
--
-- Se guarda una copia de los datos y no una referencia: declaraciones_bienes es la foto
-- de lo que el responsable declara, y no tiene que cambiar si después el bien se mueve.
--
-- SECURITY DEFINER es necesario: bienes y movimientos_bien tienen row level security
-- (bienes sólo deja seleccionar a admin), así que sin esto la carga devolvería cero
-- filas en silencio para cualquier otro rol.

CREATE OR REPLACE FUNCTION declaraciones_cargar_bienes_trg()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $BODY$
BEGIN
  IF TG_OP = 'UPDATE' AND new.responsable IS NOT DISTINCT FROM old.responsable THEN
    RETURN new;
  END IF;

  -- Una declaración ya emitida está congelada: no se le tocan los bienes.
  IF coalesce(new.estado, 'BORRADOR') <> 'BORRADOR' THEN
    RETURN new;
  END IF;

  DELETE FROM declaraciones_bienes WHERE declaracion = new.declaracion;

  IF new.responsable IS NULL THEN
    RETURN new;
  END IF;

  INSERT INTO declaraciones_bienes (
    declaracion, ficha, orden,
    rubro, clase, cuenta, marca, grupo,
    detalle, observacion,
    sector, responsable, sede, espacio,
    activo
  )
  SELECT
    new.declaracion,
    b.ficha,
    row_number() OVER (ORDER BY b.ficha),
    b.rubro, b.clase, b.cuenta, b.marca, b.grupo,
    b.detalle, b.observacion,
    ult.sector, ult.responsable, ult.sede, ult.espacio,
    b.activo
  FROM bienes b
  JOIN LATERAL (
    SELECT mb.responsable, mb.sector, mb.sede, mb.espacio
      FROM movimientos_bien mb
      WHERE mb.ficha = b.ficha
      ORDER BY mb.orden DESC
      LIMIT 1
  ) ult ON true
  WHERE ult.responsable = new.responsable
    AND coalesce(upper(btrim(b.activo)), '') <> 'BAJA';

  RETURN new;
END;
$BODY$;

DROP TRIGGER IF EXISTS declaraciones_cargar_bienes_trg ON declaraciones;
CREATE TRIGGER declaraciones_cargar_bienes_trg
  AFTER INSERT OR UPDATE OF responsable
  ON declaraciones
  FOR EACH ROW
  EXECUTE FUNCTION declaraciones_cargar_bienes_trg();


-- Inmutabilidad de los documentos emitidos y firmados.
--
-- IMPORTANTE: NO colgar archivo_borrar_trg de declaraciones_documentos. Ese trigger
-- encola el archivo físico para que el cron de las 23:58 lo borre ante cualquier UPDATE
-- o DELETE. Un documento firmado digitalmente es evidencia y no se borra nunca.

CREATE OR REPLACE FUNCTION declaraciones_documentos_inmutable_trg()
  RETURNS trigger
  LANGUAGE plpgsql
AS $BODY$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Los documentos de la declaración % no se pueden borrar', old.declaracion;
  END IF;

  IF new.archivo IS DISTINCT FROM old.archivo
     OR new.hash_sha256 IS DISTINCT FROM old.hash_sha256
     OR new.codigo_contenido IS DISTINCT FROM old.codigo_contenido
     OR new.version IS DISTINCT FROM old.version
     OR new.tipo IS DISTINCT FROM old.tipo
  THEN
    RAISE EXCEPTION 'El documento (declaración %, versión %, %) ya fue emitido y no puede alterarse',
      old.declaracion, old.version, old.tipo;
  END IF;

  RETURN new;
END;
$BODY$;

DROP TRIGGER IF EXISTS declaraciones_documentos_inmutable_trg ON declaraciones_documentos;
CREATE TRIGGER declaraciones_documentos_inmutable_trg
  BEFORE UPDATE OR DELETE
  ON declaraciones_documentos
  FOR EACH ROW
  EXECUTE FUNCTION declaraciones_documentos_inmutable_trg();
