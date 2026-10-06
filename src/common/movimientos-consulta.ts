import {hoyYmd, sumarDias} from './calendario';

type Fila = Record<string, unknown>;

export const TODOS = '__todos__';
export const CON_SOLICITUD = '__con_solicitud__';
export const SIN_SOLICITUD = '__sin_solicitud__';

export const DIAS_DEL_RANGO_INICIAL = 30;

export type FiltrosDeMovimientos = {
    bien:string,
    solicitud:string,
    conSolicitud:string,
    saleDe:string,
    llegaA:string,
    usuario:string,
    accion:string,
};

export type FiltroDeMovimiento = 'conSolicitud';

export const SIN_FILTROS:FiltrosDeMovimientos = {
    bien:'', solicitud:'', conSolicitud:TODOS, saleDe:'', llegaA:'', usuario:'', accion:TODOS,
};

const CAMPOS_DEL_BIEN = ['ficha', 'bien', 'grupo', 'marca', 'modelo', 'serie'];
const CAMPOS_DE_ORIGEN = ['de_sector', 'de_responsable', 'de_espacio'];
const CAMPOS_DE_DESTINO = ['a_sector', 'a_responsable', 'a_espacio'];

function texto(valor:unknown):string{
    return String(valor ?? '').trim();
}

function contiene(fila:Fila, campos:string[], buscado:string):boolean{
    const minusculas = buscado.trim().toLowerCase();
    return minusculas === '' || campos.some(campo => texto(fila[campo]).toLowerCase().includes(minusculas));
}

export function rangoInicial(hoy:string = hoyYmd()):{desde:string, hasta:string}{
    return {desde:sumarDias(hoy, -DIAS_DEL_RANGO_INICIAL), hasta:hoy};
}

export function tieneSolicitud(fila:Fila):boolean{
    return texto(fila.acta_origen) !== '';
}

export function pasaMovimiento(fila:Fila, filtros:FiltrosDeMovimientos, sin:FiltroDeMovimiento[] = []):boolean{
    const solicitud = filtros.solicitud.trim();
    return contiene(fila, CAMPOS_DEL_BIEN, filtros.bien)
        && (solicitud === '' || texto(fila.acta_origen) === solicitud)
        && (sin.includes('conSolicitud') || filtros.conSolicitud === TODOS
            || tieneSolicitud(fila) === (filtros.conSolicitud === CON_SOLICITUD))
        && contiene(fila, CAMPOS_DE_ORIGEN, filtros.saleDe)
        && contiene(fila, CAMPOS_DE_DESTINO, filtros.llegaA)
        && contiene(fila, ['usuario_creacion'], filtros.usuario)
        && (filtros.accion === TODOS || texto(fila.accion) === filtros.accion);
}

export type ConteoDeMovimientos = {todos:number, conSolicitud:number, sinSolicitud:number};

export function contarPorSolicitud(filas:Fila[], filtros:FiltrosDeMovimientos):ConteoDeMovimientos{
    const conteo:ConteoDeMovimientos = {todos:0, conSolicitud:0, sinSolicitud:0};
    for(const fila of filas){
        if(!pasaMovimiento(fila, filtros, ['conSolicitud'])){
            continue;
        }
        conteo.todos++;
        if(tieneSolicitud(fila)){
            conteo.conSolicitud++;
        }else{
            conteo.sinSolicitud++;
        }
    }
    return conteo;
}

export function accionesDe(filas:Fila[]):string[]{
    return [...new Set(filas.map(fila => texto(fila.accion)).filter(accion => accion !== ''))].sort((a, b) => a.localeCompare(b));
}
