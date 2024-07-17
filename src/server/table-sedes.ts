"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function sedes(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'sedes',
        elementName: 'sede',
        title: 'Sedes',
        editable: admin,
        fields:[
            {name:'sede' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
            {name:'identificador' , typeName:'text'},
        ],
        primaryKey:['sede']
    };
}