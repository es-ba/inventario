# Design

## Context

- El organigrama es la tabla `sectores` (`pertenece_a`). En los datos de desarrollo tiene 104 sectores (86 activos), 6 niveles (DE → DG → SDG → DIR → DEP → DIV) y 9 raíces: la DE y algunas sueltas.
- El reporte actual (`reporte_bienes_por_sector`, grilla de backend-plus) calcula en SQL, por sector, los bienes propios, los «con dependientes» y las personas propias y con subsectores. Lo hace con el CTE `ARBOL_DE_SECTORES` y `perteneceASql` (`reportes-bienes.ts`). No sabe de estados, de «en uso» ni de categorías.
- La búsqueda filtra por `grupoFiltro`: una lista de partes `{dimension, valor}` que el servidor aplica como igualdad (o `IS NULL`) sobre el `valor` de cada dimensión (`bienes-busqueda-query.ts`).
- `sector_pertenece(sector, ancestro)` ya existe en la base (`install/sector_pertenece.sql`): es recursiva y llega hasta 10 niveles.
- El reporte por categoría ya resuelve la tabla, el paso a la búsqueda y la descarga con filtros previos: `useReporteDeCategorias`, `VistaDelReporte`, `descargarReporte`, `filtroDeCelda` y `hashDeBusqueda`.

Ver proposal.md para la motivación y la spec `reporte-por-sector` para el comportamiento.

## Goals / Non-Goals

**Goals:**
- Cada número del árbol es el mismo que da la búsqueda con ese filtro, igual que en el reporte por categoría.
- Ningún nivel, tipo de sector ni estado escrito en el código: la forma del árbol sale de `sectores` y las columnas de `estados_bien`.
- El filtro de rama queda disponible para los changes de parque tecnológico y cobertura.

**Non-Goals:**
- Cambiar el SQL ni el alcance de `reporte_bienes_por_sector`.
- Recalcular el árbol en el servidor.

## Decisions

**1. Las cantidades salen de una sola consulta agrupada, y el árbol se arma en el cliente.**

La pantalla pide `bienes_buscar_agrupado` (activos) por `['sector', 'estado', 'en_uso']` y obtiene, para cada sector, sus bienes propios por estado y en uso. Con la tabla `sectores` arma el árbol y suma cada rama hacia arriba: `rama(s) = propios(s) + Σ rama(hijo)`.

- Cada bien cuenta una sola vez, en su sector, así que la suma de las raíces más «Sin sector» es el total de activos, y la RLS se respeta porque la consulta pasa por la búsqueda.
- Los números son los mismos que da la búsqueda, porque salen de la misma consulta base.
- Con un árbol de ~100 sectores, sumar en el cliente es trivial.
- Alternativa descartada: ampliar `sqlBienesPorSector` con estados y en uso. Duplicaría en otro SQL las reglas de la búsqueda (activos, en uso, estados del catálogo) y los números podrían diferir.

**2. Las personas salen de `reporte_bienes_por_sector`.**

Esa definición ya trae `personas` por sector. La pantalla la lee con `table_data` y suma la rama en el cliente, igual que los bienes. Así no hay otra consulta de responsables.

**3. Filtro de rama: una dimensión de sólo filtro en `ESPECIALES`.**

Se agrega `sector_rama`:
- su comparación para `grupoFiltro` es `sector_pertenece(nullif(btrim(b.sector), ''), $valor)`, en lugar de la igualdad;
- el tipo de dimensión gana dos campos opcionales: `filtro(parámetro)`, que devuelve la condición, y `soloFiltro`, que la saca del catálogo que ven el Resumen, el desglose y «Es alguno de»;
- el `sql` de la dimensión queda en el mapa, así `grupoFiltro` la encuentra.

En `bienes-busqueda-query.ts`, el bucle de `grupoFiltro` usa `filtro` cuando la dimensión lo trae y el valor no es nulo; si no, sigue con la igualdad.

Alternativa descartada: pasar a la búsqueda la condición «Sector es alguno de [códigos de la rama]». No toca el servidor, pero la condición muestra decenas de códigos, que un gerente no puede leer. Además obligaría a que el hash lleve condiciones además del `grupoFiltro`.

**4. Lógica pura en `principal/sectores/organigrama-datos.ts`, con test.**

- Armado del árbol: raíces, hijos ordenados por sigla, protección contra ciclos y padres inexistentes (un padre que no está queda como raíz).
- Suma de ramas, ocultar inactivos sin bienes, la fila «Sin sector» y el porcentaje sobre el total general.
- Aplanado para el buscador y camino de ancestros para abrir el árbol hasta un área.

Reusa los tipos y criterios de `categorias-datos.ts` (`Cuenta`, columnas de estado con orden y «Otros», `EN_USO`), para que los estados se vean igual en los dos reportes.

**5. Pantalla `ws-sectores.tsx` + `principal/sectores/bienes-por-sector.tsx`.**

- **Tabla de MUI con sangría por nivel.** Las ramas abiertas se guardan en el estado de la pantalla, y al entrar se abren los niveles 0 y 1.
- **Columnas:**
  - Área (sigla y nombre; el inactivo con marca);
  - Propios;
  - Con subsectores, con barra y %;
  - Personas (con subsectores);
  - los estados;
  - «En uso», con el separador de siempre.
- **Números:** se arman con `filtroDeCelda` y `hashDeBusqueda`, con el filtro previo `sector_rama` (o `sector` en Propios). Así el chip de la búsqueda dice «sector y subsectores: <sigla>».
- **Detalle:** al tocar el nombre se muestra el detalle, con solapas «Con subsectores» y «Sólo el área», que reusa `useReporteDeCategorias`, `VistaDelReporte` y `descargarReporte`. El árbol queda montado y oculto, como la lista en «Bienes por responsable», para no perder lo abierto.
- **Buscador:** un `Autocomplete` sobre el árbol aplanado. Al elegir, abre los ancestros, marca la fila y la lleva a la vista.
- **Teléfono:** sólo área, con subsectores y barra; los estados se ven en el detalle.

**6. Menú.**

La entrada de la grilla (`reporte_bienes_por_sector`) se reemplaza por la de la pantalla, en el mismo lugar. La definición queda: la usa la pantalla para las personas.

## Risks / Trade-offs

- [`sector_pertenece` es recursiva y se evalúa por fila] → Son unos 4.000 activos y a lo sumo 6 niveles. Si la búsqueda con este filtro se nota lenta, se reemplaza por un `IN` sobre la rama calculada una vez (CTE recursivo).
- [Personas incompletas: hay responsables sin sector] → La columna cuenta las personas con sector, como el reporte actual. La ayuda lo aclara.
- [Un rol con visibilidad restringida ve sólo sus bienes, y las personas pueden venir limitadas por las policies de `responsables`] → Es la misma RLS que la búsqueda y que el reporte actual. La pantalla lo aclara («bienes que podés ver»).
- [Un sector con `pertenece_a` mal cargado (ciclo o padre inexistente)] → El armado lo corta y lo muestra como raíz, sin perder sus bienes.

## Migration Plan

Sin cambios en la base: `sector_pertenece` ya existe en producción. Se despliega con `npm run build`. Para volver atrás se revierte el commit y vuelve la entrada de la grilla al menú.
