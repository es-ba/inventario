# Design

## Context

La búsqueda (`busqueda-bienes.tsx`) ya tiene todo lo que el desglose necesita:

- `bienes_buscar_agrupado` cuenta los bienes de una consulta agrupados por una o más dimensiones, ordenados por cantidad descendente, y devuelve valor, texto y cantidad. El Resumen (`resumen-bienes.tsx`) lo usa con `consultaResumen`, que es la consulta del listado sin `grupoFiltro` y sin paginar.
- `bienes_dimensiones_agrupar` devuelve el catálogo de dimensiones (asignación, clasificación y atributos), sin listas escritas a mano: sale de las claves foráneas de `bienes` y de los atributos (`bienes-dimensiones.ts`).
- `grupoFiltro` (`{partes, textos, etiquetas}`) es el filtro que pone el Resumen al elegir una fila. El servidor lo aplica también con `valor` nulo (`IS NULL`), y «Filtros aplicados» lo muestra y lo quita.

Ver proposal.md (Why) para la motivación y la spec `listado-de-bienes` para el comportamiento.

## Goals / Non-Goals

**Goals:**
- El desglose es otra vista de la misma consulta que ya usa el Resumen: no cambia el servidor ni el contrato.
- Ningún campo, grupo ni cantidad de chips escrito en el código, salvo el campo con el que arranca («grupo»).

**Non-Goals:**
- Desglose por varios campos a la vez: para eso está el Resumen.
- Cambiar la búsqueda rápida o el Resumen.

## Decisions

**1. Una consulta aparte con `bienes_buscar_agrupado`, no sumar el desglose a `bienes_buscar_avanzado`.**
El desglose pide `{...consultaResumen, agruparPor:[campo]}`. Sumarlo a la respuesta del listado ahorraría un viaje, pero cambia el contrato de la búsqueda, se recalcularía al paginar o al ordenar (que no cambian el desglose) y duplicaría lo que ya hace el procedure del Resumen. Como `consultaResumen` no tiene página ni orden, paginar u ordenar no vuelve a pedir el desglose.

**2. El filtro del chip es `grupoFiltro` con una sola parte.**
Tocar un chip hace lo mismo que elegir una fila del Resumen con una dimensión: `setGrupoFiltro({partes:[{dimension, valor}], textos:[texto], etiquetas:[etiqueta]})` y la página vuelve a 0. Por eso el desglose y el Resumen se reemplazan entre sí y «Filtros aplicados» no cambia. Un chip está marcado cuando `grupoFiltro` tiene una sola parte con la dimensión del desglose y ese valor. Si el filtro vino del Resumen con varias dimensiones, ningún chip se marca. Esa regla es pura y se puede probar.

**3. El desglose ignora sólo su propio filtro.**
Parte de `consultaResumen` (sin `grupoFiltro`) y le vuelve a sumar `grupoFiltro` salvo que sea propio: una sola parte con la dimensión del desglose (`consultaDelDesglose`). Con un chip elegido siguen viéndose los demás valores para cambiar de uno a otro, como los contadores de solicitudes, donde cada contador ignora su propio filtro. Con un filtro del Resumen sobre otro campo, o de varias dimensiones, el desglose cuenta lo mismo que el listado. La primera versión ignoraba siempre `grupoFiltro`; en la prueba, con un filtro del Resumen los chips sumaban más que el listado y confundía.

**4. El campo elegido se guarda en `localStorage` por usuario, como las columnas.**
Clave `inventario.busqueda-bienes.desglose.<usuario>`, con lectura y escritura dentro de `try/catch`, igual que `leerColumnas`/`guardarColumnas`. Al leerlo, si la clave guardada ya no está en el catálogo (por ejemplo, un atributo que se borró), se usa «grupo»; si «grupo» tampoco está, la primera del catálogo. Cambiar el campo quita `grupoFiltro` sólo si es propio: un filtro que vino del Resumen queda, y el desglose lo respeta (decisión 3).

**5. Una sola fila con desplazamiento horizontal, no una cantidad fija de chips.**
Los chips van en una fila sin salto de línea y con `overflow-x: auto`. Así no hay que inventar cuántos chips mostrar ni medir anchos, y en el teléfono se recorre con el dedo. Al elegir un valor, su chip se lleva a la vista con `scrollIntoView({block:'nearest', inline:'nearest'})`. En pantallas angostas el selector va arriba y la fila debajo, con todo el ancho: al lado del selector quedaban 91 px para los chips.

**6. Reusar lo del Resumen.**
`SelectorDimension` y la constante `SIN_DATO` se exportan desde `resumen-bienes.tsx` en lugar de copiarse. El texto de cada chip es `textos[0] ?? valores[0] ?? SIN_DATO`, como en las columnas del Resumen; se muestra sin el código con `textoSinCodigo` (igual que las columnas de la búsqueda), con la cantidad en negrita para que no se confunda con el texto, y el texto completo va en el `title`. La carga sigue el mismo patrón de secuencia, que descarta respuestas viejas, y se vuelve a pedir con la misma `version` (`searchVersion` + actualización) que usa el Resumen.

**7. Lógica pura en `principal/desglose-datos.ts`.**
Ahí van la elección del campo inicial a partir del catálogo y de lo guardado, si un chip está elegido según `grupoFiltro`, y la lectura y escritura en `localStorage`. El componente (`principal/desglose-busqueda.tsx`) sólo dibuja y llama. Es el mismo reparto que `vista-rapida-datos.ts` y `escaneo-datos.ts`.

## Risks / Trade-offs

- [Otra consulta por cada cambio de búsqueda] → Corre sobre la misma CTE filtrada que el conteo y agrupa en la base. Se pide sólo con la vista Listado visible y después de buscar. Si se nota lento, hay que medir `bienes_buscar_agrupado` con la búsqueda vacía (todos los bienes activos), que es el peor caso.
- [La búsqueda rápida sigue trayendo bienes que sólo mencionan la palabra] → Es lo esperado: el desglose deja ver de qué grupos son y el chip deja el número correcto. Cambiar qué campos mira la búsqueda rápida queda fuera.
- [Rubros sin nombre] → El chip muestra el código («3») hasta que se carguen los nombres del nomenclador, que es un dato y no un cambio de código.

## Migration Plan

Sólo cambia el cliente: `npm run build` y desplegar. No hay datos ni cambios en la base. Para volver atrás alcanza con revertir el commit; la clave de `localStorage` que queda en los navegadores no molesta.
