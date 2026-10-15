"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function categorias(context:TableContext):TableDefinition{
    return {
        name:'categorias',
        elementName:'categoría',
        title:'Categorías',
        editable:context.es.administrativo,
        fields:[
            {name:'categoria'  , typeName:'text'   , title:'categoría'},
            {name:'nombre'     , typeName:'text'   , isName:true},
            {name:'incluye'    , typeName:'text'   , nullable:true},
            {name:'orden'      , typeName:'integer', nullable:true},
            {name:'aparte'     , typeName:'boolean', nullable:false, defaultValue:false,
                description:'se muestra por separado en el reporte y no suma al total principal'},
        ],
        primaryKey:['categoria'],
        detailTables:[
            {table:'subcategorias', fields:['categoria'], abr:'Sub', label:'subcategorías'},
        ],
        sortColumns:[{column:'orden'}, {column:'categoria'}],
    };
}
