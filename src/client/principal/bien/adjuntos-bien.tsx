import * as React from 'react';

import {AdjuntosPanel} from '../base/adjuntos-panel';
import {useConexion} from '../base/contexto-base';
import type {Fila} from '../base/tipos-tabla';


declare module 'frontend-plus' {
    interface BEAPI {
        archivo_subir:(params:{ficha:string, files:File[]}) => Promise<{
            message:string,
            nombre:string,
            row:Fila,
        }>;
    }
}

export function AdjuntosBien({ficha}:{ficha:string}){
    const conn = useConexion();
    const subir = React.useCallback(
        (archivo:File) => conn.ajax.archivo_subir({ficha, files:[archivo]}),
        [conn, ficha],
    );
    return <AdjuntosPanel
        tabla="adjuntos_bienes"
        campoClave="ficha"
        valorClave={ficha}
        campoNumero="numero_adjunto"
        endpointDescarga="download/adjunto_bien"
        subir={subir}
    />;
}
