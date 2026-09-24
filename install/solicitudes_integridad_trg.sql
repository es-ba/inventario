CREATE OR REPLACE FUNCTION solicitud_contenido_inmutable_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.estado <> 'B' THEN
      RAISE EXCEPTION 'La solicitud % salió de borrador y no se puede borrar', OLD.acta;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.estado <> 'B' THEN
    v_old := to_jsonb(OLD) - ARRAY['estado','fecha_modificacion','usuario_modificacion'];
    v_new := to_jsonb(NEW) - ARRAY['estado','fecha_modificacion','usuario_modificacion'];
    IF v_old IS DISTINCT FROM v_new THEN
      RAISE EXCEPTION 'La solicitud % salió de borrador y su contenido no se puede modificar', OLD.acta;
    END IF;
  END IF;
  RETURN NEW;
END;
$BODY$;

DROP TRIGGER IF EXISTS solicitud_contenido_inmutable_trg ON movimientos_solicitudes;
CREATE TRIGGER solicitud_contenido_inmutable_trg
  BEFORE UPDATE OR DELETE ON movimientos_solicitudes
  FOR EACH ROW EXECUTE FUNCTION solicitud_contenido_inmutable_trg();

CREATE OR REPLACE FUNCTION solicitud_bienes_bloqueo_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_acta bigint;
  v_estado text;
BEGIN
  v_acta := CASE WHEN TG_OP = 'DELETE' THEN OLD.acta ELSE NEW.acta END;
  SELECT estado INTO v_estado FROM movimientos_solicitudes WHERE acta = v_acta FOR UPDATE;
  IF v_estado IS DISTINCT FROM 'B' THEN
    RAISE EXCEPTION 'La solicitud % salió de borrador y sus bienes no se pueden modificar', v_acta;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.acta IS DISTINCT FROM OLD.acta THEN
    SELECT estado INTO v_estado FROM movimientos_solicitudes WHERE acta = OLD.acta FOR UPDATE;
    IF v_estado IS DISTINCT FROM 'B' THEN
      RAISE EXCEPTION 'La solicitud % salió de borrador y sus bienes no se pueden modificar', OLD.acta;
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$BODY$;

DROP TRIGGER IF EXISTS solicitud_bienes_bloqueo_trg ON movimientos_solicitud_bien;
CREATE TRIGGER solicitud_bienes_bloqueo_trg
  BEFORE INSERT OR UPDATE OR DELETE ON movimientos_solicitud_bien
  FOR EACH ROW EXECUTE FUNCTION solicitud_bienes_bloqueo_trg();

CREATE OR REPLACE FUNCTION movimiento_solicitud_inmutable_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $BODY$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.acta_origen IS NOT NULL AND (
       pg_trigger_depth() < 2 OR
       nullif(current_setting('inventario.acta_origen_permitida', true), '')
         IS DISTINCT FROM NEW.acta_origen::text) THEN
      RAISE EXCEPTION 'La solicitud de origen sólo puede asignarse durante el procesamiento de la solicitud';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.acta_origen IS DISTINCT FROM OLD.acta_origen THEN
    RAISE EXCEPTION 'El origen de un movimiento no se puede modificar';
  END IF;
  IF OLD.acta_origen IS NOT NULL THEN
    RAISE EXCEPTION 'El movimiento proviene de la solicitud % y no se puede modificar', OLD.acta_origen;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$BODY$;

DROP TRIGGER IF EXISTS movimiento_solicitud_inmutable_trg ON movimientos_bien;
CREATE TRIGGER movimiento_solicitud_inmutable_trg
  BEFORE INSERT OR UPDATE OR DELETE ON movimientos_bien
  FOR EACH ROW EXECUTE FUNCTION movimiento_solicitud_inmutable_trg();
