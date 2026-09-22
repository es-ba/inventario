"use strict";

import { TableContext, TableDefinition } from "./types-principal";

export function items_control_grupos(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'items_control_grupos',
        elementName: 'grupo',
        title: 'Grupos de ítems de control',
        editable: admin,
        fields:[
            {name:'item'  , typeName:'text'},
            {name:'grupo' , typeName:'text'},
        ],
        primaryKey:['item','grupo'],
        foreignKeys:[
            {references:'items_control', fields:['item'], onDelete:'cascade'},
            {references:'grupos'       , fields:['grupo'], displayFields:['descripcion']},
        ],
    };
}
