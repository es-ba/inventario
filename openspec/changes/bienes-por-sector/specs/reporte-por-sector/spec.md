# Spec Delta

## Purpose

Que el director ejecutivo vea los bienes activos por la estructura del instituto: qué tiene cada área, sumando sus subsectores, en qué estado y por categoría, y que llegue desde cualquier número a esos bienes.

## ADDED Requirements

### Requirement: Organigrama con los bienes de cada área
El sistema SHALL ofrecer en «reportes», para todos los roles, la pantalla «Bienes por sector» con el organigrama como árbol desplegable. Cada área SHALL mostrar sus bienes activos propios y con subsectores, y sus personas propias y con subsectores. Al entrar SHALL verse abiertos sólo los dos primeros niveles. Cada usuario SHALL ver sólo los bienes que puede ver en la búsqueda.

#### Scenario: Ver una dirección con sus subsectores
- **WHEN** el usuario abre «Bienes por sector» y despliega una dirección
- **THEN** ve sus departamentos debajo, y la cantidad «con subsectores» de la dirección es la suma de sus bienes propios y de la de cada departamento

#### Scenario: Total del instituto
- **WHEN** el usuario abre la pantalla
- **THEN** la suma de los bienes con subsectores de las raíces, más la fila «Sin sector», es igual a la cantidad de bienes activos que puede ver

### Requirement: Estados y en uso por área
Cada área SHALL mostrar, sobre sus bienes con subsectores, una barra con su porcentaje del total, la cantidad en cada estado del bien con orden en el catálogo (titulada con su etiqueta, el resto en «Otros») y, separada al final, la cantidad «En uso». La suma de los estados SHALL ser igual a la cantidad con subsectores.

#### Scenario: Estados de una dirección
- **WHEN** una dirección tiene 120 bienes con subsectores, 100 asignados y 20 sin asignar
- **THEN** su fila muestra 120 en el total, 100 en «Asignado» y 20 en «Sin asignar»

### Requirement: Sin sector y sectores inactivos
Los bienes activos sin sector SHALL mostrarse en una fila «Sin sector». Un sector inactivo SHALL aparecer sólo si él o sus subsectores tienen bienes, marcado como inactivo. Un sector activo sin bienes SHALL aparecer con cero.

#### Scenario: Sector dado de baja con bienes
- **WHEN** un sector inactivo todavía tiene 5 bienes
- **THEN** aparece en el árbol con 5 bienes y la marca de inactivo

#### Scenario: Bienes sin sector
- **WHEN** hay 39 bienes activos sin sector
- **THEN** la fila «Sin sector» muestra 39

### Requirement: Buscar un área
La pantalla SHALL ofrecer un buscador por sigla o nombre del área, sin distinguir acentos ni mayúsculas. Elegir un área SHALL abrir el árbol hasta ella y marcarla.

#### Scenario: Encontrar un departamento
- **WHEN** el usuario escribe «soporte» y elige el departamento que aparece
- **THEN** el árbol se abre hasta ese departamento y lo marca

### Requirement: Del número a los bienes
Tocar una cantidad del árbol SHALL abrir la búsqueda de bienes activos filtrada por esa celda: el área con sus subsectores (o sólo el área en la columna de propios), el estado de la columna y, en «En uso», los bienes en uso. El total del listado SHALL ser igual a la cantidad tocada. El filtro del área con subsectores SHALL figurar en «Filtros aplicados» como «sector y subsectores: <sigla>» y SHALL poder quitarse desde ahí.

#### Scenario: Asignados de una dirección
- **WHEN** el usuario toca el 100 de «Asignado» de una dirección
- **THEN** la búsqueda muestra 100 bienes, con los filtros «sector y subsectores: <sigla>» y «estado: Asignado»

#### Scenario: Bienes propios
- **WHEN** el usuario toca la cantidad de propios de un área
- **THEN** la búsqueda muestra sólo los bienes de esa área, sin los de sus subsectores

### Requirement: Bienes de un área por categoría
Tocar el nombre de un área SHALL mostrar sus bienes con la misma tabla del reporte por categoría (categorías, subcategorías, estados, en uso, paso a la búsqueda y descarga), eligiendo entre «Con subsectores» y «Sólo el área», cada opción con su cantidad. Volver SHALL dejar el árbol como estaba.

#### Scenario: Categorías de una dirección
- **WHEN** el usuario toca el nombre de una dirección y elige «Con subsectores»
- **THEN** ve sus bienes por categoría, y el total general de la tabla es igual a su cantidad con subsectores

#### Scenario: Volver al árbol
- **WHEN** el usuario vuelve desde el detalle de un área
- **THEN** el árbol tiene abiertas las mismas ramas que antes

### Requirement: Filtro de rama en la búsqueda
La búsqueda de bienes y el reporte por categoría SHALL aceptar como filtro un sector con todos sus subsectores, a cualquier profundidad del organigrama. Ese filtro no SHALL ofrecerse como campo para agrupar en el Resumen ni en el desglose.

#### Scenario: Filtro de rama
- **WHEN** se abre la búsqueda con el filtro «sector y subsectores» de una dirección
- **THEN** el listado trae los bienes de la dirección y de todos los sectores que dependen de ella, directa o indirectamente

### Requirement: Uso en el teléfono
En pantallas angostas el árbol SHALL mostrar por área sólo el nombre, la cantidad con subsectores y la barra, sin desplazamiento horizontal de la página; los estados SHALL verse al abrir el detalle del área.

#### Scenario: Ver en el teléfono
- **WHEN** el usuario abre la pantalla en el teléfono
- **THEN** ve cada área con su total y su barra, sin desplazar la página hacia el costado

### Requirement: Grilla anterior fuera del menú
La grilla de backend-plus «bienes por sector» no SHALL ofrecerse en el menú «reportes».

#### Scenario: Menú de reportes
- **WHEN** el usuario abre el menú «reportes»
- **THEN** ve «bienes por sector» una sola vez, y abre la pantalla nueva
