CREATE OR REPLACE FUNCTION registrar_cambio_bien(
  p_ficha text,
  p_orden bigint,
  p_campo text,
  p_valor_anterior text,
  p_valor_nuevo text,
  p_accion text
)
RETURNS void
LANGUAGE plpgsql
AS $BODY$
BEGIN
  INSERT INTO historial_bienes (
    ficha,
    orden,
    campo,
    valor_anterior,
    valor_nuevo,
    fecha,
    usuario,
    accion,
    origen
  )
  VALUES (
    p_ficha,
    p_orden,
    p_campo,
    p_valor_anterior,
    p_valor_nuevo,
    now(),
    usuario_trazabilidad(),
    p_accion,
    'sistema'
  );
END;
$BODY$;

CREATE OR REPLACE FUNCTION bien_atributo_trazabilidad_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_orden bigint;
BEGIN
  IF TG_OP = 'UPDATE'
     AND ROW(OLD.ficha, OLD.atributo, OLD.valor)
         IS NOT DISTINCT FROM ROW(NEW.ficha, NEW.atributo, NEW.valor)
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.ficha IS DISTINCT FROM NEW.ficha THEN
    v_orden := registrar_evento_bien(OLD.ficha, 'atributo_baja');
    PERFORM registrar_cambio_bien(
      OLD.ficha,
      v_orden,
      'atributo:' || OLD.atributo,
      OLD.valor,
      NULL,
      'atributo_baja'
    );

    v_orden := registrar_evento_bien(NEW.ficha, 'atributo_alta');
    PERFORM registrar_cambio_bien(
      NEW.ficha,
      v_orden,
      'atributo:' || NEW.atributo,
      NULL,
      NEW.valor,
      'atributo_alta'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_orden := registrar_evento_bien(NEW.ficha, 'atributo_alta');
    PERFORM registrar_cambio_bien(
      NEW.ficha,
      v_orden,
      'atributo:' || NEW.atributo,
      NULL,
      NEW.valor,
      'atributo_alta'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_orden := registrar_evento_bien(OLD.ficha, 'atributo_baja');
    PERFORM registrar_cambio_bien(
      OLD.ficha,
      v_orden,
      'atributo:' || OLD.atributo,
      OLD.valor,
      NULL,
      'atributo_baja'
    );
    RETURN OLD;
  END IF;

  v_orden := registrar_evento_bien(NEW.ficha, 'atributo_modificacion');

  IF OLD.atributo IS DISTINCT FROM NEW.atributo THEN
    PERFORM registrar_cambio_bien(
      NEW.ficha,
      v_orden,
      'atributo:' || OLD.atributo,
      OLD.valor,
      NULL,
      'atributo_modificacion'
    );
    PERFORM registrar_cambio_bien(
      NEW.ficha,
      v_orden,
      'atributo:' || NEW.atributo,
      NULL,
      NEW.valor,
      'atributo_modificacion'
    );
  ELSE
    PERFORM registrar_cambio_bien(
      NEW.ficha,
      v_orden,
      'atributo:' || NEW.atributo,
      OLD.valor,
      NEW.valor,
      'atributo_modificacion'
    );
  END IF;

  RETURN NEW;
END;
$BODY$;

DROP TRIGGER IF EXISTS bien_atributo_trazabilidad_trg ON bien_atributo;
CREATE TRIGGER bien_atributo_trazabilidad_trg
AFTER INSERT OR UPDATE OR DELETE
ON bien_atributo
FOR EACH ROW
EXECUTE FUNCTION bien_atributo_trazabilidad_trg();

CREATE OR REPLACE FUNCTION adjuntos_bienes_trazabilidad_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_orden bigint;
  v_accion text;
  v_ficha text;
  v_numero bigint;
  v_valor_anterior text;
  v_valor_nuevo text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND ROW(OLD.ficha, OLD.numero_adjunto, OLD.archivo, OLD.detalle)
         IS NOT DISTINCT FROM ROW(NEW.ficha, NEW.numero_adjunto, NEW.archivo, NEW.detalle)
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.ficha IS DISTINCT FROM NEW.ficha THEN
    v_orden := registrar_evento_bien(OLD.ficha, 'documentacion_baja');
    PERFORM registrar_cambio_bien(
      OLD.ficha,
      v_orden,
      'documentacion_bien:' || OLD.numero_adjunto::text,
      concat_ws(' | ', OLD.archivo, OLD.detalle),
      NULL,
      'documentacion_baja'
    );

    v_orden := registrar_evento_bien(NEW.ficha, 'documentacion_alta');
    PERFORM registrar_cambio_bien(
      NEW.ficha,
      v_orden,
      'documentacion_bien:' || NEW.numero_adjunto::text,
      NULL,
      concat_ws(' | ', NEW.archivo, NEW.detalle),
      'documentacion_alta'
    );
    RETURN NEW;
  END IF;

  v_accion := CASE TG_OP
    WHEN 'INSERT' THEN 'documentacion_alta'
    WHEN 'DELETE' THEN 'documentacion_baja'
    ELSE 'documentacion_modificacion'
  END;
  v_ficha := CASE WHEN TG_OP = 'DELETE' THEN OLD.ficha ELSE NEW.ficha END;
  v_numero := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.numero_adjunto
    ELSE NEW.numero_adjunto
  END;
  v_valor_anterior := CASE
    WHEN TG_OP IN ('UPDATE', 'DELETE') THEN concat_ws(' | ', OLD.archivo, OLD.detalle)
    ELSE NULL
  END;
  v_valor_nuevo := CASE
    WHEN TG_OP IN ('INSERT', 'UPDATE') THEN concat_ws(' | ', NEW.archivo, NEW.detalle)
    ELSE NULL
  END;

  v_orden := registrar_evento_bien(v_ficha, v_accion);
  PERFORM registrar_cambio_bien(
    v_ficha,
    v_orden,
    'documentacion_bien:' || v_numero::text,
    v_valor_anterior,
    v_valor_nuevo,
    v_accion
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$BODY$;

DROP TRIGGER IF EXISTS adjuntos_bienes_trazabilidad_trg ON adjuntos_bienes;
CREATE TRIGGER adjuntos_bienes_trazabilidad_trg
AFTER INSERT OR UPDATE OR DELETE
ON adjuntos_bienes
FOR EACH ROW
EXECUTE FUNCTION adjuntos_bienes_trazabilidad_trg();

CREATE OR REPLACE FUNCTION adjuntos_solicitudes_trazabilidad_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_ficha text;
  v_orden bigint;
  v_accion text;
  v_acta text;
  v_numero bigint;
  v_valor_anterior text;
  v_valor_nuevo text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND ROW(OLD.acta, OLD.numero_adjunto, OLD.archivo, OLD.detalle)
         IS NOT DISTINCT FROM ROW(NEW.acta, NEW.numero_adjunto, NEW.archivo, NEW.detalle)
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.acta IS DISTINCT FROM NEW.acta THEN
    FOR v_ficha IN
      SELECT msb.ficha
        FROM movimientos_solicitud_bien msb
       WHERE msb.acta = OLD.acta
    LOOP
      v_orden := registrar_evento_bien(v_ficha, 'documentacion_baja');
      PERFORM registrar_cambio_bien(
        v_ficha,
        v_orden,
        'documentacion_solicitud:' || OLD.acta || ':' || OLD.numero_adjunto::text,
        concat_ws(' | ', OLD.archivo, OLD.detalle),
        NULL,
        'documentacion_baja'
      );
    END LOOP;

    FOR v_ficha IN
      SELECT msb.ficha
        FROM movimientos_solicitud_bien msb
       WHERE msb.acta = NEW.acta
    LOOP
      v_orden := registrar_evento_bien(v_ficha, 'documentacion_alta');
      PERFORM registrar_cambio_bien(
        v_ficha,
        v_orden,
        'documentacion_solicitud:' || NEW.acta || ':' || NEW.numero_adjunto::text,
        NULL,
        concat_ws(' | ', NEW.archivo, NEW.detalle),
        'documentacion_alta'
      );
    END LOOP;
    RETURN NEW;
  END IF;

  v_accion := CASE TG_OP
    WHEN 'INSERT' THEN 'documentacion_alta'
    WHEN 'DELETE' THEN 'documentacion_baja'
    ELSE 'documentacion_modificacion'
  END;
  v_acta := CASE WHEN TG_OP = 'DELETE' THEN OLD.acta ELSE NEW.acta END;
  v_numero := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.numero_adjunto
    ELSE NEW.numero_adjunto
  END;
  v_valor_anterior := CASE
    WHEN TG_OP IN ('UPDATE', 'DELETE') THEN concat_ws(' | ', OLD.archivo, OLD.detalle)
    ELSE NULL
  END;
  v_valor_nuevo := CASE
    WHEN TG_OP IN ('INSERT', 'UPDATE') THEN concat_ws(' | ', NEW.archivo, NEW.detalle)
    ELSE NULL
  END;

  FOR v_ficha IN
    SELECT msb.ficha
      FROM movimientos_solicitud_bien msb
     WHERE msb.acta = v_acta
  LOOP
    v_orden := registrar_evento_bien(v_ficha, v_accion);
    PERFORM registrar_cambio_bien(
      v_ficha,
      v_orden,
      'documentacion_solicitud:' || v_acta || ':' || v_numero::text,
      v_valor_anterior,
      v_valor_nuevo,
      v_accion
    );
  END LOOP;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$BODY$;

DROP TRIGGER IF EXISTS adjuntos_solicitudes_trazabilidad_trg ON adjuntos_solicitudes;
CREATE TRIGGER adjuntos_solicitudes_trazabilidad_trg
AFTER INSERT OR UPDATE OR DELETE
ON adjuntos_solicitudes
FOR EACH ROW
EXECUTE FUNCTION adjuntos_solicitudes_trazabilidad_trg();

CREATE OR REPLACE FUNCTION movimientos_solicitud_bien_documentacion_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $BODY$
DECLARE
  v_adjunto record;
  v_orden bigint;
BEGIN
  FOR v_adjunto IN
    SELECT
      a.numero_adjunto,
      a.archivo,
      a.detalle
    FROM adjuntos_solicitudes a
    WHERE a.acta = NEW.acta
  LOOP
    v_orden := registrar_evento_bien(NEW.ficha, 'documentacion_vinculacion');
    PERFORM registrar_cambio_bien(
      NEW.ficha,
      v_orden,
      'documentacion_solicitud:' || NEW.acta || ':' || v_adjunto.numero_adjunto::text,
      NULL,
      concat_ws(' | ', v_adjunto.archivo, v_adjunto.detalle),
      'documentacion_vinculacion'
    );
  END LOOP;

  RETURN NEW;
END;
$BODY$;

DROP TRIGGER IF EXISTS movimientos_solicitud_bien_documentacion_trg
ON movimientos_solicitud_bien;
CREATE TRIGGER movimientos_solicitud_bien_documentacion_trg
AFTER INSERT
ON movimientos_solicitud_bien
FOR EACH ROW
EXECUTE FUNCTION movimientos_solicitud_bien_documentacion_trg();
