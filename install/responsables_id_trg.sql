
CREATE OR REPLACE FUNCTION responsables_id_trg()
  RETURNS TRIGGER
  LANGUAGE PLPGSQL
AS
$BODY$
DECLARE
  v_letras text := translate(
    upper(substr(coalesce(btrim(new.apellido), ''), 1, 2)),
    'ÄËÏÖÜÑÁÉÍÓÚ',
    'AEIOUNAEIOU'
  );
  v_numero integer;
BEGIN
  IF length(v_letras) < 2 THEN
    RETURN new;
  END IF;

  IF new.responsable IS NULL OR substr(new.responsable, 1, 2) IS DISTINCT FROM v_letras THEN
    SELECT max(CAST(nullif(
        translate(responsable, translate(responsable, '0123456789', ''), ''), ''
      ) AS INTEGER))
      INTO v_numero
      FROM responsables
      WHERE substr(responsable, 1, 2) = v_letras;

    new.responsable := v_letras || (COALESCE(v_numero, 0) + 1);
  END IF;

  RETURN new;
END;
$BODY$;

CREATE TRIGGER responsables_id_trg
  BEFORE INSERT OR UPDATE OF apellido, responsable
  ON responsables
  FOR EACH ROW
  EXECUTE PROCEDURE responsables_id_trg();
