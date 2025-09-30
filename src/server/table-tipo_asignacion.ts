"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function tipo_asignacion(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'tipo_asignacion',
        elementName: 'tipo_asignacion',
        title: 'Tipos de asignaciones',
        editable: admin,
        fields:[
            {name:'tipo_asignacion' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
        ],
        primaryKey:['tipo_asignacion']
    };
}