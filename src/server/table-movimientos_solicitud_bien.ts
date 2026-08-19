"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function movimientos_solicitud_bien(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    var responsable = context.user.rol==='responsable';
    
    return {
        name:'movimientos_solicitud_bien',
        elementName:'movimiento_solicitud_bien', 
        title:'bienes por solicitud de movimiento',
        editable:admin || responsable,
        fields:[
            {name:'acta'                        , typeName:'text'    , nullable:false},
            {name:'ficha'                       , typeName:'text'    , nullable:false},
            {name:'observaciones'               , typeName:'text'    , nullable:true}, // Por si necesitas notas por bien
            {name:'verificado'                  , typeName:'boolean' , nullable:true, defaultValue:false}, // Para marcar cuando se verifica
            {name:'fecha_creacion'              , typeName:'date'    , nullable:false, defaultDbValue:'current_date', editable:false},
            {name:'fecha_modificacion'          , typeName:'date'    , nullable:true, editable:false},
            {name:'usuario_creacion'            , typeName:'text'    , nullable:true, editable:false},
            {name:'usuario_modificacion'        , typeName:'text'    , nullable:true, editable:false},
        ],
        primaryKey:['acta','ficha'],
        foreignKeys:[
            {references:'movimientos_solicitudes', fields:['acta']},
            /*
                displayFields trae la descripción del bien junto a la ficha. Son los mismos
                datos con los que se lo busca al agregarlo: una lista de fichas peladas no
                deja controlar qué se está por mover.

                No cuesta una consulta extra: el join con bienes ya lo hace la foreign key,
                displayFields sólo agrega columnas al select.
            */
            {references:'bienes', fields:['ficha'], displayFields:['detalle', 'modelo', 'serie']},
            {references:'usuarios', fields:[{source:'usuario_creacion' , target:'usuario'}], alias: 'usuario_creacion'},
            {references:'usuarios', fields:[{source:'usuario_modificacion' , target:'usuario'}], alias: 'usuario_modificacion'},
        ],
        detailTables:[
            {table:'bienes', fields:['ficha'], abr:'B'}
        ]
    };
}