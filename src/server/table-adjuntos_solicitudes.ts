"use strict";

import { TableDefinition, TableContext, FieldDefinition, AppBackend } from "./types-principal";

export const numero_adjunto_solicitud: FieldDefinition = {
    name: 'numero_adjunto',
    typeName: 'bigint',
    title: 'n°',
    nullable: true,
    editable: false,
};

function getPolicies(be:AppBackend){
    return {
        select:{ using: `${be.dbUserRolExpr} = 'admin' OR EXISTS (SELECT 1 FROM movimientos_solicitudes ms WHERE ms.acta = adjuntos_solicitudes.acta AND ms.responsable = ${be.dbUserNameExpr})`},
        all:{ using: `${be.dbUserRolExpr} = 'admin' OR EXISTS (SELECT 1 FROM movimientos_solicitudes ms WHERE ms.acta = adjuntos_solicitudes.acta AND ms.responsable = ${be.dbUserNameExpr})`}
    };
}

export function adjuntos_solicitudes(context:TableContext):TableDefinition{
    var be = context.be;
    var admin = context.user.rol==='admin';
    var responsable = context.user.rol==='responsable';
    return {
        name:'adjuntos_solicitudes',
        elementName:'adjunto_solicitud',
        title:'adjuntos de solicitudes',
        editable: admin || responsable,
        fields:[
            {name:'acta'       , typeName:'text'     },
            {...numero_adjunto_solicitud, sequence:{ firstValue:101, name:'adjuntos_solicitudes_numero_adjunto_seq' }},
            {name:'usuario'    , typeName:'text'     , editable:false, defaultValue: context.user.usuario},
            {name:'detalle'    , typeName:'text'     , nullable:true},
            {name:'timestamp'  , typeName:'timestamp', defaultDbValue:'current_timestamp', editable:false, inTable:true, title:'fecha'},
            {name:'subir'      , typeName:'text'     , editable:false, clientSide:'subirAdjuntoSolicitud'},
            {name:'archivo'    , typeName:'text'     , editable:false, title:'archivo'},
            {name:'bajar'      , typeName:'text'     , editable:false, clientSide:'bajarAdjuntoSolicitud'},
        ],
        primaryKey:['acta','numero_adjunto'],
        foreignKeys:[
            {references:'movimientos_solicitudes', fields:['acta'], onDelete:'cascade'},
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
