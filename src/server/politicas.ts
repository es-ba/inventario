"use strict";

function capacidad(columna:string):string{
    return `(SELECT coalesce(${columna}, false) FROM roles WHERE rol = get_app_user('rol'))`;
}

const PUEDE_VER_TODO = capacidad('puede_ver_todo');
const PUEDE_VER_PROPIO = capacidad('puede_ver_propio');
const PUEDE_VER_DEPENDIENTES = capacidad('puede_ver_dependientes');
const PUEDE_GUARDAR = capacidad('puede_guardar');
const PUEDE_ELIMINAR = capacidad('puede_eliminar');

export const MI_RESPONSABLE = `nullif(get_app_user('responsable'), '')`;

export const MI_SECTOR = `nullif(get_app_user('sector'), '')`;

export function deMisDependientes(columnaResponsable:string):string{
    return `EXISTS (SELECT 1 FROM responsables r`
        + ` WHERE r.responsable = ${columnaResponsable}`
        + ` AND sector_pertenece(r.sector, ${MI_SECTOR}))`;
}

export type PoliticasDeTabla = {
    select:{using:string},
    insert:{check:string},
    update:{using:string, check:string},
    delete:{using:string},
};

export type AlcanceDeTabla = {
    propio?:string,
    dependiente?:string,
};

export function politicasInventario(alcance:AlcanceDeTabla = {}):PoliticasDeTabla{
    const ramas = [PUEDE_VER_TODO];
    if(alcance.propio != null){
        ramas.push(`(${PUEDE_VER_PROPIO} AND (${alcance.propio}))`);
    }
    if(alcance.dependiente != null){
        ramas.push(`(${PUEDE_VER_DEPENDIENTES} AND (${alcance.dependiente}))`);
    }
    const visibilidad = ramas.length === 1 ? ramas[0] : `(${ramas.join(' OR ')})`;
    const modificacion = `(${PUEDE_GUARDAR}) AND ${visibilidad}`;
    return {
        select:{using:visibilidad},
        insert:{check:modificacion},
        update:{using:modificacion, check:modificacion},
        delete:{using:`(${PUEDE_ELIMINAR}) AND ${visibilidad}`},
    };
}

export function sqlVisibilidad():string{
    return PUEDE_VER_TODO;
}

const PUEDE_VER_CLAVES = capacidad('puede_ver_claves');

export function politicasClaves():PoliticasDeTabla{
    const modificacion = `(${PUEDE_VER_CLAVES}) AND (${PUEDE_GUARDAR})`;
    return {
        select:{using:PUEDE_VER_CLAVES},
        insert:{check:modificacion},
        update:{using:modificacion, check:modificacion},
        delete:{using:`(${PUEDE_VER_CLAVES}) AND (${PUEDE_ELIMINAR})`},
    };
}
