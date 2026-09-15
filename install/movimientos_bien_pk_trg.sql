
CREATE or REPLACE FUNCTION get_next_movimiento_number(b_ficha text) RETURNS bigint
  LANGUAGE plpgsql SECURITY DEFINER
AS
$BODY$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(b_ficha, 0));
  RETURN coalesce((SELECT max(orden + 1) FROM movimientos_bien WHERE ficha = b_ficha), 1);
END;
$BODY$;

CREATE OR REPLACE FUNCTION movimientos_bien_pk_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql' 
AS $BODY$
declare
  v_ultimo bigint;
begin
  if coalesce(new.orden, 0) <> 0 then
    null;
  else
   	new.orden := get_next_movimiento_number(new.ficha);
  end if;
  return new;
end;
$BODY$;

DROP TRIGGER IF EXISTS movimientos_bien_pk_trg ON movimientos_bien;
CREATE TRIGGER movimientos_bien_pk_trg
   before INSERT 
   ON movimientos_bien
   FOR EACH ROW
   EXECUTE PROCEDURE movimientos_bien_pk_trg();   
