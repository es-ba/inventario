CREATE OR REPLACE FUNCTION resolver_destino(
  p_ficha text,
  p_cambios jsonb DEFAULT '{}'::jsonb,
  p_campos_vaciar jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_activo boolean;
  v_actual movimientos_bien%ROWTYPE;
  v_resultado jsonb;
  v_espacio record;
  v_campo text;
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

  SELECT * INTO v_actual
    FROM movimientos_bien
    WHERE ficha = p_ficha
    ORDER BY orden DESC
    LIMIT 1;

  v_resultado := jsonb_build_object(
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

  FOREACH v_campo IN ARRAY v_campos LOOP
    IF p_campos_vaciar ? v_campo THEN
      v_resultado := jsonb_set(v_resultado, ARRAY[v_campo], 'null'::jsonb);
    ELSIF p_cambios ? v_campo AND p_cambios -> v_campo <> 'null'::jsonb THEN
      v_resultado := jsonb_set(v_resultado, ARRAY[v_campo], p_cambios -> v_campo);
    END IF;
  END LOOP;

  IF p_cambios ? 'espacio' AND NOT (p_campos_vaciar ? 'espacio') THEN
    SELECT sector, sede INTO v_espacio
      FROM espacios WHERE espacio = v_resultado ->> 'espacio';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No existe el espacio %', v_resultado ->> 'espacio';
    END IF;
    IF NOT (p_cambios ? 'sector') AND NOT (p_campos_vaciar ? 'sector') THEN
      v_resultado := jsonb_set(v_resultado, '{sector}', to_jsonb(v_espacio.sector));
    END IF;
    IF NOT (p_cambios ? 'sede') AND NOT (p_campos_vaciar ? 'sede') THEN
      v_resultado := jsonb_set(v_resultado, '{sede}', to_jsonb(v_espacio.sede));
    END IF;
  END IF;

  IF nullif(v_resultado ->> 'espacio', '') IS NOT NULL THEN
    SELECT sector, sede INTO v_espacio
      FROM espacios WHERE espacio = v_resultado ->> 'espacio';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No existe el espacio %', v_resultado ->> 'espacio';
    END IF;
    IF v_espacio.sector IS DISTINCT FROM nullif(v_resultado ->> 'sector', '') THEN
      RAISE EXCEPTION 'El espacio % no pertenece al sector indicado', v_resultado ->> 'espacio';
    END IF;
    IF v_espacio.sede IS NOT NULL
       AND v_espacio.sede IS DISTINCT FROM nullif(v_resultado ->> 'sede', '') THEN
      RAISE EXCEPTION 'El espacio % no pertenece a la sede indicada', v_resultado ->> 'espacio';
    END IF;
  END IF;

  RETURN v_resultado;
END;
$BODY$;
