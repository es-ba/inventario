"use strict";

import {TableDefinition, TableContext} from "./types-principal";
import {sqlBienesListado} from "./reportes-bienes";

/*
    Detalle de los reportes: los bienes con sus datos de asignación y las características
    principales, sin el resto de los campos de la ficha.

    Los códigos van en su columna y la descripción la agrega backend-plus aparte, con
    displayFields en cada foreign key. Sin concatenar: un campo "código — descripción"
    no se puede filtrar ni por el código ni por la descripción.

    Es de sólo lectura. Para ver o editar la ficha completa está la pantalla de bienes.
*/
export function reporte_bienes_listado(_context:TableContext):TableDefinition{
    return {
        name:'reporte_bienes_listado',
        elementName:'bien',
        title:'Bienes',
        editable:false,
        allow:{insert:false, update:false, delete:false, deleteAll:false},
        fields:[
            {name:'ficha'           , typeName:'text', title:'ficha'},
            {name:'detalle'         , typeName:'text', title:'descripción'        , nullable:true},
            {name:'marca'           , typeName:'text', title:'marca'              , nullable:true},
            {name:'modelo'          , typeName:'text', title:'modelo'             , nullable:true},
            {name:'serie'           , typeName:'text', title:'serie'              , nullable:true},
            {name:'activo'          , typeName:'boolean', title:'activo'          , nullable:false},
            {name:'estado'          , typeName:'text', title:'estado'             , nullable:true},
            {name:'categoria'       , typeName:'text', title:'categoría'          , nullable:true},
            {name:'tipo_bien'       , typeName:'text', title:'tipo'               , nullable:true},
            {name:'rubro'           , typeName:'text', title:'rubro'              , nullable:true},
            {name:'clase'           , typeName:'text', title:'clase'              , nullable:true},
            {name:'cuenta'          , typeName:'text', title:'cuenta'             , nullable:true},
            {name:'area'            , typeName:'text', title:'área'},
            {name:'sede'            , typeName:'text', title:'sede'               , nullable:true},
            {name:'espacio'         , typeName:'text', title:'espacio'            , nullable:true},
            {name:'responsable'     , typeName:'text', title:'responsable'},
            {name:'tipo_asignacion' , typeName:'text', title:'tipo de asignación' , nullable:true},
            {name:'modalidad_uso'   , typeName:'text', title:'modalidad de uso'   , nullable:true},
            {name:'enusode'         , typeName:'text', title:'en uso de'          , nullable:true},
        ],
        primaryKey:['ficha'],
        foreignKeys:[
            {references:'marcas'         , fields:['marca']          , displayFields:['descripcion']},
            // Sin displayFields: el código ya es el texto del estado.
            {references:'estados_bien'   , fields:[{source:'estado', target:'estado_bien'}], displayFields:[]},
            {references:'categoria_bien' , fields:['categoria'], displayFields:['descripcion']},
            {references:'cuentas'        , fields:['rubro', 'clase', 'cuenta'], displayFields:['nombre']},
            {references:'areas'          , fields:['area']           , displayFields:['sigla']},
            {references:'sedes'          , fields:['sede']           , displayFields:['descripcion']},
            {references:'espacios'       , fields:['espacio']        , displayFields:['numero', 'denominacion']},
            {references:'responsables'   , fields:['responsable']    , displayFields:['apellido', 'nombre']},
            {references:'tipo_asignacion', fields:['tipo_asignacion'], displayFields:['descripcion']},
            {references:'modalidad_uso'  , fields:['modalidad_uso']  , displayFields:['descripcion']},
        ],
        sortColumns:[{column:'ficha', order:1}],
        sql:{
            from:`(${sqlBienesListado})`,
        },
    };
}
