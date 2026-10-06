import * as React from 'react';
import {Chip, ChipProps, Stack, Theme, alpha} from '@mui/material';

import type {ColorDeEvento, ResumenDeEvento} from '../../../common/calendario';

export type GrupoDelDia = {
    tipo:string,
    grupo:string,
    titulo:string,
    enlace:string|null,
    cantidad:number,
    usuarios:string,
    hora:string|null,
};

export type BienDelGrupo = Record<string, unknown> & {ficha:string, total:number|string};

declare module 'frontend-plus' {
    interface BEAPI {
        calendario_eventos:(params:{desde:string, hasta:string}) => Promise<ResumenDeEvento[]>;
        calendario_dia:(params:{fecha:string}) => Promise<GrupoDelDia[]>;
        calendario_dia_bienes:(params:{fecha:string, tipo:string, grupo:string, desde:number, cantidad:number}) => Promise<BienDelGrupo[]>;
    }
}

export type TipoVisible = {tipo:string, etiqueta:string, color:ColorDeEvento, orden:number};

export function textoDelEvento(tipo:TipoVisible|undefined, titulo:string, cantidad?:number):string{
    const base = [tipo?.etiqueta ?? '', titulo].filter(parte => parte !== '').join(' · ');
    return cantidad == null ? base : `${base}: ${cantidad}`;
}

export function Leyenda({
    tipos,
    ocultos,
    onAlternar,
}:{
    tipos:TipoVisible[],
    ocultos:Set<string>,
    onAlternar:(tipo:string) => void,
}){
    return <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {tipos.map(t => <ChipDeTipo
            key={t.tipo}
            tipo={t}
            oculto={ocultos.has(t.tipo)}
            label={t.etiqueta}
            onClick={() => onAlternar(t.tipo)}
            title={ocultos.has(t.tipo) ? 'Mostrar' : 'Ocultar'}
        />)}
    </Stack>;
}

export const colorDelTipo = (color:ColorDeEvento) => (theme:Theme) =>
    color === 'default' ? theme.palette.grey[600] : theme.palette[color].main;

export const fondoDelTipo = (color:ColorDeEvento) => (theme:Theme) => alpha(colorDelTipo(color)(theme), 0.12);

export function ChipDeTipo({tipo, oculto, ...props}:{tipo:TipoVisible, oculto:boolean} & ChipProps){
    return <Chip
        color={tipo.color}
        variant="outlined"
        {...props}
        sx={{
            color:'text.primary', fontWeight:500,
            ...(oculto ? {opacity:0.6, textDecoration:'line-through'} : {bgcolor:fondoDelTipo(tipo.color)}),
        }}
    />;
}
