CREATE OR REPLACE FUNCTION asignacion_actual(p_ficha text)
RETURNS jsonb
LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_actual movimientos_bien%ROWTYPE;
BEGIN
  SELECT * INTO v_actual
    FROM movimientos_bien
    WHERE ficha = p_ficha
    ORDER BY orden DESC
    LIMIT 1;

  RETURN jsonb_build_object(
    'tipo_asignacion', v_actual.tipo_asignacion,
    'modalidad_uso', v_actual.modalidad_uso,
    'responsable', v_actual.responsable,
    'sector', v_actual.sector,
    'sede', v_actual.sede,
    'espacio', v_actual.espacio,
    'puesto', v_actual.puesto,
    'enusode', v_actual.enusode,
    'enusode_responsable', v_actual.enusode_responsable
  );
END;
$BODY$;

CREATE OR REPLACE FUNCTION resolver_destino(
  p_ficha text,
  p_cambios jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_activo boolean;
  v_resultado jsonb := '{}'::jsonb;
  v_espacio record;
  v_campo text;
  v_valor jsonb;
  v_campos constant text[] := ARRAY[
    'tipo_asignacion','modalidad_uso','responsable','sector','sede','espacio',
    'puesto','enusode','enusode_responsable'
  ];
BEGIN
  SELECT activo INTO v_activo FROM bienes WHERE ficha = p_ficha FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe el bien %', p_ficha;
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El bien % está inactivo y no se puede mover', p_ficha;
  END IF;

  FOREACH v_campo IN ARRAY v_campos LOOP
    v_valor := p_cambios -> v_campo;
    v_resultado := jsonb_set(
      v_resultado, ARRAY[v_campo],
      coalesce(nullif(v_valor, 'null'::jsonb), 'null'::jsonb)
    );
  END LOOP;

  IF nullif(v_resultado ->> 'espacio', '') IS NOT NULL THEN
    SELECT sector, sede INTO v_espacio
      FROM espacios WHERE espacio = v_resultado ->> 'espacio';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No existe el espacio %', v_resultado ->> 'espacio';
    END IF;
    IF nullif(v_resultado ->> 'sector', '') IS NOT NULL
       AND v_espacio.sector IS DISTINCT FROM nullif(v_resultado ->> 'sector', '') THEN
      RAISE EXCEPTION 'El espacio % no pertenece al sector indicado', v_resultado ->> 'espacio';
    END IF;
    IF nullif(v_resultado ->> 'sede', '') IS NOT NULL
       AND v_espacio.sede IS DISTINCT FROM nullif(v_resultado ->> 'sede', '') THEN
      RAISE EXCEPTION 'El espacio % no pertenece a la sede indicada', v_resultado ->> 'espacio';
    END IF;
  END IF;

  RETURN v_resultado;
END;
$BODY$;
