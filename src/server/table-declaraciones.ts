"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function declaraciones(context:TableContext):TableDefinition{
    return {
        name:'declaraciones',
        elementName:'declaracion',
        title:'Declaraciones',
        editable:context.es.administrativo,
        fields:[
            {name:'declaracion'      , typeName:'bigint' , nullable:true, editable:false, sequence:{name:'declaracion', firstValue:1}},
            {name:'fecha'            , typeName:'date' , nullable:false},
            {name:'fecha_firma'      , typeName:'date' },
            {name:'firmado_por'      , typeName:'text' },
            {name:'responsable'      , typeName:'text' },
            {name:'sector'             , typeName:'text' },
            {name:'observaciones'    , typeName:'text' },
            {name:'estado'           , typeName:'text' , nullable:false, editable:false, defaultValue:'BORRADOR', defaultDbValue:"'BORRADOR'"},
            {name:'motivo_observacion', typeName:'text', nullable:true},
            {name:'acciones'         , typeName:'text' , editable:false, clientSide:'accionesDeclaracion'},
            {name:'usuario_creacion' , typeName:'text' , nullable:true, editable:false},
            {name:'fecha_creacion'   , typeName:'date' , nullable:true, editable:false},
        ],
        primaryKey:['declaracion'],
        foreignKeys:[
            {references:'responsables', fields:['responsable']},
            {references:'sectores', fields:['sector']},
            {references:'estados_declaracion', fields:[{source:'estado', target:'estado_declaracion'}]},
            {references:'usuarios', fields:[{source:'usuario_creacion' , target:'usuario'}], alias: 'usuario_creacion'},
        ],
        constraints:[
            {constraintType:'unique', fields:['declaracion']}
        ],
        detailTables:[
            {table:'declaraciones_bienes', fields:['declaracion'], abr:'B', label:'Bienes'},
            {table:'declaraciones_documentos', fields:['declaracion'], abr:'Doc', label:'Documentos'}
        ],
        sortColumns:[{column:'fecha', order:-1}]
    };
}
