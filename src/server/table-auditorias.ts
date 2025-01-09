// [auditoria]
//       ,[bien]
//       ,[responsable]
//       ,[orden_compra]
//       ,[ubicacion]
//       ,[observaciones]
//       ,[detalle]
//       ,[prd]
//       ,[anio]
//       ,[importe]
//       ,[clasificacion]
//       ,[tipo]
//       ,[ficha]
//       ,[estado]
//       ,[rubro]
//       ,[grupo]
//       ,[marca]
//       ,[serie]
//       ,[imei]
//       ,[modelo]
//       ,[auditoria_usuario]
//       ,[auditoria_usuario_nombre]
//       ,[auditoria_fecha]
//       ,[auditoria_accion]
//       ,[auditoria_observaciones]
//       ,[caracter_identificador]
//       ,[numero_integrado]
//       ,[espacio]

"use strict";

import {TableDefinition, TableContext, AppBackend} from "./types-principal";

export function getPolicies(be:AppBackend){
    return {
        select:{ using: `${be.dbUserRolExpr} = 'admin' or responsable = ${be.dbUserNameExpr}`},// or publicar`},
        all:{ using: `${be.dbUserRolExpr} = 'admin' or responsable = ${be.dbUserNameExpr}`}// and publicar is not true` }
    }
}

export function auditorias(context:TableContext):TableDefinition{
    var be = context.be;
    var admin = context.user.rol==='admin';
    var responsable = context.user.rol==='responsable';
    return {
        name:'auditorias',
        elementName:'auditoria', 
        title:'auditorias', // solo si es distinto al "name", si es igual se puede omitir
        editable:admin || responsable,
        fields:[
            {name:'ficha'                       , typeName:'text'    }, 
            {name:'integrado'                   , typeName:'text'    }, 
            {name:'ubicacion'                   , typeName:'text'    },
            {name:'observacion'                 , typeName:'text'    },
            {name:'detalle'                     , typeName:'text'    },
            {name:'importe'                     , typeName:'text'    , nullable:true},
            {name:'importetotal'                , typeName:'text'    , nullable:true},//solo importe
            {name:'tipo_bien'                   , typeName:'text'    },//fk
            {name:'estado'                      , typeName:'text'    , options:['alta', 'baja']},//fk //transferencia pasaria a baja, consultar
            {name:'modalidaduso'                , typeName:'text'    , options:['trabajoremoto', 'prestamo']},//fk //transferencia pasaria a baja, consultar
            {name:'rubro'                       , typeName:'text'    , nullable:true},//fk
            {name:'clase'                       , typeName:'text'    , nullable:true},//fk
            {name:'cuenta'                      , typeName:'text'    , nullable:true},//fk
            {name:'grupo'                       , typeName:'text'    , nullable:true},//fk
            {name:'marca'                       , typeName:'text'    },
            {name:'serie'                       , typeName:'text'    },
            {name:'imei'                        , typeName:'text'    },
            {name:'modelo'                      , typeName:'text'    },
            {name:'anio'                        , typeName:'text'    },
            {name:'prd'                         , typeName:'text'    },
            {name:'caracteridentificador'       , typeName:'text'    },//?
            {name:'enusode'                     , typeName:'text'    },
            {name:'clasificacion'               , typeName:'text'    },
            {name:'area'                        , typeName:'text'    , nullable:true },//fk 
            {name:'sede'                        , typeName:'text'    , nullable:true},//fk
            {name:'espacio'                     , typeName:'text'    , nullable:true},//fk
            {name:'responsable'                 , typeName:'text'    , nullable:true},//fk
            {name:'ordencompra'                 , typeName:'text'    , nullable:true},//fk //viejomantenimiento
            {name:'auditoria_usuario'           , typeName:'text'    },
            {name:'auditoria_usuario_nombre'    , typeName:'text'    },
            {name:'auditoria_fecha'             , typeName:'text'    },
            {name:'auditoria_accion'            , typeName:'text'    },
            {name:'auditoria_observaciones'     , typeName:'text'    }
        ],
        primaryKey:['ficha'],
        foreignKeys:[
            {references:'bienes', fields:['ficha']},
            {references:'responsables', fields:['responsable']}
        ],
        sql:{
            /* 
               ATENCIÓN
               --------
               Las pólicies son algo nuevo en backend-plus, utilizan las policies de PostgreSQL: https://www.postgresql.org/docs/9.5/ddl-rowsecurity.html
               Permiten cambiar los permisos en función del contenido de cada registro.

               Como son nuevas es complicado de usarlas, hay que definir todo a mano.
               Más adelante la forma de hacer esto puede cambiar o pueden haber herramientas que lo hagan más simple.
               
            */
            policies:getPolicies(be)
        }
    };
}


 

