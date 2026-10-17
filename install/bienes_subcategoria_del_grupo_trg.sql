CREATE OR REPLACE FUNCTION bienes_subcategoria_del_grupo_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_subcategoria text;
BEGIN
  IF NEW.grupo IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.subcategoria IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND (
       NEW.grupo IS NOT DISTINCT FROM OLD.grupo
       OR NEW.subcategoria IS DISTINCT FROM OLD.subcategoria
     ) THEN
    RETURN NEW;
  END IF;
  SELECT g.subcategoria INTO v_subcategoria FROM grupos g WHERE g.grupo = NEW.grupo;
  IF v_subcategoria IS NOT NULL THEN
    NEW.subcategoria := v_subcategoria;
  END IF;
  RETURN NEW;
END;
$BODY$;

DROP TRIGGER IF EXISTS bienes_subcategoria_del_grupo_trg ON bienes;
CREATE TRIGGER bienes_subcategoria_del_grupo_trg
  BEFORE INSERT OR UPDATE OF grupo ON bienes
  FOR EACH ROW EXECUTE FUNCTION bienes_subcategoria_del_grupo_trg();
