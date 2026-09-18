export type DimensionAgrupar = string;

export type FamiliaDimension = 'asignación' | 'clasificación' | 'atributo';

export type DimensionDisponible = {
    clave:DimensionAgrupar;
    etiqueta:string;
    familia:FamiliaDimension;
};

export type GrupoFiltro = {
    dimension:DimensionAgrupar;
    valor:string|null;
};

export type BienesAgrupadoFila = {
    valores:(string|null)[];
    textos:(string|null)[];
    cantidad:number;
};

export type BienesAgrupadoResponse = {
    dimensiones:DimensionAgrupar[];
    rows:BienesAgrupadoFila[];
    total:number;
};

export type BienesDimensionesResponse = {
    dimensiones:DimensionDisponible[];
};

export const MAXIMO_DIMENSIONES = 5;

export const PREFIJO_ATRIBUTO = 'atributo:';

export function claveDeAtributo(atributo:string):DimensionAgrupar{
    return `${PREFIJO_ATRIBUTO}${atributo}`;
}
