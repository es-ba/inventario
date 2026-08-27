-- Sella usuario y fecha de creación y de modificación.
--
-- fecha_creacion la ponía el default de la columna y usuario_modificacion lo escribía
-- movimientos_solicitudes_estado_trg, pero ése corre BEFORE UPDATE OF estado: sólo sella
-- cuando cambia el estado. usuario_creacion no lo escribía nadie en un alta genérica.
--
-- Los procedures que crean solicitudes sí lo pasaban explícitamente, así que el dato salía
-- bien por ese camino y quedaba nulo al dar de alta desde la pantalla de React, que guarda
-- con table_record_save. Poniéndolo en un trigger vale para todos los caminos por igual.

CREATE OR REPLACE FUNCTION auditoria_usuario()
  RETURNS text
  STABLE
  LANGUAGE sql
AS $SQL$
  /*
    Fuera de una sesión de la aplicación —la carga inicial del dump, un psql a mano— no hay
    usuario. Ahí devuelve NULL y no se sella nada: inventar un nombre rompería la foreign
    key contra usuarios, que es la que garantiza que el sello signifique algo.
  */
  SELECT CASE
    WHEN nullif(current_setting('backend_plus._user', true), '') IS NULL THEN NULL
    ELSE get_app_user()
  END
$SQL$;

CREATE OR REPLACE FUNCTION auditoria_usuario_trg()
  RETURNS trigger
  LANGUAGE plpgsql
AS $BODY$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- coalesce y no asignación directa: si el procedure ya puso el usuario, ése manda.
    new.usuario_creacion := coalesce(new.usuario_creacion, auditoria_usuario());
    new.fecha_creacion := coalesce(new.fecha_creacion, CURRENT_DATE);
  ELSE
    new.usuario_modificacion := coalesce(auditoria_usuario(), new.usuario_modificacion);
    new.fecha_modificacion := CURRENT_DATE;
  END IF;
  RETURN new;
END;
$BODY$;

/*
  Se cuelga de las tres tablas que tienen las cuatro columnas. declaraciones queda afuera
  a propósito: tiene creacion pero no modificacion, y una función que asume las cuatro
  fallaría al asignar una columna que no existe.
*/
DROP TRIGGER IF EXISTS auditoria_usuario_trg ON movimientos_solicitudes;
CREATE TRIGGER auditoria_usuario_trg
  BEFORE INSERT OR UPDATE
  ON movimientos_solicitudes
  FOR EACH ROW
  EXECUTE FUNCTION auditoria_usuario_trg();

DROP TRIGGER IF EXISTS auditoria_usuario_trg ON movimientos_solicitud_bien;
CREATE TRIGGER auditoria_usuario_trg
  BEFORE INSERT OR UPDATE
  ON movimientos_solicitud_bien
  FOR EACH ROW
  EXECUTE FUNCTION auditoria_usuario_trg();

DROP TRIGGER IF EXISTS auditoria_usuario_trg ON movimientos_bien;
CREATE TRIGGER auditoria_usuario_trg
  BEFORE INSERT OR UPDATE
  ON movimientos_bien
  FOR EACH ROW
  EXECUTE FUNCTION auditoria_usuario_trg();
