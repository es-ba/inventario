import * as React from 'react';
import {Alert, Box, Chip, Stack} from '@mui/material';
import type {Connector} from 'frontend-plus';

import type {BienesBusquedaRequest} from '../../common/contracts';
import type {
    BienesAgrupadoFila,
    DimensionAgrupar,
    DimensionDisponible,
    GrupoFiltro,
} from '../../common/bienes-agrupar';
import {SIN_DATO, SelectorDimension} from './resumen-bienes';
import {textoSinCodigo} from './columnas-busqueda';
import {
    consultaDelDesglose,
    dimensionDelDesglose,
    esFiltroPropio,
    estaElegido,
    guardarDesglose,
    leerDesglose,
} from './desglose-datos';

export type GrupoElegido = {partes:GrupoFiltro[], textos:string[], etiquetas:string[]};

export function DesgloseBusqueda({
    conn,
    consulta,
    version,
    visible,
    usuario,
    grupoFiltro,
    onElegir,
}:{
    conn:Connector,
    consulta:BienesBusquedaRequest,
    version:number,
    visible:boolean,
    usuario:string|null|undefined,
    grupoFiltro:GrupoFiltro[]|null,
    onElegir:(grupo:GrupoElegido|null) => void,
}){
    const [opciones, setOpciones] = React.useState<DimensionDisponible[]>([]);
    const [dimension, setDimension] = React.useState<DimensionAgrupar|null>(null);
    const [filas, setFilas] = React.useState<BienesAgrupadoFila[]>([]);
    const [cargando, setCargando] = React.useState(false);
    const [error, setError] = React.useState<string|null>(null);
    const secuencia = React.useRef(0);
    const chipElegido = React.useRef<HTMLDivElement|null>(null);

    React.useEffect(() => {
        let cancelado = false;
        conn.ajax.bienes_dimensiones_agrupar({})
            .then(respuesta => { if(!cancelado){ setOpciones(respuesta.dimensiones); } })
            .catch(err => { if(!cancelado){ setError(err instanceof Error ? err.message : String(err)); } });
        return () => { cancelado = true; };
    }, [conn]);

    React.useEffect(() => {
        setDimension(dimensionDelDesglose(opciones, usuario ? leerDesglose(usuario) : null));
    }, [opciones, usuario]);

    const consultaAgrupada = dimension == null ? null : consultaDelDesglose(consulta, grupoFiltro, dimension);
    const claveConsulta = JSON.stringify(consultaAgrupada);

    React.useEffect(() => {
        if(!visible || consultaAgrupada == null){
            return;
        }
        const numero = ++secuencia.current;
        setCargando(true);
        setError(null);
        conn.ajax.bienes_buscar_agrupado({
            consulta:claveConsulta,
        }).then(resultado => {
            if(numero === secuencia.current){ setFilas(resultado.rows); }
        }).catch(err => {
            if(numero === secuencia.current){
                setError(err instanceof Error ? err.message : String(err));
                setFilas([]);
            }
        }).finally(() => {
            if(numero === secuencia.current){ setCargando(false); }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conn, claveConsulta, version, visible]);

    const etiqueta = opciones.find(opcion => opcion.clave === dimension)?.etiqueta ?? dimension ?? '';
    const valorElegido = filas.find(fila => estaElegido(grupoFiltro, dimension, fila.valores[0] ?? null));

    React.useEffect(() => {
        chipElegido.current?.scrollIntoView({block:'nearest', inline:'nearest'});
    }, [valorElegido]);

    if(dimension == null){
        return error ? <Alert severity="error" sx={{mb:1, py:0}}>{error}</Alert> : null;
    }

    return <Stack
        direction={{xs:'column', sm:'row'}}
        spacing={1}
        alignItems={{xs:'stretch', sm:'center'}}
        sx={{mb:1, minWidth:0}}
    >
        <SelectorDimension
            etiqueta="Desglosar por"
            opciones={opciones}
            valor={dimension}
            excluidas={[]}
            onChange={nueva => {
                if(nueva == null || nueva === dimension){
                    return;
                }
                if(usuario){ guardarDesglose(usuario, nueva); }
                setDimension(nueva);
                setFilas([]);
                if(esFiltroPropio(grupoFiltro, dimension)){ onElegir(null); }
            }}
        />
        {error
            ? <Alert severity="error" sx={{py:0}}>{error}</Alert>
            : <Box sx={{
                display:'flex',
                gap:1,
                flex:1,
                minWidth:0,
                overflowX:'auto',
                py:0.5,
                opacity:cargando ? 0.5 : 1,
            }}>
                {filas.map(fila => {
                    const valor = fila.valores[0] ?? null;
                    const texto = fila.textos[0] ?? valor ?? SIN_DATO;
                    const elegido = fila === valorElegido;
                    return <Chip
                        key={JSON.stringify(valor)}
                        ref={elegido ? chipElegido : undefined}
                        size="small"
                        clickable
                        color={elegido ? 'primary' : 'default'}
                        variant={elegido ? 'filled' : 'outlined'}
                        label={<>{textoSinCodigo(texto, valor)} <b>{fila.cantidad.toLocaleString('es-AR')}</b></>}
                        title={texto}
                        sx={{flexShrink:0}}
                        onClick={() => onElegir(elegido ? null : {
                            partes:[{dimension, valor}],
                            textos:[texto],
                            etiquetas:[etiqueta],
                        })}
                    />;
                })}
            </Box>}
    </Stack>;
}
