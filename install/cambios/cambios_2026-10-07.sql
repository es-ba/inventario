set role to inventario_owner;
set search_path = "inventario", public;

begin;

alter table "siper_personas" add column "fecha_ingreso" date;
alter table "siper_personas" add column "situacion_revista" text;
alter table "siper_personas" add column "cuil" text;
alter table "siper_personas" add column "tipo_doc" text;
alter table "siper_personas" add column "documento" text;
alter table "siper_personas" add column "ficha" text;
alter table "siper_personas" add column "domicilio" text;
alter table "siper_personas" add column "telefono" text;
alter table "siper_personas" add constraint "situacion_revista<>''" check ("situacion_revista"<>'');
alter table "siper_personas" add constraint "cuil<>''" check ("cuil"<>'');
alter table "siper_personas" add constraint "tipo_doc<>''" check ("tipo_doc"<>'');
alter table "siper_personas" add constraint "documento<>''" check ("documento"<>'');
alter table "siper_personas" add constraint "ficha<>''" check ("ficha"<>'');
alter table "siper_personas" add constraint "domicilio<>''" check ("domicilio"<>'');
alter table "siper_personas" add constraint "telefono<>''" check ("telefono"<>'');

alter table "movimientos_solicitudes" add column "sector_sigla" text;
alter table "movimientos_solicitudes" add column "sector_nombre" text;
alter table "movimientos_bien" add column "sector_sigla" text;
alter table "movimientos_bien" add column "sector_nombre" text;
alter table "movimientos_solicitudes" add constraint "sector_sigla<>''" check ("sector_sigla"<>'');
alter table "movimientos_solicitudes" add constraint "sector_nombre<>''" check ("sector_nombre"<>'');
alter table "movimientos_bien" add constraint "sector_sigla<>''" check ("sector_sigla"<>'');
alter table "movimientos_bien" add constraint "sector_nombre<>''" check ("sector_nombre"<>'');

CREATE OR REPLACE FUNCTION sector_texto_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $BODY$
BEGIN
  IF TG_OP = 'UPDATE' AND (
       NEW.sector IS NOT DISTINCT FROM OLD.sector
       OR (OLD.sector IS NOT NULL AND NEW.sector IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM sectores s WHERE s.sector = OLD.sector))
     ) THEN
    NEW.sector_sigla := OLD.sector_sigla;
    NEW.sector_nombre := OLD.sector_nombre;
    RETURN NEW;
  END IF;
  NEW.sector_sigla := NULL;
  NEW.sector_nombre := NULL;
  SELECT s.sigla, s.nombre_sector
    INTO NEW.sector_sigla, NEW.sector_nombre
    FROM sectores s
    WHERE s.sector = NEW.sector;
  RETURN NEW;
END;
$BODY$;

DROP TRIGGER IF EXISTS sector_texto_trg ON movimientos_bien;
CREATE TRIGGER sector_texto_trg
  BEFORE INSERT OR UPDATE ON movimientos_bien
  FOR EACH ROW EXECUTE FUNCTION sector_texto_trg();

DROP TRIGGER IF EXISTS sector_texto_trg ON movimientos_solicitudes;
CREATE TRIGGER sector_texto_trg
  BEFORE INSERT OR UPDATE ON movimientos_solicitudes
  FOR EACH ROW EXECUTE FUNCTION sector_texto_trg();

ALTER TABLE movimientos_bien DISABLE TRIGGER USER;
UPDATE movimientos_bien m
   SET sector_sigla = s.sigla, sector_nombre = s.nombre_sector
  FROM sectores s
 WHERE s.sector = m.sector
   AND m.sector_sigla IS NULL AND m.sector_nombre IS NULL;
ALTER TABLE movimientos_bien ENABLE TRIGGER USER;

ALTER TABLE movimientos_solicitudes DISABLE TRIGGER USER;
UPDATE movimientos_solicitudes m
   SET sector_sigla = s.sigla, sector_nombre = s.nombre_sector
  FROM sectores s
 WHERE s.sector = m.sector
   AND m.sector_sigla IS NULL AND m.sector_nombre IS NULL;
ALTER TABLE movimientos_solicitudes ENABLE TRIGGER USER;

commit;
