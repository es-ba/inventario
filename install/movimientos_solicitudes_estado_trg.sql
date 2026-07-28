CREATE OR REPLACE FUNCTION movimientos_solicitudes_estado_trg()
  RETURNS trigger
  LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_accion text;
  v_condicion text;
  v_cumple boolean;
  v_movimientos_existentes integer;
  v_bienes_solicitud integer;
BEGIN
  IF old.estado IS NOT DISTINCT FROM new.estado THEN
    RETURN new;
  END IF;

  SELECT ea.eaccion, ea.condicion
    INTO v_accion, v_condicion
    FROM estados_acciones ea
    WHERE ea.estado = old.estado
      AND ea.estado_destino = new.estado
    ORDER BY CASE WHEN ea.eaccion = 'procesar' THEN 0 ELSE 1 END, ea.eaccion
    LIMIT 1;

  IF v_accion IS NULL THEN
    RAISE EXCEPTION 'Cambio de estado no permitido: % -> %', old.estado, new.estado;
  END IF;

  IF v_condicion IS NOT NULL THEN
    SELECT accion_cumple_condicion(new.acta, old.estado, v_accion, v_condicion)
      INTO v_cumple;

    IF NOT coalesce(v_cumple, false) THEN
      RAISE EXCEPTION 'No se cumple la condición para ejecutar la acción %', v_accion;
    END IF;
  END IF;

  new.fecha_modificacion := CURRENT_DATE;
  new.usuario_modificacion := coalesce(get_app_user(), new.usuario_modificacion);

  IF new.estado = 'Pr' AND old.estado IS DISTINCT FROM 'Pr' THEN
    SELECT count(*)::integer
      INTO v_movimientos_existentes
      FROM movimientos_bien
      WHERE acta = new.acta;

    IF v_movimientos_existentes > 0 THEN
      RAISE EXCEPTION 'La solicitud % ya tiene movimientos de bienes generados', new.acta;
    END IF;

    SELECT count(*)::integer
      INTO v_bienes_solicitud
      FROM movimientos_solicitud_bien
      WHERE acta = new.acta;

    IF v_bienes_solicitud = 0 THEN
      RAISE EXCEPTION 'La solicitud % no tiene bienes asignados', new.acta;
    END IF;

    INSERT INTO movimientos_bien (
      ficha,
      orden,
      acta,
      tipo_asignacion,
      accion,
      modalidad_uso,
      responsable,
      area,
      sede,
      espacio,
      detalle,
      solicitado_por,
      firmado_por,
      fecha_movimiento,
      fecha_creacion,
      usuario_creacion
    )
    SELECT
      msb.ficha,
      0,
      new.acta,
      new.tipo_asignacion,
      new.accion,
      new.modalidad_uso,
      new.responsable,
      new.area,
      new.sede,
      new.espacio,
      new.detalle,
      new.solicitado_por,
      new.firmado_por,
      CURRENT_DATE,
      CURRENT_DATE,
      coalesce(get_app_user(), new.usuario_modificacion, new.usuario_creacion)
    FROM movimientos_solicitud_bien msb
    WHERE msb.acta = new.acta;
  END IF;

  RETURN new;
END;
$BODY$;

DROP TRIGGER IF EXISTS movimientos_solicitudes_estado_trg ON movimientos_solicitudes;
CREATE TRIGGER movimientos_solicitudes_estado_trg
  BEFORE UPDATE OF estado
  ON movimientos_solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION movimientos_solicitudes_estado_trg();
