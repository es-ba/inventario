"use strict";

import { FieldDefinition } from "backend-plus";
import {TableDefinition, TableContext} from "./types-principal";
import {politicasResponsables} from "./politicas";
import {VINCULOS_CON_EL_BIEN} from "./reportes-bienes";

export const responsable: FieldDefinition = {name: 'responsable', typeName: 'text', title: 'responsable'}

export function responsables(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name:'responsables',
        elementName:'responsable', 
        title:'Responsables',
        editable:admin,
        fields:[
            {...responsable, nullable:true, editable:false},
            {name:'apellido'                , typeName:'text'       , isName:true},
            {name:'nombre'                  , typeName:'text'       , isName:true},
            {name:'mail'                    , typeName:'text'       },
            {name:'dni'                     , typeName:'text'    , nullable:true},
            {name:'cuil'                    , typeName:'text'    , nullable:true, editable:false},
            {name:'tipo_doc'                , typeName:'text'    , nullable:true, editable:false},
            {name:'documento'               , typeName:'text'    , nullable:true, editable:false},
            {name:'ficha_siper'             , typeName:'text'    , nullable:true, editable:false, title:'ficha'},
            {name:'es_jefe'                 , typeName:'boolean' , nullable:true},
            {name:'fecha_ingreso'           , typeName:'date'    , nullable:true, editable:false},
            {name:'fecha_egreso'            , typeName:'date'    , nullable:true, editable:false},
            {name:'domicilio'               , typeName:'text'    , nullable:true, editable:false},
            {name:'telefono'                , typeName:'text'    , nullable:true, editable:false},
            {name:'caracter'                , typeName:'text'    , nullable:true},
            {name:'situacion_revista'       , typeName:'text'    , nullable:true, editable:false},
            {name:'externo'                 , typeName:'boolean'    , defaultValue:false},
            {name:'sector'                  , typeName:'text'    , nullable:true},
            {name:'activo'                  , typeName:'boolean'    , defaultValue:true},
            {name:'activo_siper'            , typeName:'boolean' , nullable:true, editable:false},
            {name:'fecha_creacion'          , typeName:'date'    , defaultDbValue:'current_date'},
            {name:'fecha_modificacion'      , typeName:'date'    , nullable:true, defaultValue:null},
            {name:'id_anterior'             , typeName:'text'    , nullable:true},
            {name:'idper'                   , typeName:'text'    , nullable:true, postInput:'upperWithoutDiacritics'},

        ],
        primaryKey:[responsable.name],
        constraints:[
            {constraintType:'unique', fields:['responsable']},
            {constraintType:'unique', fields:['idper']},
            {constraintType:'check', consName:'responsables_clave_idper',
                expr:`(idper IS NULL OR responsable = idper) AND (idper IS NOT NULL OR responsable !~ '^[A-Z]{2}[0-9]+$')`},
        ],
        foreignKeys:[
            {references:'sectores', fields:['sector'], displayFields:['sigla']},
        ],
        detailTables:[
            ...VINCULOS_CON_EL_BIEN.map(vinculo => ({
                table:'reporte_bienes_listado',
                fields:[{source:'responsable', target:vinculo.columna}],
                abr:vinculo.detalle.abr,
                label:vinculo.detalle.label,
            })),
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
        sql:{
            policies:politicasResponsables()
        },
        hiddenColumns:['id_anterior'],
        sortColumns:[{column:'responsable', order:1}]
    };
}