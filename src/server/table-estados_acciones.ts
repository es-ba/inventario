'use strict';

import {TableDefinition, TableContext} from './types-principal';

export function estados_acciones(context:TableContext):TableDefinition {
    //var puedeEditar = context.forDump || context.puede?.campo?.administrar;
    var admin = context.user.rol==='admin';
    return {
        name:'estados_acciones',
        elementName:'estado_accion',
        editable: admin ,
        fields:[
            {name:'estado'                  , typeName:'text' ,  nullable: false},
            {name:'eaccion'                 , typeName:'text' ,  nullable: false},
            {name:'condicion'               , typeName:'text' ,  nullable: false},
            {name:'estado_destino'          , typeName:'text' ,  nullable: false},
            {name:'eaccion_direccion'       , typeName:'text' ,  nullable: false},
            {name:'nombre_procedure'        , typeName:'text'},
            {name:'nombre_wscreen'          , typeName:'text'},
        ],
        hiddenColumns:['estados__permite_editar_encuesta','estdest__permite_editar_encuesta'],
        primaryKey:['estado','eaccion', 'estado_destino'],
        foreignKeys: [
            {references: 'estados',fields: ['estado']},
            {references: 'acciones',fields: ['eaccion']},
            {references: 'estados',fields: [{source:'estado_destino', target:'estado'}], alias:'estdest'},
        ]
    };
}


