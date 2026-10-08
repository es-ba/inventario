# Proposal

## Why

Un bien se reconoce hoy sólo por su ficha y su descripción. Para saber cómo es hay que ir a verlo, y quien lo tiene adelante no tiene cómo confirmar con la vista que la ficha que está mirando es la de ese bien.

Los modelos no sirven para compartir una foto entre bienes iguales: `modelo` es texto libre (880 valores distintos entre 4039 bienes activos, y el más usado es "Sin Modelo"). La foto tiene que ser de cada bien, y eso sólo se completa si se saca en el momento en que alguien ya está frente al bien con un teléfono: el control físico.

## What Changes

- **Foto del bien:** un bien puede tener fotos. Una foto es un adjunto del bien marcado como foto; la que se muestra es la última que se subió.
- **Sacarla:** un botón "Sacar foto" que en el teléfono abre la cámara y en la computadora deja elegir un archivo. La foto se achica antes de subirla.
  - en la ficha del bien (encabezado);
  - al abrir un bien en Control de bienes (tarjeta "Estado actual"), sin depender de guardar el control;
  - en Escanear, sobre el bien leído. **Escanear deja de ser sólo lectura.**
- **Verla:** miniatura en el encabezado de la ficha, en la vista rápida de la búsqueda, en Escanear y en Control de bienes; al tocarla se ve grande. En la solapa Adjuntos, los adjuntos que son foto muestran su miniatura.
- **Quién:** saca fotos quien hoy puede subir adjuntos (`puede_guardar`); las ve quien ve el bien. No cambia ningún permiso.
- **Qué se acepta como foto:** sólo imágenes JPEG de hasta 5 MB. Lo demás se rechaza.
- **Adjuntos con el mismo nombre:** hoy dos archivos con el mismo nombre en un mismo bien (o en una misma solicitud) comparten el archivo guardado: el segundo pisa al primero, y borrar uno deja al otro sin archivo. Los teléfonos suelen nombrar igual todas las fotos, así que se corrige: cada adjunto nuevo guarda su propio archivo. Los adjuntos ya cargados no se tocan.

Queda afuera:
- La foto en la grilla de resultados de la búsqueda (necesitaría miniaturas generadas en el servidor).
- Mostrar, cuando un bien no tiene foto, la de otro bien con el mismo grupo, marca y modelo.
- Marcar como foto un adjunto que ya estaba cargado.
- Mover Escanear del menú "desarrollo" a uno de uso general.
- Fotos asociadas a un control o a una baja en particular (constancia del estado): acá la foto es del bien.

## Capabilities

### New Capabilities
- `foto-del-bien`: sacar, guardar y mostrar la foto de un bien, y que cada adjunto conserve su propio archivo.

### Modified Capabilities

Ninguna de las que están en `openspec/specs`. `control-de-bienes` no cambia sus requisitos: la foto se suma a la pantalla sin alterar el registro del control.

Este cambio sí contradice un cambio todavía sin archivar: `escanear-bien-con-camara` define Escanear como una pantalla que no modifica nada. Como esa capacidad (`escaneo-de-bienes`) todavía no está en `openspec/specs`, acá no se puede escribir su delta; ver design.md (Risks).

## Impact

- **Base:** una columna nueva, `adjuntos_bienes.es_foto` (boolean, default `false`). Requiere dump en desarrollo y una entrada en `install/cambios/cambios_<fecha>.sql` para producción.
- **Servidor:**
  - `table-adjuntos_bienes.ts`: la columna;
  - `procedures-principal.ts`: `archivo_subir` recibe `es_foto` y valida la imagen; `archivo_subir` y la subida de adjuntos de solicitudes guardan con un nombre que no se repite;
  - `table-bienes.ts`: campo derivado `foto` (número del adjunto de la última foto) en `sqlBienesConControl`, que comparten la tabla `bienes` y la búsqueda.
- **Cliente:**
  - un componente nuevo en `principal/bien/` que muestra la foto y, si corresponde, la saca;
  - se usa en `bien-header.tsx`, `vista-rapida-bien.tsx`, `control/control-bien.tsx` y `escanear/escanear-bien.tsx`;
  - `base/adjuntos-panel.tsx`: miniatura en las filas que son foto.
- **Común:** `src/common/` suma las funciones puras de la foto (medidas al achicar, qué se acepta).
- **Dependencias:** ninguna nueva. La cámara se abre con el selector de archivos del navegador y la imagen se achica con un canvas.
- **Historial:** subir o borrar una foto queda en el historial del bien como documentación, igual que cualquier adjunto (trigger existente).
- **Tests:** nuevos para las funciones puras, la ruta de guardado y la validación; hay que ajustar `test/escanear-bien.test.js`, que hoy afirma que Escanear no escribe.
- **Verificación:** necesita un teléfono; no alcanza con los tests.
