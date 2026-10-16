# Design

## Context

- `bienes_buscar_agrupado` agrupa hasta 5 dimensiones (`MAXIMO_DIMENSIONES`) y `grupoFiltro` admite hasta 5 partes.
- Hoy existen como dimensiones:
  - `subcategoria`, `categoria` y `estado`;
  - `en_uso` (SI/NO);
  - `marca`, por clave foránea, con texto «código — descripción»;
  - los atributos, como `atributo:<clave>` (el valor de `bien_atributo`);
  - `sector_rama`, que es sólo de filtro.
- `modelo` es texto libre y todavía no es dimensión.
- Hay 13 atributos (`bienes_atributos`). En los datos de desarrollo casi todos los valores son de tablets (memoria, almacenamiento, funda, cargador…). Las especificaciones de las computadoras están dentro del texto del modelo.
- El reporte por categoría y el organigrama ya resuelven las cantidades por estado con «Otros» (`criterioDeEstados`), «En uso» con separador (`CeldasDeEstado`), el paso a la búsqueda (`filtroDeCelda`, `hashDeBusqueda`, `destinoDe`) y la descarga en CSV.

Ver proposal.md para la motivación y la spec `reporte-por-modelo` para el comportamiento.

## Goals / Non-Goals

**Goals:**
- Cada número es el mismo que da la búsqueda con ese filtro.
- Los atributos que se muestran salen del catálogo y de los datos, sin una lista fija en el código.

**Non-Goals:**
- Normalizar los textos de modelo o crear un catálogo de modelos.
- Cambiar la grilla `parque_tecnologico` ni su alcance contable (sólo deja de estar en el menú).

## Decisions

**1. Modelo como dimensión en `ESPECIALES`.**

Se agrega `{clave:'modelo', etiqueta:'modelo', familia:'clasificación'}`, con `valor` y `texto` igual a `nullif(regexp_replace(btrim(b.modelo), '\s+', ' ', 'g'), '')`. Así el filtro por modelo compara el texto sin los espacios repetidos: en los datos hay el mismo modelo escrito con dos espacios seguidos (por ejemplo «BES PRO T5 I7»: 50 + 4 + 2), y en la pantalla no se distinguen. Otras diferencias de escritura siguen separando. Por ser dimensión, también aparece en el Resumen, el desglose y «Es alguno de», sin más código.

Alternativa descartada: agrupar por modelo en una consulta propia. Sería otro SQL que no comparte las reglas de la búsqueda, y los números podrían diferir.

**2. Cantidades: una consulta agrupada por `['subcategoria', 'marca', 'modelo', 'estado', 'en_uso']`.**

- Son exactamente las 5 dimensiones permitidas.
- La categoría no se pide: se deduce de la subcategoría con el catálogo `subcategorias`, que la pantalla lee con `leerTabla` junto con `categorias`.
- Los bienes sin subcategoría van a «Sin categoría».
- El árbol de cuatro niveles se arma y se suma en el cliente.

**3. Atributos: una consulta por atributo, en paralelo, por `['subcategoria', 'marca', 'modelo', 'atributo:<clave>']`.**

- Los atributos se leen de `bienes_atributos`.
- Cada respuesta se cuelga del nodo modelo correspondiente y se suma hacia arriba.
- Se descartan las filas con valor nulo (bienes sin ese atributo), así un atributo sin valores no aparece.
- Con 13 atributos son 14 consultas por cada cambio de filtro, todas sobre el mismo conjunto filtrado.
- Alternativa descartada: un procedure nuevo que devuelva todo junto. Sería más rápido, pero duplicaría la lógica de filtros de la búsqueda, y cada número dejaría de garantizar que coincide con ella.

**4. Filtros.**

- El área usa la parte `sector_rama` (opciones de `opcionesDeSectores`: activas, con responsable) y la categoría la parte `categoria`. Los dos van como `grupoFiltro` de todas las consultas y como filtros previos del paso a la búsqueda.
- El buscador de marca o modelo filtra el árbol en el cliente: deja las ramas con algún modelo que coincida y las abre. No cambia las consultas.

**5. Paso a la búsqueda dentro del límite de 5 partes.**

| Celda | Partes |
|---|---|
| un modelo y un estado | área + subcategoría + marca + modelo + estado |
| un valor de atributo | área + subcategoría + marca + modelo + atributo |

- En los niveles de arriba se usa sólo lo que define al nivel (por ejemplo categoría, o subcategoría + marca).
- Con la categoría elegida como filtro no hace falta repetirla, porque la subcategoría ya la implica.
- Un valor de atributo filtra con la parte `atributo:<clave>`, que compara por igualdad.

**6. Lógica pura en `principal/modelos/modelos-datos.ts`, con test.**

- Armado del árbol de cuatro niveles con «(sin marca)», «(sin modelo)» y «Sin categoría».
- Suma de estados y en uso, y colgado y suma de atributos.
- Porcentaje sobre el total.
- Filtro de texto y armado de las partes de cada celda.
- CSV con una fila por modelo.
- Reusa `criterioDeEstados`, `cuentaVacia`, `sumar` y `sumarCuentas` de `categorias-datos.ts`.

**7. Pantalla `ws-modelos.tsx` + `principal/modelos/bienes-por-modelo.tsx`.**

- Tabla con sangría por nivel; al entrar se ven las categorías cerradas.
- Columnas:
  - nombre;
  - cantidad (barra y %);
  - estados;
  - «En uso» (separador);
- Atributos: en una línea debajo de cada fila, a todo el ancho (como columna quedaban cortados o hacían filas muy altas); por atributo, los 3 valores más frecuentes como enlaces, y el resto en el `title`.
- Teléfono: nombre, cantidad y barra.
- La marca se muestra sin código (`textoSinCodigo`).

**8. Menú.**

La entrada `parque_tecnologico` (grilla) se reemplaza por `{menuType:'bienes_por_modelo', name:'bienes_por_modelo', label:'bienes por marca y modelo'}` en el mismo lugar. La definición `parque_tecnologico` queda.

## Risks / Trade-offs

- [14 consultas por cambio de filtro] → Son agrupadas y en paralelo. Con el filtro de rama cada una tarda ~0,5 s en el peor caso (todo el instituto); sin filtro, decenas de ms. Si se nota, se piden los atributos sólo al abrir una subcategoría.
- [El mismo modelo escrito de formas distintas aparece separado] → Es un problema de datos, fuera de alcance. El buscador de texto ayuda a encontrarlos juntos.
- [Las computadoras casi no tienen atributos] → La columna queda vacía para ellas. La ayuda explica que esas especificaciones están en el texto del modelo, y que un catálogo de modelos es la mejora siguiente.
- [Muchos modelos distintos en subcategorías como Silla o Libro] → El árbol se abre por niveles y el buscador acota. No se pagina.

## Migration Plan

Sin cambios en la base. Se despliega con `npm run build`. Para volver atrás se revierte el commit, y la entrada de la grilla vuelve al menú.
