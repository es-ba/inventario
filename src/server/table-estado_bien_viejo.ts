"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function estado_bien_viejo(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'estado_bien_viejo',
        elementName: 'estado_bien_viejo',
        title: 'Estado bien viejo',
        editable: admin,
        fields:[
            {name:'estado_bien_viejo'      , typeName:'text'},
            {name:'descripcion'             , typeName:'text', isName:true},
        ],
        primaryKey:['estado_bien_viejo']
    };
}
