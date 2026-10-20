"use strict";

import { TableContext, TableDefinition } from "types-principal";
import {puedeElRol} from "./capacidades-roles";

export function marcas(context:TableContext):TableDefinition{
    return {
        name: 'marcas',
        elementName: 'marcas',
        title: 'Marcas',
        editable:!!context.forDump || puedeElRol(context.user?.rol, 'puede_gestionar_datos'),
        fields:[
            {name:'marca' , typeName:'text'},
            {name:'descripcion' , typeName:'text' , isName:true},
        ],
        primaryKey:['marca']
    };
}