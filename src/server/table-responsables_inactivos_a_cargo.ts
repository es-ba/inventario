"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export const sqlUltimoMovimientoDeBienesActivos = `
    SELECT DISTINCT ON (mb.ficha) mb.ficha, mb.responsable, mb.enusode_responsable
      FROM movimientos_bien mb
      JOIN bienes b ON b.ficha = mb.ficha AND b.activo
     ORDER BY mb.ficha, mb.orden DESC
`;

export const sqlResponsablesInactivosACargo = `
    WITH ultimo AS (${sqlUltimoMovimientoDeBienesActivos}),
    a_cargo AS (
        SELECT 'responsable directo'::text AS vinculo, u.responsable, u.ficha, NULL::text AS sector
          FROM ultimo u WHERE u.responsable IS NOT NULL
        UNION ALL
        SELECT 'en uso de', u.enusode_responsable, u.ficha, NULL
          FROM ultimo u WHERE u.enusode_responsable IS NOT NULL
        UNION ALL
        SELECT 'jefe de sector', s.responsable, NULL, s.sector
          FROM sectores s WHERE s.activo AND s.responsable IS NOT NULL
    )
    SELECT a.vinculo, coalesce(a.ficha, a.sector) AS objeto, a.responsable, a.ficha, a.sector,
           concat_ws(', ', r.apellido, r.nombre) AS responsable_nombre
      FROM a_cargo a
      JOIN responsables r ON r.responsable = a.responsable AND r.activo IS FALSE
`;

export function responsables_inactivos_a_cargo(context:TableContext):TableDefinition{
    const admin = context.user.rol === 'admin';
    return {
        name:'responsables_inactivos_a_cargo',
        elementName:'pendiente',
        title:'a cargo de responsables inactivos',
        editable:false,
        fields:[
            {name:'vinculo'            , typeName:'text', title:'vínculo'},
            {name:'objeto'             , typeName:'text', visible:false},
            {name:'responsable'        , typeName:'text'},
            {name:'responsable_nombre' , typeName:'text', title:'nombre del responsable'},
            {name:'ficha'              , typeName:'text'},
            {name:'sector'             , typeName:'text'},
        ],
        primaryKey:['vinculo', 'objeto'],
        sortColumns:[{column:'responsable'}, {column:'vinculo'}, {column:'objeto'}],
        foreignKeys:[
            {references:'bienes', fields:['ficha'], displayFields:['detalle']},
            {references:'sectores', fields:['sector'], displayFields:['sigla', 'nombre_sector']},
        ],
        sql:{
            isTable:false,
            from:`(${sqlResponsablesInactivosACargo})`,
            where:admin ? 'true' : 'false',
        },
    };
}
