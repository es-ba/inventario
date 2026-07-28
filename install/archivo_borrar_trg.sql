CREATE OR REPLACE FUNCTION archivo_borrar_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
begin
  if (TG_OP = 'DELETE') then
    if old.archivo is not null then
      insert into archivos_borrar ("ruta_archivo") values (old.archivo);
    end if;
    return old;
  elsif (TG_OP = 'UPDATE') then
    if old.archivo is not null and old.archivo is distinct from new.archivo then
      insert into archivos_borrar ("ruta_archivo") values (old.archivo);
    end if;
    return new;
  end if;
  return null;
end;
$BODY$;

DROP TRIGGER IF EXISTS archivo_borrar_trg ON adjuntos_bienes;
CREATE TRIGGER archivo_borrar_trg
  BEFORE DELETE OR UPDATE
  ON adjuntos_bienes
  FOR EACH ROW
  EXECUTE PROCEDURE archivo_borrar_trg();

DROP TRIGGER IF EXISTS archivo_borrar_trg ON adjuntos_solicitudes;
CREATE TRIGGER archivo_borrar_trg
  BEFORE DELETE OR UPDATE
  ON adjuntos_solicitudes
  FOR EACH ROW
  EXECUTE PROCEDURE archivo_borrar_trg();
