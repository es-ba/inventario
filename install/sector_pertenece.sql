CREATE OR REPLACE FUNCTION sector_pertenece(
    p_sector text,
    p_pertenece_a text,
    p_iteraciones numeric = 10
) RETURNS boolean
  LANGUAGE SQL STABLE
AS
$BODY$
  SELECT CASE p_iteraciones WHEN 0 THEN NULL
      ELSE sector IS NOT NULL
        AND (sector = p_pertenece_a
             OR sector_pertenece(pertenece_a, p_pertenece_a, p_iteraciones - 1)) IS TRUE
    END
    FROM sectores WHERE sector = p_sector;
$BODY$;
