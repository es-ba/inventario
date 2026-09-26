"use strict";

import type {ProcedureContext, ProcedureDef} from './types-principal';
import {diasDeVigencia} from './controles-bien';
import {
    ErrorCalendario,
    sqlBienesDelGrupo,
    sqlDetalle,
    sqlResumen,
    tiposConocidos,
    validarPagina,
    validarRango,
} from './calendario-fuentes';

async function tiposActivos(context:ProcedureContext){
    const {rows} = await context.client.query(
        'SELECT tipo FROM tipos_evento_calendario WHERE activo ORDER BY orden, tipo'
    ).fetchAll();
    return tiposConocidos(rows.map(r => r.tipo));
}

export const ProceduresCalendario:ProcedureDef[] = [
    {
        action:'calendario_eventos',
        parameters:[
            {name:'desde', typeName:'text'},
            {name:'hasta', typeName:'text'},
        ],
        coreFunction:async(context:ProcedureContext, params:any)=>{
            const {desde, hasta} = validarRango(params.desde, params.hasta);
            const tipos = await tiposActivos(context);
            if(tipos.length === 0){
                return [];
            }
            const {rows} = await context.client.query(
                sqlResumen(tipos, diasDeVigencia(context.be.config)), [desde, hasta]
            ).fetchAll();
            return rows;
        },
    },
    {
        action:'calendario_dia',
        parameters:[
            {name:'fecha', typeName:'text'},
        ],
        coreFunction:async(context:ProcedureContext, params:any)=>{
            const {desde, hasta} = validarRango(params.fecha, params.fecha);
            const tipos = await tiposActivos(context);
            if(tipos.length === 0){
                return [];
            }
            const {rows} = await context.client.query(
                sqlDetalle(tipos, diasDeVigencia(context.be.config)), [desde, hasta]
            ).fetchAll();
            return rows;
        },
    },
    {
        action:'calendario_dia_bienes',
        parameters:[
            {name:'fecha'   , typeName:'text'},
            {name:'tipo'    , typeName:'text'},
            {name:'grupo'   , typeName:'text', defaultValue:''},
            {name:'desde'   , typeName:'integer', defaultValue:0},
            {name:'cantidad', typeName:'integer', defaultValue:25},
        ],
        coreFunction:async(context:ProcedureContext, params:any)=>{
            const {desde:fecha} = validarRango(params.fecha, params.fecha);
            const {desde, cantidad} = validarPagina(params.desde, params.cantidad);
            const [tipo] = tiposConocidos([params.tipo]);
            if(tipo == null || !(await tiposActivos(context)).includes(tipo)){
                throw new ErrorCalendario('El tipo de evento no existe o no está activo');
            }
            const {rows} = await context.client.query(
                sqlBienesDelGrupo(tipo, diasDeVigencia(context.be.config)),
                [fecha, String(params.grupo ?? ''), cantidad, desde]
            ).fetchAll();
            return rows;
        },
    },
];
