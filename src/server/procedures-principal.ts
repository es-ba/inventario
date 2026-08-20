"use strict";

import * as fs from "fs-extra";
import { guarantee, is } from "guarantee-type";
import { ProcedureContext, ProcedureDef, UploadedFileInfo } from './types-principal';
import {
    BienesAtributosOpcionesResponse,
    BienesAtributoValoresOpcionesResponse,
    BienesBuscarAvanzadoParameters,
    BienesBusquedaExportarParameters,
    BienesBusquedaResponse,
    BienesBusquedaExportResponse,
} from '../common/contracts';
import {selectBienesGridFields} from '../common/bienes-busqueda';
import {
    buildBienesBusquedaQueries,
    parseBienesBusquedaRequest,
    rowsToCsv,
} from './bienes-busqueda-query';
import {
    normalizeBienesPresentationRows,
    resolveBienesPresentationSqlFieldName,
} from './bienes-presentacion';
import {
    buildAtributosOpcionesQuery,
    buildAtributoValoresOpcionesQuery,
} from './atributos-opciones-query';
import { bienes, getPolicies, sqlBienes } from './table-bienes';
import { generarDeclaracionPdf } from './declaracion-pdf-render';
import { DocumentoEmitido, analizarFirmaPdf, verificarDeclaracionFirmada } from './declaracion-verificacion';
import { setAtributosDeBienes } from './reportes-bienes';
import { describirPlan, planificarEdicionMasiva } from './bienes-edicion-masiva';
import { generarDocumentoSolicitud } from './solicitud-documento-render';
import { operacionDeActa } from './solicitud-documento';
import type { TipoDocumentoSolicitud } from './solicitud-documento';
import { createHash } from 'node:crypto';

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
        resolveSqlFieldName:resolveBienesPresentationSqlFieldName,
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
        action:'solicitud_bienes_agregar',
        parameters:[
            {name:'acta', typeName:'text'},
            {name:'fichas', typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:any){
            /*
                Alta de varios bienes de una vez. Un insert por bien desde el cliente deja
                la solicitud a medio cargar si alguno falla; acá entran todos o ninguno.

                Los que ya estaban no son un error: se ignoran y se informan aparte.
            */
            const acta = String(params.acta ?? '').trim();
            const fichas = JSON.parse(String(params.fichas ?? '[]'));
            if(!Array.isArray(fichas) || fichas.length === 0){
                throw new Error('No se indicó ningún bien');
            }
            const lista = fichas.map(ficha => String(ficha).trim()).filter(ficha => ficha !== '');
            if(lista.length === 0){
                throw new Error('No se indicó ningún bien');
            }

            const existe = await context.client.query(
                `SELECT acta FROM movimientos_solicitudes WHERE acta = $1`,
                [acta]
            ).fetchAll();
            if(!existe.rows.length){
                throw new Error(`No existe la solicitud ${acta}`);
            }

            const result = await context.client.query(`
                INSERT INTO movimientos_solicitud_bien (acta, ficha, usuario_creacion)
                    SELECT $1, f.ficha, $3
                        FROM unnest($2::text[]) AS f(ficha)
                        WHERE EXISTS (SELECT 1 FROM bienes b WHERE b.ficha = f.ficha)
                    ON CONFLICT (acta, ficha) DO NOTHING
                    RETURNING ficha
            `, [acta, lista, context.username]).fetchAll();

            const agregados = result.rows.length;
            const repetidos = lista.length - agregados;
            return {
                agregados,
                repetidos,
                message:`Se agregaron ${agregados} ${agregados === 1 ? 'bien' : 'bienes'}`
                    + (repetidos ? `; ${repetidos} ya estaban en la solicitud.` : '.'),
            };
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
                    OR ($1 = 'baja' AND lower(coalesce(b.activo, '')) = 'baja')
                    OR ($1 = 'activo' AND lower(coalesce(b.activo, '')) <> 'baja')
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
        coreFunction:async function(
            context:ProcedureContext,
            params:BienesBuscarAvanzadoParameters,
        ):Promise<BienesBusquedaResponse>{
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
                rows:normalizeBienesPresentationRows(dataResult.rows),
                total:Number(countResult.rows[0]?.total ?? 0),
            };
        }
    },
    {
        action:'bienes_busqueda_exportar',
        parameters:[
            {name:'consulta', typeName:'text'},
        ],
        coreFunction:async function(
            context:ProcedureContext,
            params:BienesBusquedaExportarParameters,
        ):Promise<BienesBusquedaExportResponse>{
            const {tableDef, queries} = await prepararBusquedaBienes(context, params.consulta, true);
            const dataResult = await context.client.query(
                queries.dataSql,
                queries.dataValues
            ).fetchAll();
            const fields = selectBienesGridFields(tableDef.fields)
                .map(field => field.name);
            const rows = normalizeBienesPresentationRows(dataResult.rows);
            return {
                fileName:`bienes-${new Date().toISOString().slice(0, 10)}.csv`,
                csv:rowsToCsv(rows, fields),
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
                { fieldName: 'activo', value: 'alta' },
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
    },
    {
        action:'declaracion_emitir',
        parameters:[
            {name:'declaracion', typeName:'bigint'},
        ],
        proceedLabel:'emitir',
        coreFunction: async function(context:ProcedureContext, params:any){
            const client = context.client;
            const declaracion = params.declaracion;

            if(context.user.rol === 'lectura'){
                throw new Error('No tiene permisos para emitir declaraciones');
            }

            // Se toma el lock de la declaración antes de leer nada, para que dos emisiones
            // simultáneas no generen la misma versión.
            const bloqueo = await client.query(`
                SELECT estado FROM declaraciones WHERE declaracion = $1 FOR UPDATE
            `, [declaracion]).fetchAll();
            if(!bloqueo.rows.length){
                throw new Error(`No existe la declaración ${declaracion}`);
            }
            const estadoActual = bloqueo.rows[0].estado;
            if(estadoActual !== 'BORRADOR'){
                throw new Error(
                    `La declaración ${declaracion} está en estado ${estadoActual}.`
                    + ` Sólo se puede emitir una declaración en BORRADOR.`
                );
            }

            const cabeceraResult = await client.query(`
                SELECT
                    d.declaracion,
                    d.fecha,
                    d.responsable,
                    d.area,
                    d.observaciones,
                    r.nombre AS responsable_nombre,
                    r.apellido AS responsable_apellido,
                    a.sigla AS area_nombre
                FROM declaraciones d
                LEFT JOIN responsables r ON r.responsable = d.responsable
                LEFT JOIN areas a ON a.area = d.area
                WHERE d.declaracion = $1
            `, [declaracion]).fetchUniqueRow();

            // Las descripciones se resuelven acá y no se guardan en declaraciones_bienes:
            // el documento queda congelado como archivo, así que alcanza con leerlas al
            // momento de emitir.
            const bienesResult = await client.query(`
                SELECT
                    db.ficha,
                    db.detalle,
                    db.observacion,
                    db.rubro,
                    db.clase,
                    db.cuenta,
                    cue.nombre AS cuenta_nombre,
                    db.marca,
                    ma.descripcion AS marca_descripcion
                FROM declaraciones_bienes db
                LEFT JOIN cuentas cue
                       ON cue.rubro = db.rubro
                      AND cue.clase = db.clase
                      AND cue.cuenta = db.cuenta
                LEFT JOIN marcas ma ON ma.marca = db.marca
                WHERE db.declaracion = $1
                ORDER BY db.ficha
            `, [declaracion]).fetchAll();

            if(!bienesResult.rows.length){
                throw new Error(`La declaración ${declaracion} no tiene bienes y no puede emitirse`);
            }

            const versionResult = await client.query(`
                SELECT coalesce(max(version), 0) + 1 AS version
                    FROM declaraciones_documentos
                    WHERE declaracion = $1
            `, [declaracion]).fetchUniqueRow();
            const version = Number(versionResult.row.version);

            const fechaEmision = new Date();
            const generado = await generarDeclaracionPdf({
                cabecera: cabeceraResult.row as any,
                bienes: bienesResult.rows as any,
                emision: {version, fecha: fechaEmision, usuario: context.username},
            });

            const archivo = `declaraciones/${declaracion}/v${version}-emitido.pdf`;
            // El archivo se escribe antes que la fila: si falla el disco no queda un
            // documento registrado que no existe, y un PDF huérfano es inocuo (la próxima
            // emisión de la misma versión lo pisa).
            await fs.outputFile(`local-attachments/${archivo}`, generado.buffer);
            try{
                await client.query(`
                    insert into declaraciones_documentos
                        (declaracion, version, tipo, archivo, hash_sha256, codigo_contenido, usuario)
                        values ($1, $2, 'emitido', $3, $4, $5, $6)
                `, [
                    declaracion,
                    version,
                    archivo,
                    generado.hashSha256,
                    generado.codigoContenido,
                    context.username,
                ]).execute();
                await client.query(`
                    update declaraciones set estado = 'EMITIDA' where declaracion = $1
                `, [declaracion]).execute();
            }catch(err){
                await fs.remove(`local-attachments/${archivo}`);
                throw err;
            }

            return {
                message: `Se emitió la versión ${version} de la declaración ${declaracion}`
                    + ` con ${generado.cantidadBienes} bienes (código ${generado.codigoContenido}).`
                    + ` La lista de bienes queda bloqueada hasta que se observe la declaración.`,
                declaracion,
                version,
                archivo,
                hash_sha256: generado.hashSha256,
                codigo_contenido: generado.codigoContenido,
                cantidad_bienes: generado.cantidadBienes,
            };
        }
    },
    {
        action:'bienes_edicion_masiva',
        parameters:[
            {name:'fichas', typeName:'text'},
            {name:'cambios', typeName:'text'},
            {name:'dryRun', typeName:'boolean'},
        ],
        proceedLabel:'aplicar',
        coreFunction: async function(context:ProcedureContext, params:any){
            const client = context.client;
            if(context.user.rol === 'lectura'){
                throw new Error('No tiene permisos para modificar bienes');
            }
            const parsear = (valor:unknown, nombre:string) => {
                if(valor == null || valor === ''){
                    return [];
                }
                if(typeof valor !== 'string'){
                    return valor;
                }
                try{
                    return JSON.parse(valor);
                }catch(_err){
                    throw new Error(`No se pudo leer el parámetro ${nombre}`);
                }
            };

            const definicion = bienes(context as never);
            const plan = planificarEdicionMasiva({
                fichas: parsear(params.fichas, 'fichas'),
                cambios: parsear(params.cambios, 'cambios'),
            }, definicion);

            // Siempre se cuenta primero: el usuario confirma sobre números concretos y no
            // sobre una intención. Las filas que la RLS no deja ver quedan afuera del
            // conteo, y por eso se informa la diferencia.
            const previo = await client.query(plan.sqlPrevio, plan.valores).fetchUniqueRow();
            const alcanzados = Number(previo.row.alcanzados);
            const cambianPorCampo:Record<string, number> = {};
            plan.cambios.forEach(cambio => {
                cambianPorCampo[cambio.campo] = Number(previo.row[`cambian_${cambio.campo}`] ?? 0);
            });
            const resumen = describirPlan(plan, alcanzados, cambianPorCampo);

            if(params.dryRun){
                return {
                    message:`Previsualización. ${resumen}`,
                    dryRun:true,
                    alcanzados,
                    seleccionados:plan.fichas.length,
                    cambian:cambianPorCampo,
                };
            }

            const resultado = await client.query(plan.sqlUpdate, plan.valores).fetchAll();
            return {
                message:`Se modificaron ${resultado.rows.length} bienes. ${resumen}`
                    + ` El detalle campo por campo quedó en el historial de cada bien.`,
                modificados:resultado.rows.length,
                alcanzados,
                seleccionados:plan.fichas.length,
                cambian:cambianPorCampo,
            };
        }
    },
    {
        action:'solicitud_documento_emitir',
        parameters:[
            {name:'acta', typeName:'text'},
            {name:'tipo', typeName:'text'},
            {name:'representante', typeName:'text'},
            {name:'caracter_representante', typeName:'text'},
            {name:'entrega_representa', typeName:'text'},
            {name:'recibe_representa', typeName:'text'},
            {name:'operacion', typeName:'text'},
        ],
        proceedLabel:'emitir',
        coreFunction: async function(context:ProcedureContext, params:any){
            const client = context.client;
            if(context.user.rol === 'lectura'){
                throw new Error('No tiene permisos para emitir documentos');
            }
            const acta = String(params.acta ?? '').trim();
            const tipo = String(params.tipo ?? '').trim() as TipoDocumentoSolicitud;
            if(tipo !== 'comodato' && tipo !== 'acta'){
                throw new Error(`Tipo de documento no válido: ${params.tipo}`);
            }

            // Lock antes de leer: dos emisiones simultáneas no pueden generar la misma versión.
            const bloqueo = await client.query(
                `SELECT acta, fecha_creacion, responsable, area, detalle
                    FROM movimientos_solicitudes WHERE acta = $1 FOR UPDATE`,
                [acta]
            ).fetchAll();
            if(!bloqueo.rows.length){
                throw new Error(`No existe la solicitud ${acta}`);
            }
            const solicitud = bloqueo.rows[0];

            /*
                Los datos de una persona salen siempre de responsables. El representante del
                IDECBA se elige entre los responsables, y su "carácter de dicha repartición"
                se completa con el área del organigrama que tiene a cargo — si no tiene
                ninguna, con el carácter cargado en su ficha.
            */
            const datosPersona = async (codigo:unknown) => {
                if(codigo == null || String(codigo).trim() === ''){
                    return null;
                }
                const {rows} = await client.query(`
                    SELECT
                        nullif(btrim(concat_ws(' ',
                            nullif(btrim(r.nombre), ''),
                            nullif(btrim(r.apellido), '')
                        )), '') AS nombre,
                        nullif(btrim(r.mail), '')              AS mail,
                        nullif(btrim(r.dni), '')               AS dni,
                        nullif(btrim(r.domicilio), '')         AS domicilio,
                        nullif(btrim(r.telefono), '')          AS telefono,
                        nullif(btrim(r.caracter), '')          AS caracter,
                        nullif(btrim(r.situacion_revista), '') AS situacion_revista,
                        -- El área del organigrama que encabeza. Si tiene más de una a cargo
                        -- se toma la más alta: la que no depende de otra.
                        (SELECT coalesce(nullif(btrim(a.sigla), ''), nullif(btrim(a.nombre_area), ''))
                            FROM areas a
                            WHERE a.responsable = r.responsable AND a.activo
                            ORDER BY (a.pertenece_a IS NOT NULL), a.area
                            LIMIT 1)                           AS area_a_cargo
                    FROM responsables r WHERE r.responsable = $1
                `, [String(codigo).trim()]).fetchAll();
                return rows[0] ?? null;
            };

            const comodatario = await datosPersona(solicitud.responsable);
            const firmante = await datosPersona(params.representante);

            const items = await client.query(`
                SELECT
                    b.ficha,
                    nullif(btrim(b.tipo_bien), '')  AS tipo_bien,
                    nullif(btrim(b.detalle), '')    AS detalle,
                    nullif(btrim(ma.descripcion), '') AS marca,
                    nullif(btrim(b.modelo), '')     AS modelo,
                    nullif(btrim(b.serie), '')      AS serie,
                    nullif(btrim(b.imei), '')       AS imei
                FROM movimientos_solicitud_bien msb
                JOIN bienes b ON b.ficha = msb.ficha
                LEFT JOIN marcas ma ON ma.marca = b.marca
                WHERE msb.acta = $1
                ORDER BY b.ficha
            `, [acta]).fetchAll();
            if(!items.rows.length){
                throw new Error(`La solicitud ${acta} no tiene bienes y no puede emitir documentos`);
            }

            const versionResult = await client.query(`
                SELECT coalesce(max(version), 0) + 1 AS version
                    FROM solicitudes_documentos WHERE acta = $1 AND tipo = $2
            `, [acta, tipo]).fetchUniqueRow();
            const version = Number(versionResult.row.version);

            const texto = (v:unknown) => {
                const t = String(v ?? '').trim();
                return t === '' ? null : t;
            };
            /*
                El diálogo manda el código del referencial, no el texto que va impreso: el
                carácter es una jerarquía, o sea el cargo. Si el código no está en la tabla
                se imprime tal cual, así el documento sale igual en vez de fallar.
            */
            const descripcionDe = async (tabla:string, campo:string, codigo:unknown) => {
                const valor = texto(codigo);
                if(valor == null){
                    return null;
                }
                const {rows} = await client.query(
                    `SELECT nullif(btrim(descripcion), '') AS descripcion
                        FROM ${tabla} WHERE ${campo} = $1`,
                    [valor]
                ).fetchAll();
                return rows[0]?.descripcion ?? valor;
            };

            /*
                El carácter con el que firma el representante sale del organigrama: el área
                que tiene a cargo. Si no encabeza ninguna, se usa el carácter de su ficha.
                La jerarquía elegida al emitir tiene prioridad sobre las dos cosas.
            */
            const caracterDelFirmante =
                await descripcionDe('jerarquias', 'jerarquia', params.caracter_representante)
                ?? firmante?.caracter
                ?? (firmante?.area_a_cargo ? `Responsable de ${firmante.area_a_cargo}` : null);


            const generado = await generarDocumentoSolicitud({
                tipo,
                cabecera:{
                    acta,
                    fecha:solicitud.fecha_creacion,
                    representante:firmante?.nombre ?? texto(params.representante),
                    caracterRepresentante:caracterDelFirmante,
                    entregaRepresenta:texto(params.entrega_representa) ?? firmante?.area_a_cargo ?? null,
                    recibeRepresenta:texto(params.recibe_representa),
                    operacion:operacionDeActa(params.operacion),
                    persona:{
                        nombre:comodatario?.nombre ?? null,
                        mail:comodatario?.mail ?? null,
                        dni:comodatario?.dni ?? null,
                        domicilio:comodatario?.domicilio ?? null,
                        telefono:comodatario?.telefono ?? null,
                        caracter:comodatario?.caracter ?? null,
                        situacionRevista:comodatario?.situacion_revista ?? null,
                    },
                },
                items:items.rows as never,
                emision:{version, fecha:new Date(), usuario:context.username},
            });

            const archivo = `solicitudes/${acta}/${tipo}-v${version}.pdf`;
            await fs.outputFile(`local-attachments/${archivo}`, generado.buffer);
            try{
                await client.query(`
                    insert into solicitudes_documentos
                        (acta, tipo, version, archivo, hash_sha256, codigo_contenido, usuario)
                        values ($1, $2, $3, $4, $5, $6, $7)
                `, [acta, tipo, version, archivo, generado.hashSha256,
                    generado.codigoContenido, context.username]).execute();
            }catch(err){
                await fs.remove(`local-attachments/${archivo}`);
                throw err;
            }

            return {
                message:`Se emitió el ${tipo} de la solicitud ${acta}, versión ${version},`
                    + ` con ${generado.cantidadItems} bienes (código ${generado.codigoContenido}).`,
                acta, tipo, version, archivo,
                codigo_contenido:generado.codigoContenido,
            };
        }
    },
    {
        action:'solicitud_documento_firmado_subir',
        progress: true,
        parameters:[
            {name:'acta', typeName:'text'},
            {name:'tipo', typeName:'text'},
            {name:'version', typeName:'bigint'},
        ],
        files:{count:1},
        coreFunction: async function(context:ProcedureContext, params:any, files?:UploadedFileInfo[]){
            /*
                Recarga del documento firmado.

                Lo único que se exige es que sea un PDF. No se pide que traiga firma digital
                —vale el firmado a mano y escaneado— ni que sea byte a byte el que se emitió.

                Igual se analiza y se guarda lo que se pueda saber: el hash de lo recargado y
                el firmante que el PDF declare, si es que viene firmado.
            */
            const client = context.client;
            const file = files![0];
            if(context.user.rol === 'lectura'){
                await fs.remove(file.path);
                throw new Error('No tiene permisos para cargar documentos');
            }
            const acta = String(params.acta ?? '').trim();
            const tipo = String(params.tipo ?? '').trim();
            const version = Number(params.version);

            const existente = await client.query(`
                SELECT archivo_firmado FROM solicitudes_documentos
                    WHERE acta = $1 AND tipo = $2 AND version = $3 FOR UPDATE
            `, [acta, tipo, version]).fetchAll();
            if(!existente.rows.length){
                await fs.remove(file.path);
                throw new Error(`No existe el documento ${tipo} v${version} de la solicitud ${acta}`);
            }

            const subido = await fs.readFile(file.path);
            const analisis = analizarFirmaPdf(subido);
            if(!analisis.esPdf){
                await fs.remove(file.path);
                throw new Error('El archivo no es un PDF.');
            }
            /*
                No se exige que el PDF traiga firma digital: también vale el documento
                firmado a mano y escaneado, que es como se resuelve cuando el firmante no
                tiene certificado.

                El análisis se sigue haciendo para dejar registro de si venía firmado y de
                quién declara ser el firmante, pero no frena la carga.
            */

            const extension = (file.originalFilename ?? '').split('.').pop() ?? 'pdf';
            const archivo = `solicitudes/${acta}/${tipo}-v${version}-firmado.${extension}`;
            await fs.move(file.path, `local-attachments/${archivo}`, {overwrite:true});
            try{
                await client.query(`
                    update solicitudes_documentos
                        set archivo_firmado = $4,
                            hash_firmado = $5,
                            fecha_firmado = current_timestamp,
                            usuario_firmado = $6,
                            firmante_declarado = $7
                        where acta = $1 AND tipo = $2 AND version = $3
                `, [acta, tipo, version, archivo,
                    createHash('sha256').update(subido).digest('hex'), context.username,
                    analisis.firmanteDeclarado]).execute();
            }catch(err){
                await fs.remove(`local-attachments/${archivo}`);
                throw err;
            }

            const reemplazo = existente.rows[0].archivo_firmado
                ? ' Reemplaza al archivo que ya estaba cargado.'
                : '';
            return {
                message:`Se cargó el ${tipo} firmado de la solicitud ${acta}.${reemplazo}`,
                acta, tipo, version, archivo,
            };
        }
    },
    {
        action:'bienes_mover_directo',
        parameters:[
            {name:'fichas', typeName:'text'},
            {name:'tipo_asignacion', typeName:'text'},
            {name:'modalidad_uso', typeName:'text'},
            {name:'responsable', typeName:'text'},
            {name:'area', typeName:'text'},
            {name:'sede', typeName:'text'},
            {name:'espacio', typeName:'text'},
            {name:'accion', typeName:'text'},
            {name:'detalle', typeName:'text'},
        ],
        proceedLabel:'mover',
        coreFunction: async function(context:ProcedureContext, params:any){
            /*
                Movimiento directo, sin acta.

                Registra un movimiento por bien apuntando al destino indicado. No pasa por
                el circuito de solicitudes: queda asentado en el momento.

                El acta va en NULL a propósito. movimientos_bien tiene una FK compuesta
                (acta, ficha) contra movimientos_solicitud_bien: con acta en NULL la FK no
                se evalúa, pero si se pusiera un acta tendría que existir esa fila. O sea
                que el modelo no admite "actas sueltas": o hay solicitud, o no hay acta.

                El orden lo asigna movimientos_bien_pk_trg cuando llega en 0.
            */
            const client = context.client;
            const rol = String(context.user.rol ?? '');
            const permiso = await client.query(
                `SELECT coalesce(puede_mover, false) AS puede FROM roles WHERE rol = $1`,
                [rol]
            ).fetchAll();
            if(!permiso.rows.length || permiso.rows[0].puede !== true){
                throw new Error(`El rol ${rol} no tiene permiso para mover bienes`);
            }

            const texto = (valor:unknown) => {
                const t = String(valor ?? '').trim();
                return t === '' ? null : t;
            };
            let fichas:string[];
            try{
                const crudo = params.fichas;
                fichas = (typeof crudo === 'string' ? JSON.parse(crudo) : crudo) ?? [];
            }catch(_err){
                throw new Error('No se pudo leer la lista de bienes');
            }
            const unicas = [...new Set(
                (Array.isArray(fichas) ? fichas : [])
                    .map(f => String(f ?? '').trim())
                    .filter(f => f !== '')
            )];
            if(unicas.length === 0){
                throw new Error('No hay bienes seleccionados');
            }

            const destino = {
                tipo_asignacion:texto(params.tipo_asignacion),
                modalidad_uso:texto(params.modalidad_uso),
                responsable:texto(params.responsable),
                area:texto(params.area),
                sede:texto(params.sede),
                espacio:texto(params.espacio),
            };
            if(Object.keys(destino).every(k => (destino as any)[k] == null)){
                throw new Error('Hay que indicar al menos un dato de destino');
            }

            const insertados = await client.query(`
                insert into movimientos_bien
                    (ficha, orden, acta, tipo_asignacion, modalidad_uso, responsable,
                     area, sede, espacio, accion, detalle, usuario_creacion)
                    select f.ficha, 0, null, $2, $3, $4, $5, $6, $7, $8, $9, $10
                        from unnest($1::text[]) AS f(ficha)
                        where exists (select 1 from bienes b where b.ficha = f.ficha)
                    returning ficha
            `, [
                unicas,
                destino.tipo_asignacion,
                destino.modalidad_uso,
                destino.responsable,
                destino.area,
                destino.sede,
                destino.espacio,
                texto(params.accion),
                texto(params.detalle),
                context.username,
            ]).fetchAll();

            const noEncontrados = unicas.length - insertados.rows.length;
            return {
                message: `Se registraron ${insertados.rows.length} movimientos sin acta`
                    + (noEncontrados > 0 ? ` (${noEncontrados} bienes no se encontraron)` : '')
                    + `. Quedan asentados de inmediato en el historial de cada bien.`,
                movimientos:insertados.rows.length,
                no_encontrados:noEncontrados,
            };
        }
    },
    {
        action:'solicitud_crear_desde_bienes',
        parameters:[
            {name:'acta', typeName:'text'},
            {name:'fichas', typeName:'text'},
            {name:'tipo_asignacion', typeName:'text'},
            {name:'modalidad_uso', typeName:'text'},
            {name:'responsable', typeName:'text'},
            {name:'area', typeName:'text'},
            {name:'sede', typeName:'text'},
            {name:'espacio', typeName:'text'},
            {name:'detalle', typeName:'text'},
        ],
        proceedLabel:'crear',
        coreFunction: async function(context:ProcedureContext, params:any){
            /*
                Crea una solicitud de movimiento con los bienes seleccionados.

                No genera los movimientos: los genera el circuito existente cuando la
                solicitud llega al estado Pr, con el trigger movimientos_solicitudes_estado_trg.
                Acá sólo se arma la cabecera y el detalle, y la solicitud nace en el estado
                inicial que define la máquina de estados (el default de la tabla, B).
            */
            const client = context.client;
            if(context.user.rol === 'lectura'){
                throw new Error('No tiene permisos para crear solicitudes');
            }

            const acta = String(params.acta ?? '').trim();
            if(acta === ''){
                throw new Error('Hay que indicar el número de acta');
            }
            const texto = (valor:unknown) => {
                const t = String(valor ?? '').trim();
                return t === '' ? null : t;
            };

            let fichas:string[];
            try{
                const crudo = params.fichas;
                fichas = (typeof crudo === 'string' ? JSON.parse(crudo) : crudo) ?? [];
            }catch(_err){
                throw new Error('No se pudo leer la lista de bienes');
            }
            const unicas = [...new Set(
                (Array.isArray(fichas) ? fichas : [])
                    .map(f => String(f ?? '').trim())
                    .filter(f => f !== '')
            )];
            if(unicas.length === 0){
                throw new Error('No hay bienes seleccionados');
            }

            const yaExiste = await client.query(
                `SELECT 1 FROM movimientos_solicitudes WHERE acta = $1`, [acta]
            ).fetchAll();
            if(yaExiste.rows.length){
                throw new Error(`Ya existe una solicitud con el acta ${acta}`);
            }

            const cabecera = await client.query(`
                insert into movimientos_solicitudes
                    (acta, tipo_asignacion, modalidad_uso, responsable, area, sede, espacio,
                     detalle, usuario_creacion)
                    values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    returning acta, estado
            `, [
                acta,
                texto(params.tipo_asignacion),
                texto(params.modalidad_uso),
                texto(params.responsable),
                texto(params.area),
                texto(params.sede),
                texto(params.espacio),
                texto(params.detalle),
                context.username,
            ]).fetchUniqueRow();

            const detalle = await client.query(`
                insert into movimientos_solicitud_bien (acta, ficha, usuario_creacion)
                    select $1, f.ficha, $3
                        from unnest($2::text[]) AS f(ficha)
                        where exists (select 1 from bienes b where b.ficha = f.ficha)
                    returning ficha
            `, [acta, unicas, context.username]).fetchAll();

            const noEncontrados = unicas.length - detalle.rows.length;
            return {
                message: `Se creó la solicitud ${acta} con ${detalle.rows.length} bienes`
                    + (noEncontrados > 0 ? ` (${noEncontrados} no se encontraron)` : '')
                    + `, en estado ${cabecera.row.estado}.`
                    + ` Los movimientos se generan cuando la solicitud llegue al final del circuito.`,
                acta,
                estado:cabecera.row.estado,
                bienes:detalle.rows.length,
                no_encontrados:noEncontrados,
            };
        }
    },
    {
        action:'bien_resumen',
        parameters:[
            {name:'ficha', typeName:'text'},
        ],
        coreFunction: async function(context:ProcedureContext, params:any){
            // Lo que el encabezado del bien necesita mostrar sin obligar a abrir solapas.
            const ficha = String(params.ficha ?? '').trim();
            if(ficha === ''){
                throw new Error('Falta la ficha');
            }
            const {row} = await context.client.query(`
                SELECT
                    (SELECT count(*) FROM movimientos_bien mb WHERE mb.ficha = $1)
                        AS movimientos,
                    (SELECT count(*) FROM adjuntos_bienes ab WHERE ab.ficha = $1)
                        AS adjuntos,
                    ult.fecha_movimiento           AS ultimo_movimiento_fecha,
                    ult.accion                     AS ultimo_movimiento_accion,
                    nullif(btrim(concat_ws(', ',
                        nullif(btrim(r.apellido), ''),
                        nullif(btrim(r.nombre), '')
                    )), '')                        AS ultimo_movimiento_responsable,
                    dec.declaracion                AS ultima_declaracion,
                    dec.fecha                      AS ultima_declaracion_fecha,
                    dec.estado                     AS ultima_declaracion_estado
                FROM (SELECT $1::text AS ficha) base
                LEFT JOIN LATERAL (
                    SELECT mb.fecha_movimiento, mb.accion, mb.responsable
                        FROM movimientos_bien mb
                        WHERE mb.ficha = base.ficha
                        ORDER BY mb.orden DESC LIMIT 1
                ) ult ON true
                LEFT JOIN responsables r ON r.responsable = ult.responsable
                LEFT JOIN LATERAL (
                    SELECT d.declaracion, d.fecha, d.estado
                        FROM declaraciones_bienes db
                        JOIN declaraciones d ON d.declaracion = db.declaracion
                        WHERE db.ficha = base.ficha
                        ORDER BY d.fecha DESC NULLS LAST, d.declaracion DESC
                        LIMIT 1
                ) dec ON true
            `, [ficha]).fetchUniqueRow();
            return row;
        }
    },
    {
        action:'atributos_recargar',
        parameters:[],
        proceedLabel:'recargar',
        coreFunction: async function(context:ProcedureContext){
            // Las columnas de atributo de la grilla del parque tecnológico se arman con la
            // lista que se lee al arrancar, porque las definiciones de tabla de
            // backend-plus son sincrónicas. Esto la refresca sin reiniciar el servidor.
            if(context.user.rol !== 'admin'){
                throw new Error('Sólo un administrador puede recargar los atributos');
            }
            const {rows} = await context.client.query(
                `SELECT atributo, nombre FROM bienes_atributos ORDER BY atributo`
            ).fetchAll();
            const lista = rows.map((fila:any) => ({
                atributo:String(fila.atributo),
                nombre:String(fila.nombre ?? fila.atributo),
            }));
            setAtributosDeBienes(lista);
            return {
                message: `Se recargaron ${lista.length} atributos.`
                    + ` La grilla del parque tecnológico ya muestra sus columnas`
                    + ` (puede hacer falta volver a abrirla).`,
                atributos: lista.map(a => a.atributo),
            };
        }
    },
    {
        action:'declaracion_firmada_subir',
        progress: true,
        parameters:[
            {name:'declaracion', typeName:'bigint'},
        ],
        files:{count:1},
        coreFunction: async function(context:ProcedureContext, params:any, files?:UploadedFileInfo[]){
            const be = context.be;
            const client = context.client;
            const declaracion = params.declaracion;
            const file = files![0];

            if(context.user.rol === 'lectura'){
                await fs.remove(file.path);
                throw new Error('No tiene permisos para cargar documentos firmados');
            }
            context.informProgress({message: be.messages.fileUploaded});

            const rechazar = async (mensaje:string) => {
                await fs.remove(file.path);
                throw new Error(mensaje);
            };

            const bloqueo = await client.query(`
                SELECT estado, responsable FROM declaraciones WHERE declaracion = $1 FOR UPDATE
            `, [declaracion]).fetchAll();
            if(!bloqueo.rows.length){
                await rechazar(`No existe la declaración ${declaracion}`);
            }
            const {estado, responsable} = bloqueo.rows[0];
            if(estado !== 'EMITIDA'){
                await rechazar(
                    `La declaración ${declaracion} está en estado ${estado}.`
                    + ` Sólo se puede cargar la firma de una declaración EMITIDA.`
                );
            }

            const emitidosResult = await client.query(`
                SELECT version, archivo
                    FROM declaraciones_documentos
                    WHERE declaracion = $1 AND tipo = 'emitido'
                    ORDER BY version
            `, [declaracion]).fetchAll();
            if(!emitidosResult.rows.length){
                await rechazar(`La declaración ${declaracion} no tiene ningún documento emitido`);
            }

            const emitidos:DocumentoEmitido[] = [];
            for(const fila of emitidosResult.rows){
                const ruta = `local-attachments/${fila.archivo}`;
                if(!await fs.pathExists(ruta)){
                    await rechazar(
                        `Falta en el servidor el archivo emitido ${fila.archivo}.`
                        + ` Sin él no se puede verificar la firma.`
                    );
                }
                emitidos.push({
                    version: Number(fila.version),
                    contenido: await fs.readFile(ruta),
                });
            }
            const versionVigente = Math.max(...emitidos.map(emitido => emitido.version));

            const yaFirmado = await client.query(`
                SELECT 1 FROM declaraciones_documentos
                    WHERE declaracion = $1 AND version = $2 AND tipo = 'firmado'
            `, [declaracion, versionVigente]).fetchAll();
            if(yaFirmado.rows.length){
                await rechazar(
                    `La versión ${versionVigente} de la declaración ${declaracion}`
                    + ` ya tiene cargado su documento firmado.`
                );
            }

            const subido = await fs.readFile(file.path);
            const verificacion = verificarDeclaracionFirmada({subido, emitidos, versionVigente});
            if(!verificacion.ok){
                await rechazar(verificacion.mensaje);
            }

            const archivo = `declaraciones/${declaracion}/v${versionVigente}-firmado.pdf`;
            await fs.move(file.path, `local-attachments/${archivo}`, {overwrite:true});
            try{
                await client.query(`
                    insert into declaraciones_documentos
                        (declaracion, version, tipo, archivo, hash_sha256, usuario,
                         firmante_declarado, resultado_verificacion)
                        values ($1, $2, 'firmado', $3, $4, $5, $6, $7)
                `, [
                    declaracion,
                    versionVigente,
                    archivo,
                    createHash('sha256').update(subido).digest('hex'),
                    context.username,
                    verificacion.firmanteDeclarado,
                    verificacion.codigo,
                ]).execute();
                await client.query(`
                    update declaraciones
                        set estado = 'FIRMADA',
                            fecha_firma = current_date,
                            firmado_por = coalesce(firmado_por, $2)
                        where declaracion = $1
                `, [declaracion, responsable]).execute();
            }catch(err){
                await fs.remove(`local-attachments/${archivo}`);
                throw err;
            }

            return {
                message: `${verificacion.mensaje}`
                    + (verificacion.firmanteDeclarado
                        ? ` El PDF declara como firmante a "${verificacion.firmanteDeclarado}"`
                            + ` (dato informativo, no validado criptográficamente).`
                        : '')
                    + ` La declaración ${declaracion} queda FIRMADA.`,
                declaracion,
                version: versionVigente,
                archivo,
                firmante_declarado: verificacion.firmanteDeclarado,
            };
        }
    },
    {
        action:'declaracion_observar',
        parameters:[
            {name:'declaracion', typeName:'bigint'},
            {name:'motivo', typeName:'text'},
        ],
        proceedLabel:'observar',
        coreFunction: async function(context:ProcedureContext, params:any){
            const client = context.client;
            const declaracion = params.declaracion;
            const motivo = String(params.motivo ?? '').trim();

            if(context.user.rol === 'lectura'){
                throw new Error('No tiene permisos para observar declaraciones');
            }
            if(motivo === ''){
                throw new Error('Hay que indicar el motivo de la observación');
            }

            const bloqueo = await client.query(`
                SELECT estado FROM declaraciones WHERE declaracion = $1 FOR UPDATE
            `, [declaracion]).fetchAll();
            if(!bloqueo.rows.length){
                throw new Error(`No existe la declaración ${declaracion}`);
            }
            const estado = bloqueo.rows[0].estado;
            if(estado !== 'EMITIDA' && estado !== 'FIRMADA'){
                throw new Error(
                    `La declaración ${declaracion} está en estado ${estado}`
                    + ` y no se puede observar.`
                );
            }

            await client.query(`
                update declaraciones
                    set estado = 'OBSERVADA', motivo_observacion = $2
                    where declaracion = $1
            `, [declaracion, motivo]).execute();

            return {
                message: `La declaración ${declaracion} quedó OBSERVADA.`
                    + ` Los documentos de la versión anterior se conservan como antecedente.`
                    + ` Para corregirla hay que reabrirla.`,
                declaracion,
            };
        }
    },
    {
        action:'declaracion_reabrir',
        parameters:[
            {name:'declaracion', typeName:'bigint'},
        ],
        proceedLabel:'reabrir',
        coreFunction: async function(context:ProcedureContext, params:any){
            const client = context.client;
            const declaracion = params.declaracion;

            if(context.user.rol === 'lectura'){
                throw new Error('No tiene permisos para reabrir declaraciones');
            }

            const bloqueo = await client.query(`
                SELECT estado FROM declaraciones WHERE declaracion = $1 FOR UPDATE
            `, [declaracion]).fetchAll();
            if(!bloqueo.rows.length){
                throw new Error(`No existe la declaración ${declaracion}`);
            }
            const estado = bloqueo.rows[0].estado;
            if(estado !== 'OBSERVADA'){
                throw new Error(
                    `La declaración ${declaracion} está en estado ${estado}.`
                    + ` Sólo se puede reabrir una declaración OBSERVADA.`
                );
            }

            await client.query(`
                update declaraciones set estado = 'BORRADOR' where declaracion = $1
            `, [declaracion]).execute();

            const proximaVersion = await client.query(`
                SELECT coalesce(max(version), 0) + 1 AS version
                    FROM declaraciones_documentos
                    WHERE declaracion = $1
            `, [declaracion]).fetchUniqueRow();

            return {
                message: `La declaración ${declaracion} volvió a BORRADOR y su lista de bienes`
                    + ` se puede editar de nuevo. Al emitirla otra vez se genera la versión`
                    + ` ${proximaVersion.row.version}.`,
                declaracion,
            };
        }
    }
];
