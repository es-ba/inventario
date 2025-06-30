"use strict";

import {TableDefinition, TableContext, AppBackend} from "./types-principal";

export function getPolicies(be:AppBackend){
    return {
        select:{ using: `${be.dbUserRolExpr} = 'admin' or responsable = ${be.dbUserNameExpr}`},
        all:{ using: `${be.dbUserRolExpr} = 'admin' or responsable = ${be.dbUserNameExpr}`}
    }
}

export function auditorias(context:TableContext):TableDefinition{
    var be = context.be;
    return {
        name:'auditorias',
        elementName:'auditoria', 
        title:'Auditorías',
        editable:false,
        fields:[
            {name:'ficha'                       , typeName:'text'    }, 
            {name:'orden'                       , typeName:'text'    },
            {name:'numero_integrado'            , typeName:'text'    }, 
            {name:'ubicacion'                   , typeName:'text'    },
            {name:'observacion'                 , typeName:'text'    },
            {name:'detalle'                     , typeName:'text'    },
            {name:'importe'                     , typeName:'text'    , nullable:true},
            {name:'importetotal'                , typeName:'text'    , nullable:true},
            {name:'tipo_bien'                   , typeName:'text'    },
            {name:'estado'                      , typeName:'text'    , options:['alta', 'baja', 'uso_precario']},
            {name:'categoria'                   , typeName:'text'    , options:['transferencia']},
            {name:'modalidaduso'                , typeName:'text'    , options:['trabajoremoto', 'prestamo']},
            {name:'rubro'                       , typeName:'text'    , nullable:true},
            {name:'clase'                       , typeName:'text'    , nullable:true},
            {name:'cuenta'                      , typeName:'text'    , nullable:true},
            {name:'grupo'                       , typeName:'text'    , nullable:true},
            {name:'marca'                       , typeName:'text'    },
            {name:'serie'                       , typeName:'text'    },
            {name:'imei'                        , typeName:'text'    },
            {name:'modelo'                      , typeName:'text'    },
            {name:'anio'                        , typeName:'text'    },
            {name:'prd'                         , typeName:'text'    },
            {name:'caracteridentificador'       , typeName:'text'    },
            {name:'enusode'                     , typeName:'text'    },
            {name:'clasificacion'               , typeName:'text'    },
            {name:'area'                        , typeName:'text'    , nullable:true},
            {name:'sede'                        , typeName:'text'    , nullable:true},
            {name:'espacio'                     , typeName:'text'    , nullable:true},
            {name:'responsable'                 , typeName:'text'    , nullable:true},
            {name:'ordencompra'                 , typeName:'text'    , nullable:true},
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
            {name:'usuario'                     , typeName:'text'    },
            {name:'usuario_nombre'              , typeName:'text'    },
            {name:'fecha'                       , typeName:'timestamp', nullable:false, specialDefaultValue:'current_timestamp'},
            {name:'accion'                      , typeName:'text'    , options:['insert', 'update', 'delete']},
            {name:'observaciones'               , typeName:'text'    }
        ],
        primaryKey:['ficha', 'orden'],
        foreignKeys:[
            {references:'bienes', fields:['ficha']},
            {references:'responsables', fields:['responsable']},
            {references:'usuarios', fields:['usuario']}
        ],
        sql:{
            policies:getPolicies(be)
        }
    };
}




