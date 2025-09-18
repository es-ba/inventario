"use strict";

import { FieldDefinition } from "backend-plus";
import {TableDefinition, TableContext} from "./types-principal";

export const area: FieldDefinition = {name: 'area', typeName: 'text', title: 'area'}

export function areas(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name:'areas',
        elementName:'área', 
        title:'áreas', // solo si es distinto al "name", si es igual se puede omitir
        editable:admin,
        fields:[
            area,
            {name:'nombre_area'        , typeName:'text'        , isName:true}, 
            {name:'sigla'              , typeName:'text'        },  
            {name:'descripcion'        , typeName:'text'        }, 
            {name:'pertenece_a'        , typeName:area.typeName , nullable:true, defaultValue:null },
            {name:'activo'             , typeName:'boolean'    , nullable: false, defaultValue: true},
            {name:'responsable'        , typeName:'text'        , nullable:true},
            {name:'tipo_area'          , typeName:'text'        },
            {name:'fecha_creacion'     , typeName:'date'        , defaultValue:null},
            {name:'fecha_modificacion' , typeName:'date'        , nullable:true, defaultValue:null},
        ],
        primaryKey:[area.name],
        foreignKeys:[
            {references:'areas', fields:[{source:'pertenece_a', target:'area'}], alias: 'pertenece_a'},
            {references:'tipo_area', fields:['tipo_area']},
            {references:'responsables', fields:['responsable']},
        ],
        constraints:[
            {constraintType:'unique', fields:['area']}
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
        sortColumns:[{column:'area', order:1}]
    };
}
