"use strict";

import {TableDefinition, TableContext, AppBackend} from "./types-principal";

export function getPolicies(be:AppBackend){
    return {
        select:{ using: `${be.dbUserRolExpr} = 'admin'`},
        all:{ using: `${be.dbUserRolExpr} = 'admin'`}
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
            {name:'annio'                       , typeName:'text'    , nullable:true},
            {name:'prd'                         , typeName:'text'    , nullable:true},
            {name:'caracteridentificador'       , typeName:'text'    , nullable:true},
            {name:'enusode'                     , typeName:'text'    , nullable:true},
            {name:'clasificacion'               , typeName:'text'    , nullable:true},
            {name:'orden_compra'                , typeName:'text'    , nullable:true},
            {name:'fecha'                       , typeName:'date'    , nullable:false, specialDefaultValue:'current_date'},
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
            {name:'estado_baja'                 , typeName:'text'    , nullable:true}
        ],  
        primaryKey:['ficha'],
        foreignKeys:[
            {references:'rubros', fields:['rubro'] },
            {references:'clases', fields:['rubro', 'clase'] },
            {references:'cuentas', fields:['rubro', 'clase', 'cuenta'] },
            {references:'tipo_bien', fields:['tipo_bien']},
            {references:'grupos', fields:['grupo']},
            {references:'motivos_baja', fields:['motivo_baja']},
            {references:'categoria_bien', fields:['categoria']},
            {references:'estados', fields:['estado']},
            {references:'tipo_contrato', fields:['tipo_contrato']},
            {references:'estados_baja', fields:['estado_baja']},
            {references:'marcas', fields:['marca']},
            {references:'ordenes_compra', fields:['orden_compra']},
        ],
        constraints:[
            {constraintType:'unique', fields:['ficha']}
        ],
        detailTables:[
            {table:'historial', fields:['ficha'], abr:'His', label:'Historial'},
            {table:'movimientos_bien', fields:['ficha'], abr:'Mov'},
        ],
        sql:{
            policies:getPolicies(be)
        }
    };
}




