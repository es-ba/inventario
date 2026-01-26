"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function tipo_accion(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'tipo_accion',
        elementName: 'tipo_accion',
        title: 'Tipo Acción',
        editable: admin,
        fields:[
            {name:'tipo_accion' , typeName:'text'},
            {name:'descripcion' , typeName:'text', isName: true},
        ],
        primaryKey:['tipo_accion'],
        
    };
}