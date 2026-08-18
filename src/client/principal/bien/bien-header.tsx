import * as React from 'react';
import {Box, Chip, IconButton, Stack, Tooltip, Typography} from '@mui/material';
import {ArrowBack, Print} from '@mui/icons-material';

import type {Fila} from '../base/tipos-tabla';

/*
    Encabezado del bien: lo que hay que ver siempre, aunque se cambie de solapa.

    La ubicación y el responsable no son campos del bien: salen del último movimiento,
    resueltos por la vista de la tabla. Por eso se muestran acá y no en el formulario,
    donde parecerían editables.
*/

function comoTexto(valor:unknown):string{
    return valor == null ? '' : String(valor).trim();
}

/** Prefiere la versión "código — descripción" que arma la vista de bienes. */
function conDescripcion(fila:Fila, campo:string):string{
    return comoTexto(fila[`${campo}_texto`]) || comoTexto(fila[campo]);
}

function colorDeEstado(estado:string):'success'|'default'|'warning'{
    const normalizado = estado.toUpperCase();
    if(normalizado === 'ALTA'){
        return 'success';
    }
    if(normalizado === 'BAJA'){
        return 'default';
    }
    return 'warning';
}

export function BienHeader({
    row,
    onVolver,
    onImprimirEtiqueta,
}:{
    row:Fila,
    onVolver?:() => void,
    onImprimirEtiqueta?:() => void,
}){
    const ficha = comoTexto(row.ficha);
    const descripcion = comoTexto(row.detalle)
        || comoTexto(row.observacion)
        || comoTexto(row.modelo);
    const estado = comoTexto(row.estado);
    const categoria = comoTexto(row.categoria);
    const responsable = conDescripcion(row, 'responsable');
    const ubicacion = [
        conDescripcion(row, 'area'),
        conDescripcion(row, 'sede'),
        conDescripcion(row, 'espacio'),
    ].filter(parte => parte !== '').join(' › ');

    return <Box sx={{
        position:'sticky',
        top:0,
        zIndex:10,
        bgcolor:'background.paper',
        borderBottom:1,
        borderColor:'divider',
        py:1.5,
        px:2,
        mx:-2,
        mt:-2,
        mb:2,
    }}>
        <Stack direction="row" alignItems="flex-start" spacing={2}>
            {onVolver
                ? <IconButton onClick={onVolver} size="small" sx={{mt:0.5}} title="Volver a la búsqueda">
                    <ArrowBack/>
                </IconButton>
                : null}

            <Box sx={{flex:1, minWidth:0}}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                    <Typography variant="h6" component="div" sx={{fontWeight:600}}>
                        Ficha {ficha || '—'}
                    </Typography>
                    {estado
                        ? <Chip label={estado} size="small" color={colorDeEstado(estado)}/>
                        : null}
                    {categoria
                        ? <Chip label={categoria} size="small" variant="outlined"/>
                        : null}
                </Stack>

                {descripcion
                    ? <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{mt:0.25, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}
                    >
                        {descripcion}
                    </Typography>
                    : null}

                {ubicacion || responsable
                    ? <Stack direction="row" spacing={2} sx={{mt:0.5}} flexWrap="wrap">
                        {ubicacion
                            ? <Typography variant="caption" color="text.secondary">
                                📍 {ubicacion}
                            </Typography>
                            : null}
                        {responsable
                            ? <Typography variant="caption" color="text.secondary">
                                👤 {responsable}
                            </Typography>
                            : null}
                    </Stack>
                    : null}
            </Box>

            {onImprimirEtiqueta
                ? <Tooltip title="Imprimir etiqueta con código de barra">
                    <IconButton size="small" onClick={onImprimirEtiqueta} disabled={!ficha}>
                        <Print/>
                    </IconButton>
                </Tooltip>
                : null}
        </Stack>
    </Box>;
}
