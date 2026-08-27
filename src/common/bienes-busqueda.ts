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
    'responsable_nombre',
    'sector_sigla',
    'sede_nombre',
    'espacio',
    'espacio_numero',
    'tipo_asignacion',
    'modalidad_uso',
    'enusode',
    'enusode_responsable_nombre',
]);

export function selectBienesGridFields<T extends BienesGridMetadataField>(
    fields:readonly T[],
):T[]{
    const deAsignacion = new Set(BIENES_GRID_ASSIGNMENT_FIELDS);
    const vistos = new Set<string>();
    return fields.filter(field => {
        if(vistos.has(field.name)){
            return false;
        }
        if(field.inTable === false && !deAsignacion.has(field.name)){
            return false;
        }
        vistos.add(field.name);
        return true;
    });
}
