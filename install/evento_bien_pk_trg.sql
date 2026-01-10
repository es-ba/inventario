CREATE OR REPLACE FUNCTION get_next_historial_evento_orden(b_ficha text)
RETURNS bigint
LANGUAGE SQL
SECURITY DEFINER
AS
$SQL$
  SELECT coalesce(
    (SELECT max(orden + 1)
       FROM historial_evento_bien
      WHERE ficha = b_ficha),
    1
  )
$SQL$;

CREATE OR REPLACE FUNCTION historial_evento_bien_pk_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $BODY$
BEGIN
  IF NEW.orden <> 0 THEN
    NULL;
  ELSE
    NEW.orden := get_next_historial_evento_orden(NEW.ficha);
  END IF;

  RETURN NEW;
END;
$BODY$;

CREATE TRIGGER historial_evento_bien_pk_trg
BEFORE INSERT
ON historial_evento_bien
FOR EACH ROW
EXECUTE PROCEDURE historial_evento_bien_pk_trg();
