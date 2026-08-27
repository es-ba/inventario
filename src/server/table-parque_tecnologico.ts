"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-principal";
import {columnasDeAtributos, getAtributosDeBienes, sqlParqueTecnologico} from "./reportes-bienes";

export function parque_tecnologico(_context:TableContext):TableDefinition{
    const atributos = getAtributosDeBienes();
    const columnasDeAtributo:FieldDefinition[] = columnasDeAtributos(atributos).map(c => ({
        name:c.columna,
        typeName:'text',
        title:c.titulo,
        nullable:true,
    }));
    return {
        name:'parque_tecnologico',
        elementName:'equipo',
        title:'Parque tecnológico',
        editable:false,
        allow:{insert:false, update:false, delete:false, deleteAll:false},
        fields:[
            {name:'ficha'       , typeName:'text', title:'ficha'},
            {name:'grupo'       , typeName:'text', title:'grupo'      , nullable:true},
            {name:'detalle'     , typeName:'text', title:'descripción', nullable:true},
            {name:'marca'       , typeName:'text', title:'marca'      , nullable:true},
            {name:'modelo'      , typeName:'text', title:'modelo'     , nullable:true},
            {name:'serie'       , typeName:'text', title:'serie'      , nullable:true},
            {name:'imei'        , typeName:'text', title:'IMEI'       , nullable:true},
            {name:'linea'       , typeName:'text', title:'línea'      , nullable:true},
            {name:'activo'      , typeName:'boolean', title:'activo'   , nullable:false},
            {name:'estado'      , typeName:'text', title:'estado'     , nullable:true},
            {name:'rubro'       , typeName:'text', title:'rubro'      , nullable:true},
            {name:'clase'       , typeName:'text', title:'clase'      , nullable:true},
            {name:'cuenta'      , typeName:'text', title:'cuenta'     , nullable:true},
            ...columnasDeAtributo,
            {name:'sector'        , typeName:'text', title:'sector'       , nullable:true},
            {name:'sede'        , typeName:'text', title:'sede'       , nullable:true},
            {name:'espacio'     , typeName:'text', title:'espacio'    , nullable:true},
            {name:'responsable' , typeName:'text', title:'responsable', nullable:true},
        ],
        primaryKey:['ficha'],
        foreignKeys:[
            {references:'grupos'      , fields:['grupo']      , displayFields:['descripcion']},
            {references:'marcas'      , fields:['marca']      , displayFields:['descripcion']},
            {references:'estados_bien', fields:[{source:'estado', target:'estado_bien'}], displayFields:[]},
            {references:'cuentas'     , fields:['rubro', 'clase', 'cuenta'], displayFields:['nombre']},
            {references:'sectores'       , fields:['sector']       , displayFields:['sigla']},
            {references:'sedes'       , fields:['sede']       , displayFields:['descripcion']},
            {references:'espacios'    , fields:['espacio']    , displayFields:['numero', 'denominacion']},
            {references:'responsables', fields:['responsable'], displayFields:['apellido', 'nombre']},
        ],
        sortColumns:[{column:'ficha', order:1}],
        sql:{
            from:`(${sqlParqueTecnologico(atributos)})`,
        },
    };
}
