import * as React from 'react';
import {Chip, Stack} from '@mui/material';

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
        {tipos.map(t => <Chip
            key={t.tipo}
            label={t.etiqueta}
            color={t.color}
            variant={ocultos.has(t.tipo) ? 'outlined' : 'filled'}
            onClick={() => onAlternar(t.tipo)}
            title={ocultos.has(t.tipo) ? 'Mostrar' : 'Ocultar'}
        />)}
    </Stack>;
}
