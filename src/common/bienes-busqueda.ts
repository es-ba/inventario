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

export const BIENES_GRID_ASSIGNMENT_FIELDS:readonly string[] = Object.freeze([
    'responsable',
    'area',
    'sede',
    'espacio',
    'tipo_asignacion',
    'modalidad_uso',
    'enusode',
]);

export function selectBienesGridFields<T extends BienesGridMetadataField>(
    fields:readonly T[],
):T[]{
    const byName = new Map(fields.map(field => [field.name, field]));
    const selectedNames = fields
        .filter(field => field.inTable !== false)
        .map(field => field.name)
        .concat(BIENES_GRID_ASSIGNMENT_FIELDS)
        .filter((name, index, names) => byName.has(name) && names.indexOf(name) === index);
    return selectedNames.map(name => byName.get(name) as T);
}
