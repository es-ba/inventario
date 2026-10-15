# Spec Delta

## Purpose

Que cada bien tenga una clasificación funcional de dos niveles (categoría y subcategoría), que sale de su grupo sin cargar nada en el bien, y que esa clasificación se pueda ver, buscar y filtrar en todo el sistema.

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

### Requirement: Clasificación del bien por su grupo
Cada grupo SHALL poder asignarse a una subcategoría. La subcategoría de un bien SHALL ser la de su grupo, y su categoría SHALL ser la de esa subcategoría. El bien no SHALL guardar la clasificación: si cambia el grupo del bien, o la subcategoría asignada al grupo, la clasificación del bien SHALL cambiar sin otra acción. Asignar la clasificación no SHALL modificar el grupo de ningún bien. Un bien cuyo grupo no tiene subcategoría, o que no tiene grupo, SHALL quedar sin categoría ni subcategoría.

#### Scenario: Bien clasificado por su grupo
- **WHEN** un bien tiene el grupo NOTEBOOK, asignado a la subcategoría «CMP-01 Notebook» de la categoría «CMP Computadoras»
- **THEN** el bien tiene subcategoría Notebook y categoría Computadoras

#### Scenario: Cambiar la asignación de un grupo
- **WHEN** el administrador asigna el grupo IMAC a la subcategoría «CMP-03 All-in-one»
- **THEN** todos los bienes del grupo IMAC pasan a tener subcategoría All-in-one y categoría Computadoras
- **AND** el grupo de esos bienes sigue siendo IMAC

#### Scenario: Grupo sin asignar
- **WHEN** se crea un grupo nuevo sin subcategoría y se carga un bien con ese grupo
- **THEN** el bien queda sin categoría ni subcategoría

### Requirement: Clasificación en la ficha del bien
La ficha del bien SHALL mostrar la categoría y la subcategoría junto al grupo, por su nombre, sin que puedan editarse.

#### Scenario: Ver la clasificación en la ficha
- **WHEN** el usuario abre la ficha de un bien del grupo TABLET
- **THEN** la ficha muestra «categoría: Dispositivos móviles» y «subcategoría: Tablet», sin poder editarlas

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
