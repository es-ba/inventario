import * as React from 'react';

import {useDatosReferencial} from './cache-tablas';
import type {Fila} from './tipos-tabla';


function comoClave(valor:unknown):string{
    return valor == null ? '' : String(valor).trim();
}

export function espacioAdmitido(espacio:Fila, sector:unknown):boolean{
    const clave = comoClave(sector);
    return clave === '' || comoClave(espacio.sector) === clave;
}

export function espacioAlCambiarSector(espacios:Fila[], sectorNuevo:unknown, espacioActual:unknown):string{
    const actual = comoClave(espacioActual);
    const fila = espacios.find(e => comoClave(e.espacio) === actual);
    return actual !== '' && fila && espacioAdmitido(fila, sectorNuevo) ? actual : '';
}

export function useDestinoDelSector(sector:unknown){
    const {filas:espacios} = useDatosReferencial('espacios');
    const clave = comoClave(sector);

    const admitirEspacio = React.useCallback(
        (fila:Fila) => espacioAdmitido(fila, clave),
        [clave],
    );

    const destinoAlCambiarSector = React.useCallback(
        (sectorNuevo:unknown, fila:{espacio?:unknown}) => ({
            espacio:espacioAlCambiarSector(espacios, sectorNuevo, fila.espacio),
        }),
        [espacios],
    );

    const admitirPara = React.useCallback(
        (campo:string) => campo === 'espacio' ? admitirEspacio : undefined,
        [admitirEspacio],
    );

    return {admitirPara, destinoAlCambiarSector};
}
