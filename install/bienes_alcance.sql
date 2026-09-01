CREATE OR REPLACE FUNCTION bienes_alcance()
RETURNS TABLE (ficha text)
  LANGUAGE SQL STABLE SECURITY DEFINER
AS
$BODY$
  WITH capacidades AS (
    SELECT coalesce(puede_ver_propio, false)       AS propio,
           coalesce(puede_ver_dependientes, false) AS dependientes
      FROM roles WHERE rol = get_app_user('rol')
  ),
  mis_sectores AS (
    SELECT s.sector
      FROM sectores s
      WHERE nullif(get_app_user('sector'), '') IS NOT NULL
        AND sector_pertenece(s.sector, nullif(get_app_user('sector'), ''))
  ),
  mis_personas AS (
    SELECT r.responsable
      FROM responsables r
      WHERE r.sector IN (SELECT sector FROM mis_sectores)
  ),
  ultimo AS (
    SELECT DISTINCT ON (mb.ficha)
           mb.ficha,
           nullif(btrim(mb.responsable), '')         AS responsable,
           nullif(btrim(mb.enusode_responsable), '') AS enusode_responsable
      FROM movimientos_bien mb
      ORDER BY mb.ficha, mb.orden DESC
  )
  SELECT u.ficha
    FROM ultimo u
    CROSS JOIN capacidades c
    WHERE (
            c.propio
            AND nullif(get_app_user('responsable'), '') IN (u.responsable, u.enusode_responsable)
          )
       OR (
            c.dependientes
            AND (   u.responsable         IN (SELECT responsable FROM mis_personas)
                 OR u.enusode_responsable IN (SELECT responsable FROM mis_personas))
          );
$BODY$;
