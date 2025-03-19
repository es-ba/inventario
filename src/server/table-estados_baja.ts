"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function estados_baja(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'estados_baja',
        elementName: 'estados_baja',
        title: 'Estados de baja',
        editable: admin,
        fields:[
            {name:'estado_baja' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
            {name:'identificador' , typeName:'text'},
        ],
        primaryKey:['estado_baja']
    };
}