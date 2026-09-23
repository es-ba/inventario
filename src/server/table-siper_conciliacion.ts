"use strict";

import {TableDefinition, TableContext} from "./types-principal";
import {sqlUltimoMovimientoDeBienesActivos} from "./table-responsables_inactivos_a_cargo";

export const SITUACIONES_SIPER = [
    'inactivo siper',
    'alta',
    'posible duplicado',
    'inactivo en inventario',
    'ausente en siper',
    'sólo en inventario',
    'sincronizado',
] as const;

const normalizado = (expresion:string) =>
    `upper(translate(btrim(coalesce(${expresion}, '')), 'áéíóúäëïöüñÁÉÍÓÚÄËÏÖÜÑ', 'aeiouaeiounAEIOUAEIOUN'))`;

export const sqlSiperConciliacion = `
    WITH ultimo AS (${sqlUltimoMovimientoDeBienesActivos}),
    hubo_recepcion AS (SELECT EXISTS (SELECT 1 FROM siper_personas) AS si),
    cruce AS (
        SELECT coalesce(r.responsable, sp.idper) AS clave,
               r.responsable, coalesce(r.idper, sp.idper) AS idper,
               coalesce(r.apellido, sp.apellido) AS apellido,
               coalesce(r.nombre, sp.nombres) AS nombre,
               r.sector, sp.sector AS sector_siper,
               r.activo AS activo_inventario,
               CASE WHEN r.responsable IS NULL THEN sp.activo ELSE r.activo_siper END AS activo_siper,
               coalesce(r.fecha_egreso, sp.fecha_egreso) AS fecha_egreso,
               sp.idper IS NOT NULL AS recibido
          FROM responsables r
          FULL JOIN siper_personas sp ON sp.idper = r.idper
         WHERE r.responsable IS NOT NULL OR sp.activo
    )
    SELECT c.*,
           CASE
             WHEN c.responsable IS NULL AND EXISTS (
                SELECT 1 FROM responsables l
                 WHERE l.idper IS NULL
                   AND ${normalizado('l.apellido')} = ${normalizado('c.apellido')}
                   AND split_part(${normalizado('l.nombre')}, ' ', 1) = split_part(${normalizado('c.nombre')}, ' ', 1)
             ) THEN 'posible duplicado'
             WHEN c.responsable IS NULL THEN 'alta'
             WHEN c.idper IS NULL THEN 'sólo en inventario'
             WHEN c.activo_inventario AND c.activo_siper IS FALSE THEN 'inactivo siper'
             WHEN c.activo_inventario IS FALSE AND c.activo_siper THEN 'inactivo en inventario'
             WHEN c.activo_siper IS NULL OR ((SELECT si FROM hubo_recepcion) AND NOT c.recibido) THEN 'ausente en siper'
             ELSE 'sincronizado'
           END AS situacion,
           (SELECT count(*) FROM ultimo u WHERE u.responsable = c.responsable)::integer AS bienes_directos,
           (SELECT count(*) FROM ultimo u WHERE u.enusode_responsable = c.responsable)::integer AS bienes_en_uso,
           (SELECT count(*) FROM sectores s WHERE s.activo AND s.responsable = c.responsable)::integer AS sectores_a_cargo
      FROM cruce c
`;

export function siper_conciliacion(context:TableContext):TableDefinition{
    const admin = context.user.rol === 'admin';
    return {
        name:'siper_conciliacion',
        elementName:'persona',
        title:'personas: inventario y siper',
        editable:false,
        fields:[
            {name:'clave'             , typeName:'text', visible:false},
            {name:'situacion'         , typeName:'text', title:'situación'},
            {name:'responsable'       , typeName:'text'},
            {name:'idper'             , typeName:'text'},
            {name:'apellido'          , typeName:'text', isName:true},
            {name:'nombre'            , typeName:'text', isName:true},
            {name:'sector'            , typeName:'text'},
            {name:'sector_siper'      , typeName:'text', title:'sector (siper)'},
            {name:'activo_inventario' , typeName:'boolean', title:'activo en inventario'},
            {name:'activo_siper'      , typeName:'boolean', title:'activo en siper'},
            {name:'fecha_egreso'      , typeName:'date', title:'egreso (siper)'},
            {name:'recibido'          , typeName:'boolean', title:'en la última recepción'},
            {name:'bienes_directos'   , typeName:'integer', title:'bienes como responsable directo'},
            {name:'bienes_en_uso'     , typeName:'integer', title:'bienes en uso'},
            {name:'sectores_a_cargo'  , typeName:'integer', title:'sectores a cargo'},
        ],
        primaryKey:['clave'],
        sortColumns:[{column:'situacion'}, {column:'apellido'}, {column:'nombre'}],
        foreignKeys:[
            {references:'sectores', fields:['sector'], displayFields:['sigla']},
        ],
        sql:{
            isTable:false,
            from:`(${sqlSiperConciliacion})`,
            where:admin ? 'true' : 'false',
        },
    };
}
