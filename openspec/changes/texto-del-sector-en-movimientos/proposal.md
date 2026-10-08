# Proposal

## Why

Los movimientos y las solicitudes guardan sólo el código del sector; la sigla y el nombre se leen siempre del catálogo `sectores`. Si un sector cambia de nombre, se reorganiza o siper reutiliza su código para otra unidad, todos sus movimientos viejos pasan a mostrar el dato de hoy y se pierde qué área era en ese momento.

El organigrama va a cambiar con el tiempo (altas, bajas, renombres). La trazabilidad de un bien no puede depender de cómo se llame el sector hoy.

## What Changes

- **Movimientos y solicitudes guardan la sigla y el nombre del sector**, además del código. Dos columnas nuevas en `movimientos_bien` y dos en `movimientos_solicitudes`.
- **El texto se toma del catálogo cuando se elige o se cambia el sector de la fila.** Después no cambia, aunque el sector se renombre, se dé de baja o cambie de código.
- **No se edita a mano.** Lo escribe la base, no las pantallas.
- **Lo histórico muestra el texto guardado:** la consulta de movimientos (pantalla, grilla y solapa Movimientos de la solicitud), el "de dónde a dónde" del calendario, el historial de la ficha, la grilla de movimientos y el listado de solicitudes.
  - El formato sigue siendo "código — sigla". Si el sector no tenía sigla, se muestra el nombre.
  - El historial de la ficha hoy muestra sólo el código del sector; pasa a mostrar también el texto.
- **Lo actual sigue leyendo el catálogo vivo:** búsqueda de bienes, vista rápida, reportes, control y los selectores de las pantallas de carga.
- **Los registros que ya existen** se completan con la sigla y el nombre que el sector tiene el día que se aplica el cambio. No hay otro dato mejor.

Fuera de alcance, por decisión tomada en la exploración:
- Borrar sectores. Siguen dándose de baja con `activo = false`, y las claves foráneas no cambian.
- Guardar de quién dependía el sector.
- Espacios, sedes y responsables, que tienen el mismo problema.

## Capabilities

### New Capabilities
- `texto-del-sector-en-movimientos`: los movimientos y las solicitudes conservan la sigla y el nombre que el sector tenía cuando se lo eligió, y las vistas históricas muestran ese texto en lugar del catálogo actual.

### Modified Capabilities

Ninguna. La única capacidad archivada es `control-de-bienes` y no cambia. Las capacidades `consulta-de-movimientos`, `calendario` y `solicitudes-de-movimiento` viven en cambios sin archivar; sus requisitos no cambian, sólo de dónde sale el texto del sector que ya muestran.

## Impact

- **Base:**
  - cuatro columnas nuevas: `sector_sigla` y `sector_nombre` en `movimientos_bien` y en `movimientos_solicitudes`;
  - `install/sector_texto_trg.sql`: función y un trigger por tabla;
  - `install/sector_texto_inicial.sql`: completa los registros existentes;
  - los dos registrados en `def-config.ts`, y todo en el `install/cambios/cambios_<fecha>.sql` del día.
- **Servidor:**
  - `table-movimientos_bien.ts` y `table-movimientos_solicitudes.ts`: los campos nuevos, y la referencia a `sectores` deja de traer la sigla y el nombre vivos;
  - `table-movimientos_consulta.ts` y `calendario-fuentes.ts`: el sector de origen y de destino sale del texto guardado.
- **Cliente:**
  - `principal/bien/historial-datos.ts`: el detalle del movimiento;
  - `principal/solicitud/solicitudes-listado.tsx` y `src/common/solicitudes.ts`: la columna y la búsqueda por sector.
- **Datos:** `movimientos_bien.tab` no cambia; el dump completa el texto con el script inicial.
- **Sin cambios:** `sectores`, sus claves foráneas, el documento de la solicitud y las pantallas de carga.
