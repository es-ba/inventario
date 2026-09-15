"use strict";

import {TableDefinition, TableContext} from "./types-principal";
import {sqlBienesBaja} from "./reportes-bienes";

export function bienes_baja(_context:TableContext):TableDefinition{
    return {
        name:'bienes_baja',
        elementName:'bien',
        title:'Proceso de baja',
        editable:false,
        allow:{insert:false, update:false, delete:false, deleteAll:false},
        fields:[
            {name:'ficha'              , typeName:'text', title:'ficha'},
            {name:'activo'             , typeName:'boolean', title:'activo'},
            {name:'detalle'            , typeName:'text', title:'descripción'       , nullable:true},
            {name:'marca'              , typeName:'text', title:'marca'             , nullable:true},
            {name:'modelo'             , typeName:'text', title:'modelo'            , nullable:true},
            {name:'serie'              , typeName:'text', title:'serie'             , nullable:true},
            {name:'estado_baja'        , typeName:'text', title:'estado de la baja' , nullable:true},
            {name:'motivo_baja'        , typeName:'text', title:'motivo'            , nullable:true},
            {name:'fecha_solicitud'    , typeName:'date', title:'solicitada'        , nullable:true},
            {name:'fecha_finalizacion' , typeName:'date', title:'finalizada'        , nullable:true},
            {name:'autorizado_por'     , typeName:'text', title:'autorizada por'    , nullable:true},
            {name:'documento_respaldo' , typeName:'text', title:'documento'         , nullable:true},
            {name:'solicitado_por'     , typeName:'text', title:'solicitada por'    , nullable:true},
            {name:'revisado_por'       , typeName:'text', title:'revisada por'      , nullable:true},
            {name:'fecha_revision'     , typeName:'date', title:'revisada'          , nullable:true},
            {name:'motivo_rechazo'     , typeName:'text', title:'motivo rechazo'    , nullable:true},
            {name:'motivo_restauracion', typeName:'text', title:'motivo restauración', nullable:true},
            {name:'restaurado_por'     , typeName:'text', title:'restaurada por'    , nullable:true},
            {name:'fecha_restauracion' , typeName:'date', title:'restaurada'        , nullable:true},
            {name:'sector'             , typeName:'text', title:'sector'},
            {name:'responsable'        , typeName:'text', title:'responsable'       , nullable:true},
            {name:'sede'               , typeName:'text', title:'sede'              , nullable:true},
            {name:'espacio'            , typeName:'text', title:'espacio'           , nullable:true},
        ],
        primaryKey:['ficha'],
        foreignKeys:[
            {references:'estados_baja'  , fields:['estado_baja'], displayFields:['descripcion']},
            {references:'motivos_baja'  , fields:['motivo_baja'], displayFields:['descripcion']},
            {references:'sectores'      , fields:['sector']     , displayFields:['sigla']},
            {references:'responsables'  , fields:['responsable'], displayFields:['apellido', 'nombre']},
            {references:'sedes'         , fields:['sede']       , displayFields:['descripcion']},
            {references:'espacios'      , fields:['espacio']    , displayFields:['numero', 'denominacion']},
        ],
        sortColumns:[{column:'fecha_solicitud', order:-1}, {column:'ficha', order:1}],
        sql:{
            from:`(${sqlBienesBaja})`,
        },
    };
}
