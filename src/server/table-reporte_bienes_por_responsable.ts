"use strict";

import {TableDefinition, TableContext} from "./types-principal";
import {sqlBienesPorResponsable, VINCULOS_CON_EL_BIEN} from "./reportes-bienes";

export function reporte_bienes_por_responsable(_context:TableContext):TableDefinition{
    return {
        name:'reporte_bienes_por_responsable',
        elementName:'responsable',
        title:'Bienes por responsable',
        editable:false,
        allow:{insert:false, update:false, delete:false, deleteAll:false},
        fields:[
            {name:'responsable'        , typeName:'text'   , title:'responsable'},
            ...VINCULOS_CON_EL_BIEN.map(vinculo => (
                {name:vinculo.contador, typeName:'bigint' as const, title:vinculo.titulo}
            )),
            {name:'personas_dependientes', typeName:'bigint', title:'personas a cargo'},
            {name:'cantidad_sector', typeName:'bigint', title:'directos en sectores a cargo'},
            {name:'cantidad_dependientes', typeName:'bigint' , title:'sectores a cargo incluyendo subsectores'},
            {name:'sectores'              , typeName:'bigint' , title:'sectores'},
            {name:'sedes'              , typeName:'bigint' , title:'sedes'},
        ],
        primaryKey:['responsable'],
        foreignKeys:[
            {references:'responsables', fields:['responsable'], displayFields:['apellido', 'nombre']},
        ],
        detailTables:[
            ...VINCULOS_CON_EL_BIEN.map(vinculo => ({
                table:'reporte_bienes_listado',
                fields:[{source:'responsable', target:vinculo.columna}],
                abr:vinculo.detalle.abr,
                label:vinculo.detalle.label,
            })),
            {table:'reporte_bienes_sectores_a_cargo', fields:[{source:'responsable', target:'jefe'}, {target:'directo', value:true}],
                abr:'Dir', label:'Bienes directos de sectores a cargo'},
            {table:'reporte_bienes_sectores_a_cargo', fields:[{source:'responsable', target:'jefe'}],
                abr:'Dep', label:'Bienes de sectores a cargo incluyendo subsectores'},
        ],
        sortColumns:[{column:'cantidad', order:-1}],
        sql:{
            from:`(${sqlBienesPorResponsable})`,
        },
    };
}
