import type {DimensionDisponible} from './bienes-agrupar';

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
    referencedName?:string;
};

export const BIENES_GRID_ASSIGNMENT_FIELDS:readonly string[] = Object.freeze([
    'responsable_sector_nombre',
    'responsable_nombre',
    'sector_sigla',
    'nombre_sector',
    'sede_nombre',
    'espacio',
    'espacio_numero',
    'puesto',
    'tipo_asignacion',
    'modalidad_uso',
    'enusode',
    'enusode_responsable_nombre',
    'fecha_ultimo_control',
    'situacion_control',
    'fecha_ultimo_movimiento',
    'usuario_ultimo_movimiento',
    'fecha_ultima_modificacion',
    'usuario_ultima_modificacion',
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

export function selectBienesFilterFields<T extends BienesGridMetadataField>(
    fields:readonly T[],
):T[]{
    return fields.filter(field => field.referencedName == null);
}

export function camposDeCondicion<T extends BienesGridMetadataField & {label?:string}>(
    fields:readonly T[],
    dimensiones:readonly DimensionDisponible[],
):T[]{
    const reemplazados = new Set(([] as string[]).concat(...dimensiones.map(dimension => dimension.reemplaza ?? [])));
    const etiquetas = new Map(dimensiones.map(dimension => [dimension.clave, dimension.etiqueta]));
    return selectBienesFilterFields(fields)
        .filter(field => !reemplazados.has(field.name))
        .map(field => etiquetas.has(field.name) ? {...field, label:etiquetas.get(field.name)} : field);
}
