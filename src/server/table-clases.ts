import { TableContext, TableDefinition } from "types-principal";

export function clases(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'clases',
        elementName: 'clase',
        title: 'Clases',
        editable: admin,
        fields:[
            {name:'rubro'      , typeName:'text'},
            {name:'clase'      , typeName:'text'},
            {name:'nombre'     , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
        ],
        primaryKey:['rubro','clase'],
        detailTables:[
            {table: 'cuentas',  fields:['rubro','clase'], abr:'Cue'}
        ]
    };
}