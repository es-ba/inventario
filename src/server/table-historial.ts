"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function historial(context:TableContext):TableDefinition{
       var admin = context.user.rol==='admin';
       var responsable = context.user.rol==='responsable';
    return {
        name:'historial',
        elementName:'historial', 
        title:'Historial',
        editable:admin || responsable,
        fields:[
            {name:'ficha'                       , typeName:'text'    },
            {name:'orden'                       , typeName:'bigint'  , nullable:true, editable:false  },
            {name:'numero_integrado'            , typeName:'text'    }, 
            {name:'ubicacion'                   , typeName:'text'    , nullable:true},
            {name:'tipo_asignacion'             , typeName:'text'    },
            {name:'accion'                      , typeName:'text'    , nullable:true},
            {name:'modalidad_uso'               , typeName:'text'    , nullable:true},
            {name:'responsable'                 , typeName:'text'    , nullable:true},
            {name:'area'                        , typeName:'text'    , nullable:true},
            {name:'observacion'                 , typeName:'text'    , nullable:true},
            {name:'detalle'                     , typeName:'text'    , nullable:true},
            {name:'importe'                     , typeName:'text'    , nullable:true},
            {name:'importetotal'                , typeName:'text'    , nullable:true},
            {name:'tipo_bien'                   , typeName:'text'    , nullable:true},
            {name:'estado'                      , typeName:'text'    , nullable:true},
            {name:'categoria'                   , typeName:'text'    , nullable:true},
            {name:'rubro'                       , typeName:'text'    , nullable:true},
            {name:'clase'                       , typeName:'text'    , nullable:true},
            {name:'cuenta'                      , typeName:'text'    , nullable:true},
            {name:'grupo'                       , typeName:'text'    , nullable:true},
            {name:'marca'                       , typeName:'text'    , nullable:true},
            {name:'serie'                       , typeName:'text'    , nullable:true},
            {name:'imei'                        , typeName:'text'    , nullable:true},
            {name:'modelo'                      , typeName:'text'    , nullable:true},
            {name:'anio'                        , typeName:'text'    , nullable:true},
            {name:'prd'                         , typeName:'text'    , nullable:true},
            {name:'caracteridentificador'       , typeName:'text'    , nullable:true},
            {name:'asignado_a'                  , typeName:'text'    , nullable:true},
            {name:'clasificacion'               , typeName:'text'    , nullable:true},
            {name:'orden_compra'                , typeName:'text'    , nullable:true},
            {name:'fecha'                       , typeName:'date'    , nullable:true,},
            {name:'entidad_prestadora'          , typeName:'text'    , nullable:true},
            {name:'tipo_contrato'               , typeName:'text'    , nullable:true},
            {name:'fecha_inicio'                , typeName:'date'    , nullable:true},
            {name:'fecha_fin'                   , typeName:'date'    , nullable:true},
            {name:'renovable'                   , typeName:'boolean' , nullable:true, defaultValue:false},
            {name:'condiciones'                 , typeName:'text'    , nullable:true},
            {name:'costo_mensual'               , typeName:'decimal' , nullable:true},
            {name:'fecha_solicitud'             , typeName:'date'    , nullable:true},
            {name:'motivo_baja'                 , typeName:'text'    , nullable:true},
            {name:'valor_residual'              , typeName:'decimal' , nullable:true},
            {name:'autorizado_por'              , typeName:'text'    , nullable:true},
            {name:'documento_respaldo'          , typeName:'text'    , nullable:true},
            {name:'estado_baja'                 , typeName:'text'    , nullable:true},
            {name:'usuario'                     , typeName:'text'    },
            {name:'usuario_nombre'              , typeName:'text'    , nullable:true},
            {name:'observaciones'               , typeName:'text'    , nullable:true},
            {name:'sede'                        , typeName:'text'    , nullable:true},
            {name:'espacio'                     , typeName:'text'    , nullable:true},
            {name:'fecha_creacion'              , typeName:'date'    , nullable:false, specialDefaultValue:'current_date'},
            {name:'fecha_modificacion'          , typeName:'date'    , nullable:true},
            {name:'usuario_modificacion'        , typeName:'text'    , nullable:true},
            {name:'solicitado_por'              , typeName:'text'    , nullable:true},
            {name:'firmado_por'                 , typeName:'text'    , nullable:true},
            {name:'vincular_responsableficha'   , typeName:'text'    , nullable:true},
            {name:'movimiento_orden'            , typeName:'bigint'  , nullable:true}
        ],
        primaryKey:['ficha', 'orden'],
        foreignKeys:[
            {references:'bienes', fields:['ficha']},
            {references:'usuarios', fields:['usuario']},
        ],
    }
};





