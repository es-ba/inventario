# Bienes por atributos

Muestra cuántos bienes activos hay de cada categoría y subcategoría y, dentro de cada subcategoría, cómo se reparten por marca, modelo y cada atributo cargado (memoria, almacenamiento, accesorios). Sirve para decidir compras y reasignaciones. Está en **reportes → bienes por atributos**, para todos los usuarios. [Abrir el reporte](#w=bienes_por_modelo)

![Los bienes por categoría, subcategoría y atributos](img/modelos.jpg)

## El árbol

Cada fila es una categoría; debajo se abren sus subcategorías. Al abrir una subcategoría aparecen sus campos: **Marca**, **Modelo** y cada atributo que tenga algún dato en esos bienes (un atributo que nadie tiene cargado no aparece). Cada campo se abre en una fila por valor, de mayor a menor, con **(sin dato)** al final para los que no lo tienen cargado; así los valores de cada campo suman lo mismo que la subcategoría. Al entrar se ven sólo las categorías; si los filtros dejan una sola subcategoría, se abre con todos sus campos.

- **Cantidad**: los bienes de esa fila, con una barra y el porcentaje sobre el **Total** de la tabla.
- **Asignado** y **Sin asignar**: reparten la cantidad por estado (ver [qué significa cada estado](#ayuda/categorias)).
- **En uso**, separada por una línea: los que tienen cargado un responsable de uso; no suma con los estados.
- **Comodato** y **Acta**, separadas por otra línea: los que tienen ese tipo de asignación en su último movimiento; tampoco suman con los estados.

Los bienes que no tienen subcategoría van a **Sin categoría**, así los totales siempre cierran.

El modelo se agrupa por su texto, sin tener en cuenta los espacios de más (*BES PRO  T5* y *BES PRO T5* son el mismo); otras diferencias de escritura, como un guion o una letra, lo separan en dos filas. Las características de las computadoras (procesador, memoria, disco) suelen estar escritas dentro del texto del modelo, no como atributos, por eso pueden quedar en *(sin dato)*.

## Filtros

- **Área (con subsectores)**: cuenta sólo los bienes del área elegida y de todos sus subsectores. Ofrece las áreas activas, con su responsable.
- **Categoría** y **Subcategoría**: limitan la tabla. La subcategoría ofrece sólo las de la categoría elegida; elegir una subcategoría completa su categoría.
- **Filtrar por atributo** y **Valor del atributo**: cuenta sólo los bienes que tienen ese valor, por ejemplo *Memoria RAM* = *16 GB*. Los valores ofrecidos son los que tienen los bienes de los otros filtros, con su cantidad.
- **Buscar atributo o valor**: deja a la vista sólo los valores que coinciden con lo escrito, en el nombre del campo o en el valor (sin importar acentos ni mayúsculas), con su categoría, subcategoría y campo abiertos. Por ejemplo *lenovo* o *memoria 16*. No cambia las cantidades.

Todos los filtros, salvo el buscador, cambian todas las cantidades.

## Ver los bienes de un número

Tocá cualquier número para abrir la [búsqueda](#ayuda/busqueda) con esos bienes: la fila (categoría, o subcategoría y el valor del campo), los filtros elegidos y el estado de la columna o *en uso*. El total del listado es el mismo número, y cada filtro figura en **Filtros aplicados**, desde donde se puede quitar. Los números de **Otros** no llevan a la búsqueda.

## Descargar

**Descargar** baja una planilla con una fila por cada valor de cada campo: categoría, subcategoría, campo, valor, total, una columna por estado, **En uso**, **Comodato** y **Acta**, con los filtros elegidos. Si hay algo escrito en el buscador, baja sólo lo que coincide. Se abre en Excel con los acentos correctos.
