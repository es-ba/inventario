"use strict";

import { TableDefinition, TableContext } from "./types-principal";
import { sqlBienes } from "./table-bienes";
import { condicionParqueTecnologico, diasDeVigencia, sqlSituacionControl, sqlUltimoControl } from "./controles-bien";

export function sqlBienesControl(dias:number):string{
    return `
SELECT
    v.ficha,
    v.grupo,
    v.rubro,
    v.clase,
    v.detalle,
    v.marca,
    v.modelo,
    v.serie,
    v.imei,
    v.linea,
    v.sector,
    v.espacio,
    v.responsable_sector,
    uc.fecha AS fecha_ultimo_control,
    current_date - uc.fecha AS dias_desde_control,
    ${sqlSituacionControl('v', 'uc.fecha', dias)} AS situacion
FROM (${sqlBienes}) v
${sqlUltimoControl('v')}
WHERE ${condicionParqueTecnologico('v')}
`;
}

export function bienes_control(context:TableContext):TableDefinition{
    return {
        name:'bienes_control',
        elementName:'bien',
        title:'Control de bienes',
        editable:false,
        allow:{insert:false, update:false, delete:false, deleteAll:false, import:false},
        fields:[
            {name:'ficha'               , typeName:'text'   , title:'ficha'},
            {name:'rubro'               , typeName:'text'   , title:'rubro'          , nullable:true},
            {name:'clase'               , typeName:'text'   , title:'clase'          , nullable:true},
            {name:'grupo'               , typeName:'text'   , title:'grupo'          , nullable:true},
            {name:'detalle'             , typeName:'text'   , title:'descripción'    , nullable:true},
            {name:'marca'               , typeName:'text'   , title:'marca'          , nullable:true},
            {name:'modelo'              , typeName:'text'   , title:'modelo'         , nullable:true},
            {name:'serie'               , typeName:'text'   , title:'serie'          , nullable:true},
            {name:'imei'                , typeName:'text'   , title:'IMEI'           , nullable:true},
            {name:'linea'               , typeName:'text'   , title:'línea'          , nullable:true},
            {name:'sector'              , typeName:'text'   , title:'sector'         , nullable:true},
            {name:'espacio'             , typeName:'text'   , title:'espacio'        , nullable:true},
            {name:'responsable_sector'  , typeName:'text'   , title:'responsable del sector', nullable:true},
            {name:'fecha_ultimo_control', typeName:'date'   , title:'último control' , nullable:true},
            {name:'dias_desde_control'  , typeName:'integer', title:'días'           , nullable:true},
            {name:'situacion'           , typeName:'text'   , title:'situación'},
        ],
        primaryKey:['ficha'],
        foreignKeys:[
            {references:'grupos'              , fields:['grupo']              , displayFields:['descripcion']},
            {references:'marcas'              , fields:['marca']              , displayFields:['descripcion']},
            {references:'sectores'            , fields:['sector']             , displayFields:['sigla']},
            {references:'clases'              , fields:['rubro', 'clase']     , displayFields:['nombre']},
            {references:'espacios'            , fields:['espacio']            , displayFields:['numero', 'denominacion']},
            {references:'responsables'        , fields:[{source:'responsable_sector', target:'responsable'}],
                alias:'responsable_sector', displayFields:['apellido', 'nombre']},
        ],
        detailTables:[
            {table:'controles_bien', fields:['ficha'], abr:'Ctl', label:'controles'},
        ],
        sortColumns:[{column:'fecha_ultimo_control', order:1}, {column:'ficha', order:1}],
        sql:{
            from:`(${sqlBienesControl(diasDeVigencia(context.be.config))})`,
        },
    };
}
