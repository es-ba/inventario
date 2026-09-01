"use strict";

import {TableDefinition, TableContext, AppBackend} from "./types-principal";
import {politicasBienes} from "./politicas";

export function getPolicies(_be?:AppBackend){
    return politicasBienes('ficha');
}

export function textoONuloSql(expresion:string):string{
    return `nullif(btrim(${expresion}), '')`;
}

function codigoTextoSql(codigo:string, texto:string):string{
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
    ult.tipo_asignacion,
    ult.modalidad_uso,
    ult.enusode,
    ult.enusode_responsable,
    ult.enusode_responsable_nombre,
    ult.nombre_sector,
    ult.sector_sigla,
    ult.sede_nombre,
    ult.responsable_nombre,
    ult.espacio_numero,
    ult.responsable_texto,
    ult.sector_texto,
    ult.sede_texto,
    ult.espacio_texto,
    ult.tipo_asignacion_texto,
    ult.modalidad_uso_texto
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
    SELECT 
        mb.sector,
        ${textoONuloSql('a.nombre_sector')} AS nombre_sector,
        ${textoONuloSql('a.sigla')} AS sector_sigla,
        mb.sede,
        ${textoONuloSql('s.descripcion')} AS sede_nombre,
        mb.responsable,
        ${textoONuloSql(`concat_ws(', ',
            nullif(btrim(r.apellido), ''),
            nullif(btrim(r.nombre), '')
        )`)} AS responsable_nombre,
        mb.espacio,
        ${textoONuloSql('e.numero')} AS espacio_numero,
        mb.tipo_asignacion,
        mb.modalidad_uso,
        ${textoONuloSql('mb.enusode')} AS enusode,
        mb.enusode_responsable,
        ${textoONuloSql(`concat_ws(', ',
            nullif(btrim(eur.apellido), ''),
            nullif(btrim(eur.nombre), '')
        )`)} AS enusode_responsable_nombre,
        ${codigoTextoSql(
            'mb.responsable',
            "concat_ws(', ', nullif(btrim(r.apellido), ''), nullif(btrim(r.nombre), ''))",
        )} AS responsable_texto,
        ${''}
        ${codigoTextoSql('mb.sector', 'a.sigla')} AS sector_texto,
        ${codigoTextoSql('mb.sede', 's.descripcion')} AS sede_texto,
        ${codigoTextoSql(
            'mb.espacio',
            "concat_ws(' — ', nullif(btrim(e.numero), ''), nullif(btrim(e.denominacion), ''))",
        )} AS espacio_texto,
        ${codigoTextoSql('mb.tipo_asignacion', 'ta.descripcion')} AS tipo_asignacion_texto,
        ${codigoTextoSql('mb.modalidad_uso', 'mu.descripcion')} AS modalidad_uso_texto
    FROM movimientos_bien mb
    LEFT JOIN sectores a ON a.sector = mb.sector
    LEFT JOIN sedes s ON s.sede = mb.sede
    LEFT JOIN responsables r ON r.responsable = mb.responsable
    LEFT JOIN responsables eur ON eur.responsable = mb.enusode_responsable
    LEFT JOIN espacios e ON e.espacio = mb.espacio
    LEFT JOIN tipo_asignacion ta ON ta.tipo_asignacion = mb.tipo_asignacion
    LEFT JOIN modalidad_uso mu ON mu.modalidad_uso = mb.modalidad_uso
    WHERE mb.ficha = b.ficha
    ORDER BY mb.orden DESC
    LIMIT 1
) ult ON true
`;

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
            {name:'responsable'                 , typeName:'text'    , editable:false, inTable:false},
            {name:'responsable_nombre'          , typeName:'text'    , editable:false, inTable:false},
            {name:'sector'                        , typeName:'text'    , editable:false, inTable:false},
            {name:'sector_sigla'                  , typeName:'text'    , editable:false, inTable:false},
            {name:'nombre_sector'                 , typeName:'text'    , editable:false, inTable:false},
            {name:'numero_integrado'            , typeName:'text'    , nullable:true}, 
            {name:'ubicacion'                   , typeName:'text'    , nullable:true},
            {name:'observacion'                 , typeName:'text'    , nullable:true},
            {name:'aclaracion'                  , typeName:'text'    , nullable:true},
            {name:'detalle'                     , typeName:'text'    , nullable:true},
            {name:'importe'                     , typeName:'text'    , nullable:true},
            {name:'importetotal'                , typeName:'text'    , nullable:true},
            {name:'tipo_bien'                   , typeName:'text'    , nullable:true},
            {name:'activo'                      , typeName:'boolean' , nullable:false, defaultValue:true},
            {name:'estado'                      , typeName:'text'    , nullable:true},
            {name:'categoria'                   , typeName:'text'    , nullable:true},
            {name:'rubro'                       , typeName:'text'    , nullable:true},
            {name:'clase'                       , typeName:'text'    , nullable:true},
            {name:'cuenta'                      , typeName:'text'    , nullable:true},
            {name:'grupo'                       , typeName:'text'    , nullable:true},
            {name:'marca'                       , typeName:'text'    , nullable:true},
            {name:'serie'                       , typeName:'text'    , nullable:true},
            {name:'imei'                        , typeName:'text'    , nullable:true},
            {name:'linea'                       , typeName:'text'    , nullable:true},
            {name:'modelo'                      , typeName:'text'    , nullable:true},
            {name:'annio'                       , typeName:'text'    , nullable:true},
            {name:'prd'                         , typeName:'text'    , nullable:true},
            {name:'caracteridentificador'       , typeName:'text'    , nullable:true},
            {name:'enusode'                     , typeName:'text'    , editable:false, inTable:false},
            {name:'enusode_responsable'         , typeName:'text'    , editable:false, inTable:false},
            {name:'enusode_responsable_nombre'  , typeName:'text'    , editable:false, inTable:false},
            {name:'tipo_asignacion'             , typeName:'text'    , editable:false, inTable:false},
            {name:'clasificacion'               , typeName:'text'    , nullable:true},
            {name:'orden_compra'                , typeName:'text'    , nullable:true},
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
            {name:'sede'                        , typeName:'text'    , editable:false, inTable:false},
            {name:'sede_nombre'                 , typeName:'text'    , editable:false, inTable:false},
            {name:'espacio'                     , typeName:'text'    , editable:false, inTable:false},
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
            {references:'estados_bien', fields:[{source:'estado', target:'estado_bien'}], displayFields:[]},
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
        ],
        hiddenColumns: [
            'entidad_prestadora', 'fecha_inicio', 'fecha_fin', 'renovable', 'condiciones',
            'costo_mensual', 'fecha_solicitud', 'valor_residual', 'autorizado_por',
            'documento_respaldo', 'estado_baja',
            'caracteridentificador', 'clasificacion', 'orden_compra', 'motivo_baja',
            'importe', 'importetotal', 'numero_integrado', 'ubicacion',
            'ordenes_compra__codigo',
            'prd', 'imei', 'linea', 'categoria', 'annio',
            'sede', 'sede_nombre',
        ],
        sql:{
            isTable: true,
            from: `(${sqlBienes})`,
            policies:getPolicies(be)
        }
    };
}




