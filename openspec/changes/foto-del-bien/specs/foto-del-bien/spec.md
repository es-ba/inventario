# Spec Delta

## Purpose

Que cada bien pueda tener una foto que ayude a reconocerlo: sacarla en el momento en que se lo tiene adelante, guardarla junto a sus adjuntos y mostrarla donde se consulta el bien.

## ADDED Requirements

### Requirement: Foto del bien
Un bien SHALL poder tener cero, una o varias fotos. Cada foto SHALL ser un adjunto del bien marcado como foto, con el usuario que la subió y el momento en que lo hizo. La foto del bien SHALL ser la última que se subió. Los adjuntos que no están marcados como foto SHALL NOT mostrarse como foto del bien, aunque sean imágenes.

#### Scenario: Bien sin foto
- **WHEN** un bien no tiene ningún adjunto marcado como foto
- **THEN** el sistema no muestra foto para ese bien

#### Scenario: La última reemplaza a la anterior
- **WHEN** un bien tiene una foto y se le sube otra
- **THEN** la foto del bien pasa a ser la nueva, y la anterior sigue entre sus adjuntos

#### Scenario: Imagen adjunta que no es la foto
- **WHEN** un bien tiene adjunta la imagen escaneada de un remito, sin marcar como foto
- **THEN** el sistema no la muestra como foto del bien

#### Scenario: Se borra la foto
- **WHEN** un bien tiene dos fotos y se borra la última
- **THEN** la foto del bien pasa a ser la anterior

### Requirement: Sacar la foto
El sistema SHALL ofrecer la acción "Sacar foto" sobre un bien en tres lugares: el encabezado de su ficha, la pantalla de Control de bienes al abrir el bien, y la pantalla Escanear sobre el bien leído. En un teléfono la acción SHALL abrir la cámara; en una computadora SHALL permitir elegir un archivo de imagen. Al terminar de subirla, la pantalla SHALL mostrar la foto nueva sin recargar. En Control de bienes, la foto SHALL guardarse en el momento, se registre o no el control.

#### Scenario: Desde el control, con un teléfono
- **WHEN** un usuario abre un bien sin foto en Control de bienes desde un teléfono, toca "Sacar foto" y saca la foto
- **THEN** la tarjeta "Estado actual" muestra la foto, y el bien la conserva aunque el usuario salga sin registrar el control

#### Scenario: Desde Escanear
- **WHEN** un usuario lee la etiqueta de un bien en Escanear, toca "Sacar foto" y saca la foto
- **THEN** la pantalla muestra la foto junto a los datos del bien

#### Scenario: Desde la ficha, en una computadora
- **WHEN** un usuario toca "Sacar foto" en el encabezado de la ficha desde una computadora y elige una imagen
- **THEN** el encabezado muestra esa imagen como foto del bien

#### Scenario: Falla la subida
- **WHEN** la subida de la foto falla
- **THEN** la pantalla avisa el motivo y el bien queda con la foto que tenía

### Requirement: Quién saca y quién ve la foto
La acción "Sacar foto" SHALL ofrecerse sólo a los usuarios que pueden subir adjuntos al bien. La foto SHALL verla todo usuario que puede ver el bien, y sólo ellos.

#### Scenario: Usuario de consulta
- **WHEN** un usuario con un rol de sólo consulta abre la ficha de un bien que tiene foto
- **THEN** ve la foto y no ve la acción "Sacar foto"

#### Scenario: Bien fuera del alcance del usuario
- **WHEN** un usuario pide la foto de un bien que su rol no le permite ver
- **THEN** el sistema no se la entrega

### Requirement: Qué se acepta como foto
El sistema SHALL aceptar como foto sólo una imagen JPEG de hasta 5 MB, y SHALL rechazar cualquier otro archivo sin guardarlo ni asociarlo al bien. Antes de subirla, la pantalla SHALL achicar la imagen para que su lado más largo no supere los 1600 píxeles, conservando la proporción.

#### Scenario: Foto de teléfono
- **WHEN** se saca una foto de 4000 por 3000 píxeles
- **THEN** se guarda una imagen JPEG de 1600 por 1200 píxeles

#### Scenario: Imagen chica
- **WHEN** se elige una imagen de 800 por 600 píxeles
- **THEN** se guarda sin agrandarla

#### Scenario: Archivo que no es una imagen
- **WHEN** llega como foto un archivo que no es una imagen JPEG, aunque su nombre termine en `.jpg`
- **THEN** el sistema lo rechaza con un aviso y el bien no suma ningún adjunto

#### Scenario: Imagen que el navegador no puede leer
- **WHEN** se elige un archivo que el navegador no puede abrir como imagen
- **THEN** la pantalla avisa que no pudo leer la imagen y no sube nada

### Requirement: Ver la foto
Si el bien tiene foto, el sistema SHALL mostrarla en el encabezado de la ficha, en la vista rápida de la búsqueda de bienes, en Control de bienes al abrir el bien y en Escanear. Al tocarla SHALL verse en grande. En la solapa Adjuntos de la ficha, los adjuntos que son foto SHALL distinguirse con su miniatura. Si el bien no tiene foto, esos lugares SHALL NOT reservar espacio ni mostrar una imagen vacía.

#### Scenario: Vista rápida
- **WHEN** un usuario hace clic en la fila de un bien con foto en la búsqueda
- **THEN** el panel lateral muestra la foto junto a los datos del bien

#### Scenario: Agrandar
- **WHEN** un usuario toca la miniatura de la foto
- **THEN** la foto se ve en grande y puede cerrarse para volver a donde estaba

#### Scenario: Solapa Adjuntos
- **WHEN** un bien tiene un PDF y una foto entre sus adjuntos
- **THEN** la solapa Adjuntos lista los dos, y la fila de la foto muestra su miniatura

### Requirement: Cada adjunto conserva su archivo
Cada adjunto que se suba a un bien o a una solicitud SHALL guardar su propio archivo, aunque otro adjunto del mismo bien o de la misma solicitud tenga el mismo nombre. Borrar un adjunto SHALL NOT afectar el archivo de otro. El nombre original SHALL seguir viéndose en la lista de adjuntos. Los adjuntos cargados antes de este cambio SHALL seguir descargándose como hasta ahora.

#### Scenario: Dos fotos con el mismo nombre
- **WHEN** se suben a un mismo bien dos fotos que el teléfono nombró `image.jpg`
- **THEN** el bien tiene dos adjuntos y cada uno descarga su propia imagen

#### Scenario: Borrar uno de dos
- **WHEN** un bien tiene dos adjuntos subidos con el mismo nombre y se borra uno
- **THEN** el otro sigue descargándose

#### Scenario: Nombre con una ruta
- **WHEN** llega un adjunto cuyo nombre incluye una ruta, como `../../otro/archivo.pdf`
- **THEN** el archivo se guarda dentro de la carpeta del bien, con el nombre `archivo.pdf`

#### Scenario: Adjunto anterior al cambio
- **WHEN** un usuario descarga un adjunto cargado antes de este cambio
- **THEN** recibe el mismo archivo que antes
