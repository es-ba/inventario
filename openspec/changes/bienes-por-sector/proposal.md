# Proposal

## Why

El director ejecutivo tiene que decidir cómo asignar los bienes y qué comprar, y para eso necesita verlos por la estructura del instituto: qué tiene cada dirección, sumando sus subsectores, y en qué estado. Hoy el reporte por sector es una grilla plana de backend-plus: muestra cada sector suelto, sin el árbol del organigrama, y no permite ver qué bienes son (por categoría) ni llegar a ellos. Además, ninguna pantalla puede filtrar «un sector y todos sus subsectores»: el filtro de la búsqueda sólo compara por igualdad. Por eso quedó afuera, en «Bienes por responsable», ver por categoría los bienes de los sectores a cargo con subsectores.

Este change es el primero de tres para la dirección: bienes por sector (organigrama), parque tecnológico y cobertura (metas por área). Los otros dos usan el filtro de rama que se agrega acá.

## What Changes

- **Pantalla nueva «Bienes por sector»**, en «reportes», para todos los roles (cada uno ve los bienes que la RLS le deja ver):
  - el organigrama como árbol desplegable, de la Dirección Ejecutiva hacia abajo, con las raíces sueltas que existan;
  - por área: bienes propios, bienes con subsectores (con barra y % del total), personas, y la cantidad por estado del bien y «En uso», todo con subsectores;
  - una fila «Sin sector» para los bienes activos sin sector;
  - los sectores inactivos aparecen sólo si tienen bienes, marcados como inactivos;
  - un buscador de área por sigla o nombre, que abre el árbol hasta el área encontrada;
  - tocar un número abre la búsqueda con esos bienes;
  - tocar un área muestra sus bienes por categoría y subcategoría, con la tabla del reporte por categoría, eligiendo entre «Con subsectores» y «Sólo el área», con su descarga.
- **Filtro de rama**: la búsqueda (y el reporte por categoría) aceptan «sector y subsectores» como parte de su filtro (`grupoFiltro`). Se muestra en «Filtros aplicados» como «sector y subsectores: <sigla>».
- **Menú**: la grilla de backend-plus «bienes por sector» deja de ofrecerse en «reportes», como se hizo con «bienes por responsable»; la definición queda.
- Fuera de alcance:
  - columnas por categoría en el árbol (el detalle por categoría está al tocar el área);
  - la solapa «sectores a cargo con subsectores» en «Bienes por responsable» (una persona puede ser responsable de varios sectores, y el filtro de rama toma uno);
  - el parque tecnológico y la cobertura, que son los changes siguientes.

## Capabilities

### New Capabilities
- `reporte-por-sector`: el organigrama con los bienes de cada área (propios y con subsectores, por estado y en uso), el detalle por categoría de un área, y el filtro de rama «sector y subsectores» con el que se llega a la búsqueda.

### Modified Capabilities

## Impact

- Servidor:
  - `bienes-dimensiones.ts`: dimensión de sólo filtro `sector_rama`, que compara con `sector_pertenece` en lugar de igualdad, y no se ofrece para agrupar;
  - `bienes-busqueda-query.ts`: el `grupoFiltro` usa la comparación propia de una dimensión cuando la tiene;
  - `app-principal.ts`: entrada de menú de la pantalla y fuera la de la grilla.
- Cliente:
  - wScreen nueva `ws-sectores.tsx` con `principal/sectores/` (árbol y lógica pura del armado);
  - reusa `useReporteDeCategorias`, `VistaDelReporte` y `descargarReporte` de `bienes-por-categoria.tsx`.
- Ayuda: sección nueva `sectores.md` con su captura; ajuste de `grillas.md`.
- Base: sin cambios. `sector_pertenece` ya existe (`install/sector_pertenece.sql`).
