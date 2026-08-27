"use strict";

import { TableDefinition, TableContext, FieldDefinition, AppBackend } from "./types-principal";
import { politicasInventario, deMisDependientes, MI_RESPONSABLE } from "./politicas";

export const numero_adjunto_solicitud: FieldDefinition = {
    name: 'numero_adjunto',
    typeName: 'bigint',
    title: 'n°',
    nullable: true,
    editable: false,
};

const RESPONSABLE_DE_LA_SOLICITUD =
    `(SELECT ms.responsable FROM movimientos_solicitudes ms`
    + ` WHERE ms.acta = adjuntos_solicitudes.acta)`;

function getPolicies(_be?:AppBackend){
    return politicasInventario({
        propio: `${RESPONSABLE_DE_LA_SOLICITUD} = ${MI_RESPONSABLE}`,
        dependiente: deMisDependientes(RESPONSABLE_DE_LA_SOLICITUD),
    });
}

export function adjuntos_solicitudes(context:TableContext):TableDefinition{
    var be = context.be;
    return {
        name:'adjuntos_solicitudes',
        elementName:'adjunto_solicitud',
        title:'adjuntos de solicitudes',
        editable:context.es.administrativo,
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
