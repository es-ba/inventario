# Bienes por atributos

Muestra cuántos bienes activos hay de cada categoría y subcategoría y, dentro de cada subcategoría, cómo se reparten por marca y cada atributo cargado (memoria, almacenamiento, accesorios). Sirve para decidir compras y reasignaciones. Está en **reportes → bienes por atributos**, para todos los usuarios. [Abrir el reporte](#w=bienes_por_modelo)

![Los bienes por categoría, subcategoría y atributos](img/modelos.jpg)

## El árbol

Cada fila es una categoría, en el mismo orden que en el reporte por categoría; debajo se abren sus subcategorías. Al abrir una subcategoría aparecen sus campos: **Marca** y cada atributo que tenga algún dato en esos bienes (un atributo que nadie tiene cargado no aparece). Cada campo se abre en una fila por valor, de mayor a menor, con **(sin dato)** al final para los que no lo tienen cargado; así los valores de cada campo suman lo mismo que la subcategoría. Al entrar se ven sólo las categorías; si los filtros dejan una sola subcategoría, se abre con todos sus campos.

- **Cantidad**: los bienes de esa fila, con una barra y el porcentaje sobre el **Total** de la tabla.
- **Asignado** y **Sin asignar**: reparten la cantidad por estado (ver [qué significa cada estado](#ayuda/categorias)).
- **En uso**, separada por una línea: los que tienen cargado un responsable de uso; no suma con los estados.
- **Comodato** y **Acta**, separadas por otra línea: los que tienen ese tipo de asignación en su último movimiento; tampoco suman con los estados.

Los bienes que no tienen subcategoría van a **Sin categoría**, así los totales siempre cierran.

## Por atributo

Arriba hay dos solapas: **Árbol** (la de arriba) y **Por atributo**. En **Por atributo**, en la franja **Columnas** que está sobre la tabla se elige un campo (la marca o cualquier atributo) y aparece una tabla con las subcategorías que lo tienen cargado en las filas, agrupadas por categoría, y sus valores en las columnas, de mayor a menor. Cada celda es la cantidad de bienes de esa subcategoría con ese valor. Se ven los ocho valores más cargados; el resto se suma en **Otros**, y **(sin dato)** va al final, así cada fila suma su **Total**. Sirve para ver de un vistazo qué hay de cada cosa y dónde, sin abrir nada. El campo elegido queda para la próxima vez.

Tocá un número para ver esos bienes en la búsqueda. Los de **Otros**, y los totales y *(sin dato)* de las filas de categoría y del total, no llevan a la búsqueda, porque cuentan sólo las subcategorías que tienen el dato. **Descargar** baja esta tabla.

## Filtros

- **Área (con subsectores)**: cuenta sólo los bienes del área elegida y de todos sus subsectores. Ofrece las áreas activas, con su responsable.
- **Categoría** y **Subcategoría**: limitan la tabla. La subcategoría ofrece sólo las de la categoría elegida; elegir una subcategoría completa su categoría.
- **Sólo bienes con** y **Valor**: cuenta sólo los bienes que tienen ese valor, por ejemplo *Memoria RAM* = *16 GB*. No es lo mismo que **Columnas**: el filtro recorta qué bienes entran y **Columnas** elige qué se reparte en la tabla; por ejemplo, **Columnas** *Almacenamiento* con **Sólo bienes con** *Memoria RAM* = *8 GB* muestra qué almacenamiento tienen los equipos de 8 GB. Por eso en **Por atributo** el filtro no ofrece el atributo elegido en **Columnas**, ni **Columnas** el del filtro. Los valores ofrecidos son los que tienen los bienes de los otros filtros, con su cantidad.
- **Buscar atributo o valor** (sólo en el árbol): deja a la vista sólo los valores que coinciden con lo escrito, en el nombre del campo o en el valor (sin importar acentos ni mayúsculas), con su categoría, subcategoría y campo abiertos. Por ejemplo *lenovo* o *memoria 16*. No cambia las cantidades.

Todos los filtros, salvo el buscador, cambian todas las cantidades.

## Ver los bienes de un número

Tocá cualquier número para abrir la [búsqueda](#ayuda/busqueda) con esos bienes: la fila (categoría, o subcategoría y el valor del campo), los filtros elegidos y el estado de la columna o *en uso*. El total del listado es el mismo número, y cada filtro figura en **Filtros aplicados**, desde donde se puede quitar. Los números de **Otros** no llevan a la búsqueda.

## Descargar

**Descargar** baja una planilla con una fila por cada valor de cada campo: categoría, subcategoría, campo, valor, total, una columna por estado, **En uso**, **Comodato** y **Acta**, con los filtros elegidos. Si hay algo escrito en el buscador, baja sólo lo que coincide. Se abre en Excel con los acentos correctos.
