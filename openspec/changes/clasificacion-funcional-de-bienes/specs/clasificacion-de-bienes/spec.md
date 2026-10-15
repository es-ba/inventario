# Spec Delta

## Purpose

Que cada bien tenga una clasificación funcional de dos niveles (categoría y subcategoría), con la subcategoría como dato propio del bien, independiente de su grupo, y que esa clasificación se pueda ver, buscar y filtrar en todo el sistema.

## ADDED Requirements

### Requirement: Catálogos de categorías y subcategorías
El sistema SHALL tener un catálogo de categorías y otro de subcategorías.

- Cada **categoría** SHALL tener un código, un nombre, una descripción de lo que incluye, un orden y una marca «aparte».
- Cada **subcategoría** SHALL tener un código, un nombre y SHALL pertenecer a una sola categoría.
- Los dos catálogos SHALL poder editarse desde «gestion de datos» con el mismo permiso que los grupos.
- El sistema SHALL rechazar el borrado de una categoría que tenga subcategorías y el de una subcategoría asignada a algún grupo.

#### Scenario: Ver las subcategorías de una categoría
- **WHEN** el usuario abre la categoría «CMP Computadoras» en «gestion de datos»
- **THEN** ve sus subcategorías: Notebook, PC de escritorio, All-in-one, Mini PC y Estación de trabajo

#### Scenario: Borrar una subcategoría en uso
- **WHEN** el usuario intenta borrar la subcategoría «CMP-01 Notebook», asignada al grupo NOTEBOOK
- **THEN** el sistema rechaza el borrado

### Requirement: Subcategoría propia de cada bien
Cada bien SHALL tener una subcategoría propia, opcional, y su categoría SHALL ser la de esa subcategoría. La subcategoría del bien no SHALL depender de su grupo: cambiar el grupo de un bien no SHALL cambiar su subcategoría. Cada grupo SHALL poder guardar una «subcategoría equivalente», que sólo se usa como referencia y para la carga inicial. La carga inicial SHALL completar cada bien sin subcategoría con la equivalente de su grupo, sin pisar las cargadas, y sin modificar el grupo de ningún bien. Un bien sin subcategoría SHALL quedar sin categoría.

#### Scenario: Carga inicial
- **WHEN** se aplica la carga inicial a un bien del grupo NOTEBOOK, cuya subcategoría equivalente es «CMP-01 Notebook»
- **THEN** el bien queda con subcategoría Notebook y categoría Computadoras
- **AND** su grupo sigue siendo NOTEBOOK

#### Scenario: Cambiar el grupo de un bien
- **WHEN** el usuario cambia el grupo de un bien de NOTEBOOK a CPU
- **THEN** la subcategoría del bien sigue siendo Notebook

#### Scenario: Corregir la subcategoría de un bien
- **WHEN** el usuario cambia en la ficha la subcategoría de un bien del grupo TP LINK a «RED-01 Switch»
- **THEN** el bien queda en la categoría Redes, y los demás bienes del grupo TP LINK no cambian

### Requirement: Clasificación en la ficha del bien
La ficha del bien SHALL mostrar la subcategoría y la categoría junto al grupo, por su nombre. La subcategoría SHALL poder elegirse en la ficha, en el alta y en la edición masiva, y SHALL copiarse al clonar un bien. La categoría no SHALL poder editarse: SHALL ser la de la subcategoría elegida.

#### Scenario: Elegir la subcategoría en la ficha
- **WHEN** el usuario edita un bien, elige la subcategoría «MOV-02 Tablet» y guarda
- **THEN** la ficha muestra «subcategoría: Tablet» y «categoría: Dispositivos móviles»

### Requirement: Clasificación en la búsqueda de bienes
- La búsqueda de bienes SHALL mostrar la categoría y la subcategoría como columnas iniciales, antes del grupo, por su nombre.
- La búsqueda avanzada y el Resumen SHALL ofrecer los dos campos, con el operador «Es alguno de».
- El desglose del resultado SHALL arrancar por «categoría» para el usuario que nunca eligió otro campo.
- La búsqueda rápida SHALL encontrar los bienes por el nombre de su categoría y de su subcategoría.
- Los bienes que coinciden por el nombre de la subcategoría SHALL ordenarse entre los que coinciden en identificación.

#### Scenario: Buscar por subcategoría
- **WHEN** el usuario escribe «notebook» en la búsqueda rápida
- **THEN** el listado trae primero los bienes de la subcategoría Notebook

#### Scenario: Buscar por categoría
- **WHEN** el usuario escribe «computadoras» en la búsqueda rápida
- **THEN** el listado trae los bienes de la categoría Computadoras, aunque ningún otro campo diga «computadoras»

#### Scenario: Desglose por categoría
- **WHEN** un usuario que nunca eligió el campo del desglose abre la búsqueda
- **THEN** el desglose muestra un chip por categoría, con su cantidad

#### Scenario: Filtrar por varias categorías
- **WHEN** el usuario carga la condición «categoría es alguno de Computadoras, Dispositivos móviles»
- **THEN** el listado trae sólo los bienes de esas dos categorías

#### Scenario: Elección anterior del desglose (búsqueda)
- **WHEN** un usuario que había elegido «Desglosar por: grupo» abre la búsqueda
- **THEN** el desglose sigue por «grupo»

### Requirement: Clasificación en los listados de control y de bajas
Los listados de control de bienes y de proceso de baja SHALL mostrar la categoría y la subcategoría como columnas, por su nombre, y SHALL ofrecer un filtro por cada una. El filtro de subcategoría SHALL ofrecer sólo las subcategorías de la categoría elegida, y cambiar la categoría SHALL quitar la subcategoría elegida.

#### Scenario: Filtrar el control por categoría
- **WHEN** el usuario elige la categoría «Computadoras» en el listado de control
- **THEN** el listado muestra sólo las computadoras
- **AND** el filtro de subcategoría ofrece sólo Notebook, PC de escritorio y All-in-one
