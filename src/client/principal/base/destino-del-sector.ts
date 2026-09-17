import * as React from 'react';

import {useDatosReferencial} from './cache-tablas';
import type {Fila} from './tipos-tabla';


function comoClave(valor:unknown):string{
    return valor == null ? '' : String(valor).trim();
}

export function jefeDelSector(sectores:Fila[], sector:unknown):string{
    const clave = comoClave(sector);
    if(clave === ''){
        return '';
    }
    return comoClave(sectores.find(fila => comoClave(fila.sector) === clave)?.responsable);
}

export function responsableAdmitido(responsable:Fila, sector:unknown, jefe:string):boolean{
    const clave = comoClave(sector);
    if(clave === ''){
        return true;
    }
    return comoClave(responsable.sector) === clave
        || (jefe !== '' && comoClave(responsable.responsable) === jefe);
}

export function espacioAdmitido(espacio:Fila, sector:unknown):boolean{
    const clave = comoClave(sector);
    return clave === '' || comoClave(espacio.sector) === clave;
}

export function responsableAlCambiarSector(
    sectores:Fila[],
    responsables:Fila[],
    sectorNuevo:unknown,
    responsableActual:unknown,
):string{
    const jefe = jefeDelSector(sectores, sectorNuevo);
    if(jefe !== ''){
        return jefe;
    }
    const actual = comoClave(responsableActual);
    const fila = responsables.find(r => comoClave(r.responsable) === actual);
    return actual !== '' && fila && responsableAdmitido(fila, sectorNuevo, jefe) ? actual : '';
}

export function espacioAlCambiarSector(espacios:Fila[], sectorNuevo:unknown, espacioActual:unknown):string{
    const actual = comoClave(espacioActual);
    const fila = espacios.find(e => comoClave(e.espacio) === actual);
    return actual !== '' && fila && espacioAdmitido(fila, sectorNuevo) ? actual : '';
}

export function useDestinoDelSector(sector:unknown){
    const {filas:sectores} = useDatosReferencial('sectores');
    const {filas:responsables} = useDatosReferencial('responsables');
    const {filas:espacios} = useDatosReferencial('espacios');
    const jefe = jefeDelSector(sectores, sector);
    const clave = comoClave(sector);

    const admitirResponsable = React.useCallback(
        (fila:Fila) => responsableAdmitido(fila, clave, jefe),
        [clave, jefe],
    );

    const admitirEspacio = React.useCallback(
        (fila:Fila) => espacioAdmitido(fila, clave),
        [clave],
    );

    const destinoAlCambiarSector = React.useCallback(
        (sectorNuevo:unknown, fila:{responsable?:unknown, espacio?:unknown}) => ({
            responsable:responsableAlCambiarSector(sectores, responsables, sectorNuevo, fila.responsable),
            espacio:espacioAlCambiarSector(espacios, sectorNuevo, fila.espacio),
        }),
        [sectores, responsables, espacios],
    );

    const admitirPara = React.useCallback(
        (campo:string) => campo === 'responsable' ? admitirResponsable
            : campo === 'espacio' ? admitirEspacio
            : undefined,
        [admitirResponsable, admitirEspacio],
    );

    return {admitirPara, destinoAlCambiarSector};
}
