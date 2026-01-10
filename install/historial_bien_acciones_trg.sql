CREATE OR REPLACE FUNCTION bienes_auditar_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_orden bigint;
  v_old jsonb;
  v_new jsonb;
  v_key text;
  v_ficha text;
BEGIN
  v_ficha := CASE WHEN TG_OP = 'DELETE' THEN OLD.ficha ELSE NEW.ficha END;

  INSERT INTO historial_evento_bien (
    ficha, orden, fecha, usuario, accion, origen
  )
  VALUES (
    v_ficha,
    0,
    now(),
    current_user,
    CASE TG_OP
      WHEN 'INSERT' THEN 'alta'
      WHEN 'DELETE' THEN 'baja'
      ELSE 'edicion'
    END,
    'sistema'
  );

  -- obtener el orden recién asignado
  SELECT max(orden)
    INTO v_orden
    FROM historial_evento_bien
   WHERE ficha = v_ficha;

  -- INSERT / DELETE: evento global
  IF TG_OP IN ('INSERT','DELETE') THEN
    INSERT INTO historial_bienes (
      ficha, orden, campo,
      valor_anterior, valor_nuevo,
      fecha, usuario, accion, origen
    )
    VALUES (
      v_ficha,
      v_orden,
      '*',
      CASE WHEN TG_OP='DELETE' THEN 'EXISTENTE' ELSE NULL END,
      CASE WHEN TG_OP='INSERT' THEN 'CREADO' ELSE 'ELIMINADO' END,
      now(),
      current_user,
      CASE TG_OP WHEN 'INSERT' THEN 'alta' ELSE 'baja' END,
      'sistema'
    );
    RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- UPDATE: diff dinámico
  v_old := to_jsonb(OLD);
  v_new := to_jsonb(NEW);

  FOR v_key IN SELECT key FROM jsonb_each(v_new)
  LOOP
    IF v_key = 'ficha' THEN CONTINUE; END IF;

    IF v_new -> v_key IS DISTINCT FROM v_old -> v_key THEN
      INSERT INTO historial_bienes (
        ficha, orden, campo,
        valor_anterior, valor_nuevo,
        fecha, usuario, accion, origen
      )
      VALUES (
        v_ficha,
        v_orden,
        v_key,
        v_old ->> v_key,
        v_new ->> v_key,
        now(),
        current_user,
        'edicion',
        'sistema'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$BODY$;

CREATE TRIGGER bienes_auditar_trg
BEFORE INSERT OR UPDATE OR DELETE
ON bienes
FOR EACH ROW
EXECUTE PROCEDURE bienes_auditar_trg();
