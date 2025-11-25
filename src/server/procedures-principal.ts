"use strict";

import { ProcedureContext, ProcedureDef } from './types-principal';

export const ProceduresInventario:ProcedureDef[] = [
    {
        action:'ejemplo_publicar_propios',
        parameters:[
            {name:'hasta_fecha', typeName:'date', specialDefaultValue:'current_date'}
        ],
        proceedLabel:'publicar',
        coreFunction:async function(context:ProcedureContext, parameters:any){
            const {client} = context;
            var result = await client.query(`
                UPDATE ejemplo_noticias
                    SET publicar = TRUE
                    WHERE publicar IS NOT TRUE
                        AND redactor = $1
                        AND current_date <= $2
                    RETURNING TRUE
            `,[context.username, parameters.hasta_fecha]).fetchAll();
            return !result.rows.length ? 'No había noticias sin publicar hasta esa fecha para usted':(
                result.rows.length==1?'se publicó una noticia':'se publicaron '+result.rows.length+' noticias'
            );
        }
    },
    {
        action:'traer_bienes',
        parameters:[],
        proceedLabel:'bienes',
        coreFunction:async function(context:ProcedureContext){
            const {client} = context;
            var result = await client.query(`
                SELECT * FROM bienes`,[]).fetchAll();
            return result.rows;
        }
    },
    {
        action: 'insertar_bien',
        parameters: [
            { name: 'ficha', typeName: 'text' },
            { name: 'observacion', typeName: 'text' },
            { name: 'integrado', typeName: 'text' },
            { name: 'fecha', typeName: 'date' }
        ],
        proceedLabel: 'insertar bien',
        coreFunction: async function (context: ProcedureContext, parameters: any) {
            const { client } = context;
            var result = await client.query(`
                INSERT INTO bienes (ficha, observacion, integrado, fecha)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `, [parameters.ficha, parameters.observacion, parameters.integrado, parameters.fecha]).fetchAll();
            return result.rows.length ? result.rows[0] : 'Error al insertar el bien';
        }
    },
    {
        action: 'accion_solicitud_ejecutar',
        parameters:[
            {name:'acta', typeName:'text'},
            {name:'accion', typeName:'text'},
        ],
        coreFunction: async function(context:ProcedureContext, params:any){
            var estadoAccion = await context.client.query(`
                SELECT ea.estado_destino, m.estado as estado_actual, ea.condicion
                    FROM movimientos_solicitudes m
                    JOIN estados_acciones ea ON ea.estado = m.estado
                    WHERE m.acta = $1 AND ea.eaccion = $2
            `, [params.acta, params.accion]).fetchUniqueRow();
            
            if(!estadoAccion.row){
                throw new Error('Acción no disponible para el estado actual');
            }
            
            if(estadoAccion.row.condicion){
                var cumple = await context.client.query(`
                    SELECT accion_cumple_condicion($1, $2, $3, $4) as cumple
                `, [params.acta, estadoAccion.row.estado_actual, params.accion, estadoAccion.row.condicion]).fetchUniqueValue();
                
                if(!cumple.value){
                    throw new Error('No se cumple la condición para ejecutar la acción');
                }
            }
            
            await context.client.query(`
                UPDATE movimientos_solicitudes 
                    SET estado = $2,
                        fecha_modificacion = CURRENT_DATE,
                        usuario_modificacion = $3
                    WHERE acta = $1
            `, [params.acta, estadoAccion.row.estado_destino, context.user.usuario])
            .fetchUniqueRow();
            
            return {message: `Acción ${params.accion} ejecutada correctamente`};
        }
    }
];
