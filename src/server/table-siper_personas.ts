"use strict";

import {TableDefinition, TableContext} from "./types-principal";
import {DATOS_DE_SIPER} from "./siper-personas";

export function siper_personas(context:TableContext):TableDefinition{
    const admin = context.user.rol === 'admin';
    return {
        name:'siper_personas',
        elementName:'persona de siper',
        title:'personas de siper',
        editable:false,
        fields:[
            {name:'idper'          , typeName:'text'    , nullable:false},
            {name:'apellido'       , typeName:'text'    , nullable:false, isName:true},
            {name:'nombres'        , typeName:'text'    , isName:true},
            {name:'sector'         , typeName:'text'    , title:'sector (siper)'},
            {name:'activo'         , typeName:'boolean' , nullable:false},
            ...DATOS_DE_SIPER.map(d => ({name:d.siper, typeName:d.tipo, title:d.titulo})),
            {name:'responsable'    , typeName:'text'    , inTable:false, title:'responsable en inventario'},
            {name:'activo_inventario', typeName:'boolean', inTable:false, title:'activo en inventario'},
        ],
        primaryKey:['idper'],
        sortColumns:[{column:'apellido'}, {column:'nombres'}],
        sql:{
            isTable:true,
            from:`(SELECT sp.*, r.responsable, r.activo AS activo_inventario
                FROM siper_personas sp LEFT JOIN responsables r ON r.idper = sp.idper)`,
            where:admin || context.forDump ? 'true' : 'false',
        },
    };
}
