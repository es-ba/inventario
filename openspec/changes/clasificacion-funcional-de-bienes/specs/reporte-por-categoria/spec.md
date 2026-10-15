# Spec Delta

## Purpose

Que un usuario gerencial vea en una sola pantalla, sin armar filtros, cuántos bienes activos hay por categoría, subcategoría y estado, y que cada número lo lleve a los bienes que cuenta.

## ADDED Requirements

### Requirement: Bienes por categoría
- El sistema SHALL ofrecer en «reportes», para todos los roles, la pantalla «Bienes por categoría», con los bienes activos que el usuario puede ver.
- La pantalla SHALL mostrar una fila por categoría, en el orden del catálogo, con el total de bienes y la cantidad en cada estado del bien.
- Los estados SHALL ser los del catálogo que tienen orden, en ese orden y con su etiqueta. Si algún bien está en un estado sin orden, SHALL sumarse en una columna «Otros».
- Cada fila de categoría SHALL poder abrirse para mostrar sus subcategorías con las mismas columnas. Al entrar, todas SHALL estar cerradas.
- Junto al total de cada categoría SHALL verse una barra proporcional a la categoría más grande de su bloque.
- Las categorías sin bienes no SHALL mostrarse.

#### Scenario: Ver cuántas computadoras hay
- **WHEN** el usuario abre «Bienes por categoría»
- **THEN** ve la fila «Computadoras» con el total de computadoras activas y cuántas están asignadas, sin asignar, en movimiento y con baja en trámite

#### Scenario: Abrir una categoría
- **WHEN** el usuario abre la fila «Computadoras»
- **THEN** ve las subcategorías Notebook, PC de escritorio y All-in-one, con sus cantidades
- **AND** la suma de las subcategorías es igual al total de la categoría

#### Scenario: Categoría sin bienes
- **WHEN** no hay bienes activos de la categoría Vehículos
- **THEN** la fila «Vehículos» no aparece

### Requirement: Totales que cierran
- Las categorías marcadas «aparte» SHALL mostrarse en un bloque propio, debajo de las demás, con su subtotal.
- Los bienes sin categoría SHALL mostrarse en una fila «Sin categoría», dentro del bloque principal.
- La pantalla SHALL mostrar el total principal, el total aparte y el total general. El total general SHALL ser igual a la cantidad de bienes activos que el usuario puede ver.
- En cada fila, el total SHALL ser igual a la suma de sus estados.

#### Scenario: Accesorios aparte
- **WHEN** la categoría «Accesorios y componentes» está marcada «aparte»
- **THEN** aparece en el bloque de abajo con su subtotal
- **AND** sus bienes no se suman al total principal
- **AND** sí se suman al total general

#### Scenario: Bienes sin clasificar
- **WHEN** hay bienes activos cuyo grupo no tiene subcategoría
- **THEN** el bloque principal muestra la fila «Sin categoría» con esa cantidad
- **AND** el total general sigue siendo igual a la cantidad de bienes activos

### Requirement: Del número a los bienes
- Tocar una cantidad de la pantalla SHALL abrir la búsqueda de bienes, en la pestaña de activos, filtrada por esa celda: la categoría o subcategoría de la fila, el estado de la columna (salvo en la columna del total) y el sector, si hay uno elegido.
- El total del listado SHALL ser igual a la cantidad tocada.
- El filtro SHALL figurar en «Filtros aplicados» con nombres legibles y SHALL poder quitarse desde ahí.
- Tocar el total general SHALL abrir la búsqueda de activos sin filtro de categoría.
- El total principal y el total aparte no SHALL ser tocables.

#### Scenario: Ver las notebooks sin asignar
- **WHEN** el usuario abre «Computadoras» y toca la cantidad de «Notebook» en la columna «Sin asignar»
- **THEN** se abre la búsqueda con el filtro «subcategoría: Notebook · estado: Sin asignar»
- **AND** el total del listado es igual al número tocado

#### Scenario: Ver los bienes sin clasificar
- **WHEN** el usuario toca el total de «Sin categoría»
- **THEN** se abre la búsqueda con los bienes activos sin categoría

#### Scenario: Parámetro inválido
- **WHEN** se abre la búsqueda con un filtro de la dirección que no se puede leer
- **THEN** la búsqueda arranca como siempre, sin filtro

### Requirement: Filtro por sector
- La pantalla SHALL ofrecer un selector de sector, opcional, que limita todas las cantidades a los bienes de ese sector.
- El sector elegido SHALL viajar a la búsqueda al tocar un número.

#### Scenario: Computadoras de un sector
- **WHEN** el usuario elige el sector 24
- **THEN** todas las cantidades cuentan sólo los bienes activos del sector 24
- **AND** al tocar un número, la búsqueda queda filtrada también por el sector 24

### Requirement: Descargar el reporte
La pantalla SHALL permitir descargar lo que muestra como una planilla:

- una fila por subcategoría, con su categoría, el total y una columna por estado;
- las filas «Sin categoría» y las de las categorías aparte;
- el sector elegido en el nombre del archivo.

La planilla SHALL abrirse en Excel con los acentos correctos.

#### Scenario: Descargar
- **WHEN** el usuario toca «Descargar»
- **THEN** baja un archivo con una fila por subcategoría y los mismos números que la pantalla

### Requirement: Uso en el teléfono
En una pantalla angosta:

- el reporte SHALL mostrar por categoría sólo el nombre, el total y la barra, sin desplazamiento horizontal de la página;
- al abrir la categoría, SHALL mostrar la cantidad por estado y sus subcategorías.

#### Scenario: Ver en el teléfono
- **WHEN** el usuario abre el reporte en el teléfono
- **THEN** ve cada categoría con su total y su barra, sin desplazar la página hacia el costado
