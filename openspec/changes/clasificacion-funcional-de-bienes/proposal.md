# Proposal

## Why

Un usuario gerencial no puede responder con el sistema preguntas como «¿cuántas computadoras tenemos?» o «¿cuántos dispositivos móviles hay asignados?». La única clasificación por tipo de bien es el `grupo`, y no alcanza:

- **Es demasiado fino y está sucio.** Hay 151 grupos en uso entre 4.039 bienes activos (254 en el catálogo). Las computadoras están repartidas en NOTEBOOK, CPU, COMPUTADORA INTEGRADA, ALL IN ONE e IMAC. Hay duplicados (CAFETERA y CAFETERAS), una marca (TP LINK) y una condición (Comodato).
- **Mezcla bienes con accesorios.** Mouse, teclados, memorias, pendrives, SIM y cargadores suman 625 activos, el 15% del total. Cualquier conteo por grupo los mezcla con los bienes que importan para la gestión.
- **La clasificación contable no sirve para esto.** Rubro/clase/cuenta es el nomenclador patrimonial: sirve para conciliar con Contaduría, no para contar por función. La cuenta 3.6.1 reúne en una sola línea las PC, las impresoras, las notebooks y los escáneres.

El desglose de la búsqueda (`desglose-por-grupo-en-busqueda`) ya muestra cantidades por un campo, pero con 151 grupos el resultado no se puede leer como un reporte.

## What Changes

- **Una clasificación funcional nueva, de dos niveles, que se suma al grupo sin reemplazarlo:**
  - la **categoría**: 22 agrupaciones funcionales (Computadoras, Dispositivos móviles, Mobiliario…), las 18 del clasificador propuesto más ACC Accesorios y componentes, CER Ceremonial, INS Instalaciones y divisiones y HER Herramientas;
  - la **subcategoría**: el nivel fino (CMP-01 Notebook, MOV-02 Tablet…), 101 en total.
- **Cada grupo se asigna a una subcategoría**, y el bien toma la clasificación de su grupo. No se carga nada nuevo en los bienes, y el grupo de cada bien no cambia. La asignación inicial sale de la planilla de equivalencias validada por Patrimonio (`local-clasificacion/equivalencias-grupos.xlsx`).
- **Las categorías se pueden marcar como «aparte».** En el reporte, las categorías aparte se muestran por separado y no se suman al total principal; en la búsqueda se tratan igual que las demás. Ninguna sale marcada: a pedido del usuario, Accesorios y componentes se muestra junto a las demás.
- **Pantalla nueva «Bienes por categoría»**, en «reportes», para todos los roles:
  - una tabla con una fila por categoría, que se abre en sus subcategorías;
  - columnas: total y cantidad por estado del bien (asignado, sin asignar, en movimiento, baja en trámite);
  - una barra que muestra el peso de cada categoría;
  - las categorías aparte, debajo, con su propio subtotal, y el total general al pie;
  - un filtro opcional por sector;
  - tocar cualquier número abre la búsqueda de bienes con ese filtro, para ver qué bienes son;
  - un botón para descargar la tabla.
- **En la búsqueda de bienes:**
  - la categoría y la subcategoría aparecen como columnas, campos de filtro (con «Es alguno de») y campos del Resumen;
  - el desglose arranca por «categoría»;
  - la búsqueda rápida también encuentra por el nombre de la subcategoría y de la categoría («notebook», «computadoras»).
- **En la ficha del bien**, la categoría y la subcategoría se muestran junto al grupo, sin poder editarse.
- **Los catálogos de categorías y subcategorías y la asignación de cada grupo** se administran desde «gestion de datos».
- **El estado del bien gana una etiqueta corta y un orden** (`estados_bien`), para titular las columnas del reporte sin escribir los estados en el código.
- Fuera de alcance:
  - limpiar el catálogo de grupos o corregir el grupo de bienes puntuales: se hace como dato, con la planilla;
  - asignar la subcategoría bien por bien, distinta de la de su grupo (ver design.md, decisión 1);
  - la partida presupuestaria: la conciliación sigue con rubro/clase/cuenta;
  - atributos específicos por subcategoría (IMEI, línea, dominio);
  - incluir los subsectores en el filtro por sector del reporte.

## Capabilities

### New Capabilities
- `clasificacion-de-bienes`: catálogos de categorías y subcategorías, la asignación de cada grupo a una subcategoría y la clasificación de cada bien que resulta de su grupo, en la ficha y en la búsqueda.
- `reporte-por-categoria`: la pantalla «Bienes por categoría», con las cantidades por categoría, subcategoría y estado, y el paso a la búsqueda desde cada número.

### Modified Capabilities

## Impact

- Base:
  - tablas nuevas `categorias` y `subcategorias`;
  - columna `subcategoria` en `grupos`;
  - columnas `etiqueta` y `orden` en `estados_bien`;
  - los `.tab` de los catálogos van en `install/`, y la asignación en `grupos.tab` de `inventario-data/provisorio`;
  - para producción, `install/cambios/cambios_<fecha>.sql`.
- Servidor:
  - `table-categorias.ts` y `table-subcategorias.ts` (nuevos), `table-grupos.ts` y `table-estados_bien.ts`;
  - en `table-bienes.ts`, las columnas derivadas en `sqlBienes` y los campos con `inTable:false`;
  - las dimensiones en `bienes-dimensiones.ts` y la búsqueda rápida en `bienes-busqueda-query.ts`;
  - el menú en `app-principal.ts`.
- Cliente:
  - la wScreen nueva `ws-categorias.tsx` con `principal/categorias/`;
  - `desglose-datos.ts`, `columnas-busqueda.ts` y `ws-principal.tsx` para abrir la búsqueda con un filtro;
  - la ficha (`bien-formulario.tsx`).
- Manual: sección nueva `categorias.md` y una mención en `busqueda.md`.
- Sin procedures nuevos: el reporte usa `bienes_buscar_agrupado`.
