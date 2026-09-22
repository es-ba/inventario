"use strict";

import { TableDefinition, TableContext } from "./types-principal";
import { politicasControlesBienItems } from "./politicas";
import { puedeElRol } from "./capacidades-roles";

export function controles_bien_items(context:TableContext):TableDefinition{
    const paraDump = !!context.forDump;
    const puedeEliminar = paraDump || puedeElRol(context.user?.rol, 'puede_eliminar');
    return {
        name:'controles_bien_items',
        elementName:'item',
        title:'Ítems del control',
        editable:paraDump,
        allow:{insert:paraDump, update:paraDump, delete:puedeEliminar, deleteAll:false, import:false},
        fields:[
            {name:'control', typeName:'bigint'},
            {name:'item'   , typeName:'text'  },
            {name:'valor'  , typeName:'text'  , nullable:true},
        ],
        primaryKey:['control','item'],
        foreignKeys:[
            {references:'controles_bien', fields:['control'], onDelete:'cascade'},
            {references:'items_control' , fields:['item'], displayFields:['descripcion']},
        ],
        sql:{
            policies:politicasControlesBienItems(),
        },
    };
}
