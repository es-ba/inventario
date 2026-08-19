"use strict";

import { FieldDefinition } from "backend-plus";
import {TableDefinition, TableContext} from "./types-principal";

export const responsable: FieldDefinition = {name: 'responsable', typeName: 'text', title: 'responsable'}

export function responsables(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name:'responsables',
        elementName:'responsable', 
        title:'Responsables', // solo si es distinto al "name", si es igual se puede omitir
        editable:admin,
        fields:[
            responsable,
            {name:'nombre'                  , typeName:'text'       },  
            {name:'apellido'                , typeName:'text'       , isName:true}, 
            {name:'mail'                    , typeName:'text'       },
            // Datos personales que pide el comodato (F-SA-12). Sin ellos el documento sale
            // con líneas de puntos para completar a mano.
            {name:'dni'                     , typeName:'text'    , nullable:true},
            {name:'domicilio'               , typeName:'text'    , nullable:true},
            {name:'telefono'                , typeName:'text'    , nullable:true},
            // El cargo con el que la persona firma: "Director Ejecutivo", "agente", etc.
            {name:'caracter'                , typeName:'text'    , nullable:true},
            {name:'situacion_revista'       , typeName:'text'    , nullable:true},
            {name:'externo'                 , typeName:'boolean'    , defaultValue:false},
            {name:'usuario'                 , typeName:'text'       , nullable:true},
            {name:'activo'                  , typeName:'boolean'    , defaultValue:true},
            {name:'fecha_creacion'          , typeName:'date'    , defaultDbValue:'current_date'},
            {name:'fecha_modificacion'      , typeName:'date'    , nullable:true, defaultValue:null},
            {name:'id_anterior'             , typeName:'text'    , nullable:true},

        ],
        primaryKey:[responsable.name],
        constraints:[
            {constraintType:'unique', fields:['responsable']}
        ],
        foreignKeys:[
            {references:'usuarios', fields:['usuario']},
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