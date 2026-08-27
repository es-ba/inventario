"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function tipo_sector(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'tipo_sector',
        elementName: 'tipo_sector',
        title: 'Tipos de sectores',
        editable: admin,
        fields:[
            {name:'tipo_sector' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
            {name:'nivel' , typeName:'integer', nullable:true},
        ],
        primaryKey:['tipo_sector'],
        detailTables:[
            {table:'sectores', fields:['tipo_sector'], abr:'Sec', label:'Sectores'},
        ],
        sortColumns:[{column:'nivel', order:1}]
    };
}
