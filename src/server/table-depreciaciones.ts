"use strict";

import {TableDefinition, TableContext, AppBackend} from "./types-principal";

export function getPolicies(be:AppBackend){
    return {
        select:{ using: `${be.dbUserRolExpr} = 'admin' or ${be.dbUserRolExpr} = 'auditor'`},
        all:{ using: `${be.dbUserRolExpr} = 'admin'`}
    }
}

export function depreciaciones(context:TableContext):TableDefinition{
    var be = context.be;
    var admin = context.user.rol==='admin';
    
    return {
        name:'depreciaciones',
        elementName:'depreciacion', 
        title:'Depreciaciones de Bienes', 
        editable:admin,
        fields:[
            {name:'depreciacion', typeName:'text', nullable:false},
            {name:'ficha', typeName:'text', nullable:false},
            {name:'fecha_calculo', typeName:'date', nullable:false, specialDefaultValue:'current_date'},
            {name:'valor_anterior', typeName:'decimal', nullable:false},
            {name:'valor_actual', typeName:'decimal', nullable:false},
            {name:'metodo_aplicado', typeName:'text', options:['lineal', 'suma_digitos', 'unidades_producidas', 'otro']},
            {name:'vida_util_total', typeName:'integer', nullable:false},
            {name:'vida_util_restante', typeName:'integer', nullable:false},
            {name:'porcentaje_depreciacion', typeName:'decimal', nullable:false},
            {name:'periodo_fiscal', typeName:'text', nullable:false},
            {name:'calculado_por', typeName:'text', nullable:false},
            {name:'observaciones', typeName:'text', nullable:true}
        ],
        primaryKey:['depreciacion', 'ficha'],
        foreignKeys:[
            {references:'bienes', fields:['ficha']},
            {references:'usuarios', fields:[{source:'calculado_por', target:'usuario'}]}
        ],
        sql:{
            policies:getPolicies(be)
        }
    };
}
