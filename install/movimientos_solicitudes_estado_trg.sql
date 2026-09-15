CREATE OR REPLACE FUNCTION movimientos_solicitudes_estado_trg()
  RETURNS trigger
  LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_accion text;
  v_condicion text;
  v_cumple boolean;
  v_bienes_solicitud integer;
  v_desactualizados integer;
  v_inactivos integer;
BEGIN
  IF old.estado IS NOT DISTINCT FROM new.estado THEN
    RETURN new;
  END IF;

  IF old.estado = 'Pr' THEN
    RAISE EXCEPTION 'La solicitud % está procesada y no puede cambiar de estado', old.acta;
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

  -- Al salir de borrador queda congelado el destino completo que se revisa.
  IF old.estado = 'B' AND new.estado <> 'B' THEN
    PERFORM 1
      FROM bienes b
      JOIN movimientos_solicitud_bien msb ON msb.ficha = b.ficha
      WHERE msb.acta = new.acta
      ORDER BY b.ficha
      FOR UPDATE OF b;

    UPDATE movimientos_solicitud_bien msb
      SET destino = resolver_destino(
            msb.ficha,
            jsonb_strip_nulls(jsonb_build_object(
              'tipo_asignacion', new.tipo_asignacion,
              'modalidad_uso', new.modalidad_uso,
              'responsable', new.responsable,
              'sector', new.sector,
              'sede', new.sede,
              'espacio', new.espacio,
              'puesto', new.puesto,
              'enusode_responsable', new.enusode_responsable
            )),
            coalesce(new.campos_vaciar, '[]'::jsonb)
          ),
          origen = resolver_destino(msb.ficha, '{}'::jsonb, '[]'::jsonb),
          orden_origen = coalesce((
            SELECT max(mb.orden) FROM movimientos_bien mb WHERE mb.ficha = msb.ficha
          ), 0)
      WHERE msb.acta = new.acta;
  END IF;

  IF new.estado = 'Pr' AND old.estado IS DISTINCT FROM 'Pr' THEN
    PERFORM 1
      FROM bienes b
      JOIN movimientos_solicitud_bien msb ON msb.ficha = b.ficha
      WHERE msb.acta = new.acta
      ORDER BY b.ficha
      FOR UPDATE OF b;

    SELECT count(*)::integer
      INTO v_bienes_solicitud
      FROM movimientos_solicitud_bien
      WHERE acta = new.acta;

    IF v_bienes_solicitud = 0 THEN
      RAISE EXCEPTION 'La solicitud % no tiene bienes asignados', new.acta;
    END IF;

    SELECT count(*)::integer
      INTO v_inactivos
      FROM movimientos_solicitud_bien msb
      LEFT JOIN bienes b ON b.ficha = msb.ficha
      WHERE msb.acta = new.acta
        AND b.activo IS NOT TRUE;
    IF v_inactivos > 0 THEN
      RAISE EXCEPTION 'La solicitud contiene % bien(es) inactivo(s) o sin acceso y no se puede procesar',
        v_inactivos;
    END IF;

    SELECT count(*)::integer INTO v_desactualizados
      FROM movimientos_solicitud_bien msb
      WHERE msb.acta = new.acta
        AND (
          coalesce((SELECT max(mb.orden) FROM movimientos_bien mb WHERE mb.ficha = msb.ficha), 0)
            IS DISTINCT FROM msb.orden_origen
          OR resolver_destino(msb.ficha, '{}'::jsonb, '[]'::jsonb)
            IS DISTINCT FROM msb.origen
        );
    IF v_desactualizados > 0 THEN
      RAISE EXCEPTION 'La asignación de % bien(es) cambió; hay que volver a borrador y revisar la solicitud',
        v_desactualizados;
    END IF;

    PERFORM set_config('inventario.acta_origen_permitida', new.acta::text, true);
    INSERT INTO movimientos_bien (
      ficha,
      orden,
      tipo_asignacion,
      accion,
      modalidad_uso,
      responsable,
      sector,
      sede,
      espacio,
      puesto,
      enusode_responsable,
      detalle,
      autorizado_por,
      firmado_por,
      fecha_movimiento,
      fecha_creacion,
      usuario_creacion,
      acta_origen
    )
    SELECT
      msb.ficha,
      0,
      msb.destino ->> 'tipo_asignacion',
      new.accion,
      msb.destino ->> 'modalidad_uso',
      msb.destino ->> 'responsable',
      msb.destino ->> 'sector',
      msb.destino ->> 'sede',
      msb.destino ->> 'espacio',
      nullif(msb.destino ->> 'puesto', '')::integer,
      msb.destino ->> 'enusode_responsable',
      new.detalle,
      new.autorizado_por,
      new.firmado_por,
      CURRENT_DATE,
      CURRENT_DATE,
      coalesce(get_app_user(), new.usuario_modificacion, new.usuario_creacion),
      new.acta
    FROM movimientos_solicitud_bien msb
    WHERE msb.acta = new.acta;
    PERFORM set_config('inventario.acta_origen_permitida', '', true);
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
