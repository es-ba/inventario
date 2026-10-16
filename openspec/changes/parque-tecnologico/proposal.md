# Proposal

## Why

Para decidir compras y reasignaciones, el director ejecutivo necesita saber cuántos bienes hay de cada marca y modelo, y con qué atributos (memoria, almacenamiento, accesorios). Hoy la única vista es la grilla «parque tecnológico»:
- es un listado plano, bien por bien;
- su alcance sale de la clasificación contable (rubro 3, clases 4 y 6), que está sucia: de sus 2.202 activos, 213 son libros y 543 accesorios;
- no agrupa por marca ni por modelo, no muestra los atributos agregados y no permite elegir un área.

El reporte por categoría y el organigrama ya cuentan por categoría y por área, pero ninguno baja a marca y modelo. Este es el segundo de los tres changes para la dirección; usa el filtro de rama que agregó `bienes-por-sector`.

## What Changes

- **Pantalla nueva «Bienes por marca y modelo»**, en «reportes», para todos los roles (cada uno ve los bienes que la RLS le deja ver), sobre todo el inventario activo:
  - un árbol categoría → subcategoría → marca → modelo, con la cantidad, una barra con su porcentaje, la cantidad por estado y, separada al final, «En uso»;
  - debajo de cada fila, la distribución de los valores de cada atributo cargado en esos bienes (por ejemplo «Memoria RAM: 8 GB 60 · 16 GB 20»), sumada en cada nivel; sólo aparecen los atributos que tienen algún valor;
  - filtros por área (con sus subsectores) y por categoría, y un buscador de marca o modelo;
  - tocar un número, o un valor de atributo, abre la búsqueda con esos bienes;
  - descarga de la tabla, con una fila por modelo.
- **Modelo como dimensión**: el modelo (texto libre) pasa a ser un campo por el que se puede agrupar y filtrar. También aparece en el Resumen y en el desglose de la búsqueda, y con «Es alguno de».
- **Menú**: la entrada «parque tecnológico» (grilla de backend-plus) se reemplaza por la pantalla nueva; la definición queda.
- Fuera de alcance:
  - un catálogo de modelos con sus especificaciones; hoy las de las computadoras (procesador, RAM, disco) están escritas dentro del texto del modelo y no se pueden agrupar;
  - limpiar o unificar los textos de modelo (por ejemplo, el mismo modelo escrito de dos formas);
  - la cobertura (metas por área), que es el change siguiente.

## Capabilities

### New Capabilities
- `reporte-por-modelo`: los bienes activos por categoría, subcategoría, marca y modelo, con estados, en uso y la distribución de sus atributos, filtrables por área y categoría, con paso a la búsqueda y descarga.

### Modified Capabilities

## Impact

- Servidor:
  - `bienes-dimensiones.ts`: dimensión `modelo` en `ESPECIALES`;
  - `app-principal.ts`: entrada del menú.
- Cliente:
  - wScreen nueva `ws-modelos.tsx` con `principal/modelos/` (árbol y lógica pura);
  - reusa piezas del reporte por categoría (`Cantidad`, `Barra`, `CeldasDeEstado`, `destinoDe`, `criterioDeEstados`), `opcionesDeSectores` y el filtro de rama.
- Ayuda: sección nueva `modelos.md` con su captura; ajuste de `grillas.md` y `busqueda.md` (modelo en el Resumen).
- Base: sin cambios.
- Rendimiento: una consulta agrupada para las cantidades y una por atributo, en paralelo, cada vez que cambia un filtro.
