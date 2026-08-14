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
            // nullable:true porque la secuencia la resuelve el servidor: si se declara
            // nullable:false, la grilla lo toma como obligatorio y nunca deja grabar la
            // fila nueva. La PK garantiza el NOT NULL en la base igual.
            {name:'declaracion'      , typeName:'bigint' , nullable:true, editable:false, sequence:{name:'declaracion', firstValue:1}},
            {name:'fecha'            , typeName:'date' , nullable:false},
            {name:'fecha_firma'      , typeName:'date' },
            {name:'firmado_por'      , typeName:'text' },
            {name:'responsable'      , typeName:'text' },
            {name:'area'             , typeName:'text' },
            {name:'observaciones'    , typeName:'text' },
            // defaultValue completa el valor en el cliente al crear la fila; defaultDbValue
            // cubre los inserts que no pasan por la grilla.
            {name:'estado'           , typeName:'text' , nullable:false, editable:false, defaultValue:'BORRADOR', defaultDbValue:"'BORRADOR'"},
            {name:'motivo_observacion', typeName:'text', nullable:true},
            {name:'acciones'         , typeName:'text' , editable:false, clientSide:'accionesDeclaracion'},
            {name:'usuario_creacion' , typeName:'text' , nullable:true, editable:false},
            {name:'fecha_creacion'   , typeName:'date' , nullable:true, editable:false},
        ],
        primaryKey:['declaracion'],
        foreignKeys:[
            {references:'responsables', fields:['responsable']},
            {references:'areas', fields:['area']},
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
