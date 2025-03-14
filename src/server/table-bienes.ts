"use strict";

import {TableDefinition, TableContext, AppBackend} from "./types-principal";

export function getPolicies(be:AppBackend){
    return {
        select:{ using: `${be.dbUserRolExpr} = 'admin' or responsable = ${be.dbUserNameExpr}`},
        all:{ using: `${be.dbUserRolExpr} = 'admin' or responsable = ${be.dbUserNameExpr}`}
    }
}

export function bienes(context:TableContext):TableDefinition{
    var be = context.be;
    var admin = context.user.rol==='admin';
    var responsable = context.user.rol==='responsable';
    return {
        name:'bienes',
        elementName:'bien', 
        title:'Bienes',
        editable:admin || responsable,
        fields:[
            {name:'ficha'                       , typeName:'text'    }, 
            {name:'numero_integrado'            , typeName:'text'    }, 
            {name:'ubicacion'                   , typeName:'text'    , nullable:true},
            {name:'observacion'                 , typeName:'text'    , nullable:true},
            {name:'detalle'                     , typeName:'text'    , nullable:true},
            {name:'importe'                     , typeName:'text'    , nullable:true},
            {name:'importetotal'                , typeName:'text'    , nullable:true},
            {name:'tipo_bien'                   , typeName:'text'    , nullable:true},
            {name:'estado'                      , typeName:'text'    , options:['alta', 'baja', 'uso_precario']},
            {name:'categoria'                   , typeName:'text'    , options:['transferencia', 'etc']},
            {name:'modalidad_uso'                , typeName:'text'    , options:['trabajoremoto', 'prestamo']},
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
            {name:'enusode'                     , typeName:'text'    , nullable:true},
            {name:'clasificacion'               , typeName:'text'    , nullable:true},
            {name:'area'                        , typeName:'text'    , nullable:true},
            {name:'sede'                        , typeName:'text'    , nullable:true},
            {name:'espacio'                     , typeName:'text'    , nullable:true},
            {name:'responsable'                 , typeName:'text'    , nullable:true},
            {name:'ordencompra'                 , typeName:'text'    , nullable:true},
            {name:'fecha'                       , typeName:'date'    , nullable:false, specialDefaultValue:'current_date'},
            {name:'entidad_prestadora'          , typeName:'text'    , nullable:true},
            {name:'tipo_contrato'               , typeName:'text'    , options:['comodato', 'prestamo', 'alquiler', 'otro'], nullable:true},
            {name:'fecha_inicio'                , typeName:'date'    , nullable:true},
            {name:'fecha_fin'                   , typeName:'date'    , nullable:true},
            {name:'renovable'                   , typeName:'boolean' , nullable:true, defaultValue:false},
            {name:'condiciones'                 , typeName:'text'    , nullable:true},
            {name:'costo_mensual'               , typeName:'decimal' , nullable:true},
            {name:'fecha_solicitud'             , typeName:'date'    , nullable:true},
            {name:'motivo'                      , typeName:'text'    , options:[
                'obsolescencia', 
                'deterioro', 
                'robo', 
                'perdida', 
                'donacion', 
                'venta', 
                'devolucion',
                'otro'
            ], nullable:true},
            {name:'valor_residual'              , typeName:'decimal' , nullable:true},
            {name:'autorizado_por'              , typeName:'text'    , nullable:true},
            {name:'documento_respaldo'          , typeName:'text'    , nullable:true},
            {name:'estado_baja'                 , typeName:'text'    , options:['solicitada', 'en_revision', 'aprobada', 'rechazada'], nullable:true},
        ],
        primaryKey:['ficha'],
        foreignKeys:[
            {references:'responsables', fields:['responsable']},
            {references:'areas', fields:['area']},
            {references:'sedes', fields:['sede']},
            {references:'espacios', fields:['espacio']},
            {references:'rubros', fields:['rubro', 'clase', 'cuenta'] },
            {references:'tipo_bien', fields:['tipo_bien']},
            {references:'grupos', fields:['grupo']},
        ],
        constraints:[
            {constraintType:'unique', fields:['ficha']}
        ],
        sql:{
            policies:getPolicies(be)
        }
    };
}




