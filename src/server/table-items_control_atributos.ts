"use strict";

import { TableContext, TableDefinition } from "./types-principal";

export function items_control_atributos(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'items_control_atributos',
        elementName: 'atributo',
        title: 'Atributos de ítems de control',
        editable: admin,
        fields:[
            {name:'item'     , typeName:'text'},
            {name:'atributo' , typeName:'text'},
        ],
        primaryKey:['item'],
        foreignKeys:[
            {references:'items_control'   , fields:['item'], onDelete:'cascade'},
            {references:'bienes_atributos', fields:['atributo'], displayFields:['nombre']},
        ],
        constraints:[
            {constraintType:'unique', fields:['atributo']},
        ],
    };
}
