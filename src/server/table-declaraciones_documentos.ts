"use strict";

import {TableDefinition, TableContext} from "./types-principal";

/*
    Documentos emitidos y firmados de cada declaración.

    Se versionan: si una declaración se observa y se re-emite, la versión anterior
    queda archivada. Los documentos nunca se borran ni se pisan: son la evidencia
    de lo que el responsable firmó.

    Los campos firmante_declarado y resultado_verificacion los completa la carga
    del documento firmado (fase 2), por eso son nullable.
*/
export function declaraciones_documentos(_context:TableContext):TableDefinition{
    return {
        name:'declaraciones_documentos',
        elementName:'declaracion_documento',
        title:'Documentos de la declaración',
        editable:false, // los genera el sistema, no se cargan a mano
        // insert:true es necesario para el GRANT: backend-plus deriva los permisos de SQL
        // de este objeto, y sin él el procedure de emisión no puede insertar la fila.
        // Que no se puedan cargar a mano lo garantizan los campos no editables y el
        // trigger declaraciones_documentos_inmutable_trg, no la falta de permiso.
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
