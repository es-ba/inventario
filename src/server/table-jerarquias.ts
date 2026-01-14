"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function jerarquias(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name:'jerarquias',
        elementName:'jerarquia',
        title:'Jerarquias',
        editable:admin,
        fields:[
            {name:'jerarquia'  , typeName:'text' , nullable:false},
            {name:'sigla'      , typeName:'text'},
            {name:'descripcion', typeName:'text'},
        ],
        primaryKey:['jerarquia'],
        constraints:[
            {constraintType:'unique', fields:['jerarquia']}
        ],
        sortColumns:[{column:'jerarquia', order:1}]
    };
}
