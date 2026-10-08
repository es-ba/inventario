# Design

## Context

Motivación y alcance: ver `proposal.md`. Lo que sigue es lo que se observó en el código y condiciona el diseño.

- **Cómo se guarda hoy.** `movimientos_bien.sector` y `movimientos_solicitudes.sector` son claves foráneas a `sectores` con `on update cascade` y sin `on delete`: un sector en uso no se puede borrar, pero un cambio de código se propaga.
- **Dónde nacen los movimientos.** En dos lugares: el trigger de `install/movimientos_solicitudes_estado_trg.sql` (al procesar una solicitud) y el procedure de movimiento directo en `procedures-principal.ts`. El destino de cada bien sale de `resolver_destino`, así que el sector del movimiento puede no ser el de la cabecera de la solicitud.
- **Quién lee el texto del sector de un movimiento.**
  - `sqlMovimientosConsulta` (`table-movimientos_consulta.ts`): dos `JOIN sectores`, uno para el origen (`lag`) y otro para el destino. Lo usan la pantalla, la grilla y la solapa de la solicitud.
  - `lateralUbicacion` (`calendario-fuentes.ts`): el "de dónde a dónde" del día.
  - La grilla `movimientos_bien`: `displayFields:['sigla','nombre_sector']` en la referencia a `sectores`.
  - El historial de la ficha (`detalleDeMovimiento` en `historial-datos.ts`): hoy muestra sólo el código.
  - El listado de solicitudes: `sectores__sigla`, que viene de la referencia de `movimientos_solicitudes`, y la búsqueda de `src/common/solicitudes.ts`.
- **Triggers de inmutabilidad** (`install/solicitudes_integridad_trg.sql`).
  - `movimiento_solicitud_inmutable_trg` rechaza cualquier `UPDATE` de un movimiento que viene de una solicitud.
  - `solicitud_contenido_inmutable_trg` rechaza cualquier cambio de contenido de una solicitud que salió de borrador; compara la fila entera salvo `estado`, `fecha_modificacion` y `usuario_modificacion`.
  - Consecuencia: completar los registros existentes con un `UPDATE` común falla, y cambiarle el código a un sector con solicitudes procesadas ya falla hoy.
- **Otros triggers sobre las dos tablas:** auditoría de usuario (pone fecha y usuario de modificación), responsables activos y recálculo del estado del bien. Ninguno modifica `sector`.
- **Dump.** `movimientos_bien.tab` no trae columnas de texto. El antecedente para un dato derivado es `install/bienes_estado_inicial.sql`: un script `post-adapt` que lo calcula para todos después de la carga, con el trigger de auditoría deshabilitado.

## Goals / Non-Goals

**Goals:**
- Que el texto lo escriba un solo lugar, sin importar por dónde nazca la fila.
- Que completar lo existente no deje rastro en otras columnas ni en el historial.
- Que las vistas históricas no dependan de `sectores` para el texto.

**Non-Goals:**
- `movimientos_solicitud_bien.origen` y `destino` (jsonb por bien) siguen guardando sólo códigos. Una vez procesada la solicitud, el movimiento ya tiene el texto.
- `declaraciones` y `declaraciones_bienes`, que también guardan sólo el código del sector.
- La solapa Datos de la solicitud: usa el selector de carga y sigue mostrando la etiqueta del catálogo, aunque la solicitud esté cerrada.
- Mostrar en las pantallas React el nombre largo además de la sigla. Queda guardado y visible en las grillas de backend-plus.

## Decisions

### D1. Dos columnas físicas por tabla: `sector_sigla` y `sector_nombre`

`text`, opcionales, `editable:false`, con `title` en castellano ("sigla del sector", "nombre del sector"), en `movimientos_bien` y en `movimientos_solicitudes`.

- **Por qué dos y no un texto armado:** la sigla y el nombre se muestran y se filtran por separado, y el formato de pantalla ("código — sigla") puede cambiar sin tocar datos.
- **Alternativa descartada:** una tabla de versiones de sectores con vigencia. Es el modelo completo, pero obliga a traducir cada importación de siper y no hace falta para lo que se pidió.

### D2. Un trigger `BEFORE INSERT OR UPDATE` por tabla, con una sola función

`install/sector_texto_trg.sql` define `sector_texto_trg()` y la engancha en las dos tablas. La regla:

| Caso | Qué hace |
|---|---|
| `INSERT` | Toma sigla y nombre de `sectores` para `new.sector`. Sin sector, quedan en null. |
| `UPDATE` sin cambio de sector | Deja la sigla y el nombre anteriores, aunque el `UPDATE` traiga otros. |
| `UPDATE` con otro sector, y el anterior sigue existiendo o era null | Toma sigla y nombre del sector nuevo. |
| `UPDATE` con otro sector, y el anterior ya no existe en `sectores` | Es un cambio de código que llegó por la cascada: conserva el texto. |

- **Por qué un trigger y no las pantallas ni los procedures:** los movimientos nacen en dos lugares y las solicitudes se editan desde la grilla y desde React. El trigger cubre todo, incluida cualquier carga futura.
- **Por qué pisar lo que venga en el `UPDATE`:** así el campo no se puede editar por ninguna vía, y un cambio de estado de una solicitud cerrada no altera la fila que compara `solicitud_contenido_inmutable_trg`. El orden entre triggers no importa: ninguno de los otros modifica `sector` ni estas columnas.
- **Cómo se reconoce el cambio de código:** la cascada corre después de que `sectores` ya tiene el código nuevo, así que el código anterior no existe más. En un cambio genuino de sector el anterior siempre existe, porque los sectores no se borran.
  - Alternativa descartada: `pg_trigger_depth()`. El procesamiento de solicitudes también corre anidado y se confundiría.
- **En el `INSERT` no se respeta un texto que venga cargado.** Siempre sale del catálogo.

### D3. El texto del movimiento se toma al registrarlo, no se copia de la solicitud

El movimiento que sale de una solicitud toma el texto del catálogo en el momento de procesarla.

- **Por qué:** el sector de cada bien sale de `resolver_destino` y puede no ser el de la cabecera, así que no hay un texto de la solicitud que copiar. Y la regla queda una sola: cada fila toma el texto cuando se le pone el sector.
- **Costo aceptado:** si el sector se renombra entre que se carga la solicitud y se procesa, la solicitud y sus movimientos quedan con textos distintos. Los dos son ciertos para su momento.

### D4. Completar lo existente con los triggers de usuario deshabilitados

`install/sector_texto_inicial.sql`, registrado en `post-adapt` después de `sector_texto_trg.sql`:

```sql
ALTER TABLE movimientos_bien DISABLE TRIGGER USER;
UPDATE movimientos_bien m SET sector_sigla = s.sigla, sector_nombre = s.nombre_sector
  FROM sectores s
 WHERE s.sector = m.sector AND m.sector_sigla IS NULL AND m.sector_nombre IS NULL;
ALTER TABLE movimientos_bien ENABLE TRIGGER USER;
```

y lo mismo para `movimientos_solicitudes`.

- **Por qué deshabilitar:** con los triggers activos, el `UPDATE` es rechazado por los de inmutabilidad, puede ser rechazado por el de responsables activos, deja fecha y usuario de modificación en cada fila y recalcula el estado de cada bien. `DISABLE TRIGGER USER` no toca las claves foráneas.
- **Por qué sólo donde está vacío:** se puede volver a correr sin reescribir historia.
- **El mismo script sirve para el dump y para producción.** En desarrollo corre en cada dump y deja todo con el nombre de hoy; ahí no hay historia que cuidar.
- **Alternativa descartada:** sumar las columnas a `movimientos_bien.tab`. Habría que mantener 9.851 filas a mano y el dato no es más cierto que el del catálogo.

### D5. Las vistas históricas leen las columnas guardadas

Un helper SQL junto a `codigoTextoSql` (`table-bienes.ts`), `textoDeSectorGuardadoSql(codigo, sigla, nombre)`, arma "código — sigla" y cae al nombre si no hay sigla.

- **Consulta de movimientos:** la subconsulta suma `lag(mb.sector_sigla)` y `lag(mb.sector_nombre)` a la ventana que ya existe; se van los dos `JOIN sectores`. El origen sigue calculándose antes de cualquier filtro.
- **Calendario:** `lateralUbicacion` usa las columnas de `m` y se va su `JOIN sectores`.
- **Grillas `movimientos_bien` y `movimientos_solicitudes`:** la referencia a `sectores` queda con `displayFields:[]`; el texto son las dos columnas nuevas. En `movimientos_bien` el `JOIN sectores` de la consulta base se queda, porque trae el jefe actual del sector.
- **Historial de la ficha:** `detalleDeMovimiento` arma "sector 242 — SIS" con los campos que ya llegan por `table_data`.
- **Listado de solicitudes:** la columna y la búsqueda (`src/common/solicitudes.ts`) pasan de `sectores__sigla` a `sector_sigla`, con el nombre como respaldo, y la búsqueda suma `sector_nombre`.

Nada que muestre el estado actual cambia: `sqlBienesConControl`, reportes, control, bajas y los selectores siguen con el catálogo.

## Risks / Trade-offs

- **El texto de los registros anteriores es el de hoy, no el de su fecha** → No hay de dónde sacarlo. Queda dicho en la propuesta y en `CLAUDE.md`.
- **`ALTER TABLE … DISABLE TRIGGER` bloquea la tabla mientras corre** → El completado toca unas 10.000 filas y tarda segundos; en producción se corre fuera de horario, dentro de la transacción del script de cambios.
- **Mientras los triggers están deshabilitados no hay validaciones** → El bloque sólo escribe las dos columnas nuevas, y el test del script verifica que no cambie ninguna otra celda.
- **Sacar `sigla` de los `displayFields` de `movimientos_solicitudes` puede afectar a quien lea `sectores__sigla`** → Los únicos usos son el listado, la búsqueda y los datos de prueba de `test/pantallas-react.test.js`; los tres se cambian en este trabajo. El selector del formulario carga `sectores` por su cuenta.
- **Un cambio de código seguido de otro sobre el mismo sector viejo** (se libera `242` y se lo asigna a otra unidad en la misma operación) puede confundir la detección de D2 → Es un caso de mantenimiento manual; se documenta que los códigos se cambian de a uno.
- **La solapa Datos de una solicitud cerrada sigue mostrando el nombre actual** → Fuera de alcance; el listado, la solapa Movimientos y el documento emitido muestran el dato de su momento.

## Migration Plan

1. **Desarrollo:** definiciones, scripts en `def-config.ts` y `npm run dump`. El script inicial deja todos los movimientos con texto.
2. **Producción**, en el `install/cambios/cambios_<fecha>.sql` del día, en una transacción y en este orden:
   - las cuatro columnas con sus checks `<>''`, con los mismos nombres que genera el dump;
   - la función y los dos triggers de `sector_texto_trg.sql`;
   - el contenido de `sector_texto_inicial.sql`.
3. **Prueba previa** sobre copias en tablas temporales y con `ROLLBACK`, comparando contra el respaldo: mismas filas, ninguna celda distinta fuera de las dos columnas, ningún movimiento con sector y sin texto.
4. **Vuelta atrás:** borrar los dos triggers, la función y las cuatro columnas, y volver al código anterior. No se pierde ningún dato que existiera antes.
