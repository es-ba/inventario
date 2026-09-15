"use strict";

import * as fs from 'fs-extra';
import * as path from 'node:path';
import type {ProcedureContext, ProcedureDef} from './types-principal';
import {describirSolicitudBaja, normalizarFichas, planificarBaja} from './bienes-baja';
import {sqlVisibilidad} from './politicas';

type AccionBaja = 'solicitar'|'aprobar'|'aprobar_directa'|'rechazar'|'restaurar';

async function ejecutarBaja(context:ProcedureContext, fichas:string[], accion:AccionBaja, motivo:string, documento:string){
    const {client} = context;
    const {row:permisos} = await client.query(`
        SELECT coalesce(bool_or(coalesce((to_jsonb(r)->>eba.capacidad)::boolean, false)), false) AS permitido
          FROM estados_baja_acciones eba
          LEFT JOIN roles r ON r.rol = get_app_user('rol')
         WHERE eba.accion_baja = $1
    `,[accion]).fetchUniqueRow();
    if(!permisos.permitido){ throw new Error(`No tiene permisos para ${accion} la baja`); }
    if(['solicitar','aprobar_directa','rechazar','restaurar'].includes(accion) && !motivo){
        throw new Error(`Debe indicar el motivo para ${accion} la baja`);
    }
    if(['aprobar','aprobar_directa'].includes(accion) && documento && !/^\d+$/.test(documento)){
        throw new Error('Seleccione el número de un adjunto del bien como documento de respaldo');
    }

    // FOR UPDATE también exige la policy de escritura para revisores sin permiso de edición.
    await client.query("SELECT set_config('inventario.baja_accion',$1,true)",[accion]).execute();
    // backend-plus ejecuta cada procedure en una transacción; todo el lote comparte estos bloqueos.
    const {rows} = await client.query(`
        SELECT b.ficha, eba.transicion_baja, eba.estado_destino, eba.activo_destino
          FROM bienes b
          LEFT JOIN estados_baja_acciones eba
            ON eba.accion_baja = $2
           AND eba.estado_origen IS NOT DISTINCT FROM b.estado_baja
           AND eba.activo_origen = b.activo
         WHERE b.ficha = ANY($1::text[])
          AND ${sqlVisibilidad('b.ficha')} ORDER BY b.ficha FOR UPDATE OF b
    `, [fichas,accion]).fetchAll();
    const visibles = new Set(rows.map(row => String(row.ficha)));
    for(const ficha of fichas){
        if(!visibles.has(ficha)){
            throw new Error(`La ficha ${ficha} no existe o no tiene acceso a ella`);
        }
    }
    for(const row of rows){
        if(!row.transicion_baja){
            throw new Error(`La acción ${accion} no está disponible para la ficha ${row.ficha} en su estado actual`);
        }
    }
    if(['aprobar','aprobar_directa'].includes(accion) && documento){
        for(const {ficha} of rows){
            const adjuntos = await client.query(`
                SELECT archivo FROM adjuntos_bienes
                 WHERE ficha=$1 AND numero_adjunto::text=$2
            `,[ficha,documento]).fetchAll();
            const archivo = String(adjuntos.rows[0]?.archivo ?? '');
            const base = path.resolve('local-attachments');
            const ruta = path.resolve(base,archivo);
            const relativa = path.relative(base,ruta);
            if(!archivo || relativa.startsWith('..') || path.isAbsolute(relativa)){
                throw new Error(`El adjunto de respaldo de la ficha ${ficha} no tiene un archivo válido`);
            }
            const stat = await fs.stat(ruta).catch(() => null);
            if(!stat?.isFile()){
                throw new Error(`No se encuentra el archivo de respaldo de la ficha ${ficha}`);
            }
        }
    }
    const cambios:Record<AccionBaja,{sql:string, valores:unknown[]}> = {
        solicitar:{
            sql:"motivo_baja=$4, fecha_solicitud=current_date,"
                + " solicitado_por=get_app_user(), fecha_revision=null, revisado_por=null,"
                + " fecha_finalizacion=null, autorizado_por=null, documento_respaldo=null, motivo_rechazo=null",
            valores:[motivo],
        },
        aprobar:{
            sql:"documento_respaldo=$4,"
                + " fecha_finalizacion=current_date, autorizado_por=get_app_user()",
            valores:[documento || null],
        },
        aprobar_directa:{
            sql:"motivo_baja=$4, documento_respaldo=$5,"
                + " fecha_solicitud=current_date, solicitado_por=get_app_user(),"
                + " fecha_finalizacion=current_date, autorizado_por=get_app_user(), motivo_rechazo=null",
            valores:[motivo,documento || null],
        },
        rechazar:{
            sql:"motivo_rechazo=$4,"
                + " fecha_finalizacion=current_date, autorizado_por=get_app_user()",
            valores:[motivo],
        },
        restaurar:{
            sql:"motivo_baja=null, fecha_solicitud=null, solicitado_por=null,"
                + " revisado_por=null, fecha_revision=null, fecha_finalizacion=null, autorizado_por=null,"
                + " documento_respaldo=null, motivo_rechazo=null, motivo_restauracion=$4,"
                + " restaurado_por=get_app_user(), fecha_restauracion=current_date",
            valores:[motivo],
        },
    };
    const cambio = cambios[accion];
    for(const row of rows){
        const ficha = row.ficha;
        if(accion === 'restaurar'){
            await client.query(`
                SELECT registrar_evento_bien(b.ficha, 'baja_restaurar',
                    jsonb_build_object('motivo',$2::text,'baja_anterior',to_jsonb(b))::text)
                  FROM bienes b WHERE b.ficha=$1
            `,[ficha,motivo]).execute();
        }
        const resultado = await client.query(`
            UPDATE bienes SET estado_baja=$2, activo=$3, ${cambio.sql}
             WHERE ficha=$1 RETURNING ficha
        `,[ficha,row.estado_destino,row.activo_destino,...cambio.valores]).fetchAll();
        if(resultado.rows.length !== 1){ throw new Error(`No se pudo ${accion} la baja de la ficha ${ficha}`); }
    }
    // No habilitar escrituras genéricas posteriores dentro de la misma transacción.
    await client.query("SELECT set_config('inventario.baja_accion','',true)").execute();
    return rows.length;
}

export const ProceduresBajas:ProcedureDef[] = [
    {
        action:'bienes_dar_de_baja',
        parameters:[{name:'fichas',typeName:'text'},{name:'motivo_baja',typeName:'text'}],
        proceedLabel:'solicitar baja',
        coreFunction:async(context:ProcedureContext,params:any)=>{
            const motivos = await context.client.query('SELECT motivo_baja FROM motivos_baja').fetchAll();
            const plan = planificarBaja({fichas:params.fichas,motivo:params.motivo_baja},
                motivos.rows.map(row=>String(row.motivo_baja)));
            const solicitados = await ejecutarBaja(context,plan.fichas,'solicitar',plan.motivo,'');
            return {message:describirSolicitudBaja(solicitados),pedidos:plan.fichas.length,solicitados,dados_de_baja:0};
        },
    },
    {
        action:'bienes_baja_accion',
        parameters:[
            {name:'fichas',typeName:'text'}, {name:'accion',typeName:'text'},
            {name:'motivo',typeName:'text',defaultValue:null},
            {name:'documento_respaldo',typeName:'text',defaultValue:null},
        ],
        coreFunction:async(context:ProcedureContext,params:any)=>{
            const accion = String(params.accion) as AccionBaja;
            if(!['aprobar','aprobar_directa','rechazar','restaurar'].includes(accion)){
                throw new Error('Operación de baja inválida');
            }
            const cantidad = await ejecutarBaja(context,normalizarFichas(params.fichas),accion,
                String(params.motivo ?? '').trim(),String(params.documento_respaldo ?? '').trim());
            const mensajes = {
                aprobar:'Baja aprobada', aprobar_directa:'Baja directa aprobada', rechazar:'Baja rechazada',
                restaurar:'Bien restaurado',
            };
            return {message:`${mensajes[accion as keyof typeof mensajes]} (${cantidad}).`,cantidad};
        },
    },
];
