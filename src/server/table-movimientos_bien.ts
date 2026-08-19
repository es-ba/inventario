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
            {name:'responsable'                 , typeName:'text'    , nullable:true},
            {name:'area'                        , typeName:'text'    , nullable:true},
            {name:'sede'                        , typeName:'text'    , nullable:true},
            {name:'espacio'                     , typeName:'text'    , nullable:true},
            {name:'enusode'                     , typeName:'text'    , nullable:true},
            {name:'detalle'                     , typeName:'text'    , nullable:true},
            {name:'fecha_movimiento'            , typeName:'date'    , nullable:false, defaultDbValue:'current_date', editable:false}, // Fecha real del movimiento
            {name:'fecha_creacion'              , typeName:'date'    , nullable:false, defaultDbValue:'current_date', editable:false},
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
            /*
                displayFields explícito: sin esto se usan los nameFields de la tabla
                apuntada, y ahí el área sale por nombre_area, que viene vacío del origen.
                Al área la identifica su sigla.

                El código queda en su columna y la descripción va aparte, sin concatenar.
            */
            {references:'responsables', fields:['responsable'], displayFields:['apellido', 'nombre']},
            {references:'usuarios', fields:[{source:'usuario_creacion' , target:'usuario'}], alias: 'usuario_creacion'},
            {references:'usuarios', fields:[{source:'usuario_modificacion' , target:'usuario'}], alias: 'usuario_modificacion'},
            {references:'areas', fields:['area'], displayFields:['sigla']},
            {references:'sedes', fields:['sede'], displayFields:['descripcion']},
            {references:'espacios', fields:['espacio'], displayFields:['numero', 'denominacion']},
            {references:'tipo_asignacion', fields:['tipo_asignacion'], displayFields:['descripcion']},
            {references:'modalidad_uso', fields:['modalidad_uso'], displayFields:['descripcion']},
        ],
        sql:{
            policies:getPolicies(be)
        }
    };
}