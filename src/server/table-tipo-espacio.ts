"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function tipo_espacio(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'tipo_espacio',
        elementName: 'tipo_espacio',
        title: 'Tipos de Espacios',
        editable: admin,
        fields:[
            {name:'tipo_espacio' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
        ],
        primaryKey:['tipo_espacio']
    };
}