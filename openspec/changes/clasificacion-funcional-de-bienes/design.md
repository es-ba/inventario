# Design

## Context

- El `grupo` del bien es una descripción genérica que viene del sistema viejo. El catálogo tiene 254 valores, 151 de ellos en uso entre 4.039 activos. La tabla `grupos` es `(grupo, pertenece_a, descripcion)`, y `pertenece_a` está vacía en todas las filas.
- La búsqueda y la tabla `bienes` comparten `sqlBienesConControl` (`table-bienes.ts`), que ya hace `LEFT JOIN grupos g`.
- El catálogo de dimensiones (`bienes-dimensiones.ts`) alimenta el Resumen, el desglose y el operador «Es alguno de». Arma una dimensión por cada clave foránea de `bienes`, más las `ESPECIALES`, que se escriben a mano porque no salen de una clave foránea (`sector`, `clase`, `cuenta`…).
- `bienes_buscar_agrupado` cuenta los bienes de una consulta de la búsqueda, agrupados por hasta 5 dimensiones, y respeta la RLS porque pasa por `bienes`. `grupoFiltro` es una lista de partes `{dimension, valor}` que el servidor aplica como igualdades (o `IS NULL`).
- El estado del bien (`estados_bien`) lo calcula `bien_estado_calcular`. Los códigos son fijos; el catálogo sólo tiene `descripcion`, y es una frase larga («Ubicado en un sector»).
- La planilla `local-clasificacion/equivalencias-grupos.xlsx` asigna cada grupo a una subcategoría. Patrimonio la está validando.

Ver proposal.md (Why) para la motivación, y las specs `clasificacion-de-bienes` y `reporte-por-categoria` para el comportamiento.

## Goals / Non-Goals

**Goals:**
- Un usuario gerencial ve en una sola pantalla cuántos bienes hay por categoría y por estado, sin armar filtros ni conocer los campos.
- Cada número del reporte es el mismo que da la búsqueda con ese filtro, y se llega a esa búsqueda tocándolo.
- Cero carga manual en los bienes: la clasificación sale del grupo.
- Ninguna categoría, subcategoría ni estado escrito en el código. Separar una categoría es un dato del catálogo (`aparte`), no un código escrito.

**Non-Goals:**
- Cambiar o limpiar el catálogo de grupos.
- Subcategoría por bien.
- Gráficos con una librería: alcanza con barras de CSS dentro de la tabla.
- Reportes por período (altas o bajas por mes): esta es una foto del inventario de hoy.

## Decisions

**1. La clasificación cuelga del grupo, no del bien.**
`grupos.subcategoria` es una clave foránea nullable a `subcategorias`, y `subcategorias.categoria` es una clave foránea no nula a `categorias`. El bien no guarda nada: su subcategoría y su categoría salen de su grupo.

- Así no hay que cargar ni migrar 10.236 bienes. Un bien nuevo queda clasificado en cuanto se le elige el grupo, y la clasificación no puede contradecir al grupo.
- La alternativa era una columna `subcategoria` en `bienes`. Eso obliga a cargarla en cada alta, a mantenerla cuando cambia el grupo y a decidir qué vale si las dos no coinciden.
- Los grupos ambiguos que marcó la planilla (TP LINK, RADIO, CAMARA…) se resuelven como dato: se reasigna el grupo de los bienes que no correspondan, o se separa el grupo en dos.
- Si la validación de Patrimonio muestra muchos grupos mezclados, se puede sumar después `bienes.subcategoria` nullable como excepción: la derivada pasaría a ser `coalesce(b.subcategoria, g.subcategoria)`, sin tocar lo demás.

**2. Catálogos con códigos legibles.**
- `categorias (categoria text PK, nombre text isName, incluye text, orden integer, aparte boolean not null default false)`.
- `subcategorias (subcategoria text PK, nombre text isName, categoria text not null FK)`.
- Los códigos son los de la planilla (CMP, CMP-01). No se exige que el prefijo de la subcategoría coincida con su categoría: el código es un identificador, y mover una subcategoría a otra categoría no obliga a renombrarla.
- `orden` es el orden en que aparecen las categorías en el reporte. Las subcategorías se ordenan por código.
- Las dos tablas son editables con el mismo permiso que `grupos` (`context.es.administrativo`) y van en «gestion de datos», junto a «grupos». `subcategorias` es tabla de detalle de `categorias`.
- Borrar una categoría o subcategoría en uso lo rechaza la clave foránea.

**3. Columnas derivadas en `sqlBienes`, no en la tabla física.**
Se agregan `LEFT JOIN subcategorias sc ON sc.subcategoria = g.subcategoria` y `LEFT JOIN categorias cat ON cat.categoria = sc.categoria`, y las columnas `subcategoria`, `subcategoria_texto`, `categoria` y `categoria_texto` (con `codigoTextoSql`, como `grupo_texto`).

- En la definición de `bienes` son campos con `inTable:false` y con título en castellano («subcategoría», «categoría»). Así la tabla, la búsqueda, el filtro avanzado y la exportación las toman sin código aparte.
- Para que la grilla de la búsqueda las muestre van en `BIENES_GRID_ASSIGNMENT_FIELDS`, y para mostrarse sin el código, en `BIENES_PRESENTATION_FIELDS`.
- La ficha arma el nombre de un campo con las columnas `<tabla>__*` que backend-plus agrega por cada clave foránea. Como no hay columna física, se declaran como `softForeignKeys` de `bienes`: backend-plus suma el join y `subcategorias__nombre`/`categorias__nombre` sin crear la restricción en la base.
- Por ser `inTable:false`, filtrar por ellas hace que el conteo pase por la consulta completa (`camposSimples`), que es lo correcto.
- El join no se pone dentro del `LATERAL` del último movimiento, que sólo trae `mb.*`.

**4. Dimensiones `categoria` y `subcategoria` en `ESPECIALES`.**
No salen de una clave foránea de `bienes`, así que se escriben como `clase`: `fija(textoONulo('b.categoria'), 'b.categoria_texto')`, en la familia «clasificación». Con eso las toman el Resumen, el desglose y el operador «Es alguno de», que compara por el `valor` (el código).

**5. El reporte usa `bienes_buscar_agrupado`, sin procedure ni vista nueva.**
La pantalla pide `{estado:'activo', agruparPor:['categoria','subcategoria','estado'], grupoFiltro}`, donde `grupoFiltro` lleva el sector si se eligió uno. La respuesta (una fila por combinación, con su cantidad) se pivotea en el cliente con funciones puras (`principal/categorias/categorias-datos.ts`).

- Se usa la misma consulta que la búsqueda, con la misma RLS. Así el número del reporte y el total de la búsqueda con ese filtro son iguales por construcción, que es lo que hace inequívoco al reporte.
- Las columnas de estado salen del catálogo y no hay nada fijo en una definición de tabla.
- La alternativa era una `TableDefinition` como `reporte_bienes_por_sector`. Daba la grilla y su exportación gratis, pero obligaba a escribir los estados como columnas fijas y a duplicar las reglas de la búsqueda.
- El catálogo de `categorias` (para `nombre`, `orden` y `aparte`) y el de `estados_bien` (para `etiqueta` y `orden`) se leen con `leerTabla`.

**6. Bienes sin clasificación, a la vista.**
Los bienes cuyo grupo no tiene subcategoría, o que no tienen grupo, llegan con categoría nula y forman la fila «Sin categoría» del bloque principal. No se esconden: así el total general es siempre el total de bienes activos, y la fila muestra cuánto falta clasificar. Al tocarla se abre la búsqueda con categoría «(sin dato)».

**7. Categorías «aparte».**
Las categorías con `aparte = true` (ninguna en la carga inicial: Accesorios se pidió junto a las demás) van debajo del bloque principal, con su subtotal. El reporte muestra tres totales:

- **total principal**: las categorías que no son aparte, más «Sin categoría»;
- **total aparte**;
- **total general**: la suma de los dos, igual a la cantidad de bienes activos.

Tocar el total general abre la búsqueda sin filtro de categoría. Los subtotales no son tocables, porque no se pueden expresar como un `grupoFiltro` (sería «categoría no aparte»).

**8. Del número a la búsqueda.**
Cada celda numérica (categoría o subcategoría × total o estado) lleva a la búsqueda con:

```
irA('w=principal&filtro=' + encodeURIComponent(JSON.stringify({partes, textos, etiquetas})))
```

- Las partes salen de la celda: el sector del reporte, la categoría o la subcategoría y el estado.
- `ws-principal.tsx` lee `filtro` de `addrParams`. `BusquedaBienes` recibe un `grupoFiltroInicial`, arranca en la pestaña de activos con ese filtro y con la búsqueda hecha.
- «Filtros aplicados» lo muestra con los textos y lo quita, como cualquier filtro del Resumen.
- La validación del parámetro es pura: si no es un JSON con partes válidas, se ignora y la búsqueda arranca como siempre.

**9. Etiqueta y orden en `estados_bien`.**
Se agregan `etiqueta` (Asignado, Sin asignar, En movimiento, Baja en trámite, Baja) y `orden` (nullable).

- El reporte muestra como columnas los estados con `orden`, en ese orden. BAJA queda sin orden, porque un bien activo nunca está en BAJA.
- Un estado que aparezca en el resultado sin `orden` igual se suma al total, y se muestra en una columna «Otros». Así el total nunca deja de cerrar.
- La `descripcion` va como ayuda en el encabezado.

**10. Visualización simple.**
Una tabla de MUI con filas de categoría que se abren (todas cerradas al entrar) y una barra horizontal de CSS en la columna del total, proporcional a la categoría más grande del bloque. El número siempre se ve junto a la barra, así que la barra no es la única forma de leer el dato.

En el teléfono, las columnas por estado se reemplazan por el total con la barra, y el detalle por estado se ve al abrir la categoría.

**11. Filtro por sector.**
Un selector de un solo sector, con las opciones del catálogo de sectores. Va como parte `{dimension:'sector', valor}` del `grupoFiltro`, así viaja tal cual a la búsqueda. No incluye subsectores: el sector es el del último movimiento del bien, como en la dimensión `sector`.

**12. Descarga.**
«Descargar» arma en el cliente un CSV (separado por `;`, con BOM, para que Excel lo abra con los acentos) desde la misma tabla pivoteada: una fila por subcategoría, con su categoría, el total y una columna por estado. Lo arma una función pura, y se baja con un `Blob`, como `exportRows` de la búsqueda.

**13. Búsqueda.**
- `DESGLOSE_INICIAL` pasa a `'categoria'`. Quien ya eligió otro campo lo conserva, porque su elección está en `localStorage`.
- `COLUMNAS_INICIALES` suma `categoria` y `subcategoria` antes de `grupo`. Se muestran sin el código (`textoSinCodigo`).
- La búsqueda rápida suma `subcategoria` y `categoria` a sus candidatos, y `subcategoria` a `CAMPOS_DE_IDENTIFICACION`, para que «notebook» traiga primero las notebooks.

**14. Ficha.**
`bien-formulario.tsx` muestra «subcategoría» y «categoría» junto al grupo, sólo lectura. Al cambiar el grupo en el formulario se actualizan cuando se guarda, porque salen de la fila releída.

## Risks / Trade-offs

- [La asignación por grupo no sirve para un grupo que mezcla bienes de distinta función] → Se corrige como dato, reasignando el grupo de esos bienes. Si son muchos, la salida está prevista en la decisión 1.
- [Un grupo nuevo se crea sin subcategoría] → Sus bienes caen en «Sin categoría», que está a la vista en el reporte. No se exige la subcategoría al crear el grupo, para no frenar una carga.
- [Un usuario con visibilidad restringida ve sólo sus bienes en el reporte] → Es la misma RLS que la búsqueda. La pantalla no muestra más de lo que el usuario puede ver. Un texto chico bajo el título lo aclara siempre: «Bienes activos que podés ver».
- [El pivoteo se hace en el cliente] → Son a lo sumo 101 subcategorías × 5 estados, unos 500 números.
- [`bienes_buscar_agrupado` sobre todos los activos con tres dimensiones] → Es el peor caso del Resumen. Si se nota lento, hay que medirlo con `EXPLAIN` y, de ser necesario, indexar `grupos.subcategoria`.

## Migration Plan

1. **Desarrollo:**
   - `categorias.tab` y `subcategorias.tab` en `install/`, porque no referencian datos;
   - la columna `subcategoria` en `inventario-data/provisorio/grupos.tab`, generada desde la planilla validada;
   - `etiqueta` y `orden` en `install/estados_bien.tab`;
   - el dump reconstruye todo desde cero.
2. **Producción:** `install/cambios/cambios_<fecha>.sql` con:
   - `CREATE TABLE` de las dos tablas;
   - los `INSERT` de los catálogos;
   - `ALTER TABLE grupos ADD subcategoria` con su clave foránea, y un `UPDATE grupos` desde una tabla temporal con la equivalencia;
   - `ALTER TABLE estados_bien ADD etiqueta, orden` con su `UPDATE`.

   Los permisos de las tablas nuevas los da quien administra la base; el script no toca `GRANT`.
3. **Verificación posterior:**
   - la suma de activos por categoría da el total de activos;
   - ningún grupo con bienes activos queda sin subcategoría, salvo los que Patrimonio haya dejado así.
4. **Vuelta atrás:** se quitan la pantalla y el menú. Las tablas y la columna pueden quedar, porque no las usa nada más.
