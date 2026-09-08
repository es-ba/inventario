"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function acciones_movimiento(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'acciones_movimiento',
        elementName: 'accion_movimiento',
        title: 'Acciones de movimiento',
        editable: admin,
        fields:[
            {name:'accion_movimiento' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
        ],
        primaryKey:['accion_movimiento']
    };
}
