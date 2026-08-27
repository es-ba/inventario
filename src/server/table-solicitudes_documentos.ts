"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function solicitudes_documentos(_context:TableContext):TableDefinition{
    return {
        name:'solicitudes_documentos',
        elementName:'documento',
        title:'Documentos de la solicitud',
        editable:false,
        allow:{insert:true, update:true, delete:true, deleteAll:false},
        fields:[
            {name:'acta'              , typeName:'text'     , nullable:false, editable:false},
            {name:'tipo'              , typeName:'text'     , nullable:false, editable:false,
                options:['comodato', 'acta']},
            {name:'version'           , typeName:'bigint'   , nullable:false, editable:false},
            {name:'archivo'           , typeName:'text'     , nullable:false, editable:false},
            {name:'hash_sha256'       , typeName:'text'     , nullable:false, editable:false,
                title:'hash del emitido'},
            {name:'codigo_contenido'  , typeName:'text'     , nullable:true , editable:false,
                title:'código impreso'},
            {name:'fecha'             , typeName:'timestamp', nullable:false, editable:false,
                defaultDbValue:'current_timestamp', title:'emitido'},
            {name:'usuario'           , typeName:'text'     , nullable:true , editable:false},
            {name:'archivo_firmado'   , typeName:'text'     , nullable:true , editable:false},
            {name:'hash_firmado'      , typeName:'text'     , nullable:true , editable:false},
            {name:'fecha_firmado'     , typeName:'timestamp', nullable:true , editable:false,
                title:'firmado'},
            {name:'usuario_firmado'   , typeName:'text'     , nullable:true , editable:false},
            {name:'firmante_declarado', typeName:'text'     , nullable:true , editable:false,
                title:'firmante (no validado)'},
            {name:'bajar'             , typeName:'text'     , editable:false,
                clientSide:'bajarDocumentoSolicitud'},
        ],
        primaryKey:['acta', 'tipo', 'version'],
        foreignKeys:[
            {references:'movimientos_solicitudes', fields:['acta']},
            {references:'usuarios', fields:['usuario']},
        ],
        hiddenColumns:['archivo', 'archivo_firmado', 'hash_sha256', 'hash_firmado'],
        sortColumns:[{column:'tipo', order:1}, {column:'version', order:-1}],
        selfRefresh:true,
        refrescable:true,
    };
}
