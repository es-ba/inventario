import {guarantee} from 'guarantee-type';
import {
    bien_busqueda,
    BienesBusquedaRow,
} from '../common/contracts';

const BIENES_PRESENTATION_FIELDS = Object.freeze([
    'grupo',
    'marca',
    'rubro',
    'clase',
    'cuenta',
    'responsable',
    'sector',
    'sede',
    'espacio',
    'tipo_asignacion',
    'modalidad_uso',
] as const satisfies readonly (keyof BienesBusquedaRow)[]);

const bienesPresentationFieldNames:ReadonlySet<string> = new Set(
    BIENES_PRESENTATION_FIELDS,
);

function internalSqlName(publicName:string):string{
    return `${publicName}_texto`;
}

export function resolveBienesPresentationSqlFieldName(publicName:string):string{
    return bienesPresentationFieldNames.has(publicName)
        ? internalSqlName(publicName)
        : publicName;
}

export function normalizeBienesPresentationRow(
    row:Record<string, unknown>,
):Record<string, unknown>{
    const normalized = {...row};
    for(const publicName of BIENES_PRESENTATION_FIELDS){
        const internalName = internalSqlName(publicName);
        if(Object.prototype.hasOwnProperty.call(normalized, internalName)){
            normalized[publicName] = normalized[internalName];
            delete normalized[internalName];
        }
    }
    return normalized;
}

export function normalizeBienesPresentationRows(
    rows:Record<string, unknown>[],
):BienesBusquedaRow[] {
    return rows.map(row => guarantee(
        bien_busqueda.description,
        normalizeBienesPresentationRow(row),
    ) as BienesBusquedaRow);
}
