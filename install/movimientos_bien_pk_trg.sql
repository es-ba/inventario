
CREATE or REPLACE FUNCTION get_next_movimiento_number(b_ficha text) RETURNS bigint
  LANGUAGE SQL SECURITY DEFINER
AS
$SQL$
  SELECT coalesce((SELECT max(orden + 1) FROM movimientos_bien WHERE ficha = b_ficha), 1)
$SQL$;

CREATE OR REPLACE FUNCTION movimientos_bien_pk_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql' 
AS $BODY$
declare
  v_ultimo bigint;
begin
  if new.orden <> 0 then
    null;
  else
   	new.orden := get_next_movimiento_number(new.ficha);
  end if;
  return new;
end;
$BODY$;

CREATE TRIGGER movimientos_bien_pk_trg
   before INSERT 
   ON movimientos_bien
   FOR EACH ROW
   EXECUTE PROCEDURE movimientos_bien_pk_trg();   
