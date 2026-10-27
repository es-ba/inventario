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

export type FiltroDeLista = {
    source:'field'|'attribute';
    target:string;
    operator:'in';
    value:(string|null)[];
    targetLabel:string;
    valueLabels:string[];
};

export function filtrosDeListaDesdeTexto(texto:unknown):FiltroDeLista[]{
    if(typeof texto !== 'string' || !texto){
        return [];
    }
    let dato:unknown;
    try{
        dato = JSON.parse(texto);
    }catch{
        return [];
    }
    if(!Array.isArray(dato)){
        return [];
    }
    const esTexto = (valor:unknown):valor is string => typeof valor === 'string';
    return dato.filter((filtro):filtro is FiltroDeLista => filtro != null && typeof filtro === 'object'
        && (filtro.source === 'field' || filtro.source === 'attribute') && esTexto(filtro.target) && filtro.target !== ''
        && filtro.operator === 'in' && Array.isArray(filtro.value) && filtro.value.length > 0
        && filtro.value.every((valor:unknown) => valor === null || esTexto(valor))
        && esTexto(filtro.targetLabel) && Array.isArray(filtro.valueLabels) && filtro.valueLabels.length === filtro.value.length
        && filtro.valueLabels.every(esTexto))
        .map(({source, target, value, targetLabel, valueLabels}) => ({source, target, operator:'in', value, targetLabel, valueLabels}));
}
