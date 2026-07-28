"use strict";

import * as fs from "fs-extra";
import { guarantee, is } from "guarantee-type";
import { ProcedureContext, ProcedureDef, UploadedFileInfo } from './types-principal';
import {
    BienesAtributosOpcionesResponse,
    BienesAtributoValoresOpcionesResponse,
    BienesBusquedaRequest,
} from '../common/bienes-busqueda';
import {
    buildBienesBusquedaQueries,
    parseBienesBusquedaRequest,
    rowsToCsv,
} from './bienes-busqueda-query';
import {
    buildAtributosOpcionesQuery,
    buildAtributoValoresOpcionesQuery,
} from './atributos-opciones-query';
import { bienes, getPolicies, sqlBienes } from './table-bienes';

type BienAtributoFiltro = {
    atributo?: unknown,
    operador?: unknown,
    valor?: unknown,
};

function parseBienesAtributosFiltros(value:unknown):BienAtributoFiltro[]{
    if(value == null || value === ''){
        return [];
    }
    var parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if(!Array.isArray(parsed)){
        return [];
    }
    return parsed
        .map((filter:BienAtributoFiltro) => ({
            atributo: String(filter.atributo ?? '').trim(),
            operador: String(filter.operador ?? 'contains').trim(),
            valor: String(filter.valor ?? '').trim(),
        }))
        .filter((filter:BienAtributoFiltro) => {
            var operador = String(filter.operador);
            return Boolean(filter.atributo) || operador === 'empty' || operador === 'not_empty' || Boolean(filter.valor);
        });
}

function tipoAtributoParaBusqueda(value:unknown):string{
    const typeName = String(value ?? '').trim().toLowerCase();
    if(/decimal|numeric|numero|número|integer|entero/.test(typeName)){
        return 'decimal';
    }
    if(/date|fecha/.test(typeName)){
        return 'date';
    }
    if(/boolean|logico|lógico|si\/no/.test(typeName)){
        return 'boolean';
    }
    return 'text';
}

async function prepararBusquedaBienes(context:ProcedureContext, consulta:unknown, withoutPagination = false){
    const request = parseBienesBusquedaRequest(consulta);
    const tableDef = bienes(context);
    const allowedFields = Object.fromEntries(
        tableDef.fields.map(field => [field.name, {typeName:field.typeName}])
    );
    const attributesResult = await context.client.query(`
        SELECT atributo, tipo_valor
          FROM bienes_atributos
    `).fetchAll();
    const allowedAttributes = Object.fromEntries(
        attributesResult.rows.map(row => [
            String(row.atributo),
            {typeName:tipoAtributoParaBusqueda(row.tipo_valor)}
        ])
    );
    const queries = buildBienesBusquedaQueries(request, {
        baseSql:sqlBienes,
        visibilitySql:getPolicies(context.be).select.using,
        allowedFields,
        allowedAttributes,
        withoutPagination,
    });
    return {request, tableDef, queries};
}

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
        action:'bienes_solicitud_buscar',
        parameters:[
            {name:'busqueda', typeName:'text'},
            {name:'fichas', typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:any){
            const busqueda = String(params.busqueda ?? '').trim();
            const fichas = String(params.fichas ?? '')
                .split(',')
                .map(ficha => ficha.trim())
                .filter(ficha => ficha !== '');

            if(!busqueda && fichas.length === 0){
                return [];
            }

            const result = await context.client.query(`
                SELECT
                    b.ficha,
                    b.detalle,
                    b.observacion,
                    b.modelo,
                    b.serie,
                    b.estado
                FROM bienes b
                WHERE coalesce(upper(b.estado), '') <> 'BAJA'
                    AND (
                        ($2 <> '' AND position(',' || b.ficha || ',' in ',' || $2 || ',') > 0)
                        OR (
                            $1 <> ''
                            AND (
                                b.ficha ILIKE '%' || $1 || '%'
                                OR coalesce(b.detalle, '') ILIKE '%' || $1 || '%'
                                OR coalesce(b.observacion, '') ILIKE '%' || $1 || '%'
                                OR coalesce(b.modelo, '') ILIKE '%' || $1 || '%'
                                OR coalesce(b.serie, '') ILIKE '%' || $1 || '%'
                            )
                        )
                    )
                ORDER BY
                    CASE
                        WHEN b.ficha = $1 THEN 0
                        WHEN b.ficha ILIKE $1 || '%' THEN 1
                        ELSE 2
                    END,
                    b.ficha
                LIMIT 50
            `, [busqueda, fichas.join(',')]).fetchAll();
            return result.rows;
        }
    },
    {
        action:'bienes_filtrar_por_atributos',
        parameters:[
            {name:'estadoFiltro', typeName:'text'},
            {name:'filtros', typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:any){
            const estadoFiltro = String(params.estadoFiltro ?? '').trim().toLowerCase();
            const filtros = parseBienesAtributosFiltros(params.filtros);
            const values:any[] = [estadoFiltro];
            const where:string[] = [`
                (
                    $1 = ''
                    OR ($1 = 'baja' AND lower(coalesce(b.estado, '')) = 'baja')
                    OR ($1 = 'activo' AND lower(coalesce(b.estado, '')) <> 'baja')
                )
            `];

            filtros.forEach((filtro:BienAtributoFiltro) => {
                const atributo = String(filtro.atributo ?? '').trim();
                const operador = String(filtro.operador ?? 'contains').trim();
                const valor = String(filtro.valor ?? '').trim();
                const atributoParam = values.push(atributo);
                let condition = `
                    EXISTS (
                        SELECT 1
                            FROM bien_atributo ba
                            WHERE ba.ficha = b.ficha
                                AND ($${atributoParam} = '' OR ba.atributo = $${atributoParam})
                `;

                if(operador === 'equals'){
                    const valorParam = values.push(valor);
                    condition += ` AND lower(coalesce(ba.valor, '')) = lower($${valorParam})`;
                }else if(operador === 'starts_with'){
                    const valorParam = values.push(valor);
                    condition += ` AND coalesce(ba.valor, '') ILIKE $${valorParam} || '%'`;
                }else if(operador === 'ends_with'){
                    const valorParam = values.push(valor);
                    condition += ` AND coalesce(ba.valor, '') ILIKE '%' || $${valorParam}`;
                }else if(operador === 'empty'){
                    condition += ` AND coalesce(ba.valor, '') = ''`;
                }else if(operador === 'not_empty'){
                    condition += ` AND coalesce(ba.valor, '') <> ''`;
                }else{
                    const valorParam = values.push(valor);
                    condition += ` AND coalesce(ba.valor, '') ILIKE '%' || $${valorParam} || '%'`;
                }

                condition += `)`;
                where.push(condition);
            });

            const result = await context.client.query(`
                SELECT b.*
                    FROM bienes b
                    WHERE ${where.join(' AND ')}
                    ORDER BY b.ficha
            `, values).fetchAll();
            return result.rows;
        }
    },
    {
        action:'bienes_atributos_buscar',
        parameters:[
            {name:'busqueda', typeName:'text'},
        ],
        coreFunction:async function(
            context:ProcedureContext,
            params:{busqueda:string},
        ):Promise<BienesAtributosOpcionesResponse>{
            const query = buildAtributosOpcionesQuery(params.busqueda);
            const result = await context.client.query(query.sql, query.values).fetchAll();
            return {rows:result.rows.map(row => ({
                atributo:String(row.atributo),
                nombre:row.nombre == null ? undefined : String(row.nombre),
                tipo_valor:row.tipo_valor == null ? undefined : String(row.tipo_valor),
            }))};
        }
    },
    {
        action:'bienes_atributo_valores_buscar',
        parameters:[
            {name:'atributo', typeName:'text'},
            {name:'busqueda', typeName:'text'},
        ],
        coreFunction:async function(
            context:ProcedureContext,
            params:{atributo:string, busqueda:string},
        ):Promise<BienesAtributoValoresOpcionesResponse>{
            const query = buildAtributoValoresOpcionesQuery(params.atributo, params.busqueda);
            const result = await context.client.query(query.sql, query.values).fetchAll();
            return {rows:result.rows.map(row => ({
                atributo:String(row.atributo),
                valor:String(row.valor),
                orden:row.orden == null ? undefined : Number(row.orden),
            }))};
        }
    },
    {
        action:'bienes_buscar_avanzado',
        parameters:[
            {name:'consulta', typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:{consulta:BienesBusquedaRequest|string}){
            const {queries} = await prepararBusquedaBienes(context, params.consulta);
            const countResult = await context.client.query(
                queries.countSql,
                queries.countValues
            ).fetchAll();
            const dataResult = await context.client.query(
                queries.dataSql,
                queries.dataValues
            ).fetchAll();
            return {
                rows:dataResult.rows,
                total:Number(countResult.rows[0]?.total ?? 0),
            };
        }
    },
    {
        action:'bienes_busqueda_exportar',
        parameters:[
            {name:'consulta', typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:{consulta:BienesBusquedaRequest|string}){
            const {tableDef, queries} = await prepararBusquedaBienes(context, params.consulta, true);
            const dataResult = await context.client.query(
                queries.dataSql,
                queries.dataValues
            ).fetchAll();
            const fields = tableDef.fields
                .filter(field => field.inTable !== false)
                .map(field => field.name);
            return {
                fileName:`bienes-${new Date().toISOString().slice(0, 10)}.csv`,
                csv:rowsToCsv(dataResult.rows, fields),
            };
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

    { action: 'bienes_activos_por_responsable',
        parameters: [
            { name: 'responsable', typeName: 'text', label: 'Responsable' },
            { name : 'anio', typeName: 'text', label: 'Año', defaultValue: null },
            
        ],
        resultOk: 'showGrid',
        coreFunction: async function(_context: ProcedureContext, params:any){
            const grilla = {
            tableName: 'bienes',
            fixedFields: [
                { fieldName: 'estado', value: 'alta' },
            ],
            tableDef: {
                title: 'Declaracion de Bienes',
                firstDisplayOverLimit: 20000,
                firstDisplayCount: 20000,
                sortColumns: [
                { column:'responsable', order: 1 },
                { column:'ficha', order: 1 },
                ],
            }
            };

            if (params.responsable != null && String(params.responsable).trim() !== '') {
            const resp = String(params.responsable).trim();
            grilla.fixedFields.push({ fieldName:'responsable', value: resp });
            grilla.tableDef.title += ` - Responsable: ${resp}`;
            }
            if (params.anio != null && String(params.anio).trim() !== '') {
            const anio = String(params.anio).trim();
            grilla.fixedFields.push({ fieldName:'annio', value: anio });
            grilla.tableDef.title += ` - Año: ${anio}`;
            }

            return grilla;
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
    },
    {
        action:'archivo_subir',
        progress: true,
        parameters:[
            {name:'ficha', typeName:'text'},
        ],
        files:{count:1},
        coreFunction: async function(context:ProcedureContext, parameters:any, files?:UploadedFileInfo[]){
            const be = context.be;
            const client = context.client;
            context.informProgress({message: be.messages.fileUploaded});
            const file = files![0];
            const tipoAdjunto = is.object({archivo: is.string, numero_adjunto: is.number});
            const originalFilename = file.originalFilename;
            const filename = `${parameters.ficha}/${originalFilename}`;
            const row = guarantee(tipoAdjunto, (await client.query(`
                insert into adjuntos_bienes (ficha, usuario, archivo)
                    values ($1, $2, $3)
                    returning *
            `,
                [parameters.ficha, context.username, filename]
            ).fetchUniqueRow()).row);
            try {
                await fs.move(file.path, `local-attachments/${row.archivo}`, {overwrite:true});
            } catch(err) {
                await client.query(`
                    delete from adjuntos_bienes where ficha = $1 and numero_adjunto = $2
                `, [parameters.ficha, row.numero_adjunto]).execute();
                throw err;
            }
            return {
                message: `el archivo ${row.archivo} se subió correctamente.`,
                nombre: row.archivo,
                row
            };
        }
    },
    {
        action:'archivo_solicitud_subir',
        progress: true,
        parameters:[
            {name:'acta', typeName:'text'},
            {name:'detalle', typeName:'text'},
        ],
        files:{count:1},
        coreFunction: async function(context:ProcedureContext, parameters:any, files?:UploadedFileInfo[]){
            const be = context.be;
            const client = context.client;
            context.informProgress({message: be.messages.fileUploaded});
            const file = files![0];
            const tipoAdjunto = is.object({archivo: is.string, numero_adjunto: is.number});
            const originalFilename = file.originalFilename;
            const filename = `solicitudes/${parameters.acta}/${originalFilename}`;
            const row = guarantee(tipoAdjunto, (await client.query(`
                insert into adjuntos_solicitudes (acta, usuario, detalle, archivo)
                    values ($1, $2, $3, $4)
                    returning *
            `,
                [parameters.acta, context.username, parameters.detalle ?? null, filename]
            ).fetchUniqueRow()).row);
            try {
                await fs.move(file.path, `local-attachments/${row.archivo}`, {overwrite:true});
            } catch(err) {
                await client.query(`
                    delete from adjuntos_solicitudes where acta = $1 and numero_adjunto = $2
                `, [parameters.acta, row.numero_adjunto]).execute();
                throw err;
            }
            return {
                message: `el archivo ${row.archivo} se subió correctamente.`,
                nombre: row.archivo,
                row
            };
        }
    }
];
