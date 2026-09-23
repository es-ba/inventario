"use strict";

import type {ProcedureContext, ProcedureDef} from './types-principal';
import {validarPersonasSiper} from './siper-personas';

type Filas = {rows:Record<string, unknown>[]};
export type ClienteSql = {
    query(sql:string, params?:unknown[]):{fetchAll():Promise<Filas>},
};

export function exigirAdmin(rol:unknown, accion:string){
    if(rol !== 'admin'){
        throw new Error(`Sólo el administrador puede ${accion}`);
    }
}

function listaDeCodigos(texto:unknown, que:string):string[]{
    const lista = JSON.parse(String(texto ?? '[]'));
    if(!Array.isArray(lista) || lista.some(x => typeof x !== 'string' || x.trim() === '')){
        throw new Error(`La lista de ${que} es inválida`);
    }
    return [...new Set(lista.map(x => x.trim()))];
}

export async function registrarPersonasSiper(client:ClienteSql, recibidas:unknown, usuario:string|null){
    const personas = validarPersonasSiper(recibidas);
    await client.query('DELETE FROM siper_personas').fetchAll();
    await client.query(`
        INSERT INTO siper_personas(idper, apellido, nombres, sector, activo, fecha_egreso)
        SELECT idper, apellido, nombres, sector, activo, fecha_egreso
          FROM jsonb_to_recordset($1::jsonb)
            AS p(idper text, apellido text, nombres text, sector text, activo boolean, fecha_egreso date)
    `, [JSON.stringify(personas)]).fetchAll();
    await client.query(
        'INSERT INTO siper_recepciones(usuario, personas) VALUES ($1, $2)', [usuario, personas.length],
    ).fetchAll();
    const actualizados = await client.query(`
        UPDATE responsables r
           SET activo_siper = sp.activo, fecha_egreso = sp.fecha_egreso
          FROM siper_personas sp
         WHERE r.idper = sp.idper
           AND (r.activo_siper IS DISTINCT FROM sp.activo OR r.fecha_egreso IS DISTINCT FROM sp.fecha_egreso)
        RETURNING r.responsable
    `).fetchAll();
    return {
        message:`Se recibieron ${personas.length} personas de siper y se actualizaron ${actualizados.rows.length} responsables`,
        personas:personas.length,
        actualizados:actualizados.rows.length,
    };
}

export async function inactivarResponsables(client:ClienteSql, texto:unknown, rol:unknown){
    exigirAdmin(rol, 'desactivar responsables');
    const codigos = listaDeCodigos(texto, 'responsables');
    const cambiados = await client.query(`
        UPDATE responsables SET activo = false
         WHERE responsable = ANY($1::text[]) AND activo IS DISTINCT FROM false
        RETURNING responsable
    `, [codigos]).fetchAll();
    return {
        message:`Se desactivaron ${cambiados.rows.length} responsables`,
        inactivados:cambiados.rows.map(r => String(r.responsable)),
    };
}

export async function darAltasDeSiper(client:ClienteSql, texto:unknown, rol:unknown){
    exigirAdmin(rol, 'dar de alta responsables');
    const idpers = listaDeCodigos(texto, 'personas');
    const altas = await client.query(`
        INSERT INTO responsables(idper, apellido, nombre, sector, activo, activo_siper, fecha_egreso, externo)
        SELECT sp.idper, sp.apellido, sp.nombres, s.sector, true, sp.activo, sp.fecha_egreso, false
          FROM siper_personas sp
          LEFT JOIN sectores s ON s.sector = sp.sector
         WHERE sp.idper = ANY($1::text[])
           AND sp.activo
           AND NOT EXISTS (SELECT 1 FROM responsables r WHERE r.idper = sp.idper)
        RETURNING responsable
    `, [idpers]).fetchAll();
    const creados = altas.rows.map(r => String(r.responsable));
    const omitidos = idpers.filter(idper => !creados.includes(idper));
    return {
        message:`Se dieron de alta ${creados.length} responsables`
            + (omitidos.length ? `; no se dieron de alta ${omitidos.join(', ')} porque ya existen, están inactivos o no están entre las personas recibidas de siper` : ''),
        creados,
        omitidos,
    };
}

export const ProceduresSiper:ProcedureDef[] = [
    {
        action:'responsables_inactivar',
        parameters:[
            {name:'responsables', typeName:'text'},
        ],
        coreFunction:async(context:ProcedureContext, params:any)=>
            inactivarResponsables(context.client, params.responsables, context.user.rol),
    },
    {
        action:'responsables_alta_siper',
        parameters:[
            {name:'idpers', typeName:'text'},
        ],
        coreFunction:async(context:ProcedureContext, params:any)=>
            darAltasDeSiper(context.client, params.idpers, context.user.rol),
    },
];
