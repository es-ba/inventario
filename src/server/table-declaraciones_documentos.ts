"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function declaraciones_documentos(_context:TableContext):TableDefinition{
    return {
        name:'declaraciones_documentos',
        elementName:'declaracion_documento',
        title:'Documentos de la declaración',
        editable:false,
        allow:{insert:true, update:false, delete:false, deleteAll:false},
        fields:[
            {name:'declaracion'            , typeName:'bigint'   , nullable:false, editable:false},
            {name:'version'                , typeName:'bigint'   , nullable:false, editable:false},
            {name:'tipo'                   , typeName:'text'     , nullable:false, editable:false, options:['emitido','firmado']},
            {name:'archivo'                , typeName:'text'     , nullable:false, editable:false},
            {name:'hash_sha256'            , typeName:'text'     , nullable:false, editable:false, title:'hash del archivo'},
            {name:'codigo_contenido'       , typeName:'text'     , nullable:true , editable:false, title:'código impreso'},
            {name:'fecha'                  , typeName:'timestamp', nullable:false, defaultDbValue:'current_timestamp', editable:false, title:'📅'},
            {name:'usuario'                , typeName:'text'     , nullable:true , editable:false},
            {name:'firmante_declarado'     , typeName:'text'     , nullable:true , editable:false},
            {name:'resultado_verificacion' , typeName:'text'     , nullable:true , editable:false},
            {name:'bajar'                  , typeName:'text'     , editable:false, clientSide:'bajarDocumentoDeclaracion'},
        ],
        primaryKey:['declaracion','version','tipo'],
        foreignKeys:[
            {references:'declaraciones', fields:['declaracion']},
            {references:'usuarios', fields:['usuario']},
        ],
        hiddenColumns:['archivo'],
        sortColumns:[{column:'version', order:-1}, {column:'tipo', order:1}],
        selfRefresh:true,
        refrescable:true,
    };
}
