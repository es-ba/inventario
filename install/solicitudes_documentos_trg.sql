-- Inmutabilidad de los documentos emitidos de una solicitud.
--
-- Lo que se emitió no cambia: si hay que corregirlo se emite una versión nueva. Lo único
-- que se puede completar después es el archivo firmado que vuelve.
--
-- Borrar sí se puede: una emisión equivocada no tiene por qué quedar para siempre en la
-- lista. Lo que no se admite es alterar una fila para que diga otra cosa.
--
-- Al borrar se encolan los dos archivos —el emitido y el firmado— en archivos_borrar, para
-- que el cron de las 23:58 los saque del disco.
--
-- IMPORTANTE: NO colgar archivo_borrar_trg de esta tabla. Ese trigger encola el archivo
-- ante cualquier UPDATE, y acá los UPDATE son justamente los que agregan el firmado: se
-- perderían los dos archivos. Por eso el encolado va acá, sólo en el DELETE.

CREATE OR REPLACE FUNCTION solicitudes_documentos_inmutable_trg()
  RETURNS trigger
  LANGUAGE plpgsql
AS $BODY$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF old.archivo IS NOT NULL THEN
      INSERT INTO archivos_borrar (ruta_archivo) VALUES (old.archivo);
    END IF;
    IF old.archivo_firmado IS NOT NULL THEN
      INSERT INTO archivos_borrar (ruta_archivo) VALUES (old.archivo_firmado);
    END IF;
    RETURN old;
  END IF;

  IF new.archivo IS DISTINCT FROM old.archivo
     OR new.hash_sha256 IS DISTINCT FROM old.hash_sha256
     OR new.codigo_contenido IS DISTINCT FROM old.codigo_contenido
     OR new.version IS DISTINCT FROM old.version
     OR new.tipo IS DISTINCT FROM old.tipo
     OR new.acta IS DISTINCT FROM old.acta
  THEN
    RAISE EXCEPTION 'El documento (solicitud %, %, versión %) ya fue emitido y no puede alterarse',
      old.acta, old.tipo, old.version;
  END IF;

  RETURN new;
END;
$BODY$;

DROP TRIGGER IF EXISTS solicitudes_documentos_inmutable_trg ON solicitudes_documentos;
CREATE TRIGGER solicitudes_documentos_inmutable_trg
  BEFORE UPDATE OR DELETE
  ON solicitudes_documentos
  FOR EACH ROW
  EXECUTE FUNCTION solicitudes_documentos_inmutable_trg();
