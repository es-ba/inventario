-- Limpieza del campo modelo de bienes (a partir del export de producción del 2026-10-20: 10658 fichas).
--   0. Los IMEI escritos en el modelo (193 bienes) pasan a claves del bien, con los tipos nuevos IMEI (191) e IMEI_SIM (27), y se borra del modelo desde "IMEI" hasta el final.
--   1. "Sin Modelo" (en cualquier combinación de mayúsculas y espacios) queda vacío: 2183 bienes en el export.
--   2. "Sin Modelo" seguido de un texto: el texto se agrega al final de detalle (salvo que detalle ya lo contenga) y modelo queda vacío: 112 bienes.
--   3. Espacios repetidos o en los extremos se colapsan, y las 87 escrituras distintas de un mismo modelo (mayúsculas, acentos, puntuación) pasan a la más usada: 444 bienes.
-- Va por el valor de cada bien, no por ficha: sirve aunque haya bienes nuevos, y se puede volver a correr.

set role to inventario_owner;
set search_path = "inventario", public;

begin;

SET LOCAL backend_plus._rol = 'admin';
SET LOCAL backend_plus._mode = 'normal';
SET LOCAL backend_plus._user = '';
SET LOCAL backend_plus._usuario = '';
SET LOCAL backend_plus._responsable = '';
SET LOCAL backend_plus._sector = '';

INSERT INTO tipo_clave (tipo_clave, descripcion) VALUES
('IMEI', 'IMEI del equipo'),
('IMEI_SIM', 'IMEI de la línea (SIM)')
ON CONFLICT DO NOTHING;

INSERT INTO claves_bienes (ficha, tipo_clave, valor, observacion, usuario_creacion)
SELECT b.ficha, x.tipo_clave, x.valor, 'tomado del modelo', null
  FROM bienes b
  CROSS JOIN LATERAL (VALUES
      ('IMEI', (regexp_match(b.modelo, 'imei[^0-9]*([0-9]{14,16})', 'i'))[1]),
      ('IMEI_SIM', (regexp_match(b.modelo, 'imei[^0-9]*(sim|linea)[^0-9]*([0-9]{14,16})', 'i'))[2])
  ) x(tipo_clave, valor)
 WHERE b.modelo ~* 'imei'
   AND x.valor IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM claves_bienes c WHERE c.ficha = b.ficha AND c.tipo_clave = x.tipo_clave AND c.valor = x.valor);

UPDATE bienes
   SET modelo = nullif(btrim(regexp_replace(modelo, '[[:space:]/.,-]*imei.*$', '', 'i')), '')
 WHERE modelo ~* 'imei';

UPDATE bienes
   SET modelo = null
 WHERE modelo ~* '^[[:space:]]*sin[[:space:]]+modelo[[:space:]]*$';

UPDATE bienes
   SET detalle = CASE
           WHEN coalesce(detalle, '') ILIKE '%' || regexp_replace(btrim(modelo), '^sin[[:space:]]+modelo[[:space:]]+', '', 'i') || '%' THEN detalle
           ELSE concat_ws(' ', nullif(btrim(detalle), ''), regexp_replace(btrim(modelo), '^sin[[:space:]]+modelo[[:space:]]+', '', 'i'))
       END,
       modelo = null
 WHERE modelo ~* '^[[:space:]]*sin[[:space:]]+modelo[[:space:]]+[^[:space:]]';

UPDATE bienes
   SET modelo = nullif(regexp_replace(btrim(modelo), '[[:space:]]+', ' ', 'g'), '')
 WHERE modelo IS DISTINCT FROM nullif(regexp_replace(btrim(modelo), '[[:space:]]+', ' ', 'g'), '');

UPDATE bienes SET modelo = 'IP HFA/SIP OPEN STAGE 15 DISPLAY CON 2 LINEAS MANOS LIBRES' WHERE modelo IN ('IP HFA/SIP Open Stage 15 display con 2 líneas manos libres', 'IP HFA/SIP Open Stage 15 Display con 2 Lineas manos libres', 'IP HFA/SIP Open Stage 15 Display con 2 lineas manos libres', 'IP HFA/SIP Open Stage 15 Display con 2 líneas manos libres');
UPDATE bienes SET modelo = 'Optico' WHERE modelo IN ('OPTICO');
UPDATE bienes SET modelo = 'Intel Core2Duo E 8400 3,0 RAM 2 Gb, HD 250Gb' WHERE modelo IN ('Intel Core2Duo E 8400 3,0 RAM 2 Gb HD 250Gb');
UPDATE bienes SET modelo = 'PLUS' WHERE modelo IN ('Plus');
UPDATE bienes SET modelo = 'Barcelona' WHERE modelo IN ('BARCELONA');
UPDATE bienes SET modelo = 'IP (VOIP) - CON CONECTOR DE RED RJ45' WHERE modelo IN ('IP (VOIP) CON CONECTOR DE RED RJ45');
UPDATE bienes SET modelo = 'ejecutivo, giratorio regulable, c/5 ramas y apoyabrazos, c/negro' WHERE modelo IN ('Ejecutivo, giratorio regulable, c/5 ramas y apoyabrazos, c/negro');
UPDATE bienes SET modelo = 'Optima B03 i5' WHERE modelo IN ('OPTIMA B03 i5');
UPDATE bienes SET modelo = 'LASER PS/2 3 BOTONES' WHERE modelo IN ('Láser PS/2 3 botones');
UPDATE bienes SET modelo = 'De madera' WHERE modelo IN ('DE MADERA');
UPDATE bienes SET modelo = 'MULTIMEDIA ESTEREO USB 2.0' WHERE modelo IN ('Multimedia Estereo USB 2.0');
UPDATE bienes SET modelo = 'Conexión USB 104 teclas' WHERE modelo IN ('conexión USB 104 teclas');
UPDATE bienes SET modelo = 'esqueleto de caño ref, de 1.6 mm x 25 mm, asiento y respaldo en laminado, c/negro' WHERE modelo IN ('Esqueleto de caño ref, de 1.6 mm x 25 mm, asiento y respaldo en laminado, c/negro');
UPDATE bienes SET modelo = 'NETSCROLL 120' WHERE modelo IN ('NetScroll 120', 'Netscroll 120');
UPDATE bienes SET modelo = 'Optima B03 i7' WHERE modelo IN ('OPTIMA B03 i7');
UPDATE bienes SET modelo = 'plegable metálica tapizada con regatones de presión antideslizante' WHERE modelo IN ('Plegable metálica tapizada con regatones de presión antideslizante', 'plegable, metálica, tapizada con regatones de presión antideslizante');
UPDATE bienes SET modelo = 'Estructura de caño, de 0,74m. +/-2 altura, guarda útiles 0,15 mm., color gris' WHERE modelo IN ('Estructura de caño, de 0,74m. +/-2 altura, guarda útiles 0,15 mm, color gris');
UPDATE bienes SET modelo = 'de 0,45 x 0,46 x 0,62, c/3 cajones, c/cedro' WHERE modelo IN ('De 0,45 x 0,46 x 0,62, c/3 cajones, c/cedro');
UPDATE bienes SET modelo = 'IP VOIP OPENSCAPE DESK PHONE 55G' WHERE modelo IN ('IP VOIP Openscape Desk Phone 55G');
UPDATE bienes SET modelo = '9na Generación' WHERE modelo IN ('9NA Generación');
UPDATE bienes SET modelo = 'sistema ROLLER (son en total 20 metros, 1 Ficha estante por metro)' WHERE modelo IN ('Sistema Roller (son en total 20 metros, 1 Ficha estante por metro)');
UPDATE bienes SET modelo = 'giratoria regulable, c/5 patas y apoyabrazos' WHERE modelo IN ('Giratoria regulable c/5 patas y apoyabrazos');
UPDATE bienes SET modelo = 'INTEL CORE, DDR2 4G, HD 500GB, DVD,' WHERE modelo IN ('INTEL CORE, DDR2 4G, HD 500GB, DVD', 'Intel Core DDR2 4G, HD 500GB, DVD,');
UPDATE bienes SET modelo = 'DE PIE' WHERE modelo IN ('De pie', 'de pie');
UPDATE bienes SET modelo = 'Sillón asiento y respaldo en cuerina negra c/5 ramas cromadas y apoyabrazos' WHERE modelo IN ('Sillon asiento y respaldo en cuerina negra c/5 ramas cromadas y apoyabrazos');
UPDATE bienes SET modelo = 'P/ESCRIT fija base metal c/4 patas asiento y respal. tap. tela c/verde musgo' WHERE modelo IN ('p/ESCRIT. fija base metal. c/4 patas, asiento y respal. tap. tela c/verde musgo');
UPDATE bienes SET modelo = 'fija c/4 patas base caño metalico c/negro, asiento tapizado pana, c/negro' WHERE modelo IN ('fija c/4 patas base caño metalico c/negro, asiento tapizado pana c/negro', 'Fija c/4 patas base caño metalico c/negro, asiento tapizado pana c/negro');
UPDATE bienes SET modelo = 'de 1,35 x 0,90 x 0,45, c/2 ptas de abrir, c/cerradura, c/cedro' WHERE modelo IN ('De 1,35 x 0,90 x 0,45, c/2 ptas de abrir, c/cerradura, c/cedro');
UPDATE bienes SET modelo = 'de 0,90 x 0,74 x 0,45, c/2 ptas corredizas, c/cerradura, c/cedro' WHERE modelo IN ('De 0,90 x 0,74 x 0,45, c/2 ptas corredizas, c/cerradura, c/cedro');
UPDATE bienes SET modelo = 'giratoria regulable de altura con respaldo de contacto permanente de 5 ramas' WHERE modelo IN ('Giratoria regulable de altura con respaldo de contacto permanente de 5 ramas');
UPDATE bienes SET modelo = 'PARA BANDERA' WHERE modelo IN ('Para bandera');
UPDATE bienes SET modelo = 'De pie metálico, caño redondo, base redonda, c/3 ganchos, c/paraguero, de 1,70 de alto, c/negro' WHERE modelo IN ('de pie metálico, caño redondo, base redonda, c/3 ganchos, c/paraguero, de 1,70 de alto, c/negro');
UPDATE bienes SET modelo = 'de madera, de 0,60 x 0,40 x 2,00, c/ptas batientes, c/6 est regulables, c/cerradura' WHERE modelo IN ('De madera, de 0,60 x 0,40 x 2,00, c/ptas batientes, c/6 est regulables, c/cerradura');
UPDATE bienes SET modelo = 'LASER JET CP2025DN' WHERE modelo IN ('Laser Jet CP2025DN');
UPDATE bienes SET modelo = 'DE PIE 20"' WHERE modelo IN ('De pie 20"');
UPDATE bienes SET modelo = 'De pared, c/2 ganchos' WHERE modelo IN ('de pared, c/2 ganchos');
UPDATE bienes SET modelo = 'barcelona color blanca' WHERE modelo IN ('Barcelona color blanca');
UPDATE bienes SET modelo = 'De 3 sillas' WHERE modelo IN ('de 3 sillas');
UPDATE bienes SET modelo = '5000 CALORIAS' WHERE modelo IN ('5000 calorías');
UPDATE bienes SET modelo = 'ELECTRICA' WHERE modelo IN ('Eléctrica');
UPDATE bienes SET modelo = 'SIMPLE' WHERE modelo IN ('simple');
UPDATE bienes SET modelo = 'pata caño metal c/negro, asiento tapa cuerina negra, altura 0,40' WHERE modelo IN ('Pata caño metal c/negro, asiento tapa cuerina negra, altura 0,40');
UPDATE bienes SET modelo = 'estructura metálica base regatones de presión anti deslizantes, respaldo en tela de red, asiento tela, c/negro' WHERE modelo IN ('Estructura metálica base regatones de presión anti deslizantes, respaldo en tela de red, asiento tela, c/negro');
UPDATE bienes SET modelo = 'de 50 x 50 x 25, tapa frontal transparente, c/rojo' WHERE modelo IN ('De 50 x 50 x 25, tapa frontal transparente, c/rojo');
UPDATE bienes SET modelo = 'aglomerado laminado, de 1,20 x 0,80 x 0,40, colgante, c/2 ptas batientes, c/est gr, c/haya' WHERE modelo IN ('Aglomerado laminado, de 1,20 x 0,80 x 0,40, colgante, c/2 ptas batientes, c/est gr, c/haya');
UPDATE bienes SET modelo = 'de 1,40 x 090, p/frente de repartición, soga de sujeción de polipropileno' WHERE modelo IN ('De 1,40 x 090, p/frente de repartición, soga de sujeción de polipropileno');
UPDATE bienes SET modelo = 'DESFIBRILADOR EXTERNO AUTOMATICO (DEA)' WHERE modelo IN ('Desfibrilador Externo Automático (DEA)');
UPDATE bienes SET modelo = 'COMPAQ 6735S' WHERE modelo IN ('Compaq 6735S');
UPDATE bienes SET modelo = ', de 1,20 x 0,70, c/4 cajones, c/cerradura, c/haya' WHERE modelo IN ('de 1,20 x 0,70, c/4 cajones, c/cerradura, c/haya');
UPDATE bienes SET modelo = 'HP205 DISPOSITIVO PARA ACCESO INALAMBRICO A RED' WHERE modelo IN ('HP205 Dispositivo para acceso inalambrico a red');
UPDATE bienes SET modelo = 'P/ESCRIT fija base metal. c/4 patas, asiento y respal. tap. tela c/negro' WHERE modelo IN ('p/ESCRIT. ,fija base metal. c/4 patas, asiento y respal. tap. tela c/negro');
UPDATE bienes SET modelo = 'ESPAÑOL 101 TECLAS' WHERE modelo IN ('Español 101 Teclas');
UPDATE bienes SET modelo = 'Bajo mesada' WHERE modelo IN ('BAJO MESADA');
UPDATE bienes SET modelo = 'de 2,00 X 0,80 mts para caballete' WHERE modelo IN ('De 2,00 X 0,80 mts para caballete');
UPDATE bienes SET modelo = 'Grande' WHERE modelo IN ('GRANDE');
UPDATE bienes SET modelo = 'De Ceremonia, de 1,40 x 0,90' WHERE modelo IN ('de Ceremonia, de 1,40 x 0,90');
UPDATE bienes SET modelo = 'HPK37 BAJO MESADA' WHERE modelo IN ('HPK37 Bajo Mesada', 'HPK37 Bajo mesada');
UPDATE bienes SET modelo = 'Driver en CD IDE/ATAPI interfase Diskette' WHERE modelo IN ('Driver en CD IDE/ATAPI interfase.Diskette');
UPDATE bienes SET modelo = 'DE TECHO' WHERE modelo IN ('De Techo');
UPDATE bienes SET modelo = '3 TECLAS' WHERE modelo IN ('3 Teclas');
UPDATE bienes SET modelo = 'CON PROLONGACIÓN LATERAL' WHERE modelo IN ('Con prolongación lateral');
UPDATE bienes SET modelo = 'PLANO' WHERE modelo IN ('Plano');
UPDATE bienes SET modelo = 'DE MESA COLOR NEGRO METAL' WHERE modelo IN ('de mesa color negro metal');
UPDATE bienes SET modelo = 'de 1,20 x 0,70, c/4 cajones, s/cerradura, c/haya' WHERE modelo IN (', de 1,20 x 0,70, c/4 cajones, s/cerradura, c/haya');
UPDATE bienes SET modelo = 'A10 CON CONECTOR' WHERE modelo IN ('A10 con conector');
UPDATE bienes SET modelo = 'Regulable, c/5 ramas cromadas c/ruedas, c/apoyab, respaldo red negro, asiento cuero negro' WHERE modelo IN ('Regulable, c/5 ramas cromadas c/ruedas, c/ apoyab, respaldo red negro, asiento cuero negro');
UPDATE bienes SET modelo = 'de pared' WHERE modelo IN ('DE PARED');
UPDATE bienes SET modelo = 'redondo' WHERE modelo IN ('Redondo');
UPDATE bienes SET modelo = 'CON FREEZER BAJO MESADA' WHERE modelo IN ('Con freezer bajo mesada');
UPDATE bienes SET modelo = 'Licencia Windows 98 SE' WHERE modelo IN ('Licencia Windows 98,SE');
UPDATE bienes SET modelo = 'Easy cook 26 LTS' WHERE modelo IN ('EASY COOK 26 LTS');
UPDATE bienes SET modelo = 'español de 101 teclas' WHERE modelo IN ('Español de 101 teclas');
UPDATE bienes SET modelo = 'PLUS OPTICO' WHERE modelo IN ('Plus óptico');
UPDATE bienes SET modelo = '32 gb' WHERE modelo IN ('32 GB');
UPDATE bienes SET modelo = 'ALL IN ONE i7 PANTALLA 27''´' WHERE modelo IN ('ALL IN ONE i7 pantalla 27´´');
UPDATE bienes SET modelo = 'de pared, metal, c/5 perchas, de 0,95 x 0,15' WHERE modelo IN ('De pared, metal, c/5 perchas, de 0,95 x 0,15');
UPDATE bienes SET modelo = '2kg c/cabo de madera' WHERE modelo IN ('2KG C/CABO DE MADERA');
UPDATE bienes SET modelo = 'Francesa' WHERE modelo IN ('FRANCESA');
UPDATE bienes SET modelo = 'De mano' WHERE modelo IN ('DE MANO');
UPDATE bienes SET modelo = 'mod 2-9167' WHERE modelo IN ('Mod 2-9167');
UPDATE bienes SET modelo = 'metálico, c/4 ganchos, c/paraguero , de 1,70 cm, c/negro' WHERE modelo IN ('Metálico, c/4 ganchos, c/paraguero , de 1,70 cm, c/negro');
UPDATE bienes SET modelo = 'Chico' WHERE modelo IN ('CHICO');
UPDATE bienes SET modelo = 'de pie, c/6 perchas, c/paragûero' WHERE modelo IN ('De pie, c/6 perchas, c/paragûero');
UPDATE bienes SET modelo = 'de Ciudad, de 1,40 x 0,90' WHERE modelo IN ('De Ciudad, de 1,40 x 0,90');
UPDATE bienes SET modelo = '1 cuerpo x 6 cajones c/soporte y base, de 0,32 X 40,50 X 27,50' WHERE modelo IN ('1 cuerpo x 6 cajones, c/soporte y base, de 0,32 X 40,50 X 27,50');
UPDATE bienes SET modelo = 'Fija c/asiento y respaldo plástico, tipo apilable, c/negro' WHERE modelo IN ('Fija, c/asiento y respaldo plástico, tipo apilable, c/negro');
UPDATE bienes SET modelo = 'Color LaserJet CP2025' WHERE modelo IN ('Color LáserJet CP2025');

commit;

begin;

CREATE OR REPLACE FUNCTION sectores_de_la_rama(p_sector text)
RETURNS TABLE (sector text)
  LANGUAGE SQL STABLE
AS
$BODY$
  WITH RECURSIVE rama AS (
    SELECT s.sector
      FROM sectores s
      WHERE s.sector = p_sector
    UNION
    SELECT s.sector
      FROM sectores s
      JOIN rama r ON s.pertenece_a = r.sector
  )
  SELECT sector FROM rama;
$BODY$;

CREATE OR REPLACE FUNCTION bienes_alcance()
RETURNS TABLE (ficha text)
  LANGUAGE SQL STABLE SECURITY DEFINER
AS
$BODY$
  WITH capacidades AS (
    SELECT coalesce(puede_ver_propio, false)       AS propio,
           coalesce(puede_ver_dependientes, false) AS dependientes
      FROM roles WHERE rol = get_app_user('rol')
  ),
  mis_sectores AS (
    SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), ''))
  ),
  sectores_a_cargo AS (
    SELECT s.sector
      FROM sectores s
      WHERE s.responsable = nullif(get_app_user('responsable'), '')
  ),
  mis_personas AS (
    SELECT r.responsable
      FROM responsables r
      WHERE r.sector IN (SELECT sector FROM mis_sectores)
  ),
  ultimo AS (
    SELECT DISTINCT ON (mb.ficha COLLATE "C")
           mb.ficha, mb.sector, mb.responsable, mb.enusode_responsable
      FROM movimientos_bien mb
      ORDER BY mb.ficha COLLATE "C", mb.orden DESC
  )
  SELECT u.ficha
    FROM ultimo u
    CROSS JOIN capacidades c
    WHERE (
            c.propio
            AND (   nullif(get_app_user('responsable'), '') IN (u.responsable, u.enusode_responsable)
                 OR u.sector IN (SELECT sector FROM sectores_a_cargo))
          )
       OR (
            c.dependientes
            AND (   u.responsable         IN (SELECT responsable FROM mis_personas)
                 OR u.enusode_responsable IN (SELECT responsable FROM mis_personas)
                 OR u.sector              IN (SELECT sector FROM mis_sectores))
          );
$BODY$;

ALTER POLICY "bp select" ON "responsables" USING ( (get_app_user('mode') = 'login' OR ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND (responsable = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), ''))))))) );
ALTER POLICY "bp insert" ON "responsables" WITH CHECK ( ((SELECT coalesce(puede_guardar, false) FROM roles WHERE rol = get_app_user('rol'))) AND (get_app_user('mode') = 'login' OR ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND (responsable = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), ''))))))) );
ALTER POLICY "bp update" ON "responsables" USING ( ((SELECT coalesce(puede_guardar, false) FROM roles WHERE rol = get_app_user('rol'))) AND (get_app_user('mode') = 'login' OR ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND (responsable = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), ''))))))) ) WITH CHECK ( ((SELECT coalesce(puede_guardar, false) FROM roles WHERE rol = get_app_user('rol'))) AND (get_app_user('mode') = 'login' OR ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND (responsable = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), ''))))))) );
ALTER POLICY "bp delete" ON "responsables" USING ( ((SELECT coalesce(puede_eliminar, false) FROM roles WHERE rol = get_app_user('rol'))) AND (get_app_user('mode') = 'login' OR ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND (responsable = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), ''))))))) );
ALTER POLICY "bp select" ON "movimientos_solicitudes" USING ( ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND (responsable = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector_responsable(responsable) IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), '')))))) );
ALTER POLICY "bp insert" ON "movimientos_solicitudes" WITH CHECK ( ((SELECT coalesce(puede_guardar, false) FROM roles WHERE rol = get_app_user('rol'))) AND ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND (responsable = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector_responsable(responsable) IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), '')))))) );
ALTER POLICY "bp update" ON "movimientos_solicitudes" USING ( ((SELECT coalesce(puede_guardar, false) FROM roles WHERE rol = get_app_user('rol'))) AND ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND (responsable = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector_responsable(responsable) IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), '')))))) ) WITH CHECK ( ((SELECT coalesce(puede_guardar, false) FROM roles WHERE rol = get_app_user('rol'))) AND ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND (responsable = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector_responsable(responsable) IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), '')))))) );
ALTER POLICY "bp delete" ON "movimientos_solicitudes" USING ( ((SELECT coalesce(puede_eliminar, false) FROM roles WHERE rol = get_app_user('rol'))) AND ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND (responsable = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector_responsable(responsable) IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), '')))))) );
ALTER POLICY "bp select" ON "adjuntos_solicitudes" USING ( ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND ((SELECT ms.responsable FROM movimientos_solicitudes ms WHERE ms.acta = adjuntos_solicitudes.acta) = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector_responsable((SELECT ms.responsable FROM movimientos_solicitudes ms WHERE ms.acta = adjuntos_solicitudes.acta)) IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), '')))))) );
ALTER POLICY "bp insert" ON "adjuntos_solicitudes" WITH CHECK ( ((SELECT coalesce(puede_guardar, false) FROM roles WHERE rol = get_app_user('rol'))) AND ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND ((SELECT ms.responsable FROM movimientos_solicitudes ms WHERE ms.acta = adjuntos_solicitudes.acta) = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector_responsable((SELECT ms.responsable FROM movimientos_solicitudes ms WHERE ms.acta = adjuntos_solicitudes.acta)) IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), '')))))) );
ALTER POLICY "bp update" ON "adjuntos_solicitudes" USING ( ((SELECT coalesce(puede_guardar, false) FROM roles WHERE rol = get_app_user('rol'))) AND ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND ((SELECT ms.responsable FROM movimientos_solicitudes ms WHERE ms.acta = adjuntos_solicitudes.acta) = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector_responsable((SELECT ms.responsable FROM movimientos_solicitudes ms WHERE ms.acta = adjuntos_solicitudes.acta)) IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), '')))))) ) WITH CHECK ( ((SELECT coalesce(puede_guardar, false) FROM roles WHERE rol = get_app_user('rol'))) AND ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND ((SELECT ms.responsable FROM movimientos_solicitudes ms WHERE ms.acta = adjuntos_solicitudes.acta) = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector_responsable((SELECT ms.responsable FROM movimientos_solicitudes ms WHERE ms.acta = adjuntos_solicitudes.acta)) IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), '')))))) );
ALTER POLICY "bp delete" ON "adjuntos_solicitudes" USING ( ((SELECT coalesce(puede_eliminar, false) FROM roles WHERE rol = get_app_user('rol'))) AND ((SELECT coalesce(puede_ver_todo, false) FROM roles WHERE rol = get_app_user('rol')) OR ((SELECT coalesce(puede_ver_propio, false) FROM roles WHERE rol = get_app_user('rol')) AND ((SELECT ms.responsable FROM movimientos_solicitudes ms WHERE ms.acta = adjuntos_solicitudes.acta) = nullif(get_app_user('responsable'), ''))) OR ((SELECT coalesce(puede_ver_dependientes, false) FROM roles WHERE rol = get_app_user('rol')) AND (sector_responsable((SELECT ms.responsable FROM movimientos_solicitudes ms WHERE ms.acta = adjuntos_solicitudes.acta)) IN (SELECT sector FROM sectores_de_la_rama(nullif(get_app_user('sector'), '')))))) );

DROP FUNCTION sector_pertenece(text, text, numeric);

commit;
