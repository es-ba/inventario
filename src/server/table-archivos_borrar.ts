"use strict";

import { TableDefinition } from "./types-principal";

export function archivos_borrar():TableDefinition{
    return {
        editable: true,
        name: 'archivos_borrar',
        fields: [
            {name:'ruta_archivo', typeName:'text'},
        ],
        primaryKey: ['ruta_archivo'],
    };
}
