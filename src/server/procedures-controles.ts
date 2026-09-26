"use strict";

import type {ProcedureContext, ProcedureDef} from './types-principal';
import {armarGruposPorItem, TipoDeItem} from '../common/controles';
import {condicionControlable, ErrorControl, planificarControl} from './controles-bien';
import {sqlVisibilidad} from './politicas';

function valoresPorClave(filas:any[], clave:string):Map<string, Set<string>>{
    const porClave = new Map<string, Set<string>>();
    for(const fila of filas){
        const k = String(fila[clave]);
        if(!porClave.has(k)){
            porClave.set(k, new Set());
        }
        porClave.get(k)!.add(String(fila.valor));
    }
    return porClave;
}

async function catalogoDeControl(context:ProcedureContext, ficha:string, grupoDelBien:string|null){
    const {client} = context;
    const items = await client.query('SELECT item, tipo_valor, activo FROM items_control').fetchAll();
    const opciones = await client.query('SELECT item, valor FROM items_control_opciones').fetchAll();
    const grupos = await client.query('SELECT item, grupo FROM items_control_grupos').fetchAll();
    const vinculos = await client.query('SELECT item, atributo FROM items_control_atributos').fetchAll();
    const valores = await client.query('SELECT atributo, valor FROM bienes_atributo_valores').fetchAll();
    const ultimo = await client.query(
        'SELECT max(fecha)::text AS fecha FROM controles_bien WHERE ficha = $1', [ficha]
    ).fetchUniqueRow();
    const hoy = await client.query('SELECT current_date::text AS hoy').fetchUniqueRow();
    return {
        items:items.rows.map(r => ({item:String(r.item), tipo_valor:r.tipo_valor as TipoDeItem, activo:r.activo === true})),
        opciones:valoresPorClave(opciones.rows, 'item'),
        gruposPorItem:armarGruposPorItem(grupos.rows),
        atributoPorItem:new Map(vinculos.rows.map(r => [String(r.item), String(r.atributo)])),
        valoresPorAtributo:valoresPorClave(valores.rows, 'atributo'),
        grupoDelBien,
        fechaUltimoControl:ultimo.row.fecha == null ? null : String(ultimo.row.fecha),
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
            const plan = planificarControl(params, await catalogoDeControl(context, ficha, bien.grupo));
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
            for(const {atributo, valor} of plan.atributos){
                await client.query(`
                    INSERT INTO bien_atributo (ficha, atributo, valor) VALUES ($1, $2, $3)
                        ON CONFLICT (ficha, atributo) DO UPDATE SET valor = excluded.valor
                `, [plan.ficha, atributo, valor]).execute();
            }
            return {message:`Control registrado para la ficha ${plan.ficha}.`, control:row.control};
        },
    },
];
