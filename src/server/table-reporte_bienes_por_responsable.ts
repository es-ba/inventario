"use strict";

import {TableDefinition, TableContext} from "./types-principal";
import {sqlBienesPorResponsable} from "./reportes-bienes";

/*
    Reporte: bienes por responsable.

    Un responsable puede tener bienes en más de un área, así que se agrupa sólo por
    responsable y las áreas se cuentan como distintas en vez de abrir una fila por
    combinación.
*/
export function reporte_bienes_por_responsable(_context:TableContext):TableDefinition{
    return {
        name:'reporte_bienes_por_responsable',
        elementName:'responsable',
        title:'Bienes por responsable',
        editable:false,
        allow:{insert:false, update:false, delete:false, deleteAll:false},
        fields:[
            {name:'responsable'        , typeName:'text'   , title:'responsable'},
            {name:'cantidad'           , typeName:'bigint' , title:'bienes'},
            {name:'cantidad_alta'      , typeName:'bigint' , title:'en alta'},
            {name:'cantidad_baja'      , typeName:'bigint' , title:'en baja'},
            {name:'areas'              , typeName:'bigint' , title:'áreas'},
            {name:'sedes'              , typeName:'bigint' , title:'sedes'},
        ],
        primaryKey:['responsable'],
        // Apellido y nombre van en columnas propias, no concatenados con el código.
        foreignKeys:[
            {references:'responsables', fields:['responsable'], displayFields:['apellido', 'nombre']},
        ],
        detailTables:[
            {table:'reporte_bienes_listado', fields:['responsable'], abr:'B', label:'Bienes del responsable'},
        ],
        sortColumns:[{column:'cantidad', order:-1}],
        sql:{
            from:`(${sqlBienesPorResponsable})`,
        },
    };
}
