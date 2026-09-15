"use strict";

import {TableDefinition, TableContext} from "./types-principal";
import {reporte_bienes_listado} from "./table-reporte_bienes_listado";
import {sqlBienesConDependientes, sqlBienesSectoresACargo} from "./reportes-bienes";

export function reporte_bienes_dependientes(context:TableContext):TableDefinition{
    const listado = reporte_bienes_listado(context);
    return {
        name:'reporte_bienes_dependientes',
        elementName:'bien',
        title:'Bienes incluyendo subsectores',
        editable:false,
        allow:{insert:false, update:false, delete:false, deleteAll:false},
        fields:[
            {name:'depende_de' , typeName:'text', title:'depende de'},
            {name:'jefe'        , typeName:'text', title:'a cargo de', nullable:true},
            {name:'directo'     , typeName:'boolean', title:'pertenencia directa'},
            ...listado.fields,
        ],
        primaryKey:['depende_de', 'ficha'],
        foreignKeys:[
            ...listado.foreignKeys ?? [],
            {references:'sectores'    , fields:[{source:'depende_de', target:'sector'}],
                alias:'depende_de', displayFields:['sigla']},
            {references:'responsables', fields:[{source:'jefe', target:'responsable'}],
                alias:'jefe', displayFields:['apellido', 'nombre']},
        ],
        sortColumns:[{column:'ficha', order:1}],
        sql:{
            from:`(${sqlBienesConDependientes})`,
        },
    };
}

export function reporte_bienes_sectores_a_cargo(context:TableContext):TableDefinition{
    return {
        ...reporte_bienes_dependientes(context),
        name:'reporte_bienes_sectores_a_cargo',
        title:'Bienes de los sectores a cargo',
        primaryKey:['jefe', 'ficha'],
        sql:{from:`(${sqlBienesSectoresACargo})`},
    };
}
