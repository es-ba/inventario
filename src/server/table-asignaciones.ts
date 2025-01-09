"use strict";

import {TableDefinition, TableContext, AppBackend} from "./types-principal";

export function getPolicies(be:AppBackend){
    return {
        select:{ using: `${be.dbUserRolExpr} = 'admin' or responsable = ${be.dbUserNameExpr}`},
        all:{ using: `${be.dbUserRolExpr} = 'admin' or responsable = ${be.dbUserNameExpr}`}
    }
}

export function asignaciones(context:TableContext):TableDefinition{
    var be = context.be;
    var admin = context.user.rol==='admin';
    var responsable = context.user.rol==='responsable';
    return {
        name:'asignaciones',
        elementName:'asignacion', 
        title:'Asignaciones', // solo si es distinto al "name", si es igual se puede omitir
        editable:admin || responsable,
        fields:[
            {name:'ficha'                       , typeName:'text'    }, 
            {name:'orden'                       , typeName:'text'    },
            {name:'tipo_asignacion'             , typeName:'text'    , options:['acta', 'comodato']},
            {name:'accion'                      , typeName:'text'    , options:['entrega', 'devolucion']},
            {name:'modalidaduso'                , typeName:'text'    , options:['trabajoremoto', 'prestamo']},//fk //transferencia pasaria a baja, consultar
            {name:'responsable'                 , typeName:'text'    , nullable:true},
            {name:'enusode'                     , typeName:'text'    },
            {name:'detalle'                     , typeName:'text'    },
            {name:'fecha_creacion'              , typeName:'date'    , nullable:false, specialDefaultValue:'current_date'},
            {name:'fecha_modificacion'          , typeName:'date'    , nullable:false},
            {name:'usuario_creacion'            , typeName:'text'    },
            {name:'usuario_modificacion'        , typeName:'text'    },

        ],
        primaryKey:['ficha'],
        foreignKeys:[
            {references:'bienes', fields:['ficha']},
            {references:'responsables', fields:['responsable']},
            {references:'usuarios', fields:[{source:'usuario_creacion' , target:'usuario'}], alias: 'usuario_creacion'},
            {references:'usuarios', fields:[{source:'usuario_modificacion' , target:'usuario'}], alias: 'usuario_modificacion'},
            // {references:'tipo_asignacion', fields:['tipo_asignacion']},
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


 

