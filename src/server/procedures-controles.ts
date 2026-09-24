"use strict";

import type {ProcedureContext, ProcedureDef} from './types-principal';
import {armarGruposPorItem, TipoDeItem} from '../common/controles';
import {condicionControlable, ErrorControl, planificarControl} from './controles-bien';
import {sqlVisibilidad} from './politicas';

async function catalogoDeControl(context:ProcedureContext, grupoDelBien:string|null){
    const {client} = context;
    const items = await client.query('SELECT item, tipo_valor, activo FROM items_control').fetchAll();
    const opciones = await client.query('SELECT item, valor FROM items_control_opciones').fetchAll();
    const grupos = await client.query('SELECT item, grupo FROM items_control_grupos').fetchAll();
    const hoy = await client.query('SELECT current_date::text AS hoy').fetchUniqueRow();
    const porItem = new Map<string, Set<string>>();
    for(const {item, valor} of opciones.rows){
        if(!porItem.has(item)){
            porItem.set(item, new Set());
        }
        porItem.get(item)!.add(String(valor));
    }
    return {
        items:items.rows.map(r => ({item:String(r.item), tipo_valor:r.tipo_valor as TipoDeItem, activo:r.activo === true})),
        opciones:porItem,
        gruposPorItem:armarGruposPorItem(grupos.rows),
        grupoDelBien,
        hoy:String(hoy.row.hoy),
    };
}

export const ProceduresControles:ProcedureDef[] = [
    {
        action:'control_registrar',
        parameters:[
            {name:'ficha'              , typeName:'text'},
            {name:'fecha'              , typeName:'text', defaultValue:null},
            {name:'observacion'        , typeName:'text', defaultValue:null},
            {name:'items'              , typeName:'text', defaultValue:null},
        ],
        coreFunction:async(context:ProcedureContext, params:any)=>{
            const {client} = context;
            const permiso = await client.query(
                `SELECT coalesce(puede_controlar, false) AS puede FROM roles WHERE rol = $1`,
                [String(context.user.rol ?? '')]
            ).fetchAll();
            if(permiso.rows[0]?.puede !== true){
                throw new ErrorControl('No tiene permiso para registrar controles');
            }
            const ficha = String(params.ficha ?? '').trim();
            const bienes = await client.query(`
                SELECT b.ficha, nullif(btrim(b.grupo), '') AS grupo,
                       coalesce(${condicionControlable('b')}, false) AS controlable
                  FROM bienes b
                 WHERE b.ficha = $1 AND ${sqlVisibilidad('b.ficha')}
            `, [ficha]).fetchAll();
            const bien = bienes.rows[0];
            if(bien == null){
                throw new ErrorControl(`La ficha ${ficha} no existe o no tiene acceso a ella`);
            }
            if(bien.controlable !== true){
                throw new ErrorControl(`La ficha ${ficha} está dada de baja`);
            }
            const plan = planificarControl(params, await catalogoDeControl(context, bien.grupo));
            const {row} = await client.query(`
                INSERT INTO controles_bien (ficha, fecha, observacion, usuario_creacion)
                    VALUES ($1, $2::date, $3, get_app_user())
                    RETURNING control
            `, [plan.ficha, plan.fecha, plan.observacion]).fetchUniqueRow();
            for(const {item, valor} of plan.items){
                await client.query(
                    `INSERT INTO controles_bien_items (control, item, valor) VALUES ($1, $2, $3)`,
                    [row.control, item, valor]
                ).execute();
            }
            return {message:`Control registrado para la ficha ${plan.ficha}.`, control:row.control};
        },
    },
];
