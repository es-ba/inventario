"use strict";

import {TableDefinition, TableContext} from "./types-principal";
import {sqlBienesPorArea} from "./reportes-bienes";

/*
    Reporte: bienes por área.

    Cuenta sólo los bienes en alta: es el patrimonio vigente. Un bien dado de baja
    conserva el área y el responsable que tuvo, y contarlo ahí infla el inventario de un
    sector con cosas que ya no están.

    Es de sólo lectura y no tiene tabla física detrás. Al abrir una fila se puede bajar al
    detalle de los bienes de esa área.
*/
export function reporte_bienes_por_area(_context:TableContext):TableDefinition{
    return {
        name:'reporte_bienes_por_area',
        elementName:'área',
        title:'Bienes por área',
        editable:false,
        allow:{insert:false, update:false, delete:false, deleteAll:false},
        fields:[
            {name:'area'               , typeName:'text'   , title:'área'},
            {name:'cantidad'           , typeName:'bigint' , title:'bienes'},
            {name:'responsables'       , typeName:'bigint' , title:'responsables'},
            {name:'sedes'              , typeName:'bigint' , title:'sedes'},
            {name:'espacios'           , typeName:'bigint' , title:'espacios'},
        ],
        primaryKey:['area'],
        // La sigla la agrega backend-plus como columna aparte, filtrable por sí sola.
        foreignKeys:[
            {references:'areas', fields:['area'], displayFields:['sigla', 'descripcion']},
        ],
        detailTables:[
            {table:'reporte_bienes_listado', fields:['area'], abr:'B', label:'Bienes del área'},
        ],
        sortColumns:[{column:'cantidad', order:-1}],
        sql:{
            from:`(${sqlBienesPorArea})`,
        },
    };
}
