CREATE OR REPLACE FUNCTION sector_texto_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $BODY$
BEGIN
  IF TG_OP = 'UPDATE' AND (
       NEW.sector IS NOT DISTINCT FROM OLD.sector
       OR (OLD.sector IS NOT NULL AND NEW.sector IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM sectores s WHERE s.sector = OLD.sector))
     ) THEN
    NEW.sector_sigla := OLD.sector_sigla;
    NEW.sector_nombre := OLD.sector_nombre;
    RETURN NEW;
  END IF;
  NEW.sector_sigla := NULL;
  NEW.sector_nombre := NULL;
  SELECT s.sigla, s.nombre_sector
    INTO NEW.sector_sigla, NEW.sector_nombre
    FROM sectores s
    WHERE s.sector = NEW.sector;
  RETURN NEW;
END;
$BODY$;

DROP TRIGGER IF EXISTS sector_texto_trg ON movimientos_bien;
CREATE TRIGGER sector_texto_trg
  BEFORE INSERT OR UPDATE ON movimientos_bien
  FOR EACH ROW EXECUTE FUNCTION sector_texto_trg();

DROP TRIGGER IF EXISTS sector_texto_trg ON movimientos_solicitudes;
CREATE TRIGGER sector_texto_trg
  BEFORE INSERT OR UPDATE ON movimientos_solicitudes
  FOR EACH ROW EXECUTE FUNCTION sector_texto_trg();
