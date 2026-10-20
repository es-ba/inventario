CREATE OR REPLACE FUNCTION sectores_de_la_rama(p_sector text)
RETURNS TABLE (sector text)
  LANGUAGE SQL STABLE
AS
$BODY$
  WITH RECURSIVE rama AS (
    SELECT s.sector
      FROM sectores s
      WHERE s.sector = p_sector
    UNION
    SELECT s.sector
      FROM sectores s
      JOIN rama r ON s.pertenece_a = r.sector
  )
  SELECT sector FROM rama;
$BODY$;
