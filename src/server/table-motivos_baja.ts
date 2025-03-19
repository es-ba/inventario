"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function motivos_baja(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'motivos_baja',
        elementName: 'motivos_baja',
        title: 'Motivos de baja',
        editable: admin,
        fields:[
            {name:'motivo_baja' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
        ],
        primaryKey:['motivo_baja']
    };
}