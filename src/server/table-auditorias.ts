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
            {name:'bien'                          , typeName:'text'    }, 
            {name:'responsable'                   , typeName:'text'    }, 
            {name:'orden_compra'                  , typeName:'text'    },
            {name:'ubicacion'                     , typeName:'text'    },
            {name:'observaciones'                 , typeName:'text'    },
            {name:'detalle'                       , typeName:'text'    },
            {name:'prd'                           , typeName:'text'    },
            {name:'anio'                          , typeName:'text'    },
            {name:'importe'                       , typeName:'text'    },
            {name:'clasificacion'                 , typeName:'text'    },
            {name:'tipo'                          , typeName:'text'    },
            {name:'ficha'                         , typeName:'text'    },
            {name:'estado'                        , typeName:'text'    },
            {name:'rubro'                         , typeName:'text'    },
            {name:'grupo'                         , typeName:'text'    },
            {name:'marca'                         , typeName:'text'    },
            {name:'serie'                         , typeName:'text'    },
            {name:'imei'                          , typeName:'text'    },
            {name:'modelo'                        , typeName:'text'    },
            {name:'auditoria_usuario'             , typeName:'text'    },
            {name:'auditoria_usuario_nombre'      , typeName:'text'    },
            {name:'auditoria_fecha'               , typeName:'text'    },
            {name:'auditoria_accion'              , typeName:'text'    },
            {name:'auditoria_observaciones'       , typeName:'text'    },
            {name:'caracter_identificador'        , typeName:'text'    },
            {name:'numero_integrado'              , typeName:'text'    },
            {name:'espacio'                       , typeName:'text'    },

        ],
        primaryKey:['auditorias'],
        foreignKeys:[
            {references:'usuarios', fields:[{source:'responsable', target:'usuario'}]},
            // {references:'areas', fields:['area']},
        ],
        constraints:[
            {constraintType:'unique', fields:['ficha', 'integrado']}
        ],
        detailTables:[
            // {table:'areas', fields:['area'], abr:'V'}
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


 

