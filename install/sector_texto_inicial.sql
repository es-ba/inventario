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
