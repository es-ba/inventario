"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function tipo_ordencompra(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'tipo_ordencompra',
        elementName: 'tipo_ordencompra',
        title: 'Tipos de Órden de Compra',
        editable: admin,
        fields:[
            {name:'tipo_ordencompra' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
        ],
        primaryKey:['tipo_ordencompra']
    };
}