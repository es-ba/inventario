"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function estados_movimiento(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'estados_movimiento',
        elementName: 'estados_movimiento',
        title: 'Estados de movimientos',
        editable: admin,
        fields:[
            {name:'estado_movimiento' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
            {name:'identificador' , typeName:'text'},
        ],
        primaryKey:['estado_movimiento']
    };
}