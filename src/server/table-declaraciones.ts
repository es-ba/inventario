"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function declaraciones(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    var responsable = context.user.rol==='responsable';
    return {
        name:'declaraciones',
        elementName:'declaracion',
        title:'Declaraciones',
        editable:admin || responsable,
        fields:[
            {name:'declaracion'      , typeName:'bigint' , nullable:false, editable:false, sequence:{name:'declaracion', firstValue:1}},
            {name:'fecha'            , typeName:'date' , nullable:false},
            {name:'fecha_firma'      , typeName:'date' },
            {name:'firmado_por'      , typeName:'text' },
            {name:'responsable_raiz' , typeName:'text' },
            {name:'area_raiz'        , typeName:'text' },
            {name:'observaciones'    , typeName:'text' },
            {name:'usuario_creacion' , typeName:'text' , nullable:true, editable:false},
            {name:'fecha_creacion'   , typeName:'date' , nullable:true, editable:false},
        ],
        primaryKey:['declaracion'],
        foreignKeys:[
            {references:'responsables', fields:['responsable_raiz']},
            {references:'areas', fields:['area_raiz']},
            {references:'usuarios', fields:[{source:'usuario_creacion' , target:'usuario'}], alias: 'usuario_creacion'},
        ],
        constraints:[
            {constraintType:'unique', fields:['declaracion']}
        ],
        detailTables:[
            {table:'declaraciones_bienes', fields:['declaracion'], abr:'B', label:'Bienes'}
        ],
        sortColumns:[{column:'fecha', order:-1}]
    };
}
