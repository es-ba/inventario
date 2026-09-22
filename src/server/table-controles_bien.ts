"use strict";

import { TableDefinition, TableContext } from "./types-principal";
import { politicasControlesBien } from "./politicas";
import { puedeElRol } from "./capacidades-roles";

export function controles_bien(context:TableContext):TableDefinition{
    const paraDump = !!context.forDump;
    const puedeEliminar = paraDump || puedeElRol(context.user?.rol, 'puede_eliminar');
    return {
        name:'controles_bien',
        elementName:'control',
        title:'Controles del bien',
        editable:puedeEliminar,
        allow:{insert:paraDump, deleteAll:false, import:false},
        fields:[
            {name:'control'            , typeName:'bigint' , nullable:true, editable:false,
                sequence:{firstValue:1, name:'controles_bien_control_seq'}},
            {name:'ficha'              , typeName:'text'   },
            {name:'fecha'              , typeName:'date'   , nullable:false, defaultDbValue:'current_date'},
            {name:'observacion'        , typeName:'text'   , nullable:true},
            {name:'usuario_creacion'   , typeName:'text'   , nullable:true, editable:false},
            {name:'fecha_creacion'     , typeName:'date'   , nullable:true, editable:false,
                defaultDbValue:'current_date'},
        ],
        primaryKey:['control'],
        foreignKeys:[
            {references:'bienes'              , fields:['ficha']},
            {references:'usuarios'            , fields:[{source:'usuario_creacion', target:'usuario'}],
                alias:'usuario_creacion'},
        ],
        constraints:[
            {constraintType:'check', consName:'controles_bien_fecha_no_futura', expr:'fecha <= current_date'},
        ],
        detailTables:[
            {table:'controles_bien_items', fields:['control'], abr:'It', label:'ítems'},
        ],
        sortColumns:[{column:'fecha', order:-1}, {column:'control', order:-1}],
        sql:{
            policies:politicasControlesBien('ficha'),
            postCreateSqls:'CREATE INDEX controles_bien_ficha_fecha_idx ON controles_bien (ficha, fecha DESC, control DESC);',
        },
    };
}
