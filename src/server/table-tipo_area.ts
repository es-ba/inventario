"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function tipo_area(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'tipo_area',
        elementName: 'tipo_area',
        title: 'Tipos de areas',
        editable: admin,
        fields:[
            {name:'tipo_area' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
        ],
        primaryKey:['tipo_area']
    };
}