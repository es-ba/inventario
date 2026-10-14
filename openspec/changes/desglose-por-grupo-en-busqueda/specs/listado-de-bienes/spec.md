# Spec Delta

## Purpose

Que la búsqueda de bienes responda en el momento cuántos bienes hay de cada grupo, rubro, clase u otro campo, sin salir del listado ni armar un resumen aparte.

## ADDED Requirements

### Requirement: Desglose del resultado
La búsqueda de bienes SHALL mostrar, arriba del listado, el desglose del resultado según un campo: un chip por cada valor presente, con el texto del valor y la cantidad de bienes que lo tienen, ordenados de mayor a menor cantidad. El desglose SHALL contar los mismos bienes que trae la búsqueda, con la misma pestaña, texto, condiciones, filtros de columna y filtro elegido desde el Resumen; el único filtro que no SHALL tener en cuenta es el de un valor del mismo campo por el que desglosa. Los bienes sin valor en el campo SHALL aparecer como «(sin dato)». El desglose SHALL actualizarse cada vez que cambia la búsqueda.

#### Scenario: Desglose de una búsqueda por texto
- **WHEN** el usuario escribe «monitor» en la búsqueda rápida, con el desglose por grupo
- **THEN** el desglose muestra un chip por cada grupo de los bienes encontrados, con su cantidad, el de mayor cantidad primero
- **AND** la suma de las cantidades de los chips es igual al total del listado

#### Scenario: El desglose sigue a los filtros
- **WHEN** el usuario carga la condición «Sector es alguno de 24» y pulsa «Buscar»
- **THEN** el desglose cuenta sólo los bienes del sector 24

#### Scenario: El desglose sigue a un filtro del Resumen sobre otro campo
- **WHEN** el desglose es por rubro y el usuario elige en el Resumen la fila «responsable del sector: (sin dato)»
- **THEN** el desglose muestra los rubros de los bienes sin responsable del sector
- **AND** la suma de las cantidades de los chips es igual al total del listado

#### Scenario: Bienes sin valor
- **WHEN** entre los bienes encontrados hay alguno sin grupo
- **THEN** el desglose muestra un chip «(sin dato)» con la cantidad de esos bienes

#### Scenario: Sin resultados
- **WHEN** la búsqueda no trae ningún bien
- **THEN** el desglose no muestra chips

### Requirement: Filtrar por un chip del desglose
Tocar un chip del desglose SHALL filtrar el listado por ese valor del campo, y el total del listado SHALL pasar a ser la cantidad del chip. El filtro SHALL figurar en «Filtros aplicados» con el nombre del campo y el valor, y SHALL poder quitarse desde ahí. Con un valor elegido, el desglose SHALL seguir mostrando todos los valores de la búsqueda y SHALL marcar el elegido. El chip SHALL mostrar el valor sin su código, y el valor completo como ayuda al pasar el puntero. Tocar otro chip SHALL reemplazar el filtro; tocar el chip elegido SHALL quitarlo. Elegir un valor desde el Resumen y desde el desglose SHALL ser el mismo filtro: uno reemplaza al otro.

#### Scenario: Elegir un grupo
- **WHEN** el usuario busca «monitor» y toca el chip «MONITOR 116»
- **THEN** el listado muestra sólo los 116 bienes del grupo MONITOR que coinciden con «monitor»
- **AND** «Filtros aplicados» muestra el filtro «grupo: MONITOR»
- **AND** el desglose sigue mostrando los demás grupos, con «MONITOR» marcado

#### Scenario: Cambiar de valor
- **WHEN** hay un chip elegido y el usuario toca otro
- **THEN** el listado se filtra por el nuevo valor y deja de filtrar por el anterior

#### Scenario: Quitar el valor
- **WHEN** el usuario toca el chip que está elegido
- **THEN** el listado vuelve a mostrar todos los bienes de la búsqueda

#### Scenario: Filtrar por bienes sin valor
- **WHEN** el usuario toca el chip «(sin dato)»
- **THEN** el listado muestra sólo los bienes de la búsqueda que no tienen valor en ese campo

### Requirement: Campo del desglose
El desglose SHALL ofrecer un selector «Desglosar por» con los mismos campos que el Resumen puede agrupar, incluidos los atributos. Si el usuario nunca eligió uno, el desglose SHALL arrancar por «grupo». La elección SHALL quedar guardada para ese usuario en ese navegador y SHALL ser la que se use la próxima vez que abra la búsqueda. Cambiar el campo con un valor elegido en el desglose SHALL quitar ese filtro; un filtro elegido desde el Resumen SHALL quedar.

#### Scenario: Desglose por rubro
- **WHEN** el usuario elige «Desglosar por: rubro»
- **THEN** el desglose muestra un chip por cada rubro de los bienes encontrados, con su cantidad

#### Scenario: La elección se conserva
- **WHEN** el usuario eligió «clase», sale de la búsqueda y vuelve a entrar
- **THEN** el desglose está por «clase»

#### Scenario: Primera vez
- **WHEN** el usuario abre la búsqueda sin haber elegido nunca un campo
- **THEN** el desglose está por «grupo»

#### Scenario: Cambiar el campo con un valor elegido
- **WHEN** hay un chip de grupo elegido y el usuario cambia a «Desglosar por: rubro»
- **THEN** el listado deja de filtrar por ese grupo

### Requirement: Valores que no entran en una línea
El desglose SHALL ocupar una sola línea, sin importar cuántos valores tenga: los chips que no entran SHALL alcanzarse desplazando la línea hacia los costados, sin agrandar la página. En pantallas angostas la línea de chips SHALL ir debajo del selector, con todo el ancho. Al elegir un valor, su chip SHALL quedar a la vista dentro de la línea.

#### Scenario: Muchos valores
- **WHEN** la búsqueda trae bienes de 239 grupos
- **THEN** el desglose ocupa una línea con los grupos de mayor cantidad a la vista
- **AND** desplazando la línea se llega a todos los grupos

#### Scenario: Valor elegido lejos del principio
- **WHEN** el valor elegido no está entre los primeros de la línea
- **THEN** la línea se desplaza hasta que su chip se ve marcado
