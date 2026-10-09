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

Vista rápida de bienes: el clic (o Enter) en una fila de la búsqueda (`busqueda-bienes.tsx`) abre un panel lateral (`principal/bien/vista-rapida-bien.tsx`) con datos principales y asignación, armados por funciones puras en `vista-rapida-datos.ts`; usa sólo la fila ya cargada. La búsqueda y la tabla `bienes` comparten la consulta base `sqlBienesConControl` (`table-bienes.ts`). Los catálogos se enganchan afuera del `LATERAL` del último movimiento, que sólo trae `mb.*`. El conteo de la búsqueda cuenta sobre `bienes` a secas cuando el filtro no toca ninguna columna derivada (`camposSimples` en `procedures-principal.ts`): todo campo que no esté en la tabla física necesita `inTable:false`, o el conteo lo va a buscar donde no está.

Columnas de la búsqueda: abre con `COLUMNAS_INICIALES` (`principal/columnas-busqueda.ts`), no con `hiddenColumns` (que sigue siendo de la grilla de backend-plus); la elección de cada usuario queda en `localStorage` y "Restablecer columnas" la borra. Los valores con código se muestran sin él (`textoSinCodigo`, con el `<campo>_codigo` de la fila) y el completo va en el tooltip. Los encabezados salen del `title` de cada campo de `bienes`: todo campo nuevo necesita uno en castellano. La búsqueda avanzada ofrece los campos de `bienes` sin los que backend-plus agrega por clave foránea (`selectBienesFilterFields` los reconoce por `referencedName`): llegan con el título del catálogo ("Nombre", "Descripcion") y el servidor no los acepta. «Es alguno de» (operador `in`, con una lista como valor) se ofrece en los campos que son dimensión del resumen (`bienes-dimensiones.ts`) y en los atributos: compara por el `valor` de la dimensión, igual que `grupoFiltro`, no por `<campo>_texto`; las opciones del autocompletar salen de `bienes_buscar_agrupado` con la pestaña y sin condiciones. Sumar un campo al resumen lo suma a ese operador. Búsqueda rápida sin orden elegido: primero la ficha idéntica, después lo que coincide en identificación (`CAMPOS_DE_IDENTIFICACION` en `bienes-busqueda-query.ts`) y al final el resto, con `coincide_en` para mostrar dónde coincidió; el conjunto y el conteo no cambian.

Foto: `FotoDelBien` (`principal/bien/foto-del-bien.tsx`) muestra la miniatura de `fila.foto`, la agranda al tocarla y, con `puedeSacar` y `puede_guardar`, ofrece "Sacar foto": un `<input type="file" capture>` (cámara en el teléfono, selector de archivos en la computadora), achica a 1600 px con un canvas (`medidasDeFoto`) y sube con `es_foto`. Está en el encabezado de la ficha, la vista rápida (sin sacar), la tarjeta "Estado actual" del control y Escanear. No es columna de la búsqueda (`foto` es `inTable:false` y no es de asignación), pero sí campo de filtro.

Mover: el botón está en la fila de acciones de la ficha (bien activo y `puede_mover`) y en la barra de la búsqueda con selección.

Ficha del bien (`principal/bien/bien-formulario.tsx`): la solapa Historial (`historial-bien.tsx`) une eventos con sus cambios, movimientos y controles en una línea de tiempo; el armado y el orden son puros en `historial-datos.ts`. "Clonar" abre un alta con los campos de `CAMPOS_CLONABLES` (`clonar-bien.ts`); sólo aparece donde la pantalla pasa `onClonar` (hoy, `ws-principal.tsx`).

Pantallas React (`src/client/ws-*.tsx`): todas se arman con `PantallaInventario` (`principal/base/pantalla-inventario.tsx`: encabezado y "volver al menú" con `solicitarSalida`), y los helpers `textoDeReferencia`, `codigo` y `leerTabla` viven sólo en `principal/base/referencias.ts`. Un formulario con estado propio (sin `useRowEditor`) tiene que llamar a `useRegistrarEdicion` para que salir pida confirmación. Para abrir la ficha de un bien desde otra pantalla: `location.hash = 'w=principal&ficha=<ficha>'` (con `unmountConnectedAppInventario`).

Listado de solicitudes: los filtros son puros en `src/common/solicitudes.ts`. Los estados salen del catálogo `estados` y no se escriben en el código; "en curso" es tener `acciones` disponibles. Cada contador ignora su propio filtro y respeta los demás (`contarPorEstado`). El listado queda montado mientras se ve una solicitud.

Hora de registro: `movimientos_bien.momento` y `controles_bien.momento` (timestamp, default `current_timestamp`, no editable) guardan cuándo se registró la fila. Los registros anteriores quedan en null: `movimientos_bien.tab` trae la columna vacía para que el dump no les ponga su propia hora, y en producción la columna se agrega sin default y después se le pone. En el historial de la ficha, los movimientos se ordenan por `momento`; los controles, por su `fecha`, y sólo usan la hora de `momento` si es del mismo día (`momentoDeControl`).

Calendario (wScreen `calendario`, `ws-calendario.tsx` + `principal/calendario/`): vista mes y vista día, como el de Snipe-IT. Cuatro tipos de evento fijos en el código (`TIPOS_DE_EVENTO` en `src/common/calendario.ts`): movimientos (por día y solicitud), bajas (cada cambio de `estado_baja` del historial, con la etiqueta de `estados_baja`), controles por vencer (último control + vigencia) y egresos de siper de personas con bienes a cargo, sólo como aviso (no activa ni desactiva a nadie). Etiqueta, orden, activo y color de cada tipo están en el catálogo `tipos_evento_calendario`. El SQL de cada fuente está en `calendario-fuentes.ts`, y todas pasan por `bienes` para respetar la RLS. `calendario_eventos` devuelve el resumen de un rango (hasta 62 días), `calendario_dia` los grupos del día (con sus usuarios) y `calendario_dia_bienes` una página de bienes de un grupo (`sqlBienesDelGrupo`, hasta 100; en movimientos se pagina antes de resolver de dónde a dónde, porque un grupo puede tener miles), con columnas según el tipo: de dónde a dónde en movimientos, hora, motivo y respaldo en bajas, último control en controles, a cargo como en egresos.

Consulta de movimientos (wScreen `movimientos`, `ws-movimientos.tsx` + `principal/movimiento/`): una fila por bien movido, con o sin solicitud, sólo lectura; en "reportes", para todos los roles. La definición `movimientos_consulta` (`table-movimientos_consulta.ts`, sin tabla física) la leen por `table_data` la pantalla, la grilla de backend-plus ("movimientos (grilla)") y la solapa Movimientos de la solicitud (`solicitud-movimientos.tsx`, por `acta_origen`). El origen ("de") es el movimiento anterior de la ficha, con `lag()` en una subconsulta sin `WHERE`: se calcula antes de filtrar, y cualquier filtro va por fuera. La pantalla pide al servidor sólo el rango de fechas (`until` en `leerTabla`) y filtra el resto con funciones puras (`src/common/movimientos-consulta.ts`); el contador de con/sin solicitud ignora su propio filtro. La grilla React (`grilla-de-movimientos.tsx`) es la misma en la pantalla y en la solapa; `Ubicacion` está en `principal/base/ubicacion.tsx` e `irA` en `render-connected-app-inventario.tsx`. El aviso de la solapa depende de que no haya filas, no del estado.

Escanear (wScreen `escanear`, `ws-escanear.tsx` + `principal/escanear/`): lee con la cámara el código de barras de la etiqueta y muestra el bien; lo único que escribe es la foto (`FotoDelBien`); está en el menú "desarrollo", que sólo ve `admin`, mientras se prueba. `lector-de-camara.tsx` no sabe de bienes: usa el `BarcodeDetector` del navegador (sólo Chrome y Edge de Android) y necesita https o `localhost`; si no puede, avisa el motivo y queda el campo de ficha a mano. La etiqueta empieza con ceros y la cámara puede entregarla como UPC-A de 12 dígitos: `fichaDesdeCodigoLeido` (`src/common/codigos-barra.ts`) acepta las dos formas. Sumar un formato (por ejemplo QR): agregarlo a `FORMATOS` y un caso a `fichaDesdeCodigoLeido`. La cámara se monta sólo mientras lee, así se apaga al mostrar un bien y al salir. El bien se pide con `bienes_buscar_avanzado` (`consultaPorFicha`), no con `table_data`, porque así llega con "código — descripción" y con sus atributos; qué datos se muestran y en qué grupo lo decide `seccionesDeEscaneo` (`escaneo-datos.ts`), que saca los vacíos. Está pensada para teléfono: dos columnas, datos largos a todo el ancho (`ancho`) y acciones fijas al pie.

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

La tabla `adjuntos_bienes` permite asociar N archivos por bien. PK compuesta `(ficha, numero_adjunto)`. El procedure `archivo_subir` recibe el archivo via multipart y lo guarda en `local-attachments/<ficha>/<numero_adjunto>-<nombre>` (`rutaDeAdjunto` en `nombre-archivo.ts`, que también usa `archivo_solicitud_subir`): el número se pide a la secuencia antes de insertar, así dos adjuntos con el mismo nombre no comparten archivo. Los anteriores a ese cambio conservan su ruta sin número; la lista muestra el nombre sin el prefijo (`nombreDeAdjunto` en `formato-valores.ts`). Endpoint de descarga: `GET /download/adjunto_bien?ficha=...&numero_adjunto=...`. Borrado físico diferido por cron a las 23:58 vía tabla `archivos_borrar` + trigger `archivo_borrar_trg`.

Foto del bien: un adjunto con `es_foto` (lo pone `archivo_subir` con el parámetro `es_foto`; no se edita). El servidor sólo acepta JPEG de hasta 5 MB (`validarFoto`, con `esJpeg` y `PESO_MAXIMO` de `src/common/fotos.ts`) y la guarda siempre como `<numero_adjunto>-foto.jpg`, sin usar el nombre que manda el cliente. La foto del bien es la de `numero_adjunto` más alto: llega en el campo derivado `bienes.foto` (`sqlBienesConControl`) y se muestra con el mismo endpoint de descarga. Borrar el adjunto deja como foto la anterior.

## Estado del bien

`bienes.estado` lo determina el sistema, no se edita a mano. Valores (catálogo `install/estados_bien.tab`), por precedencia: `BAJA` (inactivo), `BAJA_EN_TRAMITE` (baja SOLICITADA), `EN_MOVIMIENTO` (en una solicitud que no está en `B` ni `Pr`), `ASIGNADO` (último movimiento con sector o responsable directo), `SIN_ASIGNAR`.

- Regla única: `bien_estado_calcular` en `install/bienes_estado.sql`. Los triggers AFTER sobre `movimientos_solicitudes` (cambio de estado) y `movimientos_bien` llaman a `bien_estado_recalcular`.
- La baja lo calcula en el mismo UPDATE, dentro de `bienes_baja_estado_trg`, que además rechaza cualquier `estado` distinto del calculado.
- El dump lo recalcula para todos con `install/bienes_estado_inicial.sql`, sin dejar historial. `bienes.tab` no trae la columna `estado`.
- Sumar una condición nueva: se edita `bien_estado_calcular` y, si depende de otra tabla, se le agrega un trigger que llame a `bien_estado_recalcular`.

## Texto del sector en movimientos

`movimientos_bien` y `movimientos_solicitudes` guardan, además del código, la sigla y el nombre del sector (`sector_sigla`, `sector_nombre`), para que la historia no cambie cuando cambia el organigrama. Los sectores no se borran: se dan de baja con `activo = false`.

- Lo escribe `sector_texto_trg` (`install/sector_texto_trg.sql`), no las pantallas: toma el texto del catálogo al insertar la fila y cuando se le elige otro sector. Si el sector no cambia, conserva lo guardado aunque el `UPDATE` traiga otra cosa. El movimiento que sale de una solicitud lo toma al procesarse, no lo copia de la solicitud.
- Un cambio de código del sector conserva el texto: la cascada llega cuando el código anterior ya no existe en `sectores`, y así se lo reconoce. Por eso los códigos se cambian de a uno.
- Lo histórico lee lo guardado (`textoDeSectorGuardadoSql` en `table-bienes.ts`; sin sigla, usa el nombre): consulta de movimientos, "de dónde a dónde" del calendario, historial de la ficha, grillas de las dos tablas y listado de solicitudes. Lo actual sigue con el catálogo: búsqueda de bienes, vista rápida, reportes, control, bajas y los selectores de carga.
- Los registros anteriores al cambio tienen el nombre del día en que se aplicó, no el de su fecha. Los completa `install/sector_texto_inicial.sql`, que corre en cada dump y sólo llena lo vacío; deshabilita los triggers de usuario porque los de inmutabilidad rechazan cualquier `UPDATE` de un movimiento con solicitud o de una solicitud fuera de borrador.
- Quedan con sólo el código: `movimientos_solicitud_bien` (origen y destino por bien), las declaraciones y la solapa Datos de la solicitud, que usa el selector.

## Control de bienes

Registro de controles físicos de todo bien activo (`condicionControlable` en `controles-bien.ts`). El reporte de parque tecnológico conserva su propio alcance (rubro 3, clases 4 y 6; `condicionParqueTecnologico`, reexportada por `reportes-bienes.ts`).

- Tablas: `controles_bien` (cabecera: fecha, observación, usuario; PK por secuencia) y `controles_bien_items` (valor por ítem). Catálogos: `items_control`, `items_control_opciones`, `items_control_grupos`. Vista `bienes_control` con el último control y la situación `NUNCA`/`VENCIDO`/`VIGENTE`.
- Alta sólo por el procedure `control_registrar` (`procedures-controles.ts`); la validación es pura en `controles-bien.ts` (`planificarControl`). Requiere la capacidad `puede_controlar`.
- Vigencia: `inventario.control.dias_vigencia` en `def-config.ts` (365), sobreescribible en `local-config.yaml`.
- Pantalla React: wScreen `controles` (`ws-controles.tsx`, `principal/control/`).
- Agregar un ítem: filas en `items_control` (y en `items_control_opciones` si es `opcion`). Limitarlo a grupos: filas en `items_control_grupos`; sin filas aplica a todos. `items_control_grupos.tab` vive en `inventario-data/provisorio` porque referencia `grupos`.
- Sumar un tipo de ítem: agregarlo a `TIPOS_DE_ITEM` (`src/common/controles.ts`), un `case` en `validarValor` (`controles-bien.ts`) y otro en `ValorDeItem` (`control-bien.tsx`).
- Accesorios: un ítem de tipo `atributo` se vincula a un atributo de bien en `items_control_atributos` (uno a uno; el `.tab` vive en `inventario-data/provisorio` porque referencia `bienes_atributos`). Ofrece los valores de `bienes_atributo_valores` y `control_registrar` deja el valor en `bien_atributo`, sólo si el control queda como el último del bien (una fecha anterior no actualiza). Ítem vacío no toca el atributo; borrar el control no revierte. Vincular un accesorio nuevo: fila en `items_control` con tipo `atributo` y otra en `items_control_atributos`.
- Listado (`bienes_control`): suma estado, responsable directo y atributos (`atributos_texto`); `atributos` y `ultimo_control` viajan como jsonb `[{clave, nombre, valor}]` con `visible:false`, para filtrar en el cliente por atributo/valor e ítem del último control/valor (`pasaFiltroDePar`, `opcionesDePares` y `SIN_DATO` en `src/common/controles.ts`).
- Al abrir un bien: tarjeta "Estado actual" con las secciones de la vista rápida (`SeccionesDeBien` y `useDescripcionDeEstado`, exportados de `vista-rapida-bien.tsx`), sus atributos y el último control. Los ítems `atributo` muestran "hoy figura", y los atributos se releen al guardar.
- En `bienes` (grilla y búsqueda React): `fecha_ultimo_control` y `situacion_control`, con el mismo cálculo que `bienes_control` (`sqlUltimoControl` y `sqlSituacionControl` en `controles-bien.ts`). En los bienes dados de baja la situación queda vacía.
- Grilla de backend-plus: `bienes_control` en el menú "operaciones" ("control de bienes (grilla)"), junto a la pantalla; las dos entradas se ven con `puede_controlar`, para consultar, filtrar y exportar. No permite dar de alta controles.
- Pantalla: Enter en el buscador abre la ficha; acepta el EAN-13 de la etiqueta (`fichaDesdeEAN13` en `src/common/codigos-barra.ts`). El listado queda montado mientras se ve un bien, así se conservan filtros y página.

## Personas de siper

siper es la fuente de las personas; inventario sólo recibe (nunca escribe en siper).

- Clave del responsable: si tiene `idper`, la clave **es** el `idper` (check `responsables_clave_idper` + `unique(idper)`). Sin `idper`, dos letras del apellido + `I` + número (`AGI1`), que siper no puede generar. La pone `responsables_id_trg` sólo en INSERT; corregir el apellido no la cambia.
- Recepción: agnóstica de la fuente y todavía sin definir. Quien reciba las personas de siper llama a `registrarPersonasSiper` (`procedures-siper.ts`) con la lista; valida (`validarPersonasSiper`), reemplaza `siper_personas`, anota en `siper_recepciones` y concilia.
- Al recibir se copian `activo_siper` y los datos de `DATOS_DE_SIPER` (`siper-personas.ts`: egreso, ingreso, situación de revista, CUIL, documento, ficha, domicilio y teléfono) de los vinculados por `idper`, tal cual llegan (vacío pisa); apellido, nombre y sector sólo se toman en el alta. Sumar un dato: una fila en `DATOS_DE_SIPER` y la columna en `siper_personas`. `activo` es de inventario y lo cambia el administrador (`responsables_inactivar`); las altas usan `responsables_alta_siper`.
- Un responsable inactivo no se asigna: `install/responsables_activos_trg.sql` lo rechaza en solicitudes, movimientos (salvo los que vienen de una solicitud) y jefe de sector; en React, `sinInactivos` (`form-field-renderer.tsx`) lo saca de los selectores. Lo que les quedó a cargo se ve en `responsables_inactivos_a_cargo`.
- Pantalla: wScreen `siper` (`ws-siper.tsx`, `principal/siper/`), en "gestion de datos" → "siper" → "personas", sólo `admin`. Solapa Personas: vista `siper_conciliacion` con la situación de cada persona (sincronizado, inactivo siper, alta, posible duplicado, ausente en siper, sólo en inventario, inactivo en inventario); para los responsables usa `activo_siper` ya conciliado. Solapa A cargo de inactivos: vista `responsables_inactivos_a_cargo`.
