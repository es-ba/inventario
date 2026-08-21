import * as React from 'react';
import {Box, Chip, Divider, IconButton, Stack, Tooltip, Typography} from '@mui/material';
import {ArrowBack, Print} from '@mui/icons-material';

import {formatearValor} from '../base/formato-valores';
import type {Fila} from '../base/tipos-tabla';

export type ResumenDelBien = {
    movimientos?:unknown,
    adjuntos?:unknown,
    ultimo_movimiento_fecha?:unknown,
    ultimo_movimiento_accion?:unknown,
    ultimo_movimiento_responsable?:unknown,
    ultima_declaracion?:unknown,
    ultima_declaracion_fecha?:unknown,
    ultima_declaracion_estado?:unknown,
};

/*
    Encabezado del bien: lo que hay que ver siempre, aunque se cambie de solapa.

    La ubicación y el responsable no son campos del bien: salen del último movimiento,
    resueltos por la vista de la tabla. Por eso se muestran acá y no en el formulario,
    donde parecerían editables.
*/

function comoTexto(valor:unknown):string{
    return valor == null ? '' : String(valor).trim();
}

/*
    Nombre descriptivo de una referencia del bien.

    Leía <campo>_texto. Esas columnas existen en la vista pero no están declaradas como
    campos de la tabla, así que backend-plus no las selecciona: la lectura daba siempre
    undefined y el encabezado terminaba mostrando el código pelado —"27", "138"—.

    Las que sí llegan son las que la definición declara.
*/
const CAMPO_DESCRIPTIVO:Record<string, string> = {
    responsable:'responsable_nombre',
    area:'area_sigla',
    sede:'sede_nombre',
    espacio:'espacio_numero',
};

function conDescripcion(fila:Fila, campo:string):string{
    const descriptivo = CAMPO_DESCRIPTIVO[campo];
    // Si el referencial está incompleto queda el código: identifica, aunque no se lea bien.
    return (descriptivo ? comoTexto(fila[descriptivo]) : '') || comoTexto(fila[campo]);
}

function estaEnAlta(row:Fila):boolean{
    return row.activo !== false;
}

function ultimoMovimiento(resumen:ResumenDelBien):string{
    return [
        formatearValor(resumen.ultimo_movimiento_fecha),
        comoTexto(resumen.ultimo_movimiento_accion),
        comoTexto(resumen.ultimo_movimiento_responsable),
    ].filter(parte => parte !== '').join(' · ');
}

function ultimaDeclaracion(resumen:ResumenDelBien):string{
    const numero = comoTexto(resumen.ultima_declaracion);
    if(numero === ''){
        return '';
    }
    return [
        `N° ${numero}`,
        formatearValor(resumen.ultima_declaracion_fecha),
        comoTexto(resumen.ultima_declaracion_estado),
    ].filter(parte => parte !== '').join(' · ');
}

/** Un dato del resumen: etiqueta arriba, valor abajo. Se omite si no hay nada que mostrar. */
function DatoResumen({etiqueta, valor}:{etiqueta:string, valor:string}){
    if(valor === ''){
        return null;
    }
    return <Box sx={{minWidth:0}}>
        <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>
            {etiqueta}
        </Typography>
        <Typography variant="body2" fontWeight={500} noWrap title={valor}>
            {valor}
        </Typography>
    </Box>;
}

export function BienHeader({
    row,
    resumen,
    onVolver,
    onImprimirEtiqueta,
}:{
    row:Fila,
    resumen?:ResumenDelBien|null,
    onVolver?:() => void,
    onImprimirEtiqueta?:() => void,
}){
    const ficha = comoTexto(row.ficha);
    const descripcion = comoTexto(row.detalle)
        || comoTexto(row.observacion)
        || comoTexto(row.modelo);
    const enAlta = estaEnAlta(row);
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
                    <Chip
                        label={enAlta ? 'Alta' : 'Baja'}
                        size="small"
                        color={enAlta ? 'success' : 'default'}
                    />
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

                {/* Lo que antes había que ir a buscar abriendo una solapa por vez. */}
                {resumen
                    ? <Stack
                        direction="row"
                        spacing={3}
                        sx={{mt:1, pt:1, borderTop:1, borderColor:'divider'}}
                        divider={<Divider orientation="vertical" flexItem/>}
                        flexWrap="wrap"
                        useFlexGap
                    >
                        <DatoResumen
                            etiqueta="último movimiento"
                            valor={ultimoMovimiento(resumen)}
                        />
                        <DatoResumen
                            etiqueta="última declaración"
                            valor={ultimaDeclaracion(resumen)}
                        />
                        <DatoResumen
                            etiqueta="movimientos"
                            valor={comoTexto(resumen.movimientos)}
                        />
                        <DatoResumen
                            etiqueta="adjuntos"
                            valor={comoTexto(resumen.adjuntos)}
                        />
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
