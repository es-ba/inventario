"use strict";

import { TableContext, TableDefinition } from "types-principal";

/*
    Valores de bienes.estado: la condición del bien (NORMAL, BAJA, PRESTAMO, ...).

    Se llamaba estado_bien_viejo, por el sistema anterior de donde salían los datos. El
    nombre lo liberó estados_activo, que es donde vive ahora la situación patrimonial.

    El código es la descripción en mayúscula, no un número: un "2" no dice nada en una
    grilla ni en una exportación. Por eso no hay columna descripcion: sería el mismo texto
    dos veces, y dos lugares donde escribir el nombre de un estado es uno de más.
*/
export function estados_bien(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'estados_bien',
        elementName: 'estado_bien',
        title: 'Estados del bien',
        editable: admin,
        fields:[
            {name:'estado_bien'      , typeName:'text', isName:true},
        ],
        primaryKey:['estado_bien']
    };
}
