"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function estados_declaracion(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name:'estados_declaracion',
        elementName:'estado_declaracion',
        title:'Estados de declaración',
        editable:admin,
        fields:[
            {name:'estado_declaracion' , typeName:'text'    , nullable:false},
            {name:'descripcion'        , typeName:'text'    , nullable:true},
            {name:'orden'              , typeName:'integer' , nullable:true},
        ],
        primaryKey:['estado_declaracion'],
        sortColumns:[{column:'orden'}],
    };
}
