"use strict";

import { TableDefinition, TableContext, FieldDefinition } from "./types-principal";
import { politicasClaves } from "./politicas";

export const numero_clave: FieldDefinition = {
    name: 'numero_clave',
    typeName: 'bigint',
    title: 'n°',
    nullable: true,
    editable: false,
};

export function claves_bienes(context:TableContext):TableDefinition{
    return {
        name:'claves_bienes',
        elementName:'clave_bien',
        title:'claves de bienes',
        editable:context.es.administrativo,
        allow:{ export:false, deleteAll:false },
        fields:[
            {name:'ficha'            , typeName:'text'  },
            {...numero_clave, sequence:{ firstValue:101, name:'claves_bienes_numero_clave_seq' }},
            {name:'tipo_clave'       , typeName:'text'  },
            {name:'valor'            , typeName:'text'  , title:'clave'},
            {name:'observacion'      , typeName:'text'  , nullable:true},
            {name:'usuario_creacion' , typeName:'text'  , nullable:true, editable:false,
                defaultValue: context.user.usuario},
            {name:'fecha_creacion'   , typeName:'date'  , nullable:true, editable:false,
                defaultDbValue:'current_date'},
        ],
        primaryKey:['ficha','numero_clave'],
        foreignKeys:[
            {references:'bienes'     , fields:['ficha'], onDelete:'cascade'},
            {references:'tipo_clave' , fields:['tipo_clave'], displayFields:['descripcion']},
            {references:'usuarios'   , fields:[{source:'usuario_creacion', target:'usuario'}],
                alias:'usuario_creacion'},
        ],
        sortColumns:[{column:'numero_clave', order:1}],
        sql:{
            policies:politicasClaves(),
            skipEnance:true,
        }
    };
}
