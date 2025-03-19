"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function modalidad_uso(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'modalidad_uso',
        elementName: 'modalidad_uso',
        title: 'Modalidades de uso',
        editable: admin,
        fields:[
            {name:'modalidad_uso' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
            {name:'identificador' , typeName:'text'},
        ],
        primaryKey:['modalidad_uso']
    };
}