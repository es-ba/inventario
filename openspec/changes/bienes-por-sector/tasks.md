# Tasks

## 1. Filtro de rama en el servidor

- [x] 1.1 Sumar al tipo de dimensión de `bienes-dimensiones.ts` los campos opcionales `filtro` (condición para un valor) y `soloFiltro`, y agregar a `ESPECIALES` la dimensión `sector_rama` (etiqueta «sector y subsectores», filtro `sector_pertenece(nullif(btrim(b.sector), ''), <valor>)`, sólo filtro). Que `armarCatalogoDeDimensiones` la deje en `sql` y la saque de `disponibles`. Verificar con un caso en `test/bienes-dimensiones.test.js`: está en `sql`, no en `disponibles`, y su filtro usa `sector_pertenece`.
- [x] 1.2 En `bienes-busqueda-query.ts`, que el bucle de `grupoFiltro` use el `filtro` de la dimensión cuando existe y el valor no es nulo, y la igualdad en los demás casos. Verificar con un caso en `test/bienes-busqueda-query.test.js` que una parte `sector_rama` genera `sector_pertenece(…, $n)` con su parámetro y que `sector` sigue comparando por igualdad.

## 2. Lógica pura del organigrama

- [x] 2.1 Crear `src/client/principal/sectores/organigrama-datos.ts` con su test `test/sectores-reporte.test.js`. Debe:
  - armar el árbol desde las filas de `sectores` (hijos ordenados por sigla, ciclo o padre inexistente como raíz);
  - sumar propios y rama por estado y en uso desde las filas de `bienes_buscar_agrupado` por `['sector', 'estado', 'en_uso']`, reusando `Cuenta`, las columnas de estado y `EN_USO` de `categorias-datos.ts`;
  - sumar las personas propias y de la rama;
  - armar la fila «Sin sector», ocultar los inactivos sin bienes y calcular el porcentaje sobre el total general;
  - aplanar el árbol para el buscador (búsqueda sin acentos) y devolver los ancestros de un área.

  Casos: la suma de las raíces más «Sin sector» da el total, una rama de tres niveles suma bien, un ciclo no cuelga, un inactivo con y sin bienes, y un estado sin orden va a «Otros».
- [x] 2.2 Agregar a `organigrama-datos.ts` los filtros previos de un área («con subsectores» con `sector_rama`; «sólo el área» con `sector`) y verificar en el test que `filtroDeCelda` + `hashDeBusqueda` arman el filtro con la etiqueta «sector y subsectores» y la sigla como texto, y que `grupoFiltroDesdeTexto` lo vuelve a leer igual.

## 3. Pantalla «Bienes por sector»

- [x] 3.1 Crear `src/client/ws-sectores.tsx` (wScreen `bienes_por_sector`, `PantallaInventario` con `ayuda="sectores"`) y `principal/sectores/bienes-por-sector.tsx`. Debe:
  - leer `sectores` y `reporte_bienes_por_sector` con `leerTabla`, y `bienes_buscar_agrupado`;
  - dibujar el árbol con sangría, los niveles 0 y 1 abiertos, las columnas Área / Propios / Con subsectores (barra y %) / Personas / estados / En uso (con separador), y los números con `irA(hashDeBusqueda(...))`;
  - tener el buscador de área (abre los ancestros, marca la fila y la lleva a la vista);
  - en el teléfono, mostrar sólo área, total y barra.

  Importarlo desde `ws-principal.tsx`. Verificar que `npm run build` no da errores de webpack y que `dist/client/client/ws-principal.js` es el bundle (~1 MB).
- [x] 3.2 Al tocar el nombre de un área, mostrar el detalle con solapas «Con subsectores (n)» y «Sólo el área (n)», que reusa `useReporteDeCategorias`, `VistaDelReporte` y `descargarReporte`, con «Volver al organigrama». El árbol queda montado y oculto, así no se pierden las ramas abiertas. Verificar en el navegador que volver deja abiertas las mismas ramas.
- [x] 3.3 En `app-principal.ts`, reemplazar en «reportes» la entrada de la grilla `reporte_bienes_por_sector` por `{menuType:'bienes_por_sector', name:'bienes_por_sector', label:'bienes por sector'}`, en el mismo lugar. Verificar que `npx tsc -p tsconfig-server.json` compila y que el menú muestra una sola entrada.

## 4. Ayuda y documentación

- [x] 4.1 Escribir `principal/ayuda/manual/sectores.md`:
  - qué es el árbol, qué significa cada columna (propios, con subsectores, personas, estados, en uso);
  - «Sin sector» e inactivos;
  - el buscador, el paso a la búsqueda con el chip «sector y subsectores» y el detalle por categoría.

  Listarla en `manual.ts` con su captura `img/sectores.jpg`. La captura se saca a 1000×680 con nombres de personas desenfocados, y antes del build se pone una imagen provisoria para que webpack no falle. Quitar «bienes por sector» de `grillas.md`. Verificar con `node --test test/manual-ayuda.test.js`.
- [x] 4.2 Agregar a `CLAUDE.md` un párrafo sobre el reporte por sector (consulta agrupada + árbol en el cliente, `sector_rama` como dimensión de sólo filtro con `sector_pertenece`, personas desde `reporte_bienes_por_sector`, detalle reusando el reporte por categoría). Verificar releyéndolo contra el código.

## 5. Verificación integrada

- [x] 5.1 Contra la base de prueba (cluster de `local-test-pg` con el dump nuevo), comprobar en el navegador:
  - la suma de las raíces más «Sin sector» es igual a los activos de la búsqueda;
  - tocar «Asignado» de una dirección abre la búsqueda con el mismo número y el chip «sector y subsectores»;
  - tocar los propios de un área no trae los de sus subsectores;
  - el detalle «Con subsectores» da el mismo total que la fila;
  - el buscador abre el árbol hasta un departamento;
  - a ancho de teléfono no hay desplazamiento horizontal.
- [x] 5.2 Correr los tests de lo tocado (`bienes-dimensiones`, `bienes-busqueda-query`, `sectores-reporte`, `categorias-reporte`, `responsables-reporte`, `manual-ayuda`) y `npm run build`, y verificar que pasan sin errores nuevos.

## Workflow follow-up

- Siguientes changes de la dirección: `parque-tecnologico` (subcategoría > marca > modelo con atributos, filtrable por rama) y `cobertura-de-bienes` (reglas por persona + excepciones por área; editan admin, administrador y administrativo; superior ve con sus bienes).
