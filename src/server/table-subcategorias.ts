"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function subcategorias(context:TableContext):TableDefinition{
    return {
        name:'subcategorias',
        elementName:'subcategoría',
        title:'Subcategorías',
        editable:context.es.administrativo,
        fields:[
            {name:'subcategoria', typeName:'text', title:'subcategoría'},
            {name:'nombre'      , typeName:'text', isName:true},
            {name:'categoria'   , typeName:'text', nullable:false, title:'categoría'},
        ],
        primaryKey:['subcategoria'],
        foreignKeys:[
            {references:'categorias', fields:['categoria']},
        ],
        detailTables:[
            {table:'grupos', fields:['subcategoria'], abr:'G', label:'grupos'},
        ],
        sortColumns:[{column:'subcategoria'}],
    };
}
