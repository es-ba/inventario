import * as React from 'react';
import {Box, Chip, Divider, IconButton, Stack, Tooltip, Typography} from '@mui/material';
import {ArrowBack, Print} from '@mui/icons-material';

import {formatearValor} from '../base/formato-valores';
import type {Fila} from '../base/tipos-tabla';
import {colorDeEstado} from './presentacion-bien';

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


function comoTexto(valor:unknown):string{
    return valor == null ? '' : String(valor).trim();
}

const CAMPO_DESCRIPTIVO:Record<string, string> = {
    sector:'sector_sigla',
    sede:'sede_nombre',
    espacio:'espacio_numero',
    estado:'estados_bien__descripcion',
};

function conDescripcion(fila:Fila, campo:string):string{
    const descriptivo = CAMPO_DESCRIPTIVO[campo];
    return (descriptivo ? comoTexto(fila[descriptivo]) : '') || comoTexto(fila[campo]);
}

export function responsablesDelBien(row:Fila):{delSector:string, directo:string}{
    const delSector = comoTexto(row.responsable_sector_nombre) || comoTexto(row.responsable_sector);
    const directo = comoTexto(row.responsable_nombre) || comoTexto(row.responsable);
    const mismoQueElSector = comoTexto(row.responsable) !== ''
        && comoTexto(row.responsable) === comoTexto(row.responsable_sector);
    return {delSector, directo:mismoQueElSector ? '' : directo};
}

function Rotulo({etiqueta, valor}:{etiqueta:string, valor:string}){
    if(valor === ''){
        return null;
    }
    return <Typography variant="caption" color="text.secondary">
        {etiqueta}: <Box component="span" sx={{color:'text.primary'}}>{valor}</Box>
    </Typography>;
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
    const estado = conDescripcion(row, 'estado');
    const {delSector, directo} = responsablesDelBien(row);
    const asignacion = conDescripcion(row, 'tipo_asignacion');
    const ubicacion = [
        conDescripcion(row, 'sector'),
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
                        ? <Chip label={estado} size="small" color={colorDeEstado(row.estado)}/>
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

                {ubicacion || delSector || directo || asignacion
                    ? <Stack direction="row" columnGap={2} rowGap={0.25} sx={{mt:0.5}} flexWrap="wrap" useFlexGap>
                        <Rotulo etiqueta="Ubicación" valor={ubicacion}/>
                        <Rotulo etiqueta="Responsable del sector" valor={delSector}/>
                        <Rotulo etiqueta="Responsable directo" valor={directo}/>
                        <Rotulo etiqueta="Tipo de asignación" valor={asignacion}/>
                    </Stack>
                    : null}

                {}
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
                            etiqueta="Último movimiento"
                            valor={ultimoMovimiento(resumen)}
                        />
                        <DatoResumen
                            etiqueta="Última declaración"
                            valor={ultimaDeclaracion(resumen)}
                        />
                        <DatoResumen
                            etiqueta="Movimientos"
                            valor={comoTexto(resumen.movimientos)}
                        />
                        <DatoResumen
                            etiqueta="Adjuntos"
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
