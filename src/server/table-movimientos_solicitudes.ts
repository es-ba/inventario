"use strict";

import {TableDefinition, TableContext, AppBackend} from "./types-principal";

export function getPolicies(be:AppBackend){
    return {
        select:{ using: `${be.dbUserRolExpr} = 'admin' OR responsable = ${be.dbUserNameExpr}`},
        all:{ using: `${be.dbUserRolExpr} = 'admin' OR responsable = ${be.dbUserNameExpr}`}
    }
}

export function movimientos_solicitudes(context:TableContext):TableDefinition{
    var be = context.be;
    var admin = context.user.rol==='admin';
    
    return {
        name:'movimientos_solicitudes',
        elementName:'movimiento_solicitud', 
        title:'solicitudes de movimiento',
        editable:admin,
        fields:[
            {name:'orden'                       , typeName:'bigint'  , nullable:true, editable:false},
            {name:'acta'                        , typeName:'text'    , nullable:false}, 
            {name:'tipo_asignacion'             , typeName:'text'    },
            {name:'accion'                      , typeName:'text'    },
            {name:'modalidad_uso'               , typeName:'text'    },
            {name:'estado'                      , typeName:'text'    , defaultDbValue:"'B'", editable:false},
            {name:'responsable'                 , typeName:'text'    , nullable:true},
            {name:'area'                        , typeName:'text'    , nullable:true},
            {name:'sede'                        , typeName:'text'    , nullable:true},
            {name:'espacio'                     , typeName:'text'    , nullable:true},
            {name:'usuario_final'               , typeName:'text'    , nullable:true},
            {name:'detalle'                     , typeName:'text'    , nullable:true},
            {name:'fecha_creacion'              , typeName:'date'    , nullable:false, specialDefaultValue:'current_date'},
            {name:'fecha_modificacion'          , typeName:'date'    , nullable:true},
            {name:'usuario_creacion'            , typeName:'text'    , nullable:true},
            {name:'usuario_modificacion'        , typeName:'text'    , nullable:true},
            {name:'solicitado_por'              , typeName:'text'    , nullable:true},
            {name:'firmado_por'                 , typeName:'text'    , nullable:true},
        ],
        primaryKey:['acta'],
        foreignKeys:[
            {references:'responsables', fields:['responsable']},
            {references:'usuarios', fields:[{source:'usuario_creacion' , target:'usuario'}], alias: 'usuario_creacion'},
            {references:'usuarios', fields:[{source:'usuario_modificacion' , target:'usuario'}], alias: 'usuario_modificacion'},
            {references:'areas', fields:['area']},
            {references:'sedes', fields:['sede']},
            {references:'espacios', fields:['espacio']},
            {references:'tipo_asignacion', fields:['tipo_asignacion']},
            {references:'modalidad_uso', fields:['modalidad_uso']},
            {references:'estados', fields:['estado']},
        ],
        detailTables:[
            {table:'movimientos_solicitud_bien', fields:['acta'], abr:'B'},
            {table:'adjuntos_solicitudes', fields:['acta'], abr:'Adj', label:'Adjuntos'}
        ],
        sql:{
            policies:getPolicies(be)
        }
    };
}