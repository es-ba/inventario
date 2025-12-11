"use strict";

import {TableDefinition, TableContext, AppBackend} from "./types-principal";

export function getPolicies(be:AppBackend){
    return {
        select:{ using: `${be.dbUserRolExpr} = 'admin' or responsable = ${be.dbUserNameExpr}`},
        all:{ using: `${be.dbUserRolExpr} = 'admin' or responsable = ${be.dbUserNameExpr}`}
    }
}

export function movimientos_bien(context:TableContext):TableDefinition{
    var be = context.be;
    var admin = context.user.rol==='admin';
    var responsable = context.user.rol==='responsable';
    return {
        name:'movimientos_bien',
        elementName:'movimiento_bien', 
        title:'movimientos de bienes', // solo si es distinto al "name", si es igual se puede omitir
        editable:admin || responsable,
        fields:[
            {name:'ficha'                       , typeName:'text'    }, 
            {name:'orden'                       , typeName:'bigint'  , nullable:true, editable:false  },
            {name:'tipo_asignacion'             , typeName:'text'    },
            {name:'accion'                      , typeName:'text'    , options:['entrega', 'devolucion']},
            {name:'modalidad_uso'               , typeName:'text'    },
            {name:'estado_movimiento'           , typeName:'text'    },
            {name:'responsable'                 , typeName:'text'    , nullable:true},
            {name:'area'                        , typeName:'text'    , nullable:true},
            {name:'sede'                        , typeName:'text'    , nullable:true},
            {name:'espacio'                     , typeName:'text'    , nullable:true},
            {name:'enusode'                     , typeName:'text'    , nullable:true},
            {name:'detalle'                     , typeName:'text'    , nullable:true},
            {name:'fecha_creacion'              , typeName:'date'    , nullable:false, specialDefaultValue:'current_date'},
            {name:'fecha_modificacion'          , typeName:'date'    , nullable:true},
            {name:'usuario_creacion'            , typeName:'text'    , nullable:true},
            {name:'usuario_modificacion'        , typeName:'text'    , nullable:true},
            {name:'solicitado_por'              , typeName:'text'    , nullable:true},
            {name:'firmado_por'                 , typeName:'text'    , nullable:true},

        ],
        primaryKey:['ficha', 'orden'],
        sortColumns:[{column:'orden', order:-1}], 
        foreignKeys:[
            {references:'bienes', fields:['ficha']},
            {references:'responsables', fields:['responsable']},
            {references:'usuarios', fields:[{source:'usuario_creacion' , target:'usuario'}], alias: 'usuario_creacion'},
            {references:'usuarios', fields:[{source:'usuario_modificacion' , target:'usuario'}], alias: 'usuario_modificacion'},
            {references:'areas', fields:['area']},
            {references:'sedes', fields:['sede']},
            {references:'espacios', fields:['espacio']},
            {references:'tipo_asignacion', fields:['tipo_asignacion']},
            {references:'modalidad_uso', fields:['modalidad_uso']},
            {references:'estados_movimiento', fields:['estado_movimiento']},
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


 

