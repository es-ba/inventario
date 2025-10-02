"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function marcas(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'marcas',
        elementName: 'marcas',
        title: 'Marcas',
        editable: admin,
        fields:[
            {name:'marca' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
        ],
        primaryKey:['marca']
    };
}