# Declaraciones

Una declaración documenta los bienes que un responsable tiene a cargo en un momento dado, para que la firme. Está en **operaciones → declaraciones** y requiere permiso para guardar.

## Circuito

| Estado | Qué significa | Acciones |
|---|---|---|
| **Borrador** | En preparación: la lista de bienes se puede editar. | **emitir**: genera el PDF y congela la lista de bienes. |
| **Emitida** | Documento emitido, pendiente de firma. | **recibir documento**: carga el PDF firmado. **observar**: marca un problema. |
| **Firmada** | Documento firmado y verificado. | **observar** |
| **Observada** | Requiere corrección y una nueva emisión. | **reabrir**: vuelve a Borrador para corregir la lista y emitir una versión nueva. |
| **Anulada** | Sin efecto. | — |

Los botones aparecen en la fila de cada declaración según su estado; al pasar el mouse sobre cada uno se ve qué hace.

Desde la [ficha de un bien](#ayuda/ficha), la solapa **Declaraciones** muestra en cuáles figura.
