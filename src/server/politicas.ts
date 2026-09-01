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
    return `sector_pertenece(sector_responsable(${columnaResponsable}), ${MI_SECTOR})`;
}

export function visibilidadDeBienes(columnaFicha:string = 'ficha'):string{
    return `(${PUEDE_VER_TODO} OR ${columnaFicha} IN (SELECT ficha FROM bienes_alcance()))`;
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

export function visibilidadDe(alcance:AlcanceDeTabla = {}):string{
    const ramas = [PUEDE_VER_TODO];
    if(alcance.propio != null){
        ramas.push(`(${PUEDE_VER_PROPIO} AND (${alcance.propio}))`);
    }
    if(alcance.dependiente != null){
        ramas.push(`(${PUEDE_VER_DEPENDIENTES} AND (${alcance.dependiente}))`);
    }
    return ramas.length === 1 ? ramas[0] : `(${ramas.join(' OR ')})`;
}

function conVisibilidad(visibilidad:string):PoliticasDeTabla{
    const modificacion = `(${PUEDE_GUARDAR}) AND ${visibilidad}`;
    return {
        select:{using:visibilidad},
        insert:{check:modificacion},
        update:{using:modificacion, check:modificacion},
        delete:{using:`(${PUEDE_ELIMINAR}) AND ${visibilidad}`},
    };
}

export function politicasInventario(alcance:AlcanceDeTabla = {}):PoliticasDeTabla{
    return conVisibilidad(visibilidadDe(alcance));
}

export function politicasPorElBien(columnaFicha:string = 'ficha'):PoliticasDeTabla{
    return conVisibilidad(`${columnaFicha} IN (SELECT ficha FROM bienes)`);
}

export function politicasResponsables():PoliticasDeTabla{
    const visibilidad = visibilidadDe({
        propio:`responsable = ${MI_RESPONSABLE}`,
        dependiente:`sector_pertenece(sector, ${MI_SECTOR})`,
    });
    return conVisibilidad(`(get_app_user('mode') = 'login' OR ${visibilidad})`);
}

export function politicasBienes(columnaFicha:string = 'ficha'):PoliticasDeTabla{
    return conVisibilidad(visibilidadDeBienes(columnaFicha));
}

export function sqlVisibilidad(columnaFicha:string = 'ficha'):string{
    return visibilidadDeBienes(columnaFicha);
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
