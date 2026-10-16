# Tasks

## 1. Modelo como dimensión

- [x] 1.1 Agregar a `ESPECIALES` (`bienes-dimensiones.ts`) la dimensión `modelo` (etiqueta «modelo», familia «clasificación», `valor` y `texto` `nullif(regexp_replace(btrim(b.modelo), '\s+', ' ', 'g'), '')`, sin espacios repetidos). Verificar con un caso en `test/bienes-dimensiones.test.js` que está en `disponibles` y en `sql`, y que no queda duplicada.
- [x] 1.2 Mencionar en `principal/ayuda/manual/busqueda.md` que el Resumen y el desglose pueden agrupar por modelo. Verificar con `node --test test/manual-ayuda.test.js`.

## 2. Lógica pura

- [x] 2.1 Crear `src/client/principal/modelos/modelos-datos.ts`, con su test `test/modelos-reporte.test.js`. Debe:
  - armar el árbol categoría → subcategoría → marca → modelo desde las filas por `['subcategoria', 'marca', 'modelo', 'estado', 'en_uso']` y los catálogos `subcategorias` y `categorias`, con «Sin categoría», «(sin marca)» y «(sin modelo)», la marca sin código, el orden por cantidad y el porcentaje sobre el total;
  - sumar estados y en uso reusando `criterioDeEstados`, `cuentaVacia`, `sumar` y `sumarCuentas`;
  - colgar y sumar hacia arriba los atributos desde las filas por `['subcategoria', 'marca', 'modelo', 'atributo:<clave>']`, sin nulos y de mayor a menor.

  Casos: suma de modelos = marca = subcategoría = categoría = total, un estado sin orden va a «Otros», nulos de marca o modelo, un atributo sin valores no aparece, y la suma de atributos de una marca.
- [x] 2.2 Agregar a `modelos-datos.ts`:
  - el filtro de texto (modelos que coinciden sin acentos, con sus ancestros abiertos);
  - las partes de cada celda (nivel, estado, en uso, valor de atributo, con el área y la categoría elegidas), sin pasar de 5 partes;
  - el CSV con una fila por modelo y los atributos en texto.

  Verificar en el test:
  - la celda «modelo + estado» con área arma 5 partes, y la de un valor de atributo también;
  - `hashDeBusqueda` y `grupoFiltroDesdeTexto` hacen ida y vuelta;
  - el CSV tiene BOM y los mismos números.

## 3. Pantalla «Bienes por marca y modelo»

- [x] 3.1 Crear `src/client/ws-modelos.tsx` (wScreen `bienes_por_modelo`, `PantallaInventario` con `ayuda="modelos"`) y `principal/modelos/bienes-por-modelo.tsx`. Debe:
  - leer `categorias`, `subcategorias`, `estados_bien`, `bienes_atributos` y `sectores` con `leerTabla`;
  - pedir la consulta de cantidades y una por atributo, en paralelo y con secuencia contra respuestas viejas, con los filtros de área (`sector_rama`) y categoría;
  - dibujar el árbol con sangría (categorías cerradas al entrar) y las columnas nombre / cantidad con barra y % / estados / En uso (separador), y los atributos en una línea debajo de cada fila (3 valores por atributo como enlaces, el resto en `title`);
  - tener el buscador de marca o modelo y «Descargar»;
  - en el teléfono, mostrar sólo nombre, cantidad y barra.

  Importarla desde `ws-principal.tsx`. Verificar que `npm run build` no muestra errores de webpack y que `dist/client/client/ws-principal.js` es el bundle (~1 MB).
- [x] 3.2 En `app-principal.ts`, reemplazar en «reportes» la entrada `parque_tecnologico` por `{menuType:'bienes_por_modelo', name:'bienes_por_modelo', label:'bienes por marca y modelo'}`, en el mismo lugar. Verificar que `npx tsc -p tsconfig-server.json` compila.

## 4. Ayuda y documentación

- [x] 4.1 Escribir `principal/ayuda/manual/modelos.md`. Debe explicar:
  - el árbol, las columnas y los atributos (sólo los que tienen valores, y que las especificaciones de las computadoras están en el texto del modelo);
  - los filtros de área, categoría y texto;
  - el paso a la búsqueda y la descarga.

  Listarla en `manual.ts` con su captura `img/modelos.jpg`, a 1000×680 y con nombres de personas desenfocados, poniendo antes una imagen provisoria para que webpack no falle. Sacar «parque tecnológico» de `grillas.md`. Verificar con `node --test test/manual-ayuda.test.js`.
- [x] 4.2 Agregar a `CLAUDE.md` un párrafo sobre el reporte por modelo:
  - consulta de cantidades por 5 dimensiones y categoría deducida de la subcategoría;
  - una consulta por atributo;
  - dimensión `modelo`;
  - filtros como `grupoFiltro`;
  - reemplazo de la grilla `parque_tecnologico` en el menú.

  Verificar releyéndolo contra el código.

## 5. Verificación integrada

- [x] 5.1 Contra la base de prueba (cluster de `local-test-pg` con el dump nuevo), comprobar en el navegador:
  - el total coincide con los activos;
  - el total de una subcategoría y el de un modelo coinciden con la búsqueda;
  - tocar un valor de atributo de un modelo de tablet abre la búsqueda con el mismo número;
  - con un área elegida, los números coinciden con la búsqueda de esa área;
  - el buscador encuentra un modelo;
  - medir el tiempo de carga con y sin área;
  - a ancho de teléfono no hay desplazamiento horizontal.
- [x] 5.2 Correr los tests de lo tocado (`bienes-dimensiones`, `modelos-reporte`, `sectores-reporte`, `categorias-reporte`, `manual-ayuda`) y `npm run build`, y verificar que no hay errores nuevos.

## Workflow follow-up

- Mejora posible después: un catálogo de modelos con especificaciones (procesador, RAM, disco, año) para agrupar las computadoras por capacidad.
- Siguiente change de la dirección: `cobertura-de-bienes`.
