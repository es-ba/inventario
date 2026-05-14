"use strict";

import { TableDefinition, TableContext, FieldDefinition } from "./types-principal";
import { getPolicies } from "./table-bienes";

export const numero_adjunto: FieldDefinition = {
    name: 'numero_adjunto',
    typeName: 'bigint',
    title: 'n°',
    nullable: true,
    editable: false,
};

export function adjuntos_bienes(context:TableContext):TableDefinition{
    var be = context.be;
    var admin = context.user.rol==='admin';
    var responsable = context.user.rol==='responsable';
    return {
        name:'adjuntos_bienes',
        elementName:'adjunto',
        editable: admin || responsable,
        fields:[
            {name:'ficha'      , typeName:'text'     },
            {...numero_adjunto, sequence:{ firstValue:101, name:'numero_adjunto_seq' }},
            {name:'usuario'    , typeName:'text'     , editable:false, defaultValue: context.user.usuario},
            {name:'detalle'    , typeName:'text'     , nullable:true},
            {name:'timestamp'  , typeName:'timestamp', defaultDbValue:'current_timestamp', editable:false, inTable:true, title:'📅'},
            {name:'subir'      , typeName:'text'     , editable:false, clientSide:'subirAdjunto'},
            {name:'archivo'    , typeName:'text'     , editable:false, title:'archivo'},
            {name:'bajar'      , typeName:'text'     , editable:false, clientSide:'bajarAdjunto'},
        ],
        primaryKey:['ficha','numero_adjunto'],
        foreignKeys:[
            {references:'bienes'   , fields:['ficha'], onDelete:'cascade'},
            {references:'usuarios' , fields:['usuario']},
        ],
        hiddenColumns:['archivo'],
        selfRefresh:true,
        refrescable:true,
        sql:{
            policies: getPolicies(be)
        }
    };
}
