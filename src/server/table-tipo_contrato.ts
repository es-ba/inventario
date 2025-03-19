"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function tipo_contrato(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'tipo_contrato',
        elementName: 'tipo_contrato',
        title: 'Tipos de contratos',
        editable: admin,
        fields:[
            {name:'tipo_contrato' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
        ],
        primaryKey:['tipo_contrato']
    };
}