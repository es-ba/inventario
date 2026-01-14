"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function bienes_atributo_valores(context:TableContext):TableDefinition{
    var admin = context.user.rol === 'admin';
    return {
        name:'bienes_atributo_valores',
        elementName:'valor',
        title:'Valores posibles',
        editable:admin,
        fields:[
            {name:'atributo', typeName:'text'},
            {name:'valor'   , typeName:'text'},
            {name:'orden'   , typeName:'integer', nullable:true},
        ],
        primaryKey:['atributo','valor'],
        foreignKeys:[
            {references:'bienes_atributos', fields:['atributo']}
        ]
    };
}
