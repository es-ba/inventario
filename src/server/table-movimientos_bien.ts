"use strict";

import {TableDefinition, TableContext, AppBackend} from "./types-principal";
import {politicasPorElBien} from "./politicas";
import {textoONuloSql} from "./table-bienes";

export const sqlMovimientosBien = `
SELECT mb.*,
    ${textoONuloSql(`concat_ws(', ',
        nullif(btrim(r.apellido), ''),
        nullif(btrim(r.nombre), '')
    )`)} AS responsable_nombre,
    ${textoONuloSql('s.responsable')} AS responsable_sector,
    ${textoONuloSql(`concat_ws(', ',
        nullif(btrim(rs.apellido), ''),
        nullif(btrim(rs.nombre), '')
    )`)} AS responsable_sector_nombre
FROM movimientos_bien mb
LEFT JOIN responsables r ON r.responsable = mb.responsable
LEFT JOIN sectores s ON s.sector = mb.sector
LEFT JOIN responsables rs ON rs.responsable = s.responsable
`;

export function getPolicies(_be?:AppBackend){
    return politicasPorElBien('ficha');
}

export function movimientos_bien(context:TableContext):TableDefinition{
    var be = context.be;
    
    return {
        name:'movimientos_bien',
        elementName:'movimiento_bien', 
        title:'movimientos de bienes',
        editable:context.es.administrativo,
        fields:[
            {name:'ficha'                       , typeName:'text'    , nullable:false}, 
            {name:'orden'                       , typeName:'bigint'  , nullable:false, editable:false},
            {name:'tipo_asignacion'             , typeName:'text'    , nullable:true},
            {name:'accion'                      , typeName:'text'    , nullable:true},
            {name:'modalidad_uso'               , typeName:'text'    , nullable:true},
            {name:'responsable'                 , typeName:'text'    , nullable:true},
            {name:'responsable_nombre'          , typeName:'text'    , nullable:true, editable:false, inTable:false,
                title:'responsable directo'},
            {name:'sector'                        , typeName:'text'    , nullable:true},
            {name:'responsable_sector'          , typeName:'text'    , nullable:true, editable:false, inTable:false,
                title:'cód. responsable del sector'},
            {name:'responsable_sector_nombre'   , typeName:'text'    , nullable:true, editable:false, inTable:false,
                title:'responsable del sector'},
            {name:'sede'                        , typeName:'text'    , nullable:true},
            {name:'espacio'                     , typeName:'text'    , nullable:true},
            {name:'puesto'                      , typeName:'integer' , nullable:true},
            {name:'enusode'                     , typeName:'text'    , nullable:true},
            {name:'enusode_responsable'         , typeName:'text'    , nullable:true},
            {name:'detalle'                     , typeName:'text'    , nullable:true},
            {name:'fecha_movimiento'            , typeName:'date'    , nullable:false, defaultDbValue:'current_date', editable:false},
            {name:'fecha_creacion'              , typeName:'date'    , nullable:false, defaultDbValue:'current_date', editable:false},
            {name:'fecha_modificacion'          , typeName:'date'    , nullable:true, editable:false},
            {name:'usuario_creacion'            , typeName:'text'    , nullable:true, editable:false},
            {name:'usuario_modificacion'        , typeName:'text'    , nullable:true, editable:false},
            {name:'autorizado_por'              , typeName:'text'    , nullable:true},
            {name:'firmado_por'                 , typeName:'text'    , nullable:true},
            {name:'acta_origen'                 , typeName:'bigint'  , nullable:true, editable:false},
        ],
        primaryKey:['ficha', 'orden'],
        sortColumns:[{column:'orden', order:-1}], 
        foreignKeys:[
            {references:'bienes', fields:['ficha']},
            {references:'responsables', fields:['responsable'], displayFields:[]},
            {references:'responsables', fields:[{source:'enusode_responsable', target:'responsable'}],
                alias:'enusode_responsable', displayFields:['apellido', 'nombre']},
            {references:'responsables', fields:[{source:'autorizado_por', target:'responsable'}],
                alias:'autorizado_por', displayFields:['apellido', 'nombre']},
            {references:'responsables', fields:[{source:'firmado_por', target:'responsable'}],
                alias:'firmado_por', displayFields:['apellido', 'nombre']},
            {references:'usuarios', fields:[{source:'usuario_creacion' , target:'usuario'}], alias: 'usuario_creacion'},
            {references:'usuarios', fields:[{source:'usuario_modificacion' , target:'usuario'}], alias: 'usuario_modificacion'},
            {references:'sectores', fields:['sector'], displayFields:['sigla', 'nombre_sector']},
            {references:'sedes', fields:['sede'], displayFields:['descripcion']},
            {references:'espacios', fields:['espacio'], displayFields:['numero', 'denominacion']},
            {references:'acciones_movimiento', fields:[{source:'accion', target:'accion_movimiento'}],
                displayFields:[]},
            {references:'tipo_asignacion', fields:['tipo_asignacion'], displayFields:[]},
            {references:'modalidad_uso', fields:['modalidad_uso'], displayFields:[]},
            {references:'movimientos_solicitudes', fields:[{source:'acta_origen', target:'acta'}], alias:'solicitud_origen'},
        ],
        constraints:[{constraintType:'unique', fields:['acta_origen', 'ficha']}],
        hiddenColumns:['responsable_sector'],
        sql:{
            isTable:true,
            from:`(${sqlMovimientosBien})`,
            policies:getPolicies(be)
        }
    };
}
