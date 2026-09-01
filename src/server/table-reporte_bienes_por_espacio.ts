"use strict";

import {TableDefinition, TableContext} from "./types-principal";
import {sqlBienesPorEspacio} from "./reportes-bienes";

export function reporte_bienes_por_espacio(_context:TableContext):TableDefinition{
    return {
        name:'reporte_bienes_por_espacio',
        elementName:'espacio',
        title:'Bienes por espacio',
        editable:false,
        allow:{insert:false, update:false, delete:false, deleteAll:false},
        fields:[
            {name:'espacio'      , typeName:'text'   , title:'espacio'},
            {name:'sector'       , typeName:'text'   , title:'sector'},
            {name:'cantidad'     , typeName:'bigint' , title:'bienes'},
            {name:'responsables' , typeName:'bigint' , title:'responsables'},
            {name:'sectores'     , typeName:'bigint' , title:'sectores de los bienes'},
        ],
        primaryKey:['espacio'],
        foreignKeys:[
            {references:'espacios', fields:['espacio'],
                displayFields:['numero', 'denominacion', 'ubicacion']},
            {references:'sectores', fields:['sector'], displayFields:['sigla', 'nombre_sector']},
        ],
        detailTables:[
            {table:'reporte_bienes_listado', fields:['espacio'],
                abr:'B', label:'Bienes en el espacio'},
        ],
        sortColumns:[{column:'cantidad', order:-1}],
        sql:{
            from:`(${sqlBienesPorEspacio})`,
        },
    };
}
