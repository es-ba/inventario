CREATE OR REPLACE FUNCTION ficha_sugerida()
RETURNS text
  LANGUAGE SQL STABLE SECURITY DEFINER
AS
$BODY$
  SELECT (coalesce(max(ficha::numeric), 0) + 1)::text
    FROM bienes
    WHERE ficha ~ '^[0-9]+$';
$BODY$;
