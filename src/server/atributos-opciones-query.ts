"use strict";

export type OpcionesQuery = {
    sql:string;
    values:unknown[];
};

const MAX_SEARCH_LENGTH = 100;

function normalizeSearch(value:unknown):string{
    const search = String(value ?? '').trim();
    if(search.length > MAX_SEARCH_LENGTH){
        throw new Error(`La búsqueda no puede superar ${MAX_SEARCH_LENGTH} caracteres`);
    }
    return search;
}

export function buildAtributosOpcionesQuery(busqueda:unknown):OpcionesQuery{
    const search = normalizeSearch(busqueda);
    return {
        sql:`
            SELECT atributo, nombre, tipo_valor
              FROM bienes_atributos
             WHERE $1 = ''
                OR atributo ILIKE '%' || $1 || '%'
                OR coalesce(nombre, '') ILIKE '%' || $1 || '%'
             ORDER BY lower(coalesce(nullif(nombre, ''), atributo)), lower(atributo)
             LIMIT 20
        `,
        values:[search],
    };
}

export function buildAtributoValoresOpcionesQuery(
    atributoValue:unknown,
    busqueda:unknown,
):OpcionesQuery{
    const atributo = String(atributoValue ?? '').trim();
    if(!atributo){
        throw new Error('El atributo es obligatorio');
    }
    const search = normalizeSearch(busqueda);
    return {
        sql:`
            SELECT atributo, valor, orden
              FROM bienes_atributo_valores
             WHERE atributo = $1
               AND ($2 = '' OR valor ILIKE '%' || $2 || '%')
             ORDER BY orden NULLS LAST, valor
             LIMIT 20
        `,
        values:[atributo, search],
    };
}

