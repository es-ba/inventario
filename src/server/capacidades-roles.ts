"use strict";

export type FilaDeRol = Record<string, unknown> & {rol?:unknown};

let capacidades:Record<string, Record<string, boolean>> = {};

export function setCapacidadesDeRoles(filas:FilaDeRol[]):void{
    capacidades = {};
    for(const fila of filas){
        const rol = String(fila.rol ?? '').trim();
        if(rol === ''){
            continue;
        }
        const delRol:Record<string, boolean> = {};
        for(const columna of Object.keys(fila)){
            if(columna.startsWith('puede_')){
                delRol[columna] = fila[columna] === true;
            }
        }
        capacidades[rol] = delRol;
    }
}

export function getCapacidadesDeRoles():Record<string, Record<string, boolean>>{
    return capacidades;
}

export function puedeElRol(rol:unknown, capacidad:string):boolean{
    const delRol = capacidades[String(rol ?? '').trim()];
    return delRol != null && delRol[capacidad] === true;
}
