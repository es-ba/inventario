"use strict";

import { TableContext, TableDefinition } from "types-principal";

export function roles(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'roles',
        elementName: 'rol',
        title: 'Roles',
        editable: admin,
        fields:[
            {name:'rol' , typeName:'text'},
            {name:'descripcion' , typeName:'text'},
            {name:'puede_ver_todo' , typeName:'boolean'},
            {name:'puede_ver_propio' , typeName:'boolean'},
            {name:'puede_ver_dependientes' , typeName:'boolean'},
            {name:'puede_ver_claves' , typeName:'boolean'},
            {name:'puede_restaurar_baja' , typeName:'boolean'},
            {name:'puede_eliminar' , typeName:'boolean'},
            {name:'puede_guardar' , typeName:'boolean'},
            {name:'puede_mover' , typeName:'boolean'},
        ],
        primaryKey:['rol'],
      
    };
}