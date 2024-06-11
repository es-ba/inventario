"use strict";

import {TableDefinition, TableContext} from "./types-principal";

import { getPolicies } from "./table-bienes";

export function areas(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    var redactor = context.user.rol==='redactor';
    var pol = getPolicies(context.be);
    return {
        name:'areas',
        elementName:'área', 
        title:'áreas', // solo si es distinto al "name", si es igual se puede omitir
        editable:admin || redactor,
        fields:[
            {name:'area'             , typeName:'text'    , nullable:false}, 
            {name:'sigla'              , typeName:'text'    }, 
            {name:'descripcion'        , typeName:'text'    }, 
            {name:'parent'             , typeName:'text'    }, 
            {name:'responsable'        , typeName:'text'    },
        ],
        primaryKey:['area'],
        foreignKeys:[
            {references:'bienes', fields:['area']}
        ],
        constraints:[
            {constraintType:'unique', fields:['area']}
        ],
        sql:{
            /* 
               ATENCIÓN
               --------
               Las pólicies son algo nuevo en backend-plus, utilizan las policies de PostgreSQL: https://www.postgresql.org/docs/9.5/ddl-rowsecurity.html
               Permiten cambiar los permisos en función del contenido de cada registro.

               Como son nuevas es complicado de usarlas, hay que definir todo a mano.
               Más adelante la forma de hacer esto puede cambiar o pueden haber herramientas que lo hagan más simple.
               
               Acá las "policies" se heredan de la tabla padre, lo cual lo hace más complejo aún.
            */
            policies:{
                all:{using:`(SELECT ${pol.all.using} FROM bienes WHERE url = ejemplo_vinculos.url)`},
                select:{using:`(SELECT ${pol.select.using} FROM bienes WHERE url = ejemplo_vinculos.url)`}
            }
        },
        sortColumns:[{column:'area', order:1}]
    };
}
