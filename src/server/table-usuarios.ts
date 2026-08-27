"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function usuarios(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name:'usuarios',
        title:'Usuarios de la Aplicación',
        editable:admin,
        fields:[
            {name:'usuario'          , typeName:'text'    , nullable:false  },
            {name:'rol'              , typeName:'text'    },
            {name:'responsable'      , typeName:'text'    , nullable:true},
            {name:'md5clave'         , typeName:'text'    , allow:{select: context.forDump} },
            {name:'activo'           , typeName:'boolean' , nullable:false ,defaultValue:false},
            {name:'nombre'           , typeName:'text'                      },
            {name:'apellido'         , typeName:'text'                      },
            {name:'telefono'         , typeName:'text'    , title:'teléfono'},
            {name:'interno'          , typeName:'text'                      },
            {name:'mail'             , typeName:'text'                      },
            {name:'mail_alternativo' , typeName:'text'                      },
            {name:'clave_nueva'      , typeName:'text', clientSide:'newPass', allow:{select:admin, update:true, insert:false}},
        ],
        primaryKey:['usuario'],
        foreignKeys:[
            {references:'roles', fields:[{ source: 'rol', target: 'rol' }]},
            {references:'responsables', fields:['responsable'], displayFields:['apellido','nombre']},
        ],
        sql:{
            where:admin || context.forDump?'true':"usuario = "+context.be.db.quoteNullable(context.user.usuario)
        }
    };
}
