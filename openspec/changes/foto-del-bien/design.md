# Design

## Context

Ver proposal.md (Why). Lo que condiciona el diseño:

- **Adjuntos:** `adjuntos_bienes` (PK `ficha, numero_adjunto`, secuencia `numero_adjunto_seq`) ya tiene subida (`archivo_subir`), descarga (`GET download/adjunto_bien?ficha=&numero_adjunto=`), RLS (`politicasPorElBien`: ve quien ve el bien, inserta quien además tiene `puede_guardar`) y borrado diferido (`archivo_borrar_trg` + cron).
- **Descarga:** el endpoint sirve con `send`, que pone el `Content-Type` según la extensión y no fuerza la descarga. Un `<img src>` contra ese endpoint ya funciona, y pasa por la RLS porque consulta con el cliente del usuario.
- **Guardado:** `archivo_subir` guarda en `local-attachments/<ficha>/<nombre original>` con `overwrite:true` (`procedures-principal.ts:581`), y `archivo_solicitud_subir` hace lo mismo en `solicitudes/<acta>/`. El nombre llega de `multiparty` sin limpiar. No hay límite de tamaño ni de tipo.
- **Borrado:** `archivo_borrar_trg` encola la ruta vieja en `archivos_borrar` tanto al borrar la fila como al cambiarle `archivo` en un `UPDATE`. El cron borra por ruta.
- **Historial:** `adjuntos_bienes_trazabilidad_trg` registra alta, cambio y baja de cada adjunto como documentación del bien. Sólo mira `ficha`, `numero_adjunto`, `archivo` y `detalle`.
- **Bajas:** el respaldo de una baja es un adjunto elegido por número (`procedures-bajas.ts:53`); valida que la ruta quede dentro de `local-attachments`, no su forma.
- **Fila del bien:** la tabla `bienes` y la búsqueda comparten `sqlBienesConControl` (`table-bienes.ts:103`). La ficha (`useRowEditor`), Control (`leerTabla(conn, 'bienes', ...)`) y Escanear (`bienes_buscar_avanzado`) reciben una fila de esa consulta; la vista rápida usa la fila de la búsqueda.
- **Columnas de la búsqueda:** `selectBienesGridFields` (`src/common/bienes-busqueda.ts`) deja afuera los campos `inTable:false` que no son de asignación. Los filtros sí ofrecen todos los campos de la definición.
- **Permisos:** `usePermisos().guardar` ya decide en `adjuntos-panel.tsx` si se ofrece subir. En `roles.tab`, todo rol con `puede_controlar` tiene `puede_guardar`.
- **Cámara:** un `<input type="file">` no necesita conexión segura, a diferencia de `getUserMedia` (el lector de Escanear).
- **Dependencias:** no hay ninguna librería de imágenes instalada (`sharp`, `jimp`).

## Goals / Non-Goals

**Goals:**
- Reusar la subida, la descarga, la RLS, el borrado y el historial de los adjuntos.
- Que la foto llegue con la fila del bien que cada pantalla ya tiene, sin una consulta más por pantalla.
- Sin dependencias nuevas y sin proceso de imágenes en el servidor.

**Non-Goals:**
- Miniaturas generadas en el servidor. La misma imagen achicada sirve para la miniatura y para verla grande.
- Renombrar o mover los archivos ya guardados.
- Cambiar la subida de documentos de declaraciones y de solicitudes firmadas, que ya usan nombres propios por versión.
- Borrar las fotos anteriores cuando se sube una nueva.

## Decisions

### D1. La foto es un adjunto marcado
`adjuntos_bienes` suma `es_foto boolean not null default false`, no editable desde la grilla. `archivo_subir` recibe un parámetro `es_foto` (default `false`) y lo guarda.
- *Alternativa: `bienes.foto` apuntando a un adjunto* → descartado. Agrega una FK, una acción para elegir la foto y un caso más cuando se borra el adjunto.
- *Alternativa: tabla `fotos_bienes`* → descartado. Duplica subida, descarga, políticas, borrado e historial.
- *Alternativa: tomar como foto cualquier adjunto con extensión de imagen* → descartado. La imagen de un remito pasaría a ser la foto del bien.

### D2. La foto del bien es el `numero_adjunto` más alto con `es_foto`
`sqlBienesConControl` suma una columna:

```sql
(SELECT max(ab.numero_adjunto) FROM adjuntos_bienes ab
  WHERE ab.ficha = v.ficha AND ab.es_foto) AS foto
```

y `bienes` declara el campo `foto` (`bigint`, `inTable:false`, `editable:false`, `title:'foto'`), sumado a `hiddenColumns` para que la grilla de backend-plus no muestre un número suelto. La secuencia crece, así que el número más alto es la última subida, y al borrarla la anterior vuelve a ser la foto sin hacer nada.

Con eso la fila del bien ya trae lo necesario para armar la dirección de la imagen con el endpoint que existe, y un número distinto por foto evita que el navegador muestre la anterior desde su caché.
- *Alternativa: endpoint `download/foto_bien?ficha=`* → descartado. Es un endpoint más, y la fila igual necesitaría un campo que diga si hay foto para no pedir imágenes que no existen.
- *Consecuencia:* la búsqueda React no la muestra como columna (`selectBienesGridFields` la excluye) pero sí la ofrece como campo de filtro. El conteo rápido no cambia: `camposSimples` deja afuera los `inTable:false`.

### D3. Cada adjunto guarda en `<carpeta>/<numero_adjunto>-<nombre limpio>`
Una función pura nueva en `src/server/nombre-archivo.ts`, `rutaDeAdjunto(carpeta, numero, nombreOriginal)`:
- se queda con lo que sigue a la última barra (`/` o `\`) del nombre original;
- le aplica `parteDeNombre`, que ya saca los caracteres prohibidos, y lo corta al largo máximo conservando la extensión;
- si queda vacío usa `archivo`;
- devuelve `<carpeta>/<numero>-<nombre>`.

La usan `archivo_subir` (carpeta `<ficha>`) y `archivo_solicitud_subir` (carpeta `solicitudes/<acta>`). Como la ruta necesita el número, el procedure lo pide primero a la secuencia (`SELECT nextval('numero_adjunto_seq')`; en solicitudes, `adjuntos_solicitudes_numero_adjunto_seq`) y después inserta la fila con ese `numero_adjunto` y la ruta ya armada. La fila nunca tiene una ruta provisoria.

`adjuntos-panel.tsx` muestra el nombre sin el prefijo `<numero>-` cuando coincide con el número de la fila, así los adjuntos anteriores se ven igual que hoy.
- *Alternativa: insertar y después hacer `UPDATE` de `archivo` con el número* → descartado. `archivo_borrar_trg` encolaría la ruta provisoria, y si esa ruta es la de un adjunto anterior con el mismo nombre, el cron le borra el archivo.
- *Alternativa: nombre al azar y una columna `nombre_original`* → descartado. Una columna más en dos tablas para lo mismo.

### D4. Las fotos se validan y se nombran en el servidor
Si `es_foto`, `archivo_subir` revisa antes de insertar:
- que el archivo pese hasta 5 MB;
- que empiece con los bytes de un JPEG (`FF D8 FF`).

Si no cumple, rechaza con un mensaje y no inserta nada. El nombre guardado de una foto es siempre `<numero>-foto.jpg`, sin usar el nombre que mandó el cliente: así el endpoint la sirve siempre como `image/jpeg`. El límite y la comprobación son funciones puras en `src/common/fotos.ts`.
- *Alternativa: aceptar también PNG y WebP* → descartado. La pantalla siempre manda JPEG (D5); aceptar más formatos es más superficie sin uso.

### D5. La imagen se achica en el navegador
`src/common/fotos.ts` tiene `medidasDeFoto(ancho, alto)`, pura: escala para que el lado más largo sea 1600 como máximo y nunca agranda. El cliente abre el archivo con `createImageBitmap(archivo, {imageOrientation:'from-image'})`, lo dibuja en un canvas con esas medidas y lo exporta con `toBlob('image/jpeg', 0.8)`. Si el navegador no puede abrirlo, avisa y no sube nada.

Volver a codificar la imagen además le saca los metadatos del teléfono (entre ellos, la ubicación).
- *Alternativa: `sharp` en el servidor* → descartado. Dependencia nativa nueva, y la foto de 5 a 8 MB igual tendría que viajar entera desde el teléfono.

### D6. La cámara se abre con el selector de archivos
`<input type="file" accept="image/*" capture="environment" hidden>`. En el teléfono abre la cámara trasera; en la computadora el atributo `capture` se ignora y abre el selector de archivos. Funciona en cualquier navegador y sin https.
- *Alternativa: reusar `lector-de-camara.tsx` y capturar un cuadro del video* → descartado. Sólo anda en Android con https, y saca la foto con la resolución del video.

### D7. Un solo componente para ver y sacar
`principal/bien/foto-del-bien.tsx` exporta `FotoDelBien({ficha, numero, puedeSacar, lado})`:
- con `numero`, muestra la miniatura (`download/adjunto_bien?ficha=&numero_adjunto=`); al tocarla abre un `Dialog` con la imagen grande; si la imagen no carga, se oculta;
- con `puedeSacar` y `usePermisos().guardar`, muestra "Sacar foto" (o "Cambiar foto" si ya hay una), achica, llama a `archivo_subir` con `es_foto:true` y pasa a mostrar el `numero_adjunto` que devuelve;
- sin `numero` y sin permiso, no dibuja nada.

El número nuevo queda en el estado del componente; no hace falta volver a leer el bien.

| Dónde | Archivo | `puedeSacar` |
|---|---|---|
| Encabezado de la ficha | `bien-header.tsx` | sí, con el bien ya guardado |
| Vista rápida | `vista-rapida-bien.tsx` | no |
| Control, tarjeta "Estado actual" | `control/control-bien.tsx` | sí |
| Escanear, sobre el bien leído | `escanear/escanear-bien.tsx` | sí |

### D8. La solapa Adjuntos marca las fotos
`adjuntos-panel.tsx` muestra una miniatura en la celda del archivo cuando la fila trae `es_foto`. El panel es el mismo para solicitudes, que no tienen esa columna, así que ahí no cambia nada.

### D9. Sin cambios de permisos
La inserción sigue pasando por la política de `adjuntos_bienes` con el cliente del usuario. No se tocan roles, `GRANT` ni políticas.

## Risks / Trade-offs

- **Escanear deja de ser sólo lectura** y contradice el cambio sin archivar `escanear-bien-con-camara` (su propósito dice "sin modificar nada"). El test `test/escanear-bien.test.js:31` se llama "no escribe nada" y va a seguir pasando sin avisar, porque sólo lee los fuentes de `escanear/`. → El test se renombra y se amplía en este cambio. La spec `escaneo-de-bienes` hay que ajustarla en aquel cambio (`/opsx:update`) o archivarlo antes que éste; si no, al archivar los dos quedan dos specs que se contradicen.
- **La subconsulta de `foto` corre en la consulta que comparten la tabla y la búsqueda**, con la RLS de `adjuntos_bienes` encima. → Se mide con `EXPLAIN ANALYZE` antes y después sobre la búsqueda sin filtros. Si empeora, se pasa a un `LEFT JOIN LATERAL` como el del último control.
- **Los adjuntos que ya se pisaron no se recuperan.** → Una consulta de sólo lectura lista las rutas repetidas para saber cuáles son.
- **Disco:** una foto achicada pesa unos cientos de KB; con una por bien activo son del orden de 1 a 2 GB en `local-attachments`, y las fotos anteriores se acumulan. → Se acepta. Hay que confirmar que el respaldo de `local-attachments` contempla ese tamaño.
- **En el teléfono, `capture` abre la cámara y no deja elegir de la galería.** → Se acepta: el caso es sacar la foto frente al bien. Desde la computadora se puede elegir un archivo.
- **Fotos de iPhone en formato HEIC elegidas desde una computadora** pueden no abrirse en el navegador. → El aviso de "no pude leer la imagen" lo cubre.
- **La orientación** depende de que el navegador respete la que indica el teléfono al abrir la imagen. → Se verifica con una foto vertical en la prueba con teléfono.
- **La vista rápida y la solapa Adjuntos no se enteran de una foto recién sacada** hasta que se vuelve a buscar o a abrir la solapa. → Se acepta.
- **Riesgo que ya existe y no se resuelve acá:** el endpoint de descarga muestra en el navegador cualquier adjunto según su extensión, incluido un `.html` subido por un usuario con `puede_guardar`. Las fotos no lo agravan (D4). Conviene tratarlo en un cambio aparte.

## Migration Plan

1. Desarrollo: editar la definición y dumpear.
2. Producción: `alter table adjuntos_bienes add column es_foto boolean not null default false`, tomado de `local-db-dump.sql`, en `install/cambios/cambios_<fecha>.sql`. No hay datos que completar.
3. Los adjuntos ya cargados conservan su ruta y siguen descargándose.
4. Vuelta atrás: revertir el código. Los adjuntos subidos con el nombre nuevo siguen funcionando con el código anterior, porque la ruta está en `archivo`. La columna puede quedar.
