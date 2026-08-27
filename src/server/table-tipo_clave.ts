"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function tipo_clave(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'tipo_clave',
        elementName: 'tipo_clave',
        title: 'Tipos de clave',
        editable: admin,
        fields:[
            {name:'tipo_clave' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
        ],
        primaryKey:['tipo_clave']
    };
}
