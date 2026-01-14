"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function acciones(context:TableContext):TableDefinition {
    var admin = context.user.rol==='admin';
    return {
        name:'acciones',
        elementName:'accion',
        editable:admin,
        fields:[
            {name:'eaccion'                  , typeName:'text',    nullable: false},
            {name:'abr_eaccion'              , typeName:'text'},
            {name:'desactiva_boton'          , typeName:'boolean', nullable: false, defaultDbValue: 'false'},
            {name:'path_icono_svg'           , typeName:'text'},
            {name:'icono'                    , typeName:'text'        , editable:false   , inTable:false, clientSide:'verIconoSvg'},
            {name:'desc_eaccion'             , typeName:'text'},
            {name:'confirma'                 , typeName:'boolean', nullable: false, defaultDbValue: 'false'},
        ],
        primaryKey:['eaccion'],
        detailTables: [
            {table: "estados_acciones", fields: ["eaccion"], abr: "e", label:"estados"}
        ],
    };
}