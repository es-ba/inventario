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
            {name:'ubicacion'                   , typeName:'text'    },
            {name:'observacion'                 , typeName:'text'    },
            {name:'detalle'                     , typeName:'text'    },
            {name:'importe'                     , typeName:'text'    },
            {name:'importetotal'                , typeName:'text'    },
            {name:'tipo_bien'                   , typeName:'text'    },
            {name:'estado'                      , typeName:'text'    },
            {name:'categoria'                   , typeName:'text'    },
            {name:'modalidad_uso'               , typeName:'text'    },
            {name:'rubro'                       , typeName:'text'    },
            {name:'clase'                       , typeName:'text'    },
            {name:'cuenta'                      , typeName:'text'    },
            {name:'grupo'                       , typeName:'text'    },
            {name:'marca'                       , typeName:'text'    },
            {name:'serie'                       , typeName:'text'    },
            {name:'imei'                        , typeName:'text'    },
            {name:'modelo'                      , typeName:'text'    },
            {name:'annio'                       , typeName:'text'    },
            {name:'prd'                         , typeName:'text'    },
            {name:'caracteridentificador'       , typeName:'text'    },
            {name:'enusode'                     , typeName:'text'    },
            {name:'clasificacion'               , typeName:'text'    },
            {name:'area'                        , typeName:'text'    },
            {name:'sede'                        , typeName:'text'    },
            {name:'espacio'                     , typeName:'text'    },
            {name:'responsable'                 , typeName:'text'    },
            {name:'orden_compra'                , typeName:'text'    },
            {name:'fecha'                       , typeName:'date'    , nullable:false, specialDefaultValue:'current_date'},
            {name:'entidad_prestadora'          , typeName:'text'    },
            {name:'tipo_contrato'               , typeName:'text'    },
            {name:'fecha_inicio'                , typeName:'date'    },
            {name:'fecha_fin'                   , typeName:'date'    },
            {name:'renovable'                   , typeName:'boolean' , defaultValue:false},
            {name:'condiciones'                 , typeName:'text'    },
            {name:'costo_mensual'               , typeName:'decimal' },
            {name:'fecha_solicitud'             , typeName:'date'    },
            {name:'motivo_baja'                 , typeName:'text'    },
            {name:'valor_residual'              , typeName:'decimal' },
            {name:'autorizado_por'              , typeName:'text'    },
            {name:'documento_respaldo'          , typeName:'text'    },
            {name:'estado_baja'                 , typeName:'text'    },
            {name:'codigo_barra'                , typeName:'text'    , inTable:false, clientSide:'codigo_barra', editable:false},
        ],
        primaryKey:['ficha'],
        foreignKeys:[
            {references:'responsables'  , fields:['responsable']},
            {references:'areas'         , fields:['area']},
            {references:'sedes'         , fields:['sede']},
            {references:'espacios'      , fields:['espacio']},
            {references:'rubros'        , fields:['rubro'] },
            {references:'clases'        , fields:['rubro','clases'] },
            {references:'cuentas'       , fields:['rubro', 'clase', 'cuenta'] },
            {references:'tipo_bien'     , fields:['tipo_bien']},
            {references:'grupos'        , fields:['grupo']},
            {references:'motivos_baja'  , fields:['motivo_baja']},
            {references:'categoria_bien', fields:['categoria']},
            {references:'modalidad_uso' , fields:['modalidad_uso']},
            {references:'estados'       , fields:['estado']},
            {references:'tipo_contrato' , fields:['tipo_contrato']},
            {references:'estados_baja'  , fields:['estado_baja']},
            {references:'ordenes_compra', fields:['orden_compra']},
        ],
        constraints:[
            {constraintType:'unique', fields:['ficha']}
        ],
        detailTables:[
            {table:'asignaciones', fields:['ficha'], abr:'A', label:'Asignaciones'},
            {table:'auditorias', fields:['ficha'], abr:'Au', label:'Auditorias'} 
        ],
        sql:{
            policies:getPolicies(be)
        }
    };
}




