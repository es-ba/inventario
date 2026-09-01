CREATE OR REPLACE FUNCTION sector_responsable(p_responsable text)
RETURNS text
  LANGUAGE SQL STABLE SECURITY DEFINER
AS
$BODY$
  SELECT nullif(btrim(r.sector), '')
    FROM responsables r
    WHERE r.responsable = p_responsable;
$BODY$;
