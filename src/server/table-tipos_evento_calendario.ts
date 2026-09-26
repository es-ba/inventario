"use strict";

import { TableContext, TableDefinition } from "./types-principal";
import { COLORES_DE_EVENTO, TIPOS_DE_EVENTO } from "../common/calendario";

export function tipos_evento_calendario(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'tipos_evento_calendario',
        elementName: 'tipo de evento',
        title: 'Tipos de evento del calendario',
        editable: admin,
        fields:[
            {name:'tipo'     , typeName:'text'   , options:[...TIPOS_DE_EVENTO]},
            {name:'etiqueta' , typeName:'text'   , isName:true},
            {name:'orden'    , typeName:'integer', nullable:true},
            {name:'activo'   , typeName:'boolean', nullable:false, defaultValue:true},
            {name:'color'    , typeName:'text'   , options:[...COLORES_DE_EVENTO], nullable:false, defaultValue:'default'},
        ],
        primaryKey:['tipo'],
        sortColumns:[{column:'orden', order:1}, {column:'tipo', order:1}],
    };
}
