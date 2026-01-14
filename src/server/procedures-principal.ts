"use strict";

import { ProcedureContext, ProcedureDef } from './types-principal';
import { sqlBienes } from './table-bienes';

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
    
    {
        action: 'guardar_bien',
        parameters: [
            {name:'ficha'                 , typeName:'text'},
            {name:'numero_integrado'      , typeName:'text', defaultValue:null},
            {name:'ubicacion'             , typeName:'text', defaultValue:null},
            {name:'observacion'           , typeName:'text', defaultValue:null},
            {name:'detalle'               , typeName:'text', defaultValue:null},
            {name:'importe'               , typeName:'text', defaultValue:null},
            {name:'importetotal'          , typeName:'text', defaultValue:null},
            {name:'tipo_bien'             , typeName:'text', defaultValue:null},
            {name:'estado'                , typeName:'text', defaultValue:null},
            {name:'categoria'             , typeName:'text', defaultValue:null},
            {name:'rubro'                 , typeName:'text', defaultValue:null},
            {name:'clase'                 , typeName:'text', defaultValue:null},
            {name:'cuenta'                , typeName:'text', defaultValue:null},
            {name:'grupo'                 , typeName:'text', defaultValue:null},
            {name:'marca'                 , typeName:'text', defaultValue:null},
            {name:'serie'                 , typeName:'text', defaultValue:null},
            {name:'imei'                  , typeName:'text', defaultValue:null},
            {name:'modelo'                , typeName:'text', defaultValue:null},
            {name:'annio'                 , typeName:'text', defaultValue:null},
            {name:'prd'                   , typeName:'text', defaultValue:null},
            {name:'caracteridentificador' , typeName:'text', defaultValue:null},
            {name:'clasificacion'         , typeName:'text', defaultValue:null},
            {name:'orden_compra'          , typeName:'text', defaultValue:null},
            {name:'fecha'                 , typeName:'date', defaultValue:null, specialDefaultValue:'current_date'},
            {name:'entidad_prestadora'    , typeName:'text', defaultValue:null},
            {name:'tipo_contrato'         , typeName:'text', defaultValue:null},
            {name:'fecha_inicio'          , typeName:'date', defaultValue:null},
            {name:'fecha_fin'             , typeName:'date', defaultValue:null},
            {name:'renovable'             , typeName:'boolean', defaultValue:false},
            {name:'condiciones'           , typeName:'text', defaultValue:null},
            {name:'costo_mensual'         , typeName:'decimal', defaultValue:null},
            {name:'fecha_solicitud'       , typeName:'date', defaultValue:null},
            {name:'motivo_baja'           , typeName:'text', defaultValue:null},
            {name:'valor_residual'        , typeName:'decimal', defaultValue:null},
            {name:'autorizado_por'        , typeName:'text', defaultValue:null},
            {name:'documento_respaldo'    , typeName:'text', defaultValue:null},
            {name:'estado_baja'           , typeName:'text', defaultValue:null},
        ],
        proceedLabel: 'guardar bien',
        coreFunction: async function(context: ProcedureContext, parameters: any){
            const {client} = context;
            const columns = [
                'ficha',
                'numero_integrado',
                'ubicacion',
                'observacion',
                'detalle',
                'importe',
                'importetotal',
                'tipo_bien',
                'estado',
                'categoria',
                'rubro',
                'clase',
                'cuenta',
                'grupo',
                'marca',
                'serie',
                'imei',
                'modelo',
                'annio',
                'prd',
                'caracteridentificador',
                'clasificacion',
                'orden_compra',
                'fecha',
                'entidad_prestadora',
                'tipo_contrato',
                'fecha_inicio',
                'fecha_fin',
                'renovable',
                'condiciones',
                'costo_mensual',
                'fecha_solicitud',
                'motivo_baja',
                'valor_residual',
                'autorizado_por',
                'documento_respaldo',
                'estado_baja',
            ] as const;

            const values = columns.map(column => parameters[column]);
            const insertValuesSql = columns.map((column, index) => (
                column === 'fecha' ? `COALESCE($${index+1}, current_date)` : `$${index+1}`
            )).join(', ');
            const updateSql = columns
                .filter(column => column !== 'ficha')
                .map(column => (
                    column === 'fecha'
                        ? `fecha = COALESCE(EXCLUDED.fecha, bienes.fecha)`
                        : `${column} = EXCLUDED.${column}`
                ))
                .join(', ');

            await client.query(`
                INSERT INTO bienes (${columns.join(', ')})
                    VALUES (${insertValuesSql})
                    ON CONFLICT (ficha) DO UPDATE
                        SET ${updateSql}
                    RETURNING ficha
            `, values).fetchUniqueRow();

            const result = await client.query(`
                SELECT *
                    FROM (${sqlBienes}) x
                    WHERE ficha = $1
            `, [parameters.ficha]).fetchUniqueRow();
            return result.row;
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
