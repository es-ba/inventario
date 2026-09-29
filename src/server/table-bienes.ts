"use strict";

import {TableDefinition, TableContext, AppBackend} from "./types-principal";
import {politicasBienes} from "./politicas";
import {diasDeVigencia, sqlSituacionControl, sqlUltimoControl} from "./controles-bien";

export function getPolicies(_be?:AppBackend){
    return politicasBienes('ficha');
}

export function textoONuloSql(expresion:string):string{
    return `nullif(btrim(${expresion}), '')`;
}

export function codigoTextoSql(codigo:string, texto:string):string{
    return `CASE
        WHEN nullif(btrim(${codigo}), '') IS NULL THEN NULL
        WHEN nullif(btrim(coalesce(${texto}, '')), '') IS NULL THEN btrim(${codigo})
        ELSE btrim(${codigo}) || ' — ' || btrim(${texto})
    END`;
}

export const sqlBienes = `
SELECT 
    b.*,
    ${codigoTextoSql('b.grupo', 'g.descripcion')} AS grupo_texto,
    ${codigoTextoSql('b.marca', 'ma.descripcion')} AS marca_texto,
    ${codigoTextoSql('b.rubro', 'ru.nombre')} AS rubro_texto,
    ${codigoTextoSql('b.clase', 'cla.nombre')} AS clase_texto,
    ${codigoTextoSql('b.cuenta', 'cue.nombre')} AS cuenta_texto,
    ult.sector,
    ult.sede,
    ult.responsable,
    ult.espacio,
    ult.puesto,
    ult.tipo_asignacion,
    ult.modalidad_uso,
    ${textoONuloSql('ult.enusode')} AS enusode,
    ult.enusode_responsable,
    ${textoONuloSql(`concat_ws(', ',
        nullif(btrim(eur.apellido), ''),
        nullif(btrim(eur.nombre), '')
    )`)} AS enusode_responsable_nombre,
    ${textoONuloSql('a.nombre_sector')} AS nombre_sector,
    ${textoONuloSql('a.sigla')} AS sector_sigla,
    ${textoONuloSql('a.responsable')} AS responsable_sector,
    ${textoONuloSql(`concat_ws(', ',
        nullif(btrim(rs.apellido), ''),
        nullif(btrim(rs.nombre), '')
    )`)} AS responsable_sector_nombre,
    ${textoONuloSql('s.descripcion')} AS sede_nombre,
    ${textoONuloSql(`concat_ws(', ',
        nullif(btrim(r.apellido), ''),
        nullif(btrim(r.nombre), '')
    )`)} AS responsable_nombre,
    ${textoONuloSql('e.numero')} AS espacio_numero,
    ${codigoTextoSql(
        'ult.responsable',
        "concat_ws(', ', nullif(btrim(r.apellido), ''), nullif(btrim(r.nombre), ''))",
    )} AS responsable_texto,
    ${codigoTextoSql('ult.sector', 'a.sigla')} AS sector_texto,
    ${codigoTextoSql('ult.sede', 's.descripcion')} AS sede_texto,
    ${codigoTextoSql(
        'ult.espacio',
        "concat_ws(' — ', nullif(btrim(e.numero), ''), nullif(btrim(e.denominacion), ''))",
    )} AS espacio_texto,
    ${codigoTextoSql('ult.tipo_asignacion', 'ta.descripcion')} AS tipo_asignacion_texto,
    ${codigoTextoSql('ult.modalidad_uso', 'mu.descripcion')} AS modalidad_uso_texto,
    coalesce(ult.fecha_modificacion, ult.fecha_creacion) AS fecha_ultimo_movimiento,
    coalesce(ult.usuario_modificacion, ult.usuario_creacion) AS usuario_ultimo_movimiento
    FROM bienes b
LEFT JOIN grupos g ON g.grupo = b.grupo
LEFT JOIN marcas ma ON ma.marca = b.marca
LEFT JOIN rubros ru ON ru.rubro = b.rubro
LEFT JOIN clases cla
       ON cla.rubro = b.rubro
      AND cla.clase = b.clase
LEFT JOIN cuentas cue
       ON cue.rubro = b.rubro
      AND cue.clase = b.clase
      AND cue.cuenta = b.cuenta
LEFT JOIN LATERAL (
    SELECT mb.*
    FROM movimientos_bien mb
    WHERE mb.ficha = b.ficha
    ORDER BY mb.orden DESC
    LIMIT 1
) ult ON true
LEFT JOIN sectores a ON a.sector = ult.sector
LEFT JOIN responsables rs ON rs.responsable = a.responsable
LEFT JOIN sedes s ON s.sede = ult.sede
LEFT JOIN responsables r ON r.responsable = ult.responsable
LEFT JOIN responsables eur ON eur.responsable = ult.enusode_responsable
LEFT JOIN espacios e ON e.espacio = ult.espacio
LEFT JOIN tipo_asignacion ta ON ta.tipo_asignacion = ult.tipo_asignacion
LEFT JOIN modalidad_uso mu ON mu.modalidad_uso = ult.modalidad_uso
`;

export function sqlBienesConControl(dias:number):string{
    return `SELECT v.*, uc.fecha AS fecha_ultimo_control,
        ${sqlSituacionControl('v', 'uc.fecha', dias)} AS situacion_control,
        um.fecha AS fecha_ultima_modificacion, um.usuario AS usuario_ultima_modificacion
    FROM (${sqlBienes}) v
    ${sqlUltimoControl('v')}
    LEFT JOIN LATERAL (
        SELECT e.fecha, e.usuario
          FROM historial_evento_bien e
         WHERE e.ficha = v.ficha
         ORDER BY e.orden DESC
         LIMIT 1
    ) um ON true`;
}

export function bienes(context:TableContext):TableDefinition{
    var be = context.be;
    return {
        name:'bienes',
        elementName:'bien', 
        title:'Bienes',
        editable:context.es.administrativo,
        allow:{ delete:false, deleteAll:false },
        fields:[
            {name:'ficha'                       , typeName:'text'    },
            {name:'responsable_sector'          , typeName:'text'    , editable:false, inTable:false, title:'cód. responsable del sector'},
            {name:'responsable_sector_nombre'   , typeName:'text'    , editable:false, inTable:false, title:'responsable del sector'},
            {name:'responsable'                 , typeName:'text'    , editable:false, inTable:false, title:'cód. responsable directo'},
            {name:'responsable_nombre'          , typeName:'text'    , editable:false, inTable:false, title:'responsable directo'},
            {name:'sector'                        , typeName:'text'    , editable:false, inTable:false},
            {name:'sector_sigla'                  , typeName:'text'    , editable:false, inTable:false, title:'sigla del sector'},
            {name:'nombre_sector'                 , typeName:'text'    , editable:false, inTable:false, title:'nombre del sector'},
            {name:'numero_integrado'            , typeName:'text'    , nullable:true, title:'número integrado'},
            {name:'ubicacion'                   , typeName:'text'    , nullable:true, title:'ubicación'},
            {name:'observacion'                 , typeName:'text'    , nullable:true, title:'observación'},
            {name:'aclaracion'                  , typeName:'text'    , nullable:true, title:'aclaración'},
            {name:'detalle'                     , typeName:'text'    , nullable:true},
            {name:'importe'                     , typeName:'text'    , nullable:true},
            {name:'importetotal'                , typeName:'text'    , nullable:true, title:'importe total'},
            {name:'tipo_bien'                   , typeName:'text'    , nullable:true, title:'tipo de bien'},
            {name:'activo'                      , typeName:'boolean' , nullable:false, defaultValue:true, editable:false},
            {name:'estado'                      , typeName:'text'    , nullable:true, editable:false},
            {name:'rubro'                       , typeName:'text'    , nullable:true},
            {name:'clase'                       , typeName:'text'    , nullable:true},
            {name:'cuenta'                      , typeName:'text'    , nullable:true},
            {name:'grupo'                       , typeName:'text'    , nullable:true},
            {name:'marca'                       , typeName:'text'    , nullable:true},
            {name:'serie'                       , typeName:'text'    , nullable:true},
            {name:'imei'                        , typeName:'text'    , nullable:true, title:'IMEI'},
            {name:'linea'                       , typeName:'text'    , nullable:true, title:'línea'},
            {name:'modelo'                      , typeName:'text'    , nullable:true},
            {name:'annio'                       , typeName:'text'    , nullable:true, title:'año'},
            {name:'prd'                         , typeName:'text'    , nullable:true, title:'PRD'},
            {name:'caracteridentificador'       , typeName:'text'    , nullable:true, title:'carácter identificador'},
            {name:'enusode'                     , typeName:'text'    , editable:false, inTable:false, title:'en uso de'},
            {name:'enusode_responsable'         , typeName:'text'    , editable:false, inTable:false, title:'cód. responsable de uso'},
            {name:'enusode_responsable_nombre'  , typeName:'text'    , editable:false, inTable:false, title:'responsable de uso'},
            {name:'tipo_asignacion'             , typeName:'text'    , editable:false, inTable:false, title:'tipo de asignación'},
            {name:'clasificacion'               , typeName:'text'    , nullable:true, title:'clasificación'},
            {name:'orden_compra'                , typeName:'text'    , nullable:true, title:'orden de compra'},
            {name:'entidad_prestadora'          , typeName:'text'    , nullable:true, title:'entidad prestadora'},
            {name:'fecha_inicio'                , typeName:'date'    , nullable:true, title:'fecha de inicio'},
            {name:'fecha_fin'                   , typeName:'date'    , nullable:true, title:'fecha de fin'},
            {name:'renovable'                   , typeName:'boolean' , nullable:true, defaultValue:false},
            {name:'condiciones'                 , typeName:'text'    , nullable:true},
            {name:'costo_mensual'               , typeName:'decimal' , nullable:true, title:'costo mensual'},
            {name:'solicitado_por', typeName:'text', nullable:true, editable:false, title:'solicitado por'},
            {name:'revisado_por', typeName:'text', nullable:true, editable:false, title:'revisado por'},
            {name:'fecha_revision', typeName:'date', nullable:true, editable:false, title:'fecha de revisión'},
            {name:'motivo_rechazo', typeName:'text', nullable:true, editable:false, title:'motivo de rechazo'},
            {name:'motivo_restauracion', typeName:'text', nullable:true, editable:false, title:'motivo de restauración'},
            {name:'restaurado_por', typeName:'text', nullable:true, editable:false, title:'restaurado por'},
            {name:'fecha_restauracion', typeName:'date', nullable:true, editable:false, title:'fecha de restauración'},
            {name:'fecha_solicitud'             , typeName:'date'    , nullable:true, editable:false, title:'fecha de solicitud'},
            {name:'motivo_baja'                 , typeName:'text'    , nullable:true, editable:false, title:'motivo de baja'},
            {name:'fecha_finalizacion'          , typeName:'date'    , nullable:true, editable:false, title:'fecha de finalización'},
            {name:'autorizado_por'              , typeName:'text'    , nullable:true, editable:false, title:'autorizado por'},
            {name:'documento_respaldo'          , typeName:'text'    , nullable:true, editable:false, title:'documento de respaldo'},
            {name:'estado_baja'                 , typeName:'text'    , nullable:true, editable:false, title:'estado de la baja'},
            {name:'sede'                        , typeName:'text'    , editable:false, inTable:false},
            {name:'sede_nombre'                 , typeName:'text'    , editable:false, inTable:false, title:'nombre de la sede'},
            {name:'espacio'                     , typeName:'text'    , editable:false, inTable:false},
            {name:'espacio_numero'              , typeName:'text'    , editable:false, inTable:false, title:'número de espacio'},
            {name:'puesto'                      , typeName:'integer' , editable:false, inTable:false},
            {name:'fecha_ultimo_control'        , typeName:'date'    , editable:false, inTable:false, title:'último control'},
            {name:'situacion_control'           , typeName:'text'    , editable:false, inTable:false, title:'situación de control'},
            {name:'fecha_ultimo_movimiento'     , typeName:'date'    , editable:false, inTable:false, title:'último movimiento'},
            {name:'usuario_ultimo_movimiento'   , typeName:'text'    , editable:false, inTable:false, title:'movido por'},
            {name:'fecha_ultima_modificacion'   , typeName:'timestamp', editable:false, inTable:false, title:'última modificación'},
            {name:'usuario_ultima_modificacion' , typeName:'text'    , editable:false, inTable:false, title:'modificado por'},
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
            {references:'estados_bien', fields:[{source:'estado', target:'estado_bien'}], displayFields:['descripcion']},
            {references:'estados_baja', fields:['estado_baja']},
            {references:'marcas', fields:['marca']},
            {references:'ordenes_compra', fields:['orden_compra']},
        ],
        constraints:[
            {constraintType:'unique', fields:['ficha']}
        ],
        detailTables:[
            {table:'historial_evento_bien', fields:['ficha'], abr:'Au', label:'Auditoria'},
            {table:'movimientos_bien', fields:['ficha'], abr:'Mov', label:'Movimientos'},
            {table:'bien_atributo', fields:['ficha'], abr:'Atr', label:'Atributos'},
            {table:'adjuntos_bienes', fields:['ficha'], abr:'Adj', label:'Adjuntos'},
            {table:'declaraciones_bienes', fields:['ficha'], abr:'Dec', label:'Declaraciones'},
            {table:'claves_bienes', fields:['ficha'], abr:'Cla', label:'Claves'},
            {table:'controles_bien', fields:['ficha'], abr:'Ctl', label:'Controles'},
        ],
        hiddenColumns: [
            'entidad_prestadora', 'fecha_inicio', 'fecha_fin', 'renovable', 'condiciones',
            'costo_mensual',
            'estado_baja', 'motivo_baja', 'fecha_solicitud', 'solicitado_por',
            'fecha_revision', 'revisado_por', 'motivo_rechazo',
            'fecha_finalizacion', 'autorizado_por', 'documento_respaldo',
            'motivo_restauracion', 'restaurado_por', 'fecha_restauracion',
            'caracteridentificador', 'clasificacion', 'orden_compra',
            'importe', 'importetotal', 'numero_integrado', 'ubicacion',
            'ordenes_compra__codigo',
            'prd', 'imei', 'linea', 'annio',
            'sede', 'sede_nombre',
            'responsable_sector',
        ],
        sql:{
            isTable: true,
            from: `(${sqlBienesConControl(diasDeVigencia(be.config))})`,
            policies:getPolicies(be)
        }
    };
}




