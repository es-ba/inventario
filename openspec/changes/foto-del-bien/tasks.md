# Tasks

## 1. Funciones puras

- [x] 1.1 Agregar `rutaDeAdjunto(carpeta, numero, nombreOriginal)` a `src/server/nombre-archivo.ts` (D3). Cubrirla en `test/nombre-archivo.test.js`: mismo nombre con números distintos da rutas distintas; un nombre con ruta (`../../otro/archivo.pdf`, `C:\tmp\a.pdf`) queda dentro de la carpeta con sólo `archivo.pdf` / `a.pdf`; nombre vacío da `<numero>-archivo`; un nombre largo se corta conservando la extensión
- [x] 1.2 Crear `src/common/fotos.ts` con `LADO_MAXIMO` (1600), `PESO_MAXIMO` (5 MB), `medidasDeFoto(ancho, alto)` y `esJpeg(bytes)` (D4, D5). Cubrirlas en `test/foto-del-bien.test.js`: 4000×3000 da 1600×1200, 3000×4000 da 1200×1600, 800×600 no se agranda, y `esJpeg` acepta `FF D8 FF` y rechaza un PDF, un PNG y un archivo vacío

## 2. Base y servidor

- [x] 2.1 Agregar `es_foto` a `table-adjuntos_bienes.ts` (boolean, no nulo, default `false`, no editable, `title:'foto'`) (D1). Dumpear con `npm run dumpb` y verificar que `local-db-dump.sql` trae la columna. Copiar de ahí el `alter table` a `install/cambios/cambios_<fecha del día>.sql` (archivo nuevo si el del día ya se aplicó en producción) y probarlo sobre una copia en tabla temporal con rollback
- [ ] 2.2 Cambiar `archivo_subir` (D1, D3, D4): parámetro `es_foto` con default `false`; si es foto, validar peso y `esJpeg` antes de insertar y rechazar con mensaje claro; pedir el número a `numero_adjunto_seq`, armar la ruta con `rutaDeAdjunto` (nombre `foto.jpg` si es foto) e insertar con ese número y `es_foto`. Verificar con tests de fuente en `test/foto-del-bien.test.js` de que valida antes del `insert`, de que usa `rutaDeAdjunto` y de que ya no guarda con el nombre original a secas; y a mano: subir dos veces un archivo con el mismo nombre a una ficha y ver dos archivos en `local-attachments/<ficha>/`
- [ ] 2.3 Cambiar `archivo_solicitud_subir` para que guarde con `rutaDeAdjunto` y el número de `adjuntos_solicitudes_numero_adjunto_seq` (D3). Verificar con un test de fuente y a mano: dos adjuntos con el mismo nombre en una solicitud, borrar uno y descargar el otro
- [x] 2.4 Sumar la columna `foto` a `sqlBienesConControl` y el campo `foto` a `bienes` (`bigint`, `inTable:false`, `editable:false`, `title:'foto'`), agregado a `hiddenColumns` (D2). Verificar con un test de que el campo existe con `inTable:false` y título, de que `selectBienesGridFields` no lo incluye y de que no entra en `camposSimples`; correr `EXPLAIN ANALYZE` de la búsqueda sin filtros antes y después y anotar los tiempos en la tarea. Si empeora de forma apreciable, pasar la subconsulta a un `LEFT JOIN LATERAL` — Medido el 2026-10-08 sobre la consulta base (`EXPLAIN ANALYZE`, rol admin, 10.236 bienes), simulando una foto por bien en una tabla temporal y la política de `adjuntos_bienes` como condición, todo con rollback: todas las filas 156 ms → 221 ms; una página de 50 ordenada por ficha 3,9 ms → 4,4 ms. Queda la subconsulta; no hace falta el `LATERAL`. Falta repetirlo sobre la base real cuando tenga la columna

## 3. Componente de foto

- [x] 3.1 Crear `src/client/principal/bien/foto-del-bien.tsx` con `FotoDelBien({ficha, numero, puedeSacar, lado})` (D5, D6, D7): miniatura contra `download/adjunto_bien`, `Dialog` para verla grande, ocultarse si la imagen no carga; `<input type="file" accept="image/*" capture="environment" hidden>`; achicar con `createImageBitmap` (`imageOrientation:'from-image'`), canvas y `toBlob('image/jpeg', 0.8)` usando `medidasDeFoto`; subir con `archivo_subir` y `es_foto:true`; mostrar el número devuelto; avisos con `useAvisos` si no se puede leer la imagen o falla la subida; el botón sólo con `puedeSacar` y `usePermisos().guardar`. Sumar `es_foto` a la declaración de `archivo_subir` en `adjuntos-bien.tsx`. Verificar con `npm run build` y con tests de fuente de que el `input` lleva `accept` y `capture`, de que sube con `es_foto:true`, de que el botón depende de `permisos.guardar` y de que sin `numero` y sin permiso no dibuja nada

## 4. Pantallas

- [ ] 4.1 Encabezado de la ficha (`bien-header.tsx`): `FotoDelBien` a la izquierda del título con `numero={row.foto}`, y `puedeSacar` sólo con el bien ya guardado. Verificar con `npm run build` y en el navegador: una ficha sin foto muestra "Sacar foto", al elegir una imagen aparece la miniatura y al tocarla se agranda
- [ ] 4.2 Vista rápida (`vista-rapida-bien.tsx`): `FotoDelBien` arriba de las secciones, sin `puedeSacar`. Verificar en el navegador que un bien con foto la muestra en el panel y uno sin foto no deja un hueco, y que `test/vista-rapida-bien.test.js` sigue pasando
- [ ] 4.3 Control (`control/control-bien.tsx`): `FotoDelBien` en la tarjeta "Estado actual" con `numero={bienCompleto.foto}` y `puedeSacar`. Verificar en el navegador que la foto se guarda sin registrar el control y sigue ahí al volver a abrir el bien
- [x] 4.4 Escanear (`escanear/escanear-bien.tsx`): `FotoDelBien` en `BienLeido` con `puedeSacar`. Actualizar `test/escanear-bien.test.js`: el test que dice "no escribe nada" sigue pasando tal cual (sólo lee los fuentes de `escanear/`, y la subida vive en el componente), así que hay que cambiarle el nombre y sumarle que la pantalla monta `FotoDelBien` con `puedeSacar` y que eso es lo único que escribe. Verificar con ese test y con `npm run build`
- [ ] 4.5 Solapa Adjuntos (`base/adjuntos-panel.tsx`): miniatura en la celda del archivo cuando la fila trae `es_foto`, y nombre mostrado sin el prefijo `<numero>-` cuando coincide con el número de la fila (D3, D8). Verificar con un test de la función que arma el nombre (adjunto anterior sin prefijo, adjunto nuevo, nombre que empieza con otro número) y en el navegador con un bien que tenga un PDF y una foto; revisar que la solapa de adjuntos de una solicitud se ve igual que antes

## 5. Verificación

- [ ] 5.1 Con un teléfono (Android por USB con `adb reverse`, como en `escanear-bien-con-camara`): en Control y en Escanear, "Sacar foto" abre la cámara trasera, la foto vertical queda derecha, pesa unos cientos de KB en `local-attachments/<ficha>/` y se ve en la ficha desde la computadora. Sacar dos fotos seguidas del mismo bien y comprobar que quedan dos archivos y se muestra la segunda; borrar la segunda desde la solapa Adjuntos y comprobar que vuelve la primera
- [ ] 5.2 Rechazos y permisos: mandar como foto un PDF renombrado a `.jpg` y ver el aviso sin adjunto nuevo; con un usuario de rol `lectura`, ver la foto y no ver "Sacar foto"; con un usuario de alcance limitado, pedir por dirección la foto de un bien de otro sector y comprobar que no la entrega
- [ ] 5.3 Listar con una consulta de sólo lectura los adjuntos que hoy comparten archivo (`select archivo, count(*) from adjuntos_bienes group by 1 having count(*) > 1`, y lo mismo en `adjuntos_solicitudes`) y pasarle el resultado al usuario — En la base de desarrollo (2026-10-08) las dos tablas están vacías: 0 repetidos. Falta correrla en producción
- [ ] 5.4 Comprobar que el historial de la ficha muestra la foto subida y la borrada como documentación

## 6. Cierre

- [x] 6.1 Correr `npm test` y `npm run build` sin fallas
- [x] 6.2 Actualizar `CLAUDE.md`: en "Adjuntos a bienes", `es_foto`, la ruta `<ficha>/<numero_adjunto>-<nombre>` y que una foto se valida y se nombra en el servidor; en "Frontend React", el componente `FotoDelBien`, el campo derivado `foto` de `bienes` y que Escanear ahora puede subir una foto
- [x] 6.3 Avisar al usuario que la spec `escaneo-de-bienes` del cambio `escanear-bien-con-camara` todavía dice que Escanear no modifica nada, para que la ajuste con `/opsx:update` o archive aquel cambio primero
