CREATE OR REPLACE FUNCTION responsables_id_trg()
  RETURNS TRIGGER
  LANGUAGE PLPGSQL
AS
$BODY$
DECLARE
  v_prefijo text := upper(translate(
    substr(coalesce(btrim(new.apellido), ''), 1, 2),
    'áéíóúäëïöüñÁÉÍÓÚÄËÏÖÜÑ',
    'aeiouaeiounAEIOUAEIOUN'
  )) || 'I';
  v_numero integer;
BEGIN
  IF nullif(btrim(new.idper), '') IS NOT NULL THEN
    new.responsable := new.idper;
    RETURN new;
  END IF;

  IF length(v_prefijo) < 3 THEN
    RETURN new;
  END IF;

  SELECT max(substr(responsable, 4)::integer)
    INTO v_numero
    FROM responsables
    WHERE left(responsable, 3) = v_prefijo
      AND substr(responsable, 4) ~ '^[0-9]+$';

  new.responsable := v_prefijo || (coalesce(v_numero, 0) + 1);
  RETURN new;
END;
$BODY$;

DROP TRIGGER IF EXISTS responsables_id_trg ON responsables;
CREATE TRIGGER responsables_id_trg
  BEFORE INSERT
  ON responsables
  FOR EACH ROW
  EXECUTE PROCEDURE responsables_id_trg();
