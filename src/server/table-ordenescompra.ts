// ,[orden_compra]
// ,[estado]
// ,[tipo]
// ,[descripcion]
// ,[proveedor]
// ,[archivo_adjunto]
// ,[expediente]
// ,[numero_procedimiento]
// ,[unidad_ejecutora]
// ,[auditoria_creadopor]
// ,[auditoria_creadoen]
// ,[auditoria_modificadopor]
// ,[auditoria_modificadoen]
// ,[fecha_pedido]
// ,[fecha_recibido]


import {TableDefinition, TableContext} from "./types-principal";

export function areas(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    var responsable = context.user.rol==='responsable';
    return {
        name:'ordenes_compra',
        elementName:'orden_compra', 
        title:'orden_compra', // solo si es distinto al "name", si es igual se puede omitir
        editable:admin || responsable,
        fields:[
            {name:'orden_compra'                        , typeName:'text'    }, 
            {name:'estado'                              , typeName:'text'    },  
            {name:'tipo'                                , typeName:'text'    }, 
            {name:'descripcion'                         , typeName:'text'    }, 
            {name:'proveedor'                           , typeName:'text'    },
            {name:'archivo_adjunto'                     , typeName:'text'    },
            {name:'expediente'                          , typeName:'text'    },
            {name:'numero_procedimiento'                , typeName:'text'    },
            {name:'unidad_ejecutora'                    , typeName:'text'    },
            {name:'auditoria_creadopor'                 , typeName:'text'    },
            {name:'auditoria_creadoen'                  , typeName:'text'    },
            {name:'auditoria_modificadopor'             , typeName:'text'    },
            {name:'auditoria_modificadoen'              , typeName:'text'    },
            {name:'fecha_pedido'                        , typeName:'text'    },
            {name:'fecha_recibido'                      , typeName:'text'    },
        ],
        primaryKey:['orden_compra'],
        constraints:[
            {constraintType:'unique', fields:['orden_compra']}
        ],
        // sql:{
        //     /* 
        //        ATENCIÓN
        //        --------
        //        Las pólicies son algo nuevo en backend-plus, utilizan las policies de PostgreSQL: https://www.postgresql.org/docs/9.5/ddl-rowsecurity.html
        //        Permiten cambiar los permisos en función del contenido de cada registro.

        //        Como son nuevas es complicado de usarlas, hay que definir todo a mano.
        //        Más adelante la forma de hacer esto puede cambiar o pueden haber herramientas que lo hagan más simple.
               
        //        Acá las "policies" se heredan de la tabla padre, lo cual lo hace más complejo aún.
        //     */
        //     policies:{
        //         all:{using:`(SELECT ${pol.all.using} FROM bienes WHERE area = bienes.area)`},
        //         select:{using:`(SELECT ${pol.select.using} FROM bienes WHERE area = bienes.area)`}
        //     }
        // },
        sortColumns:[{column:'orden_compra', order:1}]
    };
}


