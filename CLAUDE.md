# inventario

Sistema de inventario para el IDECBA (Instituto de Estadística y Censos de la Ciudad Autónoma de Buenos Aires). Backend basado en `backend-plus` + PostgreSQL.

## Estructura del proyecto

- `src/server/` — código del servidor (TypeScript). Define tablas (`table-*.ts`), procedures, app principal, configuración.
- `src/client/` — código del cliente. `src/client/principal/` es el frontend React (MUI); en la raíz están los `clientSides` y las wScreens que lo montan sobre la grilla de `backend-plus`.
- `src/unlogged/` — código para la pantalla de login y vistas no autenticadas.
- `src/common/` — tipos y contratos compartidos entre cliente y servidor.
- `install/` — scripts SQL aplicados durante el `dump`/`adapt` (triggers, funciones).
- `dist/` — output de la compilación.

## Frontend React

El frontend React vive en este repo, en `src/client/principal/`: pantallas de bienes, solicitudes y reportes en React + MUI, montadas como wScreens de `backend-plus`.

Vista rápida de bienes: el clic (o Enter) en una fila de la búsqueda (`busqueda-bienes.tsx`) abre un panel lateral (`principal/bien/vista-rapida-bien.tsx`) con datos principales y asignación, armados por funciones puras en `vista-rapida-datos.ts`; usa sólo la fila ya cargada. La búsqueda y la tabla `bienes` comparten la consulta base `sqlBienesConControl` (`table-bienes.ts`).

El repo `frontend-inventario` **ya no se usa**. No trabajar ahí ni tomarlo como referencia.

## Comandos útiles

- `npm run build` — compila cliente + server + unlogged + mixin-patch.
- `npm run build-ignore-error` — compila ignorando errores de TS y corre webpack.
- `npm start` — arranca el servidor (`dist/server/server-principal.js`).
- `npm run dump` — corre el server con `--dump-db` (aplica los SQLs de `install/` definidos en `def-config.ts`).
- `npm run watch:buildS` — TypeScript watch mode del servidor.

## Convenciones del backend (`backend-plus`)

- **Tablas:** una función por archivo en `src/server/table-*.ts` que devuelve un `TableDefinition`.
- **Registro de tablas:** se agregan al método `prepareGetTables()` de `AppInventario` en `app-principal.ts`.
- **Procedures:** se exportan en el array `ProceduresInventario` en `procedures-principal.ts`.
- **Endpoints custom:** se registran en `addSchrödingerServices` (autenticación opcional) o `addUnloggedServices` (público).
- **Secuencias autonumeradoras:** definir el campo con `{...field, sequence:{ firstValue:N, name:'mi_seq' }}` y backend-plus las crea via adapt.
- **Triggers SQL custom:** agregarlos a `install/*.sql` y registrarlos en `def-config.ts` bajo `install.dump.scripts.pre-adapt` o `post-adapt`.

## Adjuntos a bienes

La tabla `adjuntos_bienes` permite asociar N archivos por bien. PK compuesta `(ficha, numero_adjunto)`. El procedure `archivo_subir` recibe el archivo via multipart y lo guarda en `local-attachments/<ficha>/<filename>`. Endpoint de descarga: `GET /download/adjunto_bien?ficha=...&numero_adjunto=...`. Borrado físico diferido por cron a las 23:58 vía tabla `archivos_borrar` + trigger `archivo_borrar_trg`.

## Estado del bien

`bienes.estado` lo determina el sistema, no se edita a mano. Valores (catálogo `install/estados_bien.tab`), por precedencia: `BAJA` (inactivo), `BAJA_EN_TRAMITE` (baja SOLICITADA), `EN_MOVIMIENTO` (en una solicitud que no está en `B` ni `Pr`), `ASIGNADO` (último movimiento con sector o responsable directo), `SIN_ASIGNAR`.

- Regla única: `bien_estado_calcular` en `install/bienes_estado.sql`. Los triggers AFTER sobre `movimientos_solicitudes` (cambio de estado) y `movimientos_bien` llaman a `bien_estado_recalcular`.
- La baja lo calcula en el mismo UPDATE, dentro de `bienes_baja_estado_trg`, que además rechaza cualquier `estado` distinto del calculado.
- El dump lo recalcula para todos con `install/bienes_estado_inicial.sql`, sin dejar historial. `bienes.tab` no trae la columna `estado`.
- Sumar una condición nueva: se edita `bien_estado_calcular` y, si depende de otra tabla, se le agrega un trigger que llame a `bien_estado_recalcular`.

## Control de bienes

Registro de controles físicos de todo bien activo (`condicionControlable` en `controles-bien.ts`). El reporte de parque tecnológico conserva su propio alcance (rubro 3, clases 4 y 6; `condicionParqueTecnologico`, reexportada por `reportes-bienes.ts`).

- Tablas: `controles_bien` (cabecera: fecha, observación, usuario; PK por secuencia) y `controles_bien_items` (valor por ítem). Catálogos: `items_control`, `items_control_opciones`, `items_control_grupos`. Vista `bienes_control` con el último control y la situación `NUNCA`/`VENCIDO`/`VIGENTE`.
- Alta sólo por el procedure `control_registrar` (`procedures-controles.ts`); la validación es pura en `controles-bien.ts` (`planificarControl`). Requiere la capacidad `puede_controlar`.
- Vigencia: `inventario.control.dias_vigencia` en `def-config.ts` (365), sobreescribible en `local-config.yaml`.
- Pantalla React: wScreen `controles` (`ws-controles.tsx`, `principal/control/`).
- Agregar un ítem: filas en `items_control` (y en `items_control_opciones` si es `opcion`). Limitarlo a grupos: filas en `items_control_grupos`; sin filas aplica a todos. `items_control_grupos.tab` vive en `inventario-data/provisorio` porque referencia `grupos`.
- Sumar un tipo de ítem: agregarlo a `TIPOS_DE_ITEM` (`src/common/controles.ts`), un `case` en `validarValor` (`controles-bien.ts`) y otro en `ValorDeItem` (`control-bien.tsx`).
- En `bienes` (grilla y búsqueda React): `fecha_ultimo_control` y `situacion_control`, con el mismo cálculo que `bienes_control` (`sqlUltimoControl` y `sqlSituacionControl` en `controles-bien.ts`). En los bienes dados de baja la situación queda vacía.
- Grilla de backend-plus: `bienes_control` en el menú "operaciones" ("control de bienes (grilla)"), junto a la pantalla; las dos entradas se ven con `puede_controlar`, para consultar, filtrar y exportar. No permite dar de alta controles.
- Pantalla: Enter en el buscador abre la ficha; acepta el EAN-13 de la etiqueta (`fichaDesdeEAN13` en `src/common/codigos-barra.ts`). El listado queda montado mientras se ve un bien, así se conservan filtros y página.

## Personas de siper

siper es la fuente de las personas; inventario sólo recibe (nunca escribe en siper).

- Clave del responsable: si tiene `idper`, la clave **es** el `idper` (check `responsables_clave_idper` + `unique(idper)`). Sin `idper`, dos letras del apellido + `I` + número (`AGI1`), que siper no puede generar. La pone `responsables_id_trg` sólo en INSERT; corregir el apellido no la cambia.
- Recepción: agnóstica de la fuente y todavía sin definir. Quien reciba las personas de siper llama a `registrarPersonasSiper` (`procedures-siper.ts`) con la lista; valida (`validarPersonasSiper`), reemplaza `siper_personas` (sin CUIL ni documento), anota en `siper_recepciones` y concilia.
- Al recibir se copian sólo `activo_siper` y `fecha_egreso` de los vinculados por `idper`. `activo` es de inventario y lo cambia el administrador (`responsables_inactivar`); las altas usan `responsables_alta_siper`.
- Un responsable inactivo no se asigna: `install/responsables_activos_trg.sql` lo rechaza en solicitudes, movimientos (salvo los que vienen de una solicitud) y jefe de sector; en React, `sinInactivos` (`form-field-renderer.tsx`) lo saca de los selectores. Lo que les quedó a cargo se ve en `responsables_inactivos_a_cargo`.
- Pantalla: wScreen `siper` (`ws-siper.tsx`, `principal/siper/`), en "gestion de datos" → "siper" → "personas", sólo `admin`. Solapa Personas: vista `siper_conciliacion` con la situación de cada persona (sincronizado, inactivo siper, alta, posible duplicado, ausente en siper, sólo en inventario, inactivo en inventario); para los responsables usa `activo_siper` ya conciliado. Solapa A cargo de inactivos: vista `responsables_inactivos_a_cargo`.
