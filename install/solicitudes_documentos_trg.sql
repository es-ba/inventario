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
