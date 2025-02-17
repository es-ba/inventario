"use strict";

import {TableDefinition, TableContext, AppBackend} from "./types-principal";

export function getPolicies(be:AppBackend){
    return {
        select:{ using: `${be.dbUserRolExpr} = 'admin' or responsable = ${be.dbUserNameExpr}`},// or publicar`},
        all:{ using: `${be.dbUserRolExpr} = 'admin' or responsable = ${be.dbUserNameExpr}`}// and publicar is not true` }
    }
}

export function bienes(context:TableContext):TableDefinition{
    var be = context.be;
    var admin = context.user.rol==='admin';
    var responsable = context.user.rol==='responsable';
    return {
        name:'bienes',
        elementName:'bien', 
        title:'Bienes', // solo si es distinto al "name", si es igual se puede omitir
        editable:admin || responsable,
        fields:[
            {name:'ficha'                       , typeName:'text'    }, 
            {name:'numero_integrado'            , typeName:'text'    }, 
            {name:'ubicacion'                   , typeName:'text'    },
            {name:'observacion'                 , typeName:'text'    },
            {name:'detalle'                     , typeName:'text'    },
            {name:'importe'                     , typeName:'text'    , nullable:true},
            {name:'importetotal'                , typeName:'text'    , nullable:true},//solo importe
            {name:'tipo_bien'                   , typeName:'text'    },//fk
            {name:'estado'                      , typeName:'text'    , options:['alta', 'baja']},//fk //transferencia pasaria a baja, consultar
            {name:'categoria'                   , typeName:'text'    , options:['transferencia', 'etc']},
            {name:'modalidaduso'                , typeName:'text'    , options:['trabajoremoto', 'prestamo']},//fk //transferencia pasaria a baja, consultar
            {name:'rubro'                       , typeName:'text'    , nullable:true},//fk
            {name:'clase'                       , typeName:'text'    , nullable:true},//fk
            {name:'cuenta'                      , typeName:'text'    , nullable:true},//fk
            {name:'grupo'                       , typeName:'text'    , nullable:true},//fk
            {name:'marca'                       , typeName:'text'    },
            {name:'serie'                       , typeName:'text'    },
            {name:'imei'                        , typeName:'text'    },
            {name:'modelo'                      , typeName:'text'    },
            {name:'anio'                        , typeName:'text'    },
            {name:'prd'                         , typeName:'text'    },
            {name:'caracteridentificador'       , typeName:'text'    },//?
            {name:'enusode'                     , typeName:'text'    },
            {name:'clasificacion'               , typeName:'text'    },
            {name:'area'                        , typeName:'text'    , nullable:true},//fk 
            {name:'sede'                        , typeName:'text'    , nullable:true},//fk
            {name:'espacio'                     , typeName:'text'    , nullable:true},//fk
            {name:'responsable'                 , typeName:'text'    , nullable:true},//fk
            // {name:'publicar'         , typeName:'boolean' , editable:admin },
            // {name:'formato'          , typeName:'text'    , options:['plano', 'md', 'html', 'jade']},
            {name:'ordencompra'                 , typeName:'text'    , nullable:true},//fk //viejomantenimiento
            {name:'fecha'              , typeName:'date'    , nullable:false, specialDefaultValue:'current_date'},//de mas, se puede usar log
            // {name:'aclaracion'                  , typeName:'text'    },//?
        ],
        primaryKey:['ficha'],
        foreignKeys:[
            {references:'responsables', fields:['responsable']},
            {references:'areas', fields:['area']},
            {references:'sedes', fields:['sede']},
            {references:'espacios', fields:['espacio']},
            {references:'rubros', fields:['rubro', 'clase', 'cuenta'] },
            {references:'tipo_bien', fields:['tipo_bien']},
            {references:'grupos', fields:['grupo']},
        ],
        constraints:[
            {constraintType:'unique', fields:['ficha']}
        ],
        detailTables:[
            // {table:'areas', fields:['area'], abr:'V'}
        ],
        sql:{
            /* 
               ATENCIÓN
               --------
               Las pólicies son algo nuevo en backend-plus, utilizan las policies de PostgreSQL: https://www.postgresql.org/docs/9.5/ddl-rowsecurity.html
               Permiten cambiar los permisos en función del contenido de cada registro.

               Como son nuevas es complicado de usarlas, hay que definir todo a mano.
               Más adelante la forma de hacer esto puede cambiar o pueden haber herramientas que lo hagan más simple.
               
            */
            policies:getPolicies(be)
        }
    };
}


 

