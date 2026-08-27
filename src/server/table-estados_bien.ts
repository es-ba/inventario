"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function estados_bien(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'estados_bien',
        elementName: 'estado_bien',
        title: 'Estados del bien',
        editable: admin,
        fields:[
            {name:'estado_bien'      , typeName:'text', isName:true},
        ],
        primaryKey:['estado_bien']
    };
}
