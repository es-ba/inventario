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
        { name : 'numerico_integrado', typeName: 'text', label: 'Número integrado' },
        { name : 'detalle', typeName: 'text', label: 'Detalle' },
        { name : 'categoria', typeName: 'text', label: 'Categoría' },
        { name : 'tipo_bien', typeName: 'text', label: 'Tipo de bien' },
        { name : 'marca', typeName: 'text', label: 'Marca' },
        { name : 'modelo', typeName: 'text', label: 'Modelo' },
        { name : 'serie', typeName: 'text', label: 'Serie' },
        { name : 'ubicacion', typeName: 'text', label: 'Ubicación' },
        { name : 'area', typeName: 'text', label: 'Área' },
        { name : 'sede', typeName: 'text', label: 'Sede' },
        { name : 'estado', typeName: 'text', label: 'Estado' },
        { name : 'estado_baja', typeName: 'text', label: 'Estado de baja' },
        { name : 'fecha_inicio', typeName: 'date', label: 'Fecha inicio' },
        { name : 'fecha_fin', typeName: 'date', label: 'Fecha fin' },
        { name : 'observaciones', typeName: 'text', label: 'Observaciones' },
        { name : 'importe', typeName: 'text', label: 'importe' },
        { name : 'importetotal', typeName: 'text', label: 'Importe total' },
        { name : 'rubro', typeName: 'text', label: 'rubro' },
        { name : 'clase', typeName: 'text', label: 'Clase' },
        { name : 'cuenta', typeName: 'text', label: 'Cuenta' },
        { name : 'grupo', typeName: 'text', label: 'Grupo' },
        { name : 'imei', typeName: 'text', label: 'IMEI' },
        { name : 'annio', typeName: 'text', label: 'Año' },
        { name : 'prd', typeName: 'text', label: 'PRD' },
        { name : 'caracteridentificador', typeName: 'text', label: 'Caracter identificador' },
        { name : 'enusode', typeName: 'text', label: 'enusode' },
        { name : 'clasificacion', typeName: 'text', label: 'Clasificación' },
        { name : 'orden_compra', typeName: 'text', label: 'Orden de compra' },
        { name : 'entidad_prestadora', typeName: 'text', label: 'Entidad prestadora' },
        { name : 'tipo_contrato', typeName: 'text', label: 'Tipo de contrato' },
        { name : 'fecha', typeName: 'date', label: 'Fecha' },
        { name : 'renovable', typeName: 'text', label: 'Renovable' },
        { name : 'condiciones', typeName: 'text', label: 'Condiciones' },
        { name : 'costo_mensual', typeName: 'decimal', label: 'Costo mensual' },
        { name : 'fecha_solicitud', typeName: 'date', label: 'Fecha de solicitud' },
        { name : 'motivo_baja', typeName: 'text', label: 'Motivo de baja' },
        { name : 'valor_residual', typeName: 'decimal', label: 'Valor residual' },
        { name : 'autorizado_por', typeName: 'text', label: 'Autorizado por' },
        { name : 'documento_respaldo', typeName: 'text', label: 'Documento de respaldo' },
        { name : 'autorizado_por', typeName: 'text', label: 'Autorizado por' },
        { name : 'espacio', typeName: 'text', label: 'Espacio' }



      ],
   resultOk: 'showGrid',
  coreFunction: async function(_context: ProcedureContext, params:any){
    const grilla = {
      tableName: 'bienes_activos_por_responsable',
      fixedFields: [
        { fieldName: 'estado', value: 'alta' },
      ],
      tableDef: {
        title: 'Bienes activos (estado alta)',
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

    return grilla;
  }
}
    
];
