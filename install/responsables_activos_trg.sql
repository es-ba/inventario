CREATE OR REPLACE FUNCTION responsables_activos_trg()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $BODY$
DECLARE
  v_columna text;
  v_nuevo text;
  v_nombre text;
BEGIN
  FOREACH v_columna IN ARRAY TG_ARGV LOOP
    v_nuevo := to_jsonb(new)->>v_columna;
    IF v_nuevo IS NOT NULL
       AND (TG_OP = 'INSERT' OR v_nuevo IS DISTINCT FROM to_jsonb(old)->>v_columna) THEN
      SELECT concat_ws(', ', apellido, nombre) INTO v_nombre
        FROM responsables
        WHERE responsable = v_nuevo AND activo IS FALSE;
      IF FOUND THEN
        RAISE EXCEPTION 'El responsable % (%) está inactivo y no puede asignarse en %.%',
          v_nuevo, v_nombre, TG_TABLE_NAME, v_columna;
      END IF;
    END IF;
  END LOOP;
  RETURN new;
END;
$BODY$;

DROP TRIGGER IF EXISTS responsables_activos_trg ON movimientos_solicitudes;
CREATE TRIGGER responsables_activos_trg
  BEFORE INSERT OR UPDATE ON movimientos_solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION responsables_activos_trg('responsable', 'enusode_responsable', 'autorizado_por', 'firmado_por');

DROP TRIGGER IF EXISTS responsables_activos_trg ON movimientos_bien;
CREATE TRIGGER responsables_activos_trg
  BEFORE INSERT OR UPDATE ON movimientos_bien
  FOR EACH ROW
  WHEN (new.acta_origen IS NULL)
  EXECUTE FUNCTION responsables_activos_trg('responsable', 'enusode_responsable', 'autorizado_por', 'firmado_por');

DROP TRIGGER IF EXISTS responsables_activos_trg ON sectores;
CREATE TRIGGER responsables_activos_trg
  BEFORE INSERT OR UPDATE ON sectores
  FOR EACH ROW
  EXECUTE FUNCTION responsables_activos_trg('responsable');
