//        [espacio]
//       ,[numero]
//       ,[tipo]
//       ,[ubicacion]
//       ,[denominacion]
//       ,[sector]
//       ,[responsable]
//       ,[sede]
"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function espacios(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name:'espacios',
        elementName:'espacio', 
        title:'espacio',
        editable:admin,
        fields:[
            {name:'espacio'             , typeName:'text'    }, 
            {name:'numero'              , typeName:'text'    },  
            {name:'tipo'                , typeName:'text'    }, 
            {name:'ubicacion'           , typeName:'text'    , isName:true}, 
            {name:'denominacion'        , typeName:'text'    , isName:true},
            {name:'sector'                , typeName:'text'    },
            {name:'responsable'         , typeName:'text'    },
            {name:'sede'                , typeName:'text'    },
            {name:'id_anterior'         , typeName:'text'    },
        ],
        primaryKey:['espacio'],
        foreignKeys:[
            {references:'tipo_espacio', fields:[{ source: 'tipo', target: 'tipo_espacio' }]},
            {references:'responsables', fields:['responsable']},
            {references:'sectores', fields:['sector']},
            {references:'sedes', fields:['sede']}
        ],
        constraints:[
            {constraintType:'unique', fields:['espacio']}
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
        //         all:{using:`(SELECT ${pol.all.using} FROM bienes WHERE sector = bienes.sector)`},
        //         select:{using:`(SELECT ${pol.select.using} FROM bienes WHERE sector = bienes.sector)`}
        //     }
        // },
        sortColumns:[{column:'espacio', order:1}]
    };
}
