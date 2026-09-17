CREATE OR REPLACE FUNCTION responsable_admitido_en_sector(p_responsable text, p_sector text)
RETURNS boolean
  LANGUAGE SQL STABLE SECURITY DEFINER
AS
$BODY$
  SELECT p_responsable IS NULL OR p_sector IS NULL
    OR EXISTS (SELECT 1 FROM responsables r WHERE r.responsable = p_responsable AND r.sector = p_sector)
    OR EXISTS (SELECT 1 FROM sectores s WHERE s.sector = p_sector AND s.responsable = p_responsable);
$BODY$;

CREATE OR REPLACE FUNCTION espacio_admitido_en_sector(p_espacio text, p_sector text)
RETURNS boolean
  LANGUAGE SQL STABLE SECURITY DEFINER
AS
$BODY$
  SELECT p_espacio IS NULL OR p_sector IS NULL
    OR EXISTS (SELECT 1 FROM espacios e WHERE e.espacio = p_espacio AND e.sector = p_sector);
$BODY$;

CREATE OR REPLACE FUNCTION solicitud_responsable_sector_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $BODY$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.responsable IS NOT DISTINCT FROM OLD.responsable
     AND NEW.espacio IS NOT DISTINCT FROM OLD.espacio
     AND NEW.sector IS NOT DISTINCT FROM OLD.sector THEN
    RETURN NEW;
  END IF;
  IF NOT responsable_admitido_en_sector(NEW.responsable, NEW.sector) THEN
    RAISE EXCEPTION 'El responsable % no pertenece al sector %', NEW.responsable, NEW.sector;
  END IF;
  IF NOT espacio_admitido_en_sector(NEW.espacio, NEW.sector) THEN
    RAISE EXCEPTION 'El espacio % no pertenece al sector %', NEW.espacio, NEW.sector;
  END IF;
  RETURN NEW;
END;
$BODY$;

DROP TRIGGER IF EXISTS solicitud_responsable_sector_trg ON movimientos_solicitudes;
CREATE TRIGGER solicitud_responsable_sector_trg
  BEFORE INSERT OR UPDATE OF responsable, espacio, sector ON movimientos_solicitudes
  FOR EACH ROW EXECUTE FUNCTION solicitud_responsable_sector_trg();
