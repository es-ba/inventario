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
}
    
];
