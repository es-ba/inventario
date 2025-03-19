"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function estados(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'estados',
        elementName: 'estado',
        title: 'Estados',
        editable: admin,
        fields:[
            {name:'estado' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
            {name:'identificador' , typeName:'text'},
        ],
        primaryKey:['estado']
    };
}