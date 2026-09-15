DROP TRIGGER IF EXISTS bienes_baja_estado_trg ON bienes;

CREATE OR REPLACE FUNCTION bienes_baja_estado_trg()
RETURNS trigger LANGUAGE plpgsql AS $BODY$
DECLARE
  v_accion text := nullif(current_setting('inventario.baja_accion', true), '');
  v_usuario text := nullif(get_app_user(), '');
  v_guardar boolean;
  v_transicion estados_baja_acciones%ROWTYPE;
  v_permitido boolean;
  v_campos text[] := ARRAY['activo','estado_baja','motivo_baja','fecha_solicitud',
    'fecha_finalizacion','autorizado_por','documento_respaldo','solicitado_por',
    'revisado_por','fecha_revision','motivo_rechazo','motivo_restauracion',
    'restaurado_por','fecha_restauracion'];
  v_permitidos text[];
  v_campo text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.activo IS NOT TRUE OR EXISTS (
      SELECT 1 FROM unnest(v_campos) campo
       WHERE campo <> 'activo' AND to_jsonb(NEW)->campo <> 'null'::jsonb
    ) THEN
      RAISE EXCEPTION 'El bien nuevo debe estar activo y sin datos de baja';
    END IF;
    RETURN NEW;
  END IF;

  SELECT coalesce(puede_guardar,false)
    INTO v_guardar FROM roles WHERE rol = get_app_user('rol');
  IF v_accion IS NULL THEN
    IF EXISTS (SELECT 1 FROM unnest(v_campos) campo
                WHERE to_jsonb(NEW)->campo IS DISTINCT FROM to_jsonb(OLD)->campo) THEN
      RAISE EXCEPTION 'Use una operación de baja para modificar activo o los datos de baja (ficha %)', OLD.ficha;
    END IF;
    IF v_guardar IS NOT TRUE THEN
      RAISE EXCEPTION 'No tiene permisos para editar el bien %', OLD.ficha;
    END IF;
    RETURN NEW;
  END IF;

  IF v_usuario IS NULL THEN RAISE EXCEPTION 'Falta el usuario de la operación de baja'; END IF;

  SELECT * INTO v_transicion
    FROM estados_baja_acciones
    WHERE accion_baja = v_accion
      AND estado_origen IS NOT DISTINCT FROM OLD.estado_baja
      AND activo_origen = OLD.activo
    ORDER BY transicion_baja
    LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La acción % no está disponible para la ficha % en su estado actual', v_accion, OLD.ficha;
  END IF;

  SELECT coalesce((to_jsonb(r)->>v_transicion.capacidad)::boolean, false)
    INTO v_permitido FROM roles r WHERE r.rol = get_app_user('rol');
  IF v_permitido IS NOT TRUE THEN
    RAISE EXCEPTION 'No tiene permisos para % la baja de la ficha %', v_accion, OLD.ficha;
  END IF;

  IF NEW.estado_baja IS DISTINCT FROM v_transicion.estado_destino
     OR NEW.activo IS DISTINCT FROM v_transicion.activo_destino THEN
    RAISE EXCEPTION 'La acción % debe llevar la ficha % al estado configurado', v_accion, OLD.ficha;
  END IF;

  v_permitidos := string_to_array(v_transicion.campos_permitidos, ',');
  IF (to_jsonb(NEW) - v_permitidos) IS DISTINCT FROM (to_jsonb(OLD) - v_permitidos) THEN
    RAISE EXCEPTION 'La operación de baja no permite modificar otros campos de la ficha %', OLD.ficha;
  END IF;

  FOREACH v_campo IN ARRAY string_to_array(coalesce(v_transicion.campos_requeridos, ''), ',') LOOP
    IF v_campo <> '' AND nullif(btrim(to_jsonb(NEW)->>v_campo), '') IS NULL THEN
      RAISE EXCEPTION 'Falta el campo requerido % para la baja de la ficha %', v_campo, OLD.ficha;
    END IF;
  END LOOP;

  IF NEW.documento_respaldo IS DISTINCT FROM OLD.documento_respaldo
     AND nullif(btrim(NEW.documento_respaldo),'') IS NOT NULL THEN
    PERFORM 1 FROM adjuntos_bienes WHERE ficha=OLD.ficha
      AND numero_adjunto::text=NEW.documento_respaldo AND nullif(btrim(archivo),'') IS NOT NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Seleccione un adjunto existente como respaldo para la ficha %', OLD.ficha; END IF;
  END IF;

  RETURN NEW;
END;
$BODY$;

DROP TRIGGER IF EXISTS bienes_baja_estado_trg ON bienes;
CREATE TRIGGER bienes_baja_estado_trg BEFORE INSERT OR UPDATE ON bienes
FOR EACH ROW EXECUTE FUNCTION bienes_baja_estado_trg();
