"use strict";

import {TableDefinition, TableContext, AppBackend} from "./types-principal";

export function getPolicies(be:AppBackend){
    return {
        select:{ using: `${be.dbUserRolExpr} = 'admin' OR responsable = ${be.dbUserNameExpr}`},
        all:{ using: `${be.dbUserRolExpr} = 'admin' OR responsable = ${be.dbUserNameExpr}`}
    }
}

export function movimientos_bien(context:TableContext):TableDefinition{
    var be = context.be;
    var admin = context.user.rol==='admin';
    var responsable = context.user.rol==='responsable';
    
    return {
        name:'movimientos_bien',
        elementName:'movimiento_bien', 
        title:'movimientos de bienes',
        editable:admin || responsable,
        fields:[
            {name:'ficha'                       , typeName:'text'    , nullable:false}, 
            {name:'orden'                       , typeName:'bigint'  , nullable:false, editable:false},
            {name:'acta'                        , typeName:'text'    , nullable:true},
            {name:'tipo_asignacion'             , typeName:'text'    , nullable:true},
            {name:'accion'                      , typeName:'text'    , nullable:true},
            {name:'modalidad_uso'               , typeName:'text'    , nullable:true},
            {name:'responsable'                 , typeName:'text'    , nullable:false},
            {name:'area'                        , typeName:'text'    , nullable:true},
            {name:'sede'                        , typeName:'text'    , nullable:true},
            {name:'espacio'                     , typeName:'text'    , nullable:true},
            {name:'asignado_a'                  , typeName:'text'    , nullable:true},
            {name:'detalle'                     , typeName:'text'    , nullable:true},
            {name:'fecha_movimiento'            , typeName:'date'    , nullable:false, specialDefaultValue:'current_date', editable:false}, // Fecha real del movimiento
            {name:'fecha_creacion'              , typeName:'date'    , nullable:false, specialDefaultValue:'current_date', editable:false},
            {name:'fecha_modificacion'          , typeName:'date'    , nullable:true, editable:false},
            {name:'usuario_creacion'            , typeName:'text'    , nullable:true, editable:false},
            {name:'usuario_modificacion'        , typeName:'text'    , nullable:true, editable:false},
            {name:'solicitado_por'              , typeName:'text'    , nullable:true},
            {name:'firmado_por'                 , typeName:'text'    , nullable:true},
        ],
        primaryKey:['ficha', 'orden'],
        sortColumns:[{column:'orden', order:-1}], 
        foreignKeys:[
            {references:'bienes', fields:['ficha']},
            {references:'movimientos_solicitud_bien', fields:['acta', 'ficha']},
            {references:'responsables', fields:['responsable']},
            {references:'responsables', fields:['asignado_a']},
            {references:'usuarios', fields:[{source:'usuario_creacion' , target:'usuario'}], alias: 'usuario_creacion'},
            {references:'usuarios', fields:[{source:'usuario_modificacion' , target:'usuario'}], alias: 'usuario_modificacion'},
            {references:'areas', fields:['area']},
            {references:'sedes', fields:['sede']},
            {references:'espacios', fields:['espacio']},
            {references:'tipo_asignacion', fields:['tipo_asignacion']},
            {references:'modalidad_uso', fields:['modalidad_uso']},
            {references:'tipo_accion', fields:['tipo_accion']},
        ],
        sql:{
            policies:getPolicies(be)
        }
    };
}
