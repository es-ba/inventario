"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function tipo_bien(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'tipo_bien',
        elementName: 'tipo_bien',
        title: 'Tipos de bienes',
        editable: admin,
        fields:[
            {name:'tipo_bien' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
        ],
        primaryKey:['tipo_bien']
    };
}