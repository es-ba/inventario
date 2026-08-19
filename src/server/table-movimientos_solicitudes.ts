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
            {name:'fecha_creacion'              , typeName:'date'    , nullable:false, defaultDbValue:'current_date'},
            {name:'fecha_modificacion'          , typeName:'date'    , nullable:true},
            {name:'usuario_creacion'            , typeName:'text'    , nullable:true},
            {name:'usuario_modificacion'        , typeName:'text'    , nullable:true},
            {name:'solicitado_por'              , typeName:'text'    , nullable:true},
            {name:'firmado_por'                 , typeName:'text'    , nullable:true},
        ],
        primaryKey:['acta'],
        /*
            displayFields explícito en cada referencia. Sin esto backend-plus usa los
            nameFields de la tabla apuntada, y ahí hay dos problemas: estados no tiene
            ninguno —así que el estado viajaba sólo como código— y areas tiene nombre_area,
            que viene vacío del origen. El área se identifica por su sigla.

            El código sigue en su columna y la descripción va aparte, sin concatenar.
        */
        foreignKeys:[
            {references:'responsables', fields:['responsable'], displayFields:['apellido', 'nombre']},
            {references:'usuarios', fields:[{source:'usuario_creacion' , target:'usuario'}], alias: 'usuario_creacion'},
            {references:'usuarios', fields:[{source:'usuario_modificacion' , target:'usuario'}], alias: 'usuario_modificacion'},
            {references:'areas', fields:['area'], displayFields:['sigla']},
            {references:'sedes', fields:['sede'], displayFields:['descripcion']},
            {references:'espacios', fields:['espacio'], displayFields:['numero', 'denominacion']},
            {references:'tipo_asignacion', fields:['tipo_asignacion'], displayFields:['descripcion']},
            {references:'modalidad_uso', fields:['modalidad_uso'], displayFields:['descripcion']},
            {references:'estados', fields:['estado'], displayFields:['desc_estado']},
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