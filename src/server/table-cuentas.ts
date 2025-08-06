import { TableContext, TableDefinition } from "types-principal";

export function cuentas(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'cuentas',
        elementName: 'cuentas',
        title: 'cuentas',
        editable: admin,
        fields:[
            {name:'rubro'      , typeName:'text'},
            {name:'clase'      , typeName:'text'},
            {name:'cuenta'     , typeName:'text'},
            {name:'nombre'     , typeName:'text'},
            {name:'descripcion', typeName:'text'},
        ],
        primaryKey:['rubro','clase','cuenta']
    };
}