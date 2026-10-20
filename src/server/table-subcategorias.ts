"use strict";

import {TableDefinition, TableContext} from "./types-principal";
import {puedeElRol} from "./capacidades-roles";

export function subcategorias(context:TableContext):TableDefinition{
    return {
        name:'subcategorias',
        elementName:'subcategoría',
        title:'Subcategorías',
        editable:!!context.forDump || puedeElRol(context.user?.rol, 'puede_gestionar_datos'),
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
            {table:'grupos', fields:['subcategoria'], abr:'G', label:'grupos equivalentes'},
        ],
        sortColumns:[{column:'subcategoria'}],
    };
}
