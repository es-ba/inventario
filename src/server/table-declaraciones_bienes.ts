"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function declaraciones_bienes(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    var responsable = context.user.rol==='responsable';
    return {
        name:'declaraciones_bienes',
        elementName:'declaracion_bien',
        title:'Bienes declarados',
        editable:admin || responsable,
        fields:[
            {name:'declaracion'           , typeName:'bigint'   , nullable:false},
            {name:'ficha'                 , typeName:'text'   , nullable:false},
            {name:'orden'                 , typeName:'bigint' , nullable:true, editable:false},
            {name:'rubro'                 , typeName:'text'},
            {name:'clase'                 , typeName:'text'},
            {name:'cuenta'                , typeName:'text'},
            {name:'marca'                 , typeName:'text'},
            {name:'grupo'                 , typeName:'text'},
            {name:'detalle'               , typeName:'text'},
            {name:'observacion'           , typeName:'text'},
            {name:'area'                  , typeName:'text'},
            {name:'responsable'           , typeName:'text'},
            {name:'sede'                  , typeName:'text'},
            {name:'espacio'               , typeName:'text'},
            {name:'estado_bien'           , typeName:'text'},
        ],
        primaryKey:['declaracion', 'ficha'],
        foreignKeys:[
            {references:'declaraciones', fields:['declaracion']},
            {references:'bienes', fields:['ficha']},
            {references:'rubros', fields:['rubro']},
            {references:'clases', fields:['rubro', 'clase']},
            {references:'cuentas', fields:['rubro', 'clase', 'cuenta']},
            {references:'marcas', fields:['marca']},
            {references:'grupos', fields:['grupo']},
            {references:'areas', fields:['area']},
            {references:'responsables', fields:['responsable']},
            {references:'sedes', fields:['sede']},
            {references:'espacios', fields:['espacio']},
            {references:'estados_bien', fields:[{source:'estado_bien', target:'estado'}]},
        ],
        sortColumns:[{column:'declaracion', order:1}, {column:'ficha', order:1}]
    };
}
