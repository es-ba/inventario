CREATE OR REPLACE FUNCTION bien_estado_calcular(p_ficha text, p_activo boolean, p_estado_baja text)
  RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER
AS $BODY$
  SELECT CASE
    WHEN p_activo IS NOT TRUE THEN 'BAJA'
    WHEN p_estado_baja = 'SOLICITADA' THEN 'BAJA_EN_TRAMITE'
    WHEN EXISTS (
      SELECT 1
        FROM movimientos_solicitud_bien msb
        JOIN movimientos_solicitudes ms ON ms.acta = msb.acta
       WHERE msb.ficha = p_ficha
         AND ms.estado NOT IN ('B', 'Pr')
    ) THEN 'EN_MOVIMIENTO'
    WHEN (
      SELECT nullif(btrim(mb.sector), '')
        FROM movimientos_bien mb
       WHERE mb.ficha = p_ficha
       ORDER BY mb.orden DESC
       LIMIT 1
    ) IS NOT NULL THEN 'ASIGNADO'
    ELSE 'SIN_ASIGNAR'
  END
$BODY$;

CREATE OR REPLACE FUNCTION bien_estado_recalcular(p_ficha text)
  RETURNS void
  LANGUAGE sql SECURITY DEFINER
AS $BODY$
  UPDATE bienes b
     SET estado = bien_estado_calcular(b.ficha, b.activo, b.estado_baja)
   WHERE b.ficha = p_ficha
     AND b.estado IS DISTINCT FROM bien_estado_calcular(b.ficha, b.activo, b.estado_baja);
$BODY$;

CREATE OR REPLACE FUNCTION movimientos_solicitudes_estado_bien_trg()
  RETURNS trigger
  LANGUAGE plpgsql
AS $BODY$
BEGIN
  IF new.estado IS DISTINCT FROM old.estado THEN
    PERFORM bien_estado_recalcular(msb.ficha)
       FROM movimientos_solicitud_bien msb
      WHERE msb.acta = new.acta;
  END IF;
  RETURN NULL;
END;
$BODY$;

DROP TRIGGER IF EXISTS movimientos_solicitudes_estado_bien_trg ON movimientos_solicitudes;
CREATE TRIGGER movimientos_solicitudes_estado_bien_trg
  AFTER UPDATE OF estado ON movimientos_solicitudes
  FOR EACH ROW EXECUTE FUNCTION movimientos_solicitudes_estado_bien_trg();

CREATE OR REPLACE FUNCTION movimientos_bien_estado_bien_trg()
  RETURNS trigger
  LANGUAGE plpgsql
AS $BODY$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM bien_estado_recalcular(new.ficha);
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') AND (TG_OP = 'DELETE' OR old.ficha IS DISTINCT FROM new.ficha) THEN
    PERFORM bien_estado_recalcular(old.ficha);
  END IF;
  RETURN NULL;
END;
$BODY$;

DROP TRIGGER IF EXISTS movimientos_bien_estado_bien_trg ON movimientos_bien;
CREATE TRIGGER movimientos_bien_estado_bien_trg
  AFTER INSERT OR UPDATE OR DELETE ON movimientos_bien
  FOR EACH ROW EXECUTE FUNCTION movimientos_bien_estado_bien_trg();
