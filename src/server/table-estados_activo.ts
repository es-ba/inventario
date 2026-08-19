"use strict";

import { TableContext, TableDefinition } from "types-principal";

/*
    Valores de bienes.activo: la situación patrimonial (ALTA / BAJA / ENDESUSO).

    Antes esta tabla se llamaba estados_bien, pero ese nombre quedó para la condición del
    bien —lo que antes era estado_bien_viejo— cuando se renombraron las columnas.
*/
export function estados_activo(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'estados_activo',
        elementName: 'activo',
        title: 'Activo',
        editable: admin,
        fields:[
            {name:'activo' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
            {name:'identificador' , typeName:'text'},
        ],
        primaryKey:['activo']
    };
}
