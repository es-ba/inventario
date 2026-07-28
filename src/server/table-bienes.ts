"use strict";

import {TableDefinition, TableContext, AppBackend} from "./types-principal";

export function getPolicies(be:AppBackend){
    return {
        select:{ using: `${be.dbUserRolExpr} = 'admin'`},
        all:{ using: `${be.dbUserRolExpr} = 'admin'`}
    }
}

export const sqlBienes = `
SELECT 
      b.*,
    ult.area,
    ult.sede,
    ult.responsable,
    ult.espacio,
    ult.enusode,
    ult.nombre_area,
    ult.sede_nombre,
    ult.responsable_nombre,
    ult.espacio_numero
    FROM bienes b
LEFT JOIN LATERAL (
    SELECT 
        mb.area,
        a.nombre_area,
        mb.sede,
        s.descripcion AS sede_nombre,
        mb.responsable,
        r.apellido || ', ' || r.nombre AS responsable_nombre,
        mb.espacio,
        e.numero AS espacio_numero,
        mb.enusode
    FROM movimientos_bien mb
    LEFT JOIN areas a ON a.area = mb.area
    LEFT JOIN sedes s ON s.sede = mb.sede
    LEFT JOIN responsables r ON r.responsable = mb.responsable
    LEFT JOIN espacios e ON e.espacio = mb.espacio
    WHERE mb.ficha = b.ficha
    ORDER BY mb.orden DESC
    LIMIT 1
) ult ON true
`;

export function bienes(context:TableContext):TableDefinition{
    var be = context.be;
    var admin = context.user.rol==='admin';
    var responsable = context.user.rol==='responsable';
    return {
        name:'bienes',
        elementName:'bien', 
        title:'Bienes',
        editable:admin || responsable,
        allow:{ delete:false, deleteAll:false },
        fields:[
            {name:'ficha'                       , typeName:'text'    }, 
            {name:'numero_integrado'            , typeName:'text'    , nullable:true}, 
            {name:'ubicacion'                   , typeName:'text'    , nullable:true},
            {name:'observacion'                 , typeName:'text'    , nullable:true},
            {name:'aclaracion'                  , typeName:'text'    , nullable:true},
            {name:'detalle'                     , typeName:'text'    , nullable:true},
            {name:'importe'                     , typeName:'text'    , nullable:true},
            {name:'importetotal'                , typeName:'text'    , nullable:true},
            {name:'tipo_bien'                   , typeName:'text'    , nullable:true},
            {name:'estado'                      , typeName:'text'    , nullable:true},
            {name:'estado_bien_viejo'           , typeName:'text'    , nullable:true},
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
            {name:'fecha'                       , typeName:'date'    , specialDefaultValue:'current_date'},
            {name:'entidad_prestadora'          , typeName:'text'    , nullable:true},
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
            {name:'responsable'                 , typeName:'text'    , editable:false, inTable:false},
            {name:'espacio'                     , typeName:'text'    , editable:false, inTable:false},
            {name:'nombre_area'                 , typeName:'text'    , editable:false, inTable:false},
            {name:'sede_nombre'                 , typeName:'text'    , editable:false, inTable:false},
            {name:'responsable_nombre'          , typeName:'text'    , editable:false, inTable:false},
            {name:'espacio_numero'              , typeName:'text'    , editable:false, inTable:false},
            //{name:'codigo_barra'                , typeName:'text'    , inTable:false, editable:false},
        ],  
        primaryKey:['ficha'],
        foreignKeys:[
            {references:'rubros', fields:['rubro'] },
            {references:'clases', fields:['rubro', 'clase'] },
            {references:'cuentas', fields:['rubro', 'clase', 'cuenta'] },
            {references:'tipo_bien', fields:['tipo_bien']},
            {references:'grupos', fields:['grupo']},
            {references:'motivos_baja', fields:['motivo_baja']},
            {references:'categoria_bien', fields:['categoria']},
            {references:'estados_bien', fields:['estado']},
            {references:'estado_bien_viejo', fields:['estado_bien_viejo']},
            {references:'estados_baja', fields:['estado_baja']},
            {references:'marcas', fields:['marca']},
            {references:'ordenes_compra', fields:['orden_compra']},
        ],
        constraints:[
            {constraintType:'unique', fields:['ficha']}
        ],
        detailTables:[
            {table:'historial', fields:['ficha'], abr:'His', label:'Historial'},
            {table:'historial_evento_bien', fields:['ficha'], abr:'Au', label:'Auditoria'},
            {table:'movimientos_bien', fields:['ficha'], abr:'Mov', label:'Movimientos'},
            {table:'bien_atributo', fields:['ficha'], abr:'Atr', label:'Atributos'},
            {table:'adjuntos_bienes', fields:['ficha'], abr:'Adj', label:'Adjuntos'}
        ],
        hiddenColumns: ['entidad_prestadora', 'fecha_inicio', 'fecha_fin', 'renovable', 'condiciones', 'costo_mensual', 'fecha_solicitud', 'valor_residual', 'autorizado_por', 'documento_respaldo', 'estado_baja'],
        sql:{
            isTable: true,
            from: `(${sqlBienes})`,
            policies:getPolicies(be)
        }
    };
}




