

"use strict";

import { TableDefinition, TableContext } from "./types-principal";

export const sqlBienesActivosPorResponsable = `
SELECT 
    b.*,
    ult.area,
    ult.sede,
    ult.responsable,
    ult.espacio,
    ult.enusode
    FROM bienes b
LEFT JOIN LATERAL (
    SELECT 
        mb.area,
        mb.sede,
        mb.responsable,
        mb.espacio,
        mb.enusode
    FROM movimientos_bien mb
    WHERE mb.ficha = b.ficha
    ORDER BY mb.orden DESC
    LIMIT 1
) ult ON true
 WHERE b.estado = 'alta'
`;


export function bienes_activos_por_responsable(_context: TableContext): TableDefinition {
  return {
    name: 'bienes_activos_por_responsable',
    elementName: 'bien',
    title: 'Bienes activos por responsable',
    editable: false,
    allow: { select: true, export: true },
    fields: [
   {name:'ficha'                       , typeName:'text'    }, 
            {name:'numero_integrado'            , typeName:'text'    }, 
            {name:'ubicacion'                   , typeName:'text'    , nullable:true},
            {name:'responsable'                 , typeName:'text'    , editable:false, inTable:false},
            {name:'observacion'                 , typeName:'text'    , nullable:true},
            {name:'detalle'                     , typeName:'text'    , nullable:true},
            {name:'importe'                     , typeName:'text'    , nullable:true},
            {name:'importetotal'                , typeName:'text'    , nullable:true},
            {name:'tipo_bien'                   , typeName:'text'    , nullable:true},
            {name:'estado'                      , typeName:'text'    , nullable:true},
            {name:'categoria'                   , typeName:'text'    , nullable:true},
            {name:'rubro'                       , typeName:'text'    , nullable:true},
            {name:'clase'                       , typeName:'text'    , nullable:true},
            {name:'cuenta'                      , typeName:'text'    , nullable:true},
            {name:'grupo'                       , typeName:'text'    , nullable:true},
            {name:'marca'                       , typeName:'text'    , nullable:true},
            {name:'serie'                       , typeName:'text'    , nullable:true},
            {name:'imei'                        , typeName:'text'    , nullable:true},
            {name:'modelo'                      , typeName:'text'    , nullable:true},
            {name:'annio'                       , typeName:'text'    , nullable:true},
            {name:'prd'                         , typeName:'text'    , nullable:true},
            {name:'caracteridentificador'       , typeName:'text'    , nullable:true},
            {name:'enusode'                     , typeName:'text'    , editable:false, inTable:false},
            {name:'clasificacion'               , typeName:'text'    , nullable:true},
            {name:'orden_compra'                , typeName:'text'    , nullable:true},
            {name:'fecha'                       , typeName:'date'    , nullable:false, specialDefaultValue:'current_date'},
            {name:'entidad_prestadora'          , typeName:'text'    , nullable:true},
            {name:'tipo_contrato'               , typeName:'text'    , nullable:true},
            {name:'fecha_inicio'                , typeName:'date'    , nullable:true},
            {name:'fecha_fin'                   , typeName:'date'    , nullable:true},
            {name:'renovable'                   , typeName:'boolean' , nullable:true, defaultValue:false},
            {name:'condiciones'                 , typeName:'text'    , nullable:true},
            {name:'costo_mensual'               , typeName:'decimal' , nullable:true},
            {name:'fecha_solicitud'             , typeName:'date'    , nullable:true},
            {name:'motivo_baja'                 , typeName:'text'    , nullable:true},
            {name:'valor_residual'              , typeName:'decimal' , nullable:true},
            {name:'autorizado_por'              , typeName:'text'    , nullable:true},
            {name:'documento_respaldo'          , typeName:'text'    , nullable:true},
            {name:'estado_baja'                 , typeName:'text'    , nullable:true},
            {name:'area'                        , typeName:'text'    , editable:false, inTable:false},
            {name:'sede'                        , typeName:'text'    , editable:false, inTable:false},
            {name:'espacio'                     , typeName:'text'    , editable:false, inTable:false},
            //{name:'codigo_barra'                , typeName:'text'    , inTable:false, editable:false},
    ],
    primaryKey: ['ficha'],
      sortColumns: [
    { column:'responsable', order: 1 },
    { column:'ficha', order: 1 }
  ],
    sql: {
      isTable: false,
      from: `(${sqlBienesActivosPorResponsable})`
    }
  };
}