"use strict";

import {TableDefinition, TableContext} from "./types-principal";

/*
    Documentos de una solicitud de movimiento: el comodato y el acta de entrega.

    Una fila por documento emitido. El archivo firmado que vuelve se guarda en la misma
    fila, porque cada emisión admite a lo sumo una devolución firmada.

    El documento se emite con el mismo campo de firma que las declaraciones, y al recargarlo
    se verifica que efectivamente venga firmado (nivel 1).

    Lo que NO se verifica —a diferencia de las declaraciones— es que el archivo que vuelve
    sea byte a byte el que se emitió (nivel 2). El hash del emitido y el del recargado se
    guardan igual, como rastro de qué archivo se generó y cuál volvió.

    Una emisión se puede borrar; el trigger encola sus archivos para que el cron los saque
    del disco. Lo que no se puede es alterar una fila para que diga otra cosa.
*/
export function solicitudes_documentos(_context:TableContext):TableDefinition{
    return {
        name:'solicitudes_documentos',
        elementName:'documento',
        title:'Documentos de la solicitud',
        editable:false,
        // insert:true para el GRANT: los procedures insertan como el usuario de la app.
        // Que no se carguen a mano lo garantizan los campos no editables y el trigger de
        // inmutabilidad, no la falta de permiso.
        //
        // delete:true para poder dar de baja una emisión equivocada. deleteAll queda en
        // false: borrar el historial entero de una solicitud de un saque no es una
        // operación que tenga sentido ofrecer.
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
