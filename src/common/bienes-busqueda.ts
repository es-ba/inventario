export type {
    BienAtributoResumen,
    BienesAtributoOpcion,
    BienesAtributosOpcionesResponse,
    BienesAtributoValorOpcion,
    BienesAtributoValoresOpcionesResponse,
    BienesBusquedaEstado,
    BienesBusquedaExportResponse,
    BienesBusquedaFilter,
    BienesBusquedaLogicOperator,
    BienesBusquedaOperator,
    BienesBusquedaRequest,
    BienesBusquedaResponse,
    BienesBusquedaRow,
    BienesBusquedaSort,
    BienesBusquedaSource,
} from './contracts';

export type BienesGridMetadataField = {
    name:string;
    inTable?:boolean;
};

/*
    Columnas que no son del bien sino de su último movimiento, y por eso vienen declaradas
    con inTable:false: no existen como columna física.

    Por regla va el nombre y no el código: poner los dos deja dos columnas diciendo lo
    mismo, y de las dos la que se lee es la del nombre. El código se sigue pudiendo filtrar,
    porque los filtros salen de la definición de la tabla y no de las columnas que la grilla
    muestra.

    El espacio es la excepción y va con su código además del número: ni "138" ni "101"
    solos alcanzan para saber de qué lugar se habla. Falta la denominación, que la vista de
    bienes no expone todavía.

    tipo_asignacion y modalidad_uso van por su código porque no tienen columna descriptiva
    en la definición de bienes.
*/
export const BIENES_GRID_ASSIGNMENT_FIELDS:readonly string[] = Object.freeze([
    'responsable_nombre',
    'area_sigla',
    'sede_nombre',
    'espacio',
    'espacio_numero',
    'tipo_asignacion',
    'modalidad_uso',
    'enusode',
]);

/**
 * Columnas de la grilla de bienes, en el orden en que las declara la definición.
 *
 * Antes se armaba en dos partes: primero los campos físicos y después, concatenados al
 * final, los de asignación. Con eso el responsable y el área quedaban últimos hicieras lo
 * que hicieras en la definición, que es el único lugar donde se decide qué se ve primero.
 */
export function selectBienesGridFields<T extends BienesGridMetadataField>(
    fields:readonly T[],
):T[]{
    const deAsignacion = new Set(BIENES_GRID_ASSIGNMENT_FIELDS);
    const vistos = new Set<string>();
    return fields.filter(field => {
        if(vistos.has(field.name)){
            return false;
        }
        // Un campo calculado que no sea de asignación no tiene columna en la grilla.
        if(field.inTable === false && !deAsignacion.has(field.name)){
            return false;
        }
        vistos.add(field.name);
        return true;
    });
}
