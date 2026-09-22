"use strict";

import { TableContext, TableDefinition } from "./types-principal";

export function items_control_opciones(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'items_control_opciones',
        elementName: 'opcion',
        title: 'Opciones de ítems de control',
        editable: admin,
        fields:[
            {name:'item'  , typeName:'text'},
            {name:'valor' , typeName:'text'},
            {name:'orden' , typeName:'integer', nullable:true},
        ],
        primaryKey:['item','valor'],
        foreignKeys:[
            {references:'items_control', fields:['item'], onDelete:'cascade'},
        ],
        sortColumns:[{column:'item', order:1}, {column:'orden', order:1}],
    };
}
