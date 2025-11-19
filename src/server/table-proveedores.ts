"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function proveedores(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'proveedores',
        elementName: 'proveedor',
        title: 'Proveedores',
        editable: admin,
        fields:[
            {name:'proveedor' , typeName:'text'},
            {name:'razonsocial' , typeName:'text', isName:true},
            {name:'telefono' , typeName:'text'},
            {name:'fax' , typeName:'text'},
            {name:'mail' , typeName:'text'},
            {name:'contacto' , typeName:'text'},
            {name:'numeroente' , typeName:'text'},
            {name:'cuit' , typeName:'text'},
            {name:'iva' , typeName:'text'},
            {name:'codigopostal' , typeName:'text'},
            {name:'localidad' , typeName:'text'},
            {name:'provincia' , typeName:'text'},
        ],
        primaryKey:['proveedor']
    };
}