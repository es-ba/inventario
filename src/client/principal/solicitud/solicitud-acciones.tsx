import * as React from 'react';
import {Button, Chip, CircularProgress, Stack} from '@mui/material';

import {useAvisos, useConexion} from '../base/contexto-base';
import type {EstadoAccion} from '../../../common/contracts';

/*
    Barra de acciones de una solicitud.

    Las acciones no se calculan acá: la vista movimientos_solicitudes_acciones ya devuelve,
    por cada solicitud, las que su estado habilita y cuya condición se cumple —lo resuelve
    accion_cumple_condicion del lado de la base—. Este componente sólo las dibuja y las
    ejecuta. Así la máquina de estados sigue viviendo en un solo lugar.
*/

declare module 'frontend-plus' {
    interface BEAPI {
        accion_solicitud_ejecutar:(params:{acta:string, accion:string}) => Promise<unknown>;
    }
}

const COLOR_POR_DIRECCION:Record<string, 'primary'|'warning'|'inherit'> = {
    avance:'primary',
    retroceso:'warning',
    blanqueo:'inherit',
};

/** El jsonb puede llegar como arreglo o como texto sin parsear. */
export function accionesDe(valor:unknown):EstadoAccion[]{
    if(Array.isArray(valor)){
        return valor as EstadoAccion[];
    }
    if(typeof valor === 'string' && valor.trim() !== ''){
        try{
            const parsed = JSON.parse(valor);
            return Array.isArray(parsed) ? parsed : [];
        }catch(_err){
            return [];
        }
    }
    return [];
}

/** El botón muestra el nombre de la acción, no su código interno. */
export function etiquetaDeAccion(accion:EstadoAccion):string{
    const abreviatura = String(accion.abr_eaccion ?? '').trim();
    return abreviatura !== '' ? abreviatura : accion.eaccion.replace(/_/g, ' ');
}

export function SolicitudAcciones({
    acta,
    acciones,
    onEjecutada,
    size = 'small',
}:{
    acta:string,
    acciones:unknown,
    onEjecutada:() => void,
    size?:'small'|'medium',
}){
    const conn = useConexion();
    const {mostrarError, mostrarMensaje} = useAvisos();
    const [ejecutando, setEjecutando] = React.useState<string|null>(null);
    const lista = accionesDe(acciones);

    const ejecutar = React.useCallback(async (accion:EstadoAccion) => {
        const nombre = etiquetaDeAccion(accion);
        if(accion.confirma && !window.confirm(`¿Confirma la acción "${nombre}"?`)){
            return;
        }
        setEjecutando(accion.eaccion);
        try{
            await conn.ajax.accion_solicitud_ejecutar({acta, accion:accion.eaccion});
            mostrarMensaje(`Se ejecutó "${nombre}" sobre la solicitud ${acta}.`);
            onEjecutada();
        }catch(err){
            mostrarError(err, `No se pudo ejecutar "${nombre}"`);
        }finally{
            setEjecutando(null);
        }
    }, [acta, conn, mostrarError, mostrarMensaje, onEjecutada]);

    if(lista.length === 0){
        return null;
    }

    return <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {lista.map(accion => accion.desactiva_boton
            ? <Chip
                key={accion.eaccion}
                size="small"
                label={etiquetaDeAccion(accion)}
                title={accion.desc_eaccion ?? undefined}
                variant="outlined"
            />
            : <Button
                key={accion.eaccion}
                size={size}
                variant={accion.eaccion_direccion === 'avance' ? 'contained' : 'outlined'}
                color={COLOR_POR_DIRECCION[accion.eaccion_direccion] ?? 'inherit'}
                title={accion.desc_eaccion ?? undefined}
                disabled={ejecutando != null}
                startIcon={ejecutando === accion.eaccion ? <CircularProgress size={14}/> : undefined}
                onClick={(evento) => {
                    evento.stopPropagation();
                    void ejecutar(accion);
                }}
            >
                {etiquetaDeAccion(accion)}
            </Button>
        )}
    </Stack>;
}
