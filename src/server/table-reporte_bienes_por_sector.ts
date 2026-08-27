"use strict";

import {TableDefinition, TableContext} from "./types-principal";
import {sqlBienesPorSector} from "./reportes-bienes";

export function reporte_bienes_por_sector(_context:TableContext):TableDefinition{
    return {
        name:'reporte_bienes_por_sector',
        elementName:'sector',
        title:'Bienes por sector patrimonial',
        editable:false,
        allow:{insert:false, update:false, delete:false, deleteAll:false},
        fields:[
            {name:'sector'               , typeName:'text'   , title:'sector'},
            {name:'cantidad'           , typeName:'bigint' , title:'en el sector'},
            {name:'cantidad_dependientes'      , typeName:'bigint' , title:'con dependientes'},
            {name:'responsables'       , typeName:'bigint' , title:'responsables'},
            {name:'sedes'              , typeName:'bigint' , title:'sedes'},
            {name:'espacios'           , typeName:'bigint' , title:'espacios'},
        ],
        primaryKey:['sector'],
        foreignKeys:[
            {references:'sectores', fields:['sector'], displayFields:['sigla', 'descripcion']},
        ],
        detailTables:[
            {table:'reporte_bienes_listado', fields:[{source:'sector', target:'sector_responsable'}],
                abr:'B', label:'Bienes del sector'},
            {table:'sectores', fields:[{source:'sector', target:'pertenece_a'}],
                abr:'Sec', label:'Sectores que dependen'},
            {table:'reporte_bienes_dependientes', fields:[{source:'sector', target:'depende_de'}],
                abr:'Dep', label:'Bienes con dependientes'},
        ],
        sortColumns:[{column:'cantidad', order:-1}],
        sql:{
            from:`(${sqlBienesPorSector})`,
        },
    };
}
