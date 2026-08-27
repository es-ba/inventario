"use strict";

import { TableDefinition } from "./types-principal";

export function historial_bienes(): TableDefinition {
    return {
        name: 'historial_bienes',
        elementName: 'cambio',
        title: 'Historial del bien',
        editable: false,
        allow: {insert: true, update: false, delete: false, deleteAll: false},
        fields: [
            { name: 'ficha', typeName: 'text' },
            { name: 'orden', typeName: 'integer' },
            { name: 'campo', typeName: 'text' },
            { name: 'valor_anterior', typeName: 'text', nullable: true },
            { name: 'valor_nuevo', typeName: 'text', nullable: true },
            { name: 'fecha', typeName: 'timestamp' },
            { name: 'usuario', typeName: 'text' },
            { name: 'accion', typeName: 'text' },
            { name: 'origen', typeName: 'text' },
        ],
        primaryKey: ['ficha', 'orden', 'campo'],
        foreignKeys: [
            {references: 'historial_evento_bien',fields: ['ficha', 'orden']},
        ],
    };
}
