export type DimensionAgrupar = string;

export type FamiliaDimension = 'asignación' | 'clasificación' | 'atributo';

export type DimensionDisponible = {
    clave:DimensionAgrupar;
    etiqueta:string;
    familia:FamiliaDimension;
    reemplaza?:string[];
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
    conjuntos:BienesAgrupadoFila[][];
};

export type BienesDimensionesResponse = {
    dimensiones:DimensionDisponible[];
};

export const MAXIMO_DIMENSIONES = 5;

export const MAXIMO_CONJUNTOS = 100;

export const PREFIJO_ATRIBUTO = 'atributo:';

export function claveDeAtributo(atributo:string):DimensionAgrupar{
    return `${PREFIJO_ATRIBUTO}${atributo}`;
}

export type GrupoFiltroElegido = {
    partes:GrupoFiltro[];
    textos:string[];
    etiquetas:string[];
};

export function grupoFiltroDesdeTexto(texto:unknown):GrupoFiltroElegido|null{
    if(typeof texto !== 'string' || !texto){
        return null;
    }
    let dato:unknown;
    try{
        dato = JSON.parse(texto);
    }catch{
        return null;
    }
    if(dato == null || typeof dato !== 'object'){
        return null;
    }
    const {partes, textos, etiquetas} = dato as Record<string, unknown>;
    const sonTextos = (lista:unknown):lista is string[] =>
        Array.isArray(lista) && lista.every(valor => typeof valor === 'string');
    if(!Array.isArray(partes) || !partes.length || !sonTextos(textos) || !sonTextos(etiquetas)
        || textos.length !== partes.length || etiquetas.length !== partes.length){
        return null;
    }
    const validas = partes.every(parte => parte != null && typeof parte === 'object'
        && typeof (parte as GrupoFiltro).dimension === 'string' && (parte as GrupoFiltro).dimension !== ''
        && ((parte as GrupoFiltro).valor === null || typeof (parte as GrupoFiltro).valor === 'string'));
    return validas
        ? {partes:partes.map(({dimension, valor}:GrupoFiltro) => ({dimension, valor})), textos, etiquetas}
        : null;
}
