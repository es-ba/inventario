"use strict";

import {TableDefinition, TableContext} from "./types-principal";
import {codigoTextoSql, textoDeSectorGuardadoSql} from "./table-bienes";
import {NOMBRE_DE_PERSONA} from "./calendario-fuentes";

const TEXTO_DE_ESPACIO = (alias:string) =>
    `concat_ws(' — ', nullif(btrim(${alias}.numero), ''), nullif(btrim(${alias}.denominacion), ''))`;

export const sqlMovimientosConsulta = `
SELECT m.ficha, m.orden, m.fecha_movimiento, m.momento,
       b.detalle AS bien,
       coalesce(nullif(btrim(g.descripcion), ''), b.grupo) AS grupo,
       coalesce(nullif(btrim(ma.descripcion), ''), b.marca) AS marca,
       b.modelo, b.serie,
       ${textoDeSectorGuardadoSql('m.sector_anterior', 'm.sector_sigla_anterior', 'm.sector_nombre_anterior')} AS de_sector,
       ${codigoTextoSql('m.responsable_anterior', NOMBRE_DE_PERSONA('dr'))} AS de_responsable,
       ${codigoTextoSql('m.espacio_anterior', TEXTO_DE_ESPACIO('de'))} AS de_espacio,
       ${textoDeSectorGuardadoSql('m.sector', 'm.sector_sigla', 'm.sector_nombre')} AS a_sector,
       ${codigoTextoSql('m.responsable', NOMBRE_DE_PERSONA('hr'))} AS a_responsable,
       ${codigoTextoSql('m.espacio', TEXTO_DE_ESPACIO('he'))} AS a_espacio,
       coalesce(nullif(btrim(am.descripcion), ''), m.accion) AS accion,
       m.acta_origen, m.usuario_creacion, m.detalle
  FROM (
      SELECT mb.*,
             lag(mb.sector) OVER w AS sector_anterior,
             lag(mb.sector_sigla) OVER w AS sector_sigla_anterior,
             lag(mb.sector_nombre) OVER w AS sector_nombre_anterior,
             lag(mb.responsable) OVER w AS responsable_anterior,
             lag(mb.espacio) OVER w AS espacio_anterior
        FROM movimientos_bien mb
      WINDOW w AS (PARTITION BY mb.ficha ORDER BY mb.orden)
  ) m
  JOIN bienes b ON b.ficha = m.ficha
  LEFT JOIN grupos g ON g.grupo = b.grupo
  LEFT JOIN marcas ma ON ma.marca = b.marca
  LEFT JOIN responsables dr ON dr.responsable = m.responsable_anterior
  LEFT JOIN espacios de ON de.espacio = m.espacio_anterior
  LEFT JOIN responsables hr ON hr.responsable = m.responsable
  LEFT JOIN espacios he ON he.espacio = m.espacio
  LEFT JOIN acciones_movimiento am ON am.accion_movimiento = m.accion
`;

export function movimientos_consulta(_context:TableContext):TableDefinition{
    return {
        name:'movimientos_consulta',
        elementName:'movimiento',
        title:'Consulta de movimientos',
        editable:false,
        allow:{insert:false, update:false, delete:false, deleteAll:false, import:false},
        fields:[
            {name:'ficha'            , typeName:'text'     , title:'ficha'},
            {name:'orden'            , typeName:'bigint'   , title:'orden'},
            {name:'fecha_movimiento' , typeName:'date'     , title:'fecha'},
            {name:'momento'          , typeName:'timestamp', title:'registrado'            , nullable:true},
            {name:'bien'             , typeName:'text'     , title:'descripción'           , nullable:true},
            {name:'grupo'            , typeName:'text'     , title:'grupo'                 , nullable:true},
            {name:'marca'            , typeName:'text'     , title:'marca'                 , nullable:true},
            {name:'modelo'           , typeName:'text'     , title:'modelo'                , nullable:true},
            {name:'serie'            , typeName:'text'     , title:'serie'                 , nullable:true},
            {name:'de_sector'        , typeName:'text'     , title:'de sector'             , nullable:true},
            {name:'de_responsable'   , typeName:'text'     , title:'de responsable directo', nullable:true},
            {name:'de_espacio'       , typeName:'text'     , title:'de espacio'            , nullable:true},
            {name:'a_sector'         , typeName:'text'     , title:'a sector'              , nullable:true},
            {name:'a_responsable'    , typeName:'text'     , title:'a responsable directo' , nullable:true},
            {name:'a_espacio'        , typeName:'text'     , title:'a espacio'             , nullable:true},
            {name:'accion'           , typeName:'text'     , title:'acción'                , nullable:true},
            {name:'acta_origen'      , typeName:'bigint'   , title:'N.º de solicitud'      , nullable:true},
            {name:'usuario_creacion' , typeName:'text'     , title:'usuario'               , nullable:true},
            {name:'detalle'          , typeName:'text'     , title:'detalle del movimiento', nullable:true},
        ],
        primaryKey:['ficha', 'orden'],
        sortColumns:[
            {column:'fecha_movimiento', order:-1},
            {column:'momento', order:-1},
            {column:'ficha', order:1},
            {column:'orden', order:-1},
        ],
        sql:{
            from:`(${sqlMovimientosConsulta})`,
        },
    };
}
