"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function bienes_atributos(context:TableContext):TableDefinition{
    var admin = context.user.rol === 'admin';
    return {
        name:'bienes_atributos',
        elementName:'atributo',
        title:'Atributos',
        editable:admin,
        fields:[
            {name:'atributo'   , typeName:'text'},
            {name:'nombre'     , typeName:'text'},
            {name:'tipo_valor' , typeName:'text'},
        ],
        primaryKey:['atributo'],
        constraints:[
            {constraintType:'unique', fields:['atributo']}
        ]
    };
}
