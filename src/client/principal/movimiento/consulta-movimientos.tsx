import * as React from 'react';
import {Box, Button, Chip, MenuItem, Stack, TextField} from '@mui/material';
import {Refresh} from '@mui/icons-material';

import {useAvisos, useConexion} from '../base/contexto-base';
import {leerTabla} from '../base/referencias';
import type {Fila} from '../base/tipos-tabla';
import {esYmd} from '../../../common/calendario';
import {
    CON_SOLICITUD,
    FiltrosDeMovimientos,
    SIN_FILTROS,
    SIN_SOLICITUD,
    TODOS,
    accionesDe,
    contarPorSolicitud,
    pasaMovimiento,
    rangoInicial,
} from '../../../common/movimientos-consulta';
import {GrillaDeMovimientos} from './grilla-de-movimientos';

type FiltroDeTexto = 'bien'|'solicitud'|'saleDe'|'llegaA'|'usuario';

const FILTROS_DE_TEXTO:{campo:FiltroDeTexto, etiqueta:string, ayuda?:string}[] = [
    {campo:'bien', etiqueta:'Bien', ayuda:'Ficha, descripción, grupo, marca, modelo o serie'},
    {campo:'solicitud', etiqueta:'N.º de solicitud'},
    {campo:'saleDe', etiqueta:'Sale de', ayuda:'Sector, responsable o espacio'},
    {campo:'llegaA', etiqueta:'Llega a', ayuda:'Sector, responsable o espacio'},
    {campo:'usuario', etiqueta:'Usuario'},
];

export function ConsultaMovimientos(){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const [rango, setRango] = React.useState(rangoInicial);
    const [filtros, setFiltros] = React.useState<FiltrosDeMovimientos>(SIN_FILTROS);
    const [filas, setFilas] = React.useState<Fila[]>([]);
    const [cargando, setCargando] = React.useState(true);
    const [version, setVersion] = React.useState(0);

    const rangoValido = esYmd(rango.desde) && esYmd(rango.hasta) && rango.desde <= rango.hasta;

    React.useEffect(() => {
        if(!rangoValido){
            return;
        }
        let cancelado = false;
        setCargando(true);
        leerTabla(conn, 'movimientos_consulta', [{fieldName:'fecha_movimiento', value:rango.desde, until:rango.hasta}])
            .then(datos => { if(!cancelado){ setFilas(datos); } })
            .catch(err => { if(!cancelado){ mostrarError(err, 'No se pudieron cargar los movimientos'); setFilas([]); } })
            .finally(() => { if(!cancelado){ setCargando(false); } });
        return () => { cancelado = true; };
    }, [conn, mostrarError, rango.desde, rango.hasta, rangoValido, version]);

    const filasVisibles = React.useMemo(() => filas.filter(fila => pasaMovimiento(fila, filtros)), [filas, filtros]);
    const conteo = React.useMemo(() => contarPorSolicitud(filas, filtros), [filas, filtros]);
    const acciones = React.useMemo(() => accionesDe(filas), [filas]);

    const cambiar = (campo:keyof FiltrosDeMovimientos, valor:string) => setFiltros(actuales => ({...actuales, [campo]:valor}));
    const fecha = (campo:'desde'|'hasta', etiqueta:string) => <TextField
        size="small"
        type="date"
        label={etiqueta}
        value={rango[campo]}
        error={!rangoValido}
        onChange={evento => setRango(actual => ({...actual, [campo]:evento.target.value}))}
        InputLabelProps={{shrink:true}}
    />;
    const chip = (valor:string, etiqueta:string, cantidad:number) => <Chip
        label={`${etiqueta}: ${cantidad}`}
        variant={filtros.conSolicitud === valor ? 'filled' : 'outlined'}
        onClick={() => cambiar('conSolicitud', filtros.conSolicitud === valor ? TODOS : valor)}
    />;

    return <Box sx={{p:{xs:1, md:2}}}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{mb:2}}>
            {fecha('desde', 'Desde')}
            {fecha('hasta', 'Hasta')}
            <Box sx={{flex:1}}/>
            <Button startIcon={<Refresh/>} onClick={() => setVersion(v => v + 1)} disabled={cargando || !rangoValido}>
                Actualizar
            </Button>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{mb:2}}>
            {chip(TODOS, 'todos', conteo.todos)}
            {chip(CON_SOLICITUD, 'con solicitud', conteo.conSolicitud)}
            {chip(SIN_SOLICITUD, 'sin solicitud', conteo.sinSolicitud)}
        </Stack>

        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{mb:2}}>
            {FILTROS_DE_TEXTO.map(({campo, etiqueta, ayuda}) => <TextField
                key={campo}
                size="small"
                label={etiqueta}
                helperText={ayuda}
                value={filtros[campo]}
                onChange={evento => cambiar(campo, evento.target.value)}
                sx={{minWidth:180}}
            />)}
            <TextField
                select
                size="small"
                label="Acción"
                value={filtros.accion}
                onChange={evento => cambiar('accion', evento.target.value)}
                sx={{minWidth:160}}
            >
                <MenuItem value={TODOS}>Todas</MenuItem>
                {acciones.map(accion => <MenuItem key={accion} value={accion}>{accion}</MenuItem>)}
            </TextField>
        </Stack>

        <GrillaDeMovimientos filas={filasVisibles} cargando={cargando}/>
    </Box>;
}
