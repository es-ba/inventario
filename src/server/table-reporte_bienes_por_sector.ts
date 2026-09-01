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
            {name:'sectores_dependientes'      , typeName:'bigint' , title:'sectores a cargo'},
            {name:'responsables'       , typeName:'bigint' , title:'responsables'},
            {name:'sedes'              , typeName:'bigint' , title:'sedes'},
            {name:'espacios_propios'      , typeName:'bigint' , title:'espacios del sector'},
            {name:'espacios_dependientes' , typeName:'bigint' , title:'espacios con dependientes'},
            {name:'espacios'              , typeName:'bigint' , title:'espacios ocupados'},
        ],
        primaryKey:['sector'],
        foreignKeys:[
            {references:'sectores', fields:['sector'], displayFields:['nombre_sector', 'sigla']},
        ],
        detailTables:[
            {table:'reporte_bienes_listado', fields:[{source:'sector', target:'sector_responsable'}],
                abr:'B', label:'Bienes del sector'},
            {table:'sectores', fields:[{source:'sector', target:'pertenece_a'}],
                abr:'Sec', label:'Sectores que dependen'},
            {table:'espacios', fields:['sector'],
                abr:'Esp', label:'Espacios del sector'},
            {table:'reporte_bienes_dependientes', fields:[{source:'sector', target:'depende_de'}],
                abr:'Dep', label:'Bienes con dependientes'},
        ],
        sortColumns:[{column:'cantidad', order:-1}],
        sql:{
            from:`(${sqlBienesPorSector})`,
        },
    };
}
