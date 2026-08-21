"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-principal";
import {columnasDeAtributos, getAtributosDeBienes, sqlParqueTecnologico} from "./reportes-bienes";

/*
    Parque tecnológico: los bienes de las clases contables 3.6 y 3.4, con sus atributos
    dinámicos abiertos como columnas.

    Los códigos van en su propia columna y la descripción la trae backend-plus como una
    columna aparte, declarándola en displayFields de cada foreign key —la misma convención
    que usa siper—. Nunca se concatenan: un campo "código — descripción" no se puede
    filtrar ni por uno ni por la otra.

    Las columnas de atributo no están fijas acá: salen de bienes_atributos, que se lee al
    arrancar el servidor. Dar de alta un atributo nuevo y asignarlo agrega su columna sin
    tocar código, y el procedure atributos_recargar lo refresca sin reiniciar.

    Es de sólo lectura. Para editar la ficha está la pantalla de bienes.
*/
export function parque_tecnologico(_context:TableContext):TableDefinition{
    const atributos = getAtributosDeBienes();
    // El mismo mapeo que usa el SQL: el nombre de columna se deriva del código, nunca es
    // el código en crudo. Así, si alguien renombra o crea un atributo con espacios o
    // acentos, la grilla sigue funcionando y sólo cambia el título que se ve.
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
            {name:'area'        , typeName:'text', title:'área'       , nullable:true},
            {name:'sede'        , typeName:'text', title:'sede'       , nullable:true},
            {name:'espacio'     , typeName:'text', title:'espacio'    , nullable:true},
            {name:'responsable' , typeName:'text', title:'responsable', nullable:true},
        ],
        primaryKey:['ficha'],
        foreignKeys:[
            {references:'grupos'      , fields:['grupo']      , displayFields:['descripcion']},
            {references:'marcas'      , fields:['marca']      , displayFields:['descripcion']},
            // displayFields vacío: el código ya es el texto, agregar la columna del
            // referencial sería repetirlo al lado.
            {references:'estados_bien', fields:[{source:'estado', target:'estado_bien'}], displayFields:[]},
            {references:'cuentas'     , fields:['rubro', 'clase', 'cuenta'], displayFields:['nombre']},
            {references:'areas'       , fields:['area']       , displayFields:['sigla']},
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
