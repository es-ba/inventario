"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function estados(context:TableContext):TableDefinition {
    var admin = context.user.rol==='admin';
    return {
        name:'estados',
        elementName:'estado',
        editable:admin,
        fields:[
            {name:'estado'                       , typeName:'text',  nullable: false},
            {name:'desc_estado'                  , typeName:'text'},
            {name:'orden_estado'                 , typeName:'text'},
            {name:'permite_asignar'              , typeName:'boolean', nullable:false, defaultDbValue:'false'},
            {name:'permite_editar_encuesta'      , typeName:'boolean', nullable:false, defaultDbValue:'true', isName:true},
            {name:'estado_al_asignar'            , typeName:'text'   },
        ],
        sortColumns:[{column:'orden_estado'}],
        hiddenColumns:['estado_al_asignar__permite_editar_encuesta'],
        primaryKey:['estado'],
        detailTables: [
            {table: "estados_acciones", fields: ["estado"], abr: "a", label:"acciones"}
        ],
    };
}