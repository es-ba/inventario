"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-principal";
import {movimientos_solicitudes} from "./table-movimientos_solicitudes";

export function movimientos_solicitudes_acciones(context:TableContext):TableDefinition {
    var tableDef = movimientos_solicitudes(context);
    
    tableDef.name = `movimientos_solicitudes_acciones`;
    
    var estadoIndex = tableDef.fields.findIndex(f => f.name === 'estado');

    tableDef.fields.splice(estadoIndex + 1, 0,
        {name:"acciones"                    , typeName: 'jsonb'      , editable:false, inTable:false},
        {name:"acciones_avance"             , typeName: 'text'       , editable:false, inTable:false, clientSide:'accionesAvance'},
        {name:"acciones_retroceso"          , typeName: 'text'       , editable:false, inTable:false, clientSide:'accionesRetroceso'},
    );
    
    tableDef.fields.forEach((field:FieldDefinition)=>{
        if(!field.table){
            field.table = 'movimientos_solicitudes'
        }
    });
    
    tableDef.hiddenColumns = ['acciones'];
    tableDef.refrescable = true;
    tableDef.selfRefresh = true;
    
    tableDef.sql!.isTable = false;
    tableDef.sql!.from = `(
        SELECT * FROM movimientos_solicitudes aux
        , LATERAL (
            SELECT jsonb_agg(z.*) as acciones
                FROM (
                    SELECT ea.*, ac.path_icono_svg, ac.desactiva_boton, ac.confirma
                        FROM estados_acciones ea 
                        JOIN acciones ac USING (eaccion)
                        WHERE ea.estado = aux.estado
                        AND accion_cumple_condicion(aux.acta, ea.estado, ea.eaccion, ea.condicion)
                ) z
            ) y
        )`;
    return tableDef;
}