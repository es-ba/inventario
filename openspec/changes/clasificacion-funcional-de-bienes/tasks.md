# Tasks

## 0. Datos (antes de empezar)

- [ ] 0.1 Recibir la planilla `local-clasificacion/equivalencias-grupos.xlsx` validada por Patrimonio y resolver las 38 filas «A confirmar» y las observaciones. Las que digan que un grupo mezcla bienes de distinta función se corrigen reasignando el grupo de esos bienes (como dato, en el `.tab` y en `cambios_<fecha>.sql`). Si son muchas, revisar la decisión 1 del diseño antes de seguir.

## 1. Base y catálogos

- [x] 1.1 Crear `table-categorias.ts` (`categoria`, `nombre` isName, `incluye`, `orden`, `aparte` boolean not null default false; detalle `subcategorias`) y `table-subcategorias.ts` (`subcategoria`, `nombre` isName, `categoria` FK not null), editables con `context.es.administrativo` como `grupos`. Registrarlas en `prepareGetTables()` y en «gestion de datos», junto a «grupos».
- [x] 1.2 Agregar a `table-grupos.ts` el campo `subcategoria` (nullable, FK a `subcategorias`).
- [x] 1.3 Agregar a `table-estados_bien.ts` los campos `etiqueta` y `orden` (nullable), y completarlos en `install/estados_bien.tab`: Asignado, Sin asignar, En movimiento y Baja en trámite con orden 1 a 4; Baja sin orden.
- [x] 1.4 Generar desde la planilla validada `install/categorias.tab` (con ACC marcada `aparte`), `install/subcategorias.tab` y la columna `subcategoria` de `inventario-data/provisorio/grupos.tab`. Correr `npm run dump` y verificar que la suma de activos por categoría da el total de activos, y que no queda ningún grupo con activos sin subcategoría salvo los que Patrimonio dejó así.
- [x] 1.5 Escribir `install/cambios/cambios_<fecha>.sql` para producción: `CREATE TABLE` de las dos tablas, `INSERT` de los catálogos, `ALTER TABLE grupos ADD subcategoria` con su FK, `UPDATE grupos` desde una tabla temporal con la equivalencia, y `ALTER TABLE estados_bien ADD etiqueta, orden` con su `UPDATE`. Sin `GRANT`. Validarlo contra una copia antes de entregarlo.

## 2. Clasificación del bien

- [x] 2.1 En `sqlBienes` (`table-bienes.ts`), sumar `LEFT JOIN subcategorias sc` y `LEFT JOIN categorias cat` fuera del `LATERAL`, y las columnas `subcategoria`, `subcategoria_texto`, `categoria` y `categoria_texto` con `codigoTextoSql`. Agregar los campos a la definición de `bienes` con `inTable:false` y títulos «subcategoría» y «categoría». Verificar con un caso en `test/bienes-busqueda-query.test.js` que filtrar por `categoria` no usa el conteo de `camposSimples`.
- [x] 2.2 Agregar `categoria` y `subcategoria` a `ESPECIALES` en `bienes-dimensiones.ts` (familia «clasificación», `fija(textoONulo('b.<campo>'), 'b.<campo>_texto')`). Verificar con `test/bienes-dimensiones.test.js` (nuevo, transpilando el `.ts`) que aparecen en el catálogo y que el operador `in` compara por el código.
- [x] 2.3 En `bienes-busqueda-query.ts`, sumar `subcategoria` y `categoria` a los candidatos de la búsqueda rápida, y `subcategoria` a `CAMPOS_DE_IDENTIFICACION`. Verificar con un caso en `test/bienes-busqueda-query.test.js` que «notebook» ordena primero los de la subcategoría Notebook.
- [x] 2.4 Mostrar categoría y subcategoría en la ficha (`bien-formulario.tsx`), junto al grupo, sólo lectura.

## 3. Búsqueda

- [x] 3.1 Cambiar `DESGLOSE_INICIAL` a `'categoria'` (`desglose-datos.ts`) y sumar `categoria` y `subcategoria` antes de `grupo` en `COLUMNAS_INICIALES`.
- [x] 3.2 Que la búsqueda pueda abrirse con un filtro: `ws-principal.tsx` lee `filtro` de `addrParams` y lo valida con una función pura (JSON con `partes`, `textos` y `etiquetas` del mismo largo, cada parte con `dimension` de texto y `valor` de texto o nulo; si no, nada). `BusquedaBienes` recibe `grupoFiltroInicial` y arranca en activos, con ese filtro y con la búsqueda hecha. Verificar la validación con test: válido, JSON roto, largos distintos y valor numérico.

## 4. Pantalla «Bienes por categoría»

- [x] 4.1 Lógica pura en `src/client/principal/categorias/categorias-datos.ts`, con su test en `test/categorias-reporte.test.js`:
  - pivotear las filas de `bienes_buscar_agrupado` con los catálogos de categorías y estados: bloques principal y aparte, «Sin categoría» en el principal, columnas por estado con orden más «Otros», totales y proporción de la barra;
  - armar el `grupoFiltro` de cada celda;
  - armar el CSV.

  Casos: totales que cierran, estado sin orden, categoría sin bienes que no aparece, bienes sin categoría, celda con y sin estado, sector elegido y acentos en el CSV.
- [x] 4.2 Crear `src/client/ws-categorias.tsx` con `PantallaInventario` (`ayuda="categorias"`) y los componentes en `principal/categorias/`. Debe:
  - leer los catálogos con `leerTabla`;
  - pedir `bienes_buscar_agrupado` con `{estado:'activo', agruparPor:['categoria','subcategoria','estado'], grupoFiltro}` y volver a pedirlo al cambiar el sector;
  - dibujar la tabla con filas que se abren y la barra;
  - llevar a la búsqueda con `irA('w=principal&filtro=…')` al tocar una cantidad;
  - descargar el CSV;
  - en el teléfono, mostrar sólo el total y la barra.
- [x] 4.3 Agregar la entrada «bienes por categoría» al menú «reportes» (`app-principal.ts`), primera de la lista, para todos los roles.
- [ ] 4.4 Probar en el navegador con el servidor local (hecho contra una base de prueba armada con el dump nuevo, salvo la descarga desde la pantalla, que sólo está cubierta por test, y el rol de visibilidad restringida, que falta):
  - que el total general sea igual a los activos de la búsqueda;
  - abrir Computadoras y tocar Notebook / Sin asignar, y ver el mismo número en el listado y el filtro en «Filtros aplicados»;
  - tocar «Sin categoría»;
  - elegir un sector y tocar un número;
  - descargar y abrir en Excel;
  - verlo a ancho de teléfono sin desplazamiento horizontal;
  - entrar con un rol de visibilidad restringida y ver que cuenta sólo sus bienes.

## 5. Cierre

- [x] 5.1 Manual:
  - sección nueva `principal/ayuda/manual/categorias.md`, listada en `manual.ts`, con una captura a 1000×680;
  - en `busqueda.md`, mencionar las columnas y el desglose por categoría;
  - correr `test/manual-ayuda.test.js`.
- [x] 5.2 Agregar a `CLAUDE.md` un párrafo sobre la clasificación funcional (`categorias`/`subcategorias`, asignada por `grupos.subcategoria` y derivada en `sqlBienes`; `aparte`; el reporte usa `bienes_buscar_agrupado` y lleva a la búsqueda con `filtro`). Correr `npm test` y `npm run build`.
