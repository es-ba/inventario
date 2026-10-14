# Proposal

## Why

Para una consulta rápida como «¿cuántas notebooks hay?» o «¿cuántos monitores hay?», el usuario escribe la palabra en la búsqueda y mira el total. Ese total no responde la pregunta: la búsqueda rápida trae todo bien que mencione la palabra en cualquier campo. «monitor» da unos 324 bienes, y de esos sólo 116 son del grupo MONITOR; el resto son CPU, mouse o teclados que la nombran en el detalle o la observación. El número correcto existe en el «Resumen», pero está detrás de un botón, arranca agrupado por responsable del sector y hay que saber elegir «grupo». El usuario lo describe como un sistema incómodo para ver cantidades por tipo de bien, grupo o rubro.

## What Changes

- Arriba del listado de la búsqueda aparece un desglose del resultado: un chip por cada valor del campo elegido, con su cantidad, de mayor a menor (por ejemplo `MONITOR 116 · CPU 58 · MOUSE 35 …`).
- El desglose sigue a la búsqueda: toma la pestaña, el texto, las condiciones y los filtros de columna que se estén usando, igual que el Resumen.
- Tocar un chip filtra el listado por ese valor, con el mismo filtro de grupo que ya pone el Resumen (aparece en «Filtros aplicados» y se quita desde ahí). Así el total del listado pasa a ser la respuesta. Con un chip elegido, el desglose sigue mostrando todos los valores y marca el elegido; tocar otro lo reemplaza y tocar el elegido lo quita.
- Un selector «Desglosar por» elige el campo entre los que ya ofrece el Resumen (grupo, rubro, clase, marca, sector, atributos…). Arranca en «grupo», y cada usuario conserva su elección en el navegador.
- El desglose ocupa una sola línea, con los valores más frecuentes primero; el resto se alcanza desplazándola hacia el costado.
- El Resumen sigue como está, para cruzar varios campos.
- Fuera de alcance:
  - contar componentes que vienen dentro de otro bien (por ejemplo, el monitor de un kit de PC): hoy no es un dato, sólo texto libre, y no hay un modelo que lo registre;
  - cambiar qué campos mira la búsqueda rápida;
  - cargar los nombres de los rubros, que es un dato del nomenclador y no un cambio del sistema.

## Capabilities

### New Capabilities
- `listado-de-bienes`: la búsqueda muestra el desglose del resultado por un campo, y un chip del desglose filtra el listado. La capacidad ya tiene requisitos en otros cambios todavía sin archivar (`listado-bienes-simple`, `filtro-bienes-sin-campos-repetidos`, `filtro-bienes-valores-multiples`); por eso no figura en `openspec/specs/` y va como nueva, con requisitos que se suman a aquellos.

### Modified Capabilities

## Impact

- Cliente: `src/client/principal/busqueda-bienes.tsx` (monta el desglose entre «Filtros aplicados» y el listado, y le pasa la consulta sin el filtro de grupo y el filtro de grupo activo); componente nuevo del desglose en `src/client/principal/`; la elección del campo se guarda junto a la de columnas (`columnas-busqueda.ts`).
- Servidor: sin cambios. Usa `bienes_buscar_agrupado` y `bienes_dimensiones_agrupar` tal como están, y el `grupoFiltro` de `bienes_buscar_avanzado`.
- Una consulta agrupada más cada vez que cambia la búsqueda.
