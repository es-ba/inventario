"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function siper_recepciones(context:TableContext):TableDefinition{
    const admin = context.user.rol === 'admin';
    return {
        name:'siper_recepciones',
        elementName:'recepción de siper',
        title:'recepciones de siper',
        editable:false,
        fields:[
            {name:'recepcion' , typeName:'bigint'   , nullable:false, sequence:{firstValue:1, name:'siper_recepciones_seq'}, title:'recepción'},
            {name:'fecha'     , typeName:'timestamp', nullable:false, defaultDbValue:'current_timestamp'},
            {name:'usuario'   , typeName:'text'},
            {name:'personas'  , typeName:'integer'  , nullable:false},
        ],
        primaryKey:['recepcion'],
        sortColumns:[{column:'recepcion', order:-1}],
        foreignKeys:[
            {references:'usuarios', fields:['usuario']},
        ],
        sql:{
            where:admin || context.forDump ? 'true' : 'false',
        },
    };
}
