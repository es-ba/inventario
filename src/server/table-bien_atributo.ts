"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function bien_atributo(context:TableContext):TableDefinition{
    var admin = context.user.rol === 'admin';
    return {
        name:'bien_atributo',
        elementName:'atributo',
        title:'Atributos',
        editable:admin,
        fields:[
            {name:'ficha'    , typeName:'text'},
            {name:'atributo' , typeName:'text'},
            {name:'valor'    , typeName:'text'},
        ],
        primaryKey:['ficha','atributo'],
        foreignKeys:[
            {references:'bienes', fields:['ficha']},
            {references:'bienes_atributos', fields:['atributo']},
            {references:'bienes_atributo_valores', fields:['atributo','valor']},
        ]
    };
}
