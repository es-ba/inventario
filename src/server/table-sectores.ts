"use strict";

import { FieldDefinition } from "backend-plus";
import {TableDefinition, TableContext} from "./types-principal";

export const sector: FieldDefinition = {name: 'sector', typeName: 'text', title: 'sector'}

export function sectores(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name:'sectores',
        elementName:'sector', 
        title:'sectores',
        editable:admin,
        fields:[
            sector,
            {name:'nombre_sector'        , typeName:'text'        , isName:true},
            {name:'sigla'              , typeName:'text'        , isName:true},
            {name:'descripcion'        , typeName:'text'        },
            {name:'pertenece_a'        , typeName:sector.typeName , nullable:true, defaultValue:null },
            {name:'activo'             , typeName:'boolean'    , nullable: false, defaultValue: true},
            {name:'responsable'        , typeName:'text'        , nullable:true},
            {name:'tipo_sector'        , typeName:'text'        },
            {name:'id_anterior'        , typeName:'text'        , nullable:true},
            {name:'fecha_creacion'     , typeName:'date'        , defaultValue:null},
            {name:'fecha_modificacion' , typeName:'date'        , nullable:true, defaultValue:null},
        ],
        primaryKey:[sector.name],
        foreignKeys:[
            {references:'sectores', fields:[{source:'pertenece_a', target:'sector'}], alias: 'pertenece_a'},
            {references:'tipo_sector', fields:['tipo_sector'], displayFields:['descripcion']},
            {references:'responsables', fields:['responsable']},
        ],
        detailTables:[
            {table:'sectores', fields:[{source:'sector', target:'pertenece_a'}],
                abr:'Sec', label:'Sectores que dependen'},
            {table:'espacios', fields:['sector'], abr:'Esp', label:'Espacios'},
            {table:'responsables', fields:['sector'], abr:'Per', label:'Personal'},
        ],
        constraints:[
            {constraintType:'unique', fields:['sector']}
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
        sortColumns:[{column:'sector', order:1}]
    };
}
