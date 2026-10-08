# Tasks

## 1. Columnas y trigger

- [x] 1.1 Sumar `sector_sigla` y `sector_nombre` (D1: `text`, opcionales, `editable:false`, con `title`) a `table-movimientos_bien.ts` y `table-movimientos_solicitudes.ts`, y dejar la referencia a `sectores` de las dos con `displayFields:[]` (D5). Verificar con `npm run build` y con un test de fuente de que los cuatro campos existen, no son editables y tienen `title`
- [x] 1.2 Escribir `install/sector_texto_trg.sql` con `sector_texto_trg()` y un trigger `BEFORE INSERT OR UPDATE` en cada tabla (D2), y registrarlo en `post-adapt` de `def-config.ts`. Cubrirlo con `test/sector-texto.test.js` sobre PostgreSQL, en las dos tablas: alta con sector, alta sin sector, renombre del sector, baja del sector, cambio de sector de la fila, sector quitado, intento de editar el texto sin cambiar el sector y cambio de código del sector por la cascada
- [x] 1.3 En el mismo test, cargar además `solicitudes_integridad_trg.sql` y `movimientos_solicitudes_estado_trg.sql` y verificar que procesar una solicitud deja sus movimientos con el texto del catálogo (D3) y que cambiar el estado de una solicitud que salió de borrador no se rechaza
- [x] 1.4 Escribir `install/sector_texto_inicial.sql` (D4) y registrarlo en `post-adapt` después del trigger. Cubrirlo en el test: completa los movimientos y solicitudes con sector, incluido un movimiento con `acta_origen` y una solicitud fuera de borrador; no cambia ninguna otra columna (comparar la fila entera antes y después); y corrido por segunda vez después de un renombre no pisa lo guardado
- [ ] 1.5 Regenerar la base de desarrollo con `npm run dump` y verificar con una consulta que no queda ningún movimiento con sector y sin texto, y que la cantidad de movimientos es la misma que antes

## 2. Vistas históricas

- [x] 2.1 Agregar `textoDeSectorGuardadoSql` junto a `codigoTextoSql` (D5) y usarlo en `sqlMovimientosConsulta`: `lag` de las dos columnas en la ventana existente y sin `JOIN sectores`. Actualizar `test/consulta-movimientos.test.js` (hoy exige esos dos `JOIN`) y sumar un test sobre PostgreSQL con los escenarios "consulta después de un renombre", "origen con el texto del movimiento anterior" y "sector sin sigla"
- [x] 2.2 Cambiar `lateralUbicacion` en `calendario-fuentes.ts` para que use las columnas guardadas, sin `JOIN sectores`. Verificar con `test/calendario.test.js` sin fallas y un test de fuente de que el sector de los movimientos no sale del catálogo
- [x] 2.3 Hacer que `detalleDeMovimiento` (`historial-datos.ts`) arme "sector código — sigla", con el nombre si no hay sigla. Cubrirlo en `test/historial-bien.test.js`: con sigla, sin sigla y sin texto guardado (queda sólo el código)
- [x] 2.4 Pasar el listado de solicitudes (`solicitudes-listado.tsx`) y la búsqueda de `src/common/solicitudes.ts` de `sectores__sigla` a `sector_sigla`, con `sector_nombre` como respaldo y dentro de la búsqueda. Actualizar los datos de `test/pantallas-react.test.js` y verificar que una solicitud se encuentra por la sigla guardada y por el nombre guardado
- [x] 2.5 Verificar con `grep` que `table-bienes.ts`, `reportes-bienes.ts`, el control, las bajas y `form-field-renderer.tsx` no cambiaron, y con `npm test` que sus tests siguen pasando: el estado actual sigue leyendo el catálogo

## 3. Producción

- [ ] 3.1 Sumar al `install/cambios/cambios_<fecha>.sql` del día las cuatro columnas con sus checks, la función y los triggers, y el completado, en el orden del plan de migración. Preguntar antes si el script de ese día ya se aplicó; si se aplicó, abrir uno nuevo
- [x] 3.2 Probar el script sobre copias en tablas temporales con `ROLLBACK` y verificarlo con un script aparte contra el respaldo: mismas filas, ninguna celda distinta fuera de las dos columnas nuevas, ningún movimiento ni solicitud con sector y sin texto

## 4. Cierre

- [ ] 4.1 Con el servidor levantado en desarrollo, renombrar un sector que tenga movimientos y verificar que la consulta de movimientos, el calendario del día, el historial de la ficha y el listado de solicitudes muestran el nombre anterior, y que la búsqueda de bienes y la vista rápida muestran el nuevo. Dejar el sector como estaba
- [x] 4.2 Correr `npm test` y `npm run build` sin fallas, y documentar en `CLAUDE.md` y `AGENTS.md`: qué columnas guardan el texto, cuándo se toma, que lo histórico lee lo guardado y lo actual el catálogo, que los registros anteriores tienen el nombre del día en que se aplicó, y que los códigos de sector se cambian de a uno
