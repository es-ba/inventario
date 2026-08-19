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
            // isName para que los selectores muestren el cargo y no sólo su código: la
            // jerarquía es lo que se imprime como "en su carácter de" en los documentos.
            {name:'descripcion', typeName:'text', isName:true},
        ],
        primaryKey:['jerarquia'],
        constraints:[
            {constraintType:'unique', fields:['jerarquia']}
        ],
        sortColumns:[{column:'jerarquia', order:1}]
    };
}
