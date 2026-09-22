"use strict";

import { TableContext, TableDefinition } from "./types-principal";
import { TIPOS_DE_ITEM } from "../common/controles";

export function items_control(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name: 'items_control',
        elementName: 'item_control',
        title: 'Ítems de control',
        editable: admin,
        fields:[
            {name:'item'        , typeName:'text'},
            {name:'descripcion' , typeName:'text'   , isName:true},
            {name:'tipo_valor'  , typeName:'text'   , options:[...TIPOS_DE_ITEM]},
            {name:'orden'       , typeName:'integer', nullable:true},
            {name:'activo'      , typeName:'boolean', nullable:false, defaultValue:true},
        ],
        primaryKey:['item'],
        detailTables:[
            {table:'items_control_opciones', fields:['item'], abr:'Op', label:'opciones'},
            {table:'items_control_grupos'  , fields:['item'], abr:'Gr', label:'grupos'},
        ],
        sortColumns:[{column:'orden', order:1}, {column:'item', order:1}],
    };
}
