"use strict";

import { TableDefinition, TableContext } from "./types-principal";

export function historial_evento_bien(context: TableContext): TableDefinition {

    return {
        name: 'historial_evento_bien',
        elementName: 'evento',
        title: 'Eventos del bien',
        editable:context.es.administrativo,
        fields: [
            { name: 'ficha', typeName: 'text' },
            { name: 'orden', typeName: 'integer' },
            { name: 'fecha', typeName: 'timestamp', defaultDbValue: 'current_date' },
            { name: 'usuario', typeName: 'text' },
            { name: 'accion', typeName: 'text' },
            { name: 'motivo', typeName: 'text', nullable: true },
            { name: 'origen', typeName: 'text' }
        ],
        primaryKey: ['ficha', 'orden'],
        foreignKeys: [
            { references: 'bienes', fields: ['ficha'] },
        ],
        constraints: [
            {
                constraintType: 'unique',
                fields: ['ficha', 'orden'],
            },
        ],
    };
}
