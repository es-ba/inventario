# Tasks

## 1. Lógica pura

- [x] 1.1 Crear `src/client/principal/desglose-datos.ts` con: la elección del campo inicial (lo guardado si está en el catálogo, si no «grupo», si no la primera dimensión; nada si el catálogo está vacío), el valor elegido según `grupoFiltro` (sólo con una parte y la misma dimensión; si no, ninguno) y `leerDesglose`/`guardarDesglose` en `localStorage` con la clave `inventario.busqueda-bienes.desglose.<usuario>` y `try/catch`, como `leerColumnas`. Verificar con `test/desglose-busqueda.test.js` (transpilando el `.ts` como `bienes-agrupado-query.test.js`): casos de guardado válido, guardado que ya no existe, catálogo sin «grupo», filtro de una parte que coincide, de otra dimensión, de varias partes, valor nulo y `localStorage` que lanza.

## 2. Componente

- [x] 2.1 Exportar `SelectorDimension` y `SIN_DATO` desde `resumen-bienes.tsx`, sin cambiar el Resumen; verificar que `npm run build` compila y que el Resumen sigue funcionando igual.
- [x] 2.2 Crear `src/client/principal/desglose-busqueda.tsx`: selector «Desglosar por» y una fila de chips sin salto de línea con `overflow-x: auto`, cada uno con «texto cantidad» y en el orden que devuelve `bienes_buscar_agrupado`. Pide `{...consulta, agruparPor:[campo]}` con secuencia contra respuestas viejas y se vuelve a pedir con `version`. Marca el chip elegido y lo lleva a la vista con `scrollIntoView`. Sin resultados no muestra chips; los errores se muestran en un `Alert` chico. Verificar con un caso en `test/desglose-busqueda.test.js` que lea el fuente y compruebe que usa `bienes_buscar_agrupado`, `overflow` en la fila y `scrollIntoView`.

## 3. Integración en la búsqueda

- [x] 3.1 En `busqueda-bienes.tsx`, montar el desglose entre «Filtros aplicados» y el listado, sólo con la vista Listado y después de buscar. Pasarle `consultaResumen`, la misma `version` que al Resumen, el `usuario` y `grupoFiltro`. Al tocar un chip: limpiar la selección, poner `grupoFiltro` de una parte con el texto del chip y la etiqueta del campo, y página 0; si el chip ya estaba elegido, quitar `grupoFiltro`. Al cambiar el campo: guardarlo y quitar `grupoFiltro`. Verificar con un caso del test que lea el fuente y compruebe el montaje con `consultaResumen`.
- [x] 3.2 Probar en el navegador con el servidor local: buscar «monitor» y ver los chips por grupo, con la suma igual al total; tocar MONITOR y ver el total del chip y «grupo: MONITOR» en «Filtros aplicados»; tocar otro chip y ver que reemplaza; tocar el elegido y ver que quita; tocar «(sin dato)»; cambiar a «rubro» y ver que el filtro se quita; recargar y ver que sigue en «rubro»; elegir una fila del Resumen y ver que reemplaza el chip; achicar a ancho de teléfono y ver que la fila se desplaza sin barra horizontal en la página.

## 4. Cierre

- [x] 4.1 Agregar a `CLAUDE.md`, en la parte de la búsqueda, un párrafo corto sobre el desglose (`desglose-busqueda.tsx` + `desglose-datos.ts`, usa `bienes_buscar_agrupado` con `consultaResumen`, el chip es `grupoFiltro` de una parte, campo guardado en `localStorage`). Correr `npm test` y `npm run build` y verificar que pasan.
