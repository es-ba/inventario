"use strict";

import { ProcedureContext, ProcedureDef } from './types-principal';
import * as path from "path";
import {promises as fsPromises} from "fs";
import { randomUUID } from "crypto";

const MOVIMIENTO_ADJUNTOS_SUBDIR = path.join('adjuntos', 'movimientos_bien');
const MAX_FILE_NAME_LENGTH = 80;

function sanitizeFileComponent(rawName:string){
    const normalized = rawName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    const clean = normalized.replace(/[^a-zA-Z0-9._-]/g, '_');
    const collapsed = clean.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    return (collapsed || 'adjunto').slice(0, MAX_FILE_NAME_LENGTH);
}

function buildStoredPath(fileName:string){
    return path.join(MOVIMIENTO_ADJUNTOS_SUBDIR, fileName).replace(/\\/g,'/');
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
        action:'adjuntar', 
        parameters:[
            {name:'ficha', typeName:'text'},
            {name:'orden', typeName:'bigint'}
        ],
        files:{count:1},
        progress:true,
        coreFunction: async function(context, parameters, files){
            if(!files || files.length === 0){
                throw new Error('Debe seleccionar un archivo para adjuntar.');
            }
            const {client} = context;

            const rowResult = await client.query(`
                SELECT archivo
                  FROM movimientos_bien
                 WHERE ficha = $1 AND orden = $2
            `, [parameters.ficha, parameters.orden]).fetchOneRowIfExists();
            if(!rowResult.row){
                throw new Error('No se encontro el movimiento indicado.');
            }
            const previousStoredPath = rowResult.row.archivo as string|null;
            const [file] = files;
            const originalName = file.originalFilename || 'adjunto';
            const extension = path.extname(originalName).slice(0, 10);
            const baseName = sanitizeFileComponent(originalName.slice(0, originalName.length - extension.length));
            const uniqueSuffix = `${Date.now().toString(36)}-${randomUUID().split('-')[0]}`;
            const availableBaseLength = Math.max(1, MAX_FILE_NAME_LENGTH - uniqueSuffix.length - extension.length - 1);
            const truncatedBase = (baseName || 'adjunto').slice(0, availableBaseLength);
            const finalFileName = `${truncatedBase}-${uniqueSuffix}${extension}`;
            const storageDir = path.join(context.be.rootPath, MOVIMIENTO_ADJUNTOS_SUBDIR);
            await fsPromises.mkdir(storageDir, {recursive:true});
            const finalAbsolutePath = path.join(storageDir, finalFileName);
            await fsPromises.rename(file.path, finalAbsolutePath);
            const storedPath = buildStoredPath(finalFileName);
            try{
                await client.query(`
                    UPDATE movimientos_bien
                       SET archivo = $3,
                           fecha_modificacion = current_date,
                           usuario_modificacion = $4
                     WHERE ficha = $1 AND orden = $2
                `, [
                    parameters.ficha,
                    parameters.orden,
                    storedPath,
                    context.user?.usuario ?? null
                ]).execute();
            }catch(err){
                await fsPromises.unlink(finalAbsolutePath).catch(()=>null);
                throw err;
            }
            if(previousStoredPath){
                const previousAbsolutePath = path.join(context.be.rootPath, previousStoredPath);
                if(previousAbsolutePath !== finalAbsolutePath){
                    await fsPromises.unlink(previousAbsolutePath).catch(function(removeError:NodeJS.ErrnoException){
                        if(removeError && removeError.code!=='ENOENT'){
                            throw removeError;
                        }
                    });
                }
            }
            return {
                archivo: storedPath,
                archivo_nombre: path.basename(storedPath)
            };
        }
    },
];


