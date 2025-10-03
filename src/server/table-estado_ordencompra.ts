"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function estado_ordencompra(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'estado_ordencompra',
        elementName: 'estado_ordencompra',
        title: 'Estados de Órden de Compra',
        editable: admin,
        fields:[
            {name:'estado_ordencompra' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
        ],
        primaryKey:['estado_ordencompra']
    };
}