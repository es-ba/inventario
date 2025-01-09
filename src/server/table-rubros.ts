    //     
    //   ,[rubro]
    //   ,[clase]
    //   ,[cuenta]
    //   ,[descripcion]
    "use strict";

import { TableContext, TableDefinition } from "types-principal";

export function rubros(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'rubros',
        elementName: 'rubro',
        title: 'Rubro',
        editable: admin,
        fields:[
            {name:'rubro'      , typeName:'text'},
            {name:'clase'       , typeName:'text'},
            {name:'cuenta'      , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
        ],
        primaryKey:['rubro', 'clase', 'cuenta']
    };
}