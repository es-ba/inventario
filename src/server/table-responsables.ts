//        [responsable]
//       ,[nombre]
//       ,[apellido]
//       ,[mail]
//       ,[externo]
//       ,[usuario]
"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function grupos(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    var responsable = context.user.rol==='responsable';
    return {
        name:'responsables',
        elementName:'responsable', 
        title:'Responsables', // solo si es distinto al "name", si es igual se puede omitir
        editable:admin || responsable,
        fields:[
            {name:'responsable'             , typeName:'text'    }, 
            {name:'nombre'                  , typeName:'text'    },  
            {name:'apellido'                , typeName:'text'    }, 
            {name:'mail'                    , typeName:'text'    },
            {name:'externo'                 , typeName:'text'    },
            {name:'usuario'                 , typeName:'text'    },
        ],
        primaryKey:['responsable'],
        // foreignKeys:[
        //     {references:'grupos', fields:[{source:'parent', target:'area'}], alias: 'pertenece_a'}
        // ],
        constraints:[
            {constraintType:'unique', fields:['responsable']}
        ],
        // sql:{
        //     /* 
        //        ATENCIÓN
        //        --------
        //        Las pólicies son algo nuevo en backend-plus, utilizan las policies de PostgreSQL: https://www.postgresql.org/docs/9.5/ddl-rowsecurity.html
        //        Permiten cambiar los permisos en función del contenido de cada registro.

        //        Como son nuevas es complicado de usarlas, hay que definir todo a mano.
        //        Más adelante la forma de hacer esto puede cambiar o pueden haber herramientas que lo hagan más simple.
               
        //        Acá las "policies" se heredan de la tabla padre, lo cual lo hace más complejo aún.
        //     */
        //     policies:{
        //         all:{using:`(SELECT ${pol.all.using} FROM bienes WHERE area = bienes.area)`},
        //         select:{using:`(SELECT ${pol.select.using} FROM bienes WHERE area = bienes.area)`}
        //     }
        // },
        sortColumns:[{column:'responsable', order:1}]
    };
}