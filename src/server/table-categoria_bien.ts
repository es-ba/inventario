"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function categoria_bien(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'categoria_bien',
        elementName: 'categoria_bien',
        title: 'Categorias de bienes',
        editable: admin,
        fields:[
            {name:'categoria' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
            {name:'identificador' , typeName:'text'},
        ],
        primaryKey:['categoria']
    };
}