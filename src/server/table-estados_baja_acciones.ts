"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function estados_baja_acciones(context:TableContext):TableDefinition{
    return {
        name:'estados_baja_acciones',
        elementName:'transición de baja',
        title:'Transiciones de baja',
        editable:context.user.rol === 'admin',
        fields:[
            {name:'transicion_baja', typeName:'text', nullable:false},
            {name:'accion_baja', typeName:'text', nullable:false},
            {name:'estado_origen', typeName:'text', nullable:true},
            {name:'activo_origen', typeName:'boolean', nullable:false},
            {name:'estado_destino', typeName:'text', nullable:true},
            {name:'activo_destino', typeName:'boolean', nullable:false},
            {name:'capacidad', typeName:'text', nullable:false},
            {name:'campos_permitidos', typeName:'text', nullable:false},
            {name:'campos_requeridos', typeName:'text', nullable:true},
        ],
        primaryKey:['transicion_baja'],
        foreignKeys:[
            {references:'estados_baja', fields:[{source:'estado_origen', target:'estado_baja'}], alias:'origen'},
            {references:'estados_baja', fields:[{source:'estado_destino', target:'estado_baja'}], alias:'destino'},
        ],
        sortColumns:[{column:'accion_baja'}, {column:'estado_origen'}],
    };
}
