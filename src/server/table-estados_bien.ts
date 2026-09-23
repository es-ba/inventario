"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function estados_bien(_context:TableContext):TableDefinition{
    return {
        name: 'estados_bien',
        elementName: 'estado_bien',
        title: 'Estados del bien',
        editable: false,
        fields:[
            {name:'estado_bien'      , typeName:'text'},
            {name:'descripcion'      , typeName:'text', isName:true},
        ],
        primaryKey:['estado_bien']
    };
}
