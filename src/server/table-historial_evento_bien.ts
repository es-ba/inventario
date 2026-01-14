"use strict";

import { TableDefinition, TableContext } from "./types-principal";

export function historial_evento_bien(context: TableContext): TableDefinition {
    var admin = context.user.rol === 'admin';
    var responsable = context.user.rol === 'responsable';

    return {
        name: 'historial_evento_bien',
        elementName: 'evento',
        title: 'Eventos del bien',
        editable: admin || responsable,
        fields: [
            { name: 'ficha', typeName: 'text' },
            { name: 'orden', typeName: 'integer' },
            { name: 'fecha', typeName: 'timestamp', specialDefaultValue: 'now()' },
            { name: 'usuario', typeName: 'text' },
            { name: 'accion', typeName: 'text' },
            { name: 'motivo', typeName: 'text', nullable: true },
            { name: 'origen', typeName: 'text' }
        ],
        primaryKey: ['ficha', 'orden'],
        foreignKeys: [
            { references: 'bienes', fields: ['ficha'] },
        ],
        detailTables:[
            {table:'historial_bienes', fields:['ficha', 'orden'], abr:'His', label:'Historial'},
        ],
        constraints: [
            {
                constraintType: 'unique',
                fields: ['ficha', 'orden'],
            },
        ],
    };
}
