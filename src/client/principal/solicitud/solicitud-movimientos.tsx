import * as React from 'react';
import {Alert, Box, CircularProgress} from '@mui/material';

import {useAvisos, useConexion} from '../base/contexto-base';
import {leerTabla} from '../base/referencias';
import type {Fila} from '../base/tipos-tabla';
import {GrillaDeMovimientos} from '../movimiento/grilla-de-movimientos';

export function SolicitudMovimientos({acta}:{acta:string}){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const [filas, setFilas] = React.useState<Fila[]>([]);
    const [cargando, setCargando] = React.useState(acta !== '');

    React.useEffect(() => {
        if(acta === ''){
            return;
        }
        let cancelado = false;
        setCargando(true);
        leerTabla(conn, 'movimientos_consulta', [{fieldName:'acta_origen', value:acta}])
            .then(datos => { if(!cancelado){ setFilas(datos); } })
            .catch(err => { if(!cancelado){ mostrarError(err, 'No se pudieron cargar los movimientos de la solicitud'); setFilas([]); } })
            .finally(() => { if(!cancelado){ setCargando(false); } });
        return () => { cancelado = true; };
    }, [acta, conn, mostrarError]);

    if(cargando){
        return <Box sx={{display:'flex', justifyContent:'center', p:4}}><CircularProgress/></Box>;
    }
    if(filas.length === 0){
        return <Alert severity="info">Los movimientos se registran cuando la solicitud se procesa.</Alert>;
    }
    return <GrillaDeMovimientos filas={filas} sinSolicitud/>;
}
