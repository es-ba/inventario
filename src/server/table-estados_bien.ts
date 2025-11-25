"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function estados_bien(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'estados_bien',
        elementName: 'estado_bien',
        title: 'Estados del bien',
        editable: admin,
        fields:[
            {name:'estado' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
            {name:'identificador' , typeName:'text'},
        ],
        primaryKey:['estado']
    };
}