"use strict";

import {TableDefinition, TableContext} from "./types-principal";
import {reporte_bienes_listado} from "./table-reporte_bienes_listado";
import {sqlBienesConDependientes} from "./reportes-bienes";

export function reporte_bienes_dependientes(context:TableContext):TableDefinition{
    const listado = reporte_bienes_listado(context);
    return {
        name:'reporte_bienes_dependientes',
        elementName:'bien',
        title:'Bienes con dependientes',
        editable:false,
        allow:{insert:false, update:false, delete:false, deleteAll:false},
        fields:[
            {name:'depende_de' , typeName:'text', title:'depende de'},
            {name:'jefe'        , typeName:'text', title:'a cargo de', nullable:true},
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
