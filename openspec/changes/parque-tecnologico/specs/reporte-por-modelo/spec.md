# Spec Delta

## Purpose

Que el director ejecutivo vea cuántos bienes activos hay de cada marca y modelo, en qué estado y con qué atributos, en todo el inventario o en un área, y llegue desde cada número a esos bienes.

## ADDED Requirements

### Requirement: Bienes por marca y modelo
El sistema SHALL ofrecer en «reportes», para todos los roles, la pantalla «Bienes por marca y modelo» con los bienes activos que el usuario puede ver, en un árbol desplegable categoría → subcategoría → marca → modelo. Cada nivel SHALL mostrar su cantidad, una barra con su porcentaje sobre el total mostrado, la cantidad por estado (los estados con orden, el resto en «Otros») y, separada al final, «En uso».

#### Scenario: Notebooks por marca y modelo
- **WHEN** el usuario abre la pantalla y despliega Computadoras, Notebook y una marca
- **THEN** ve los modelos de esa marca con su cantidad, y la suma de los modelos es igual a la cantidad de la marca

#### Scenario: Bienes sin marca o sin modelo
- **WHEN** hay bienes de una subcategoría sin marca o sin modelo
- **THEN** aparecen agrupados en «(sin marca)» o «(sin modelo)», y los totales siguen cerrando

### Requirement: Distribución de atributos
Cada nivel del árbol SHALL mostrar, para cada atributo con algún valor en sus bienes, los valores y cuántos bienes tienen cada uno, de mayor a menor. Un atributo sin valores en ese nivel no SHALL mostrarse. Los valores de un nivel SHALL ser la suma de los de sus niveles inferiores.

#### Scenario: Memoria de un modelo
- **WHEN** un modelo tiene 80 bienes, 60 con «Memoria RAM: 8 GB» y 20 con «16 GB»
- **THEN** su fila muestra «Memoria RAM: 8 GB 60 · 16 GB 20»

#### Scenario: Atributos sin datos
- **WHEN** ningún bien de un modelo tiene cargado el atributo «Funda»
- **THEN** la fila de ese modelo no muestra «Funda»

### Requirement: Filtros por área, categoría y texto
La pantalla SHALL ofrecer:
- un filtro de área, que cuenta los bienes del área y de todos sus subsectores, y que ofrece sólo áreas activas con su responsable;
- un filtro de categoría;
- un buscador de marca o modelo, que deja a la vista sólo las ramas que coinciden, sin distinguir acentos ni mayúsculas.

Los filtros de área y de categoría SHALL limitar todas las cantidades y atributos.

#### Scenario: Modelos de una dirección
- **WHEN** el usuario elige un área
- **THEN** todas las cantidades y atributos cuentan sólo los bienes del área y de sus subsectores

#### Scenario: Buscar un modelo
- **WHEN** el usuario escribe «thinkpad»
- **THEN** el árbol muestra sólo los modelos que contienen «thinkpad», abiertos, con su categoría, subcategoría y marca

### Requirement: Del número a los bienes
Tocar una cantidad SHALL abrir la búsqueda de bienes activos filtrada por la fila (y su área, si hay una elegida) y por el estado de la columna o «en uso». Tocar un valor de atributo SHALL abrir la búsqueda filtrada por la fila y ese valor. El total del listado SHALL ser igual al número tocado, y cada filtro SHALL figurar en «Filtros aplicados».

#### Scenario: Notebooks sin asignar de un modelo
- **WHEN** el usuario toca la cantidad «Sin asignar» de un modelo de notebook
- **THEN** la búsqueda muestra esos bienes, con los filtros de subcategoría, marca, modelo y estado

#### Scenario: Bienes de un modelo con 16 GB
- **WHEN** el usuario toca «16 GB 20» en la memoria de un modelo
- **THEN** la búsqueda muestra 20 bienes de ese modelo con «Memoria RAM: 16 GB»

### Requirement: Modelo como campo de agrupación
El modelo SHALL poder usarse para agrupar en el Resumen y en el desglose de la búsqueda, y como campo de «Es alguno de» en la búsqueda avanzada. Dos modelos que sólo difieren en espacios repetidos SHALL contarse como el mismo modelo.

#### Scenario: Desglosar por modelo
- **WHEN** el usuario elige «Desglosar por: modelo» en la búsqueda
- **THEN** el desglose muestra un chip por modelo con su cantidad

#### Scenario: Espacios de más
- **WHEN** hay bienes con modelo «BES PRO T5 I7» y otros con «BES PRO  T5 I7» (dos espacios)
- **THEN** aparecen en una sola fila «BES PRO T5 I7», y tocar su cantidad abre la búsqueda con todos ellos

### Requirement: Descargar
La pantalla SHALL permitir descargar lo que muestra como planilla, con una fila por modelo: categoría, subcategoría, marca, modelo, total, una columna por estado, «En uso» y los atributos con sus valores. La planilla SHALL abrirse en Excel con los acentos correctos.

#### Scenario: Descargar
- **WHEN** el usuario toca «Descargar» con un área elegida
- **THEN** baja una planilla con una fila por modelo de esa área y los mismos números que la pantalla

### Requirement: Uso en el teléfono
En pantallas angostas el árbol SHALL mostrar sólo el nombre, la cantidad y la barra, sin desplazamiento horizontal de la página.

#### Scenario: Ver en el teléfono
- **WHEN** el usuario abre la pantalla en el teléfono
- **THEN** ve cada nivel con su cantidad y su barra, sin desplazar la página hacia el costado

### Requirement: Reemplazo de la grilla en el menú
La entrada «parque tecnológico» del menú «reportes» SHALL abrir la pantalla nueva, y la grilla de backend-plus anterior no SHALL ofrecerse en el menú.

#### Scenario: Menú de reportes
- **WHEN** el usuario abre el menú «reportes»
- **THEN** no ve la grilla «parque tecnológico» y ve «bienes por marca y modelo», que abre la pantalla nueva
