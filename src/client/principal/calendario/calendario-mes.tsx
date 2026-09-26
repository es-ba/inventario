import * as React from 'react';
import {Box, Button, Chip, CircularProgress, IconButton, Stack, Typography} from '@mui/material';
import {ChevronLeft, ChevronRight} from '@mui/icons-material';

import {useAvisos, useConexion} from '../base/contexto-base';
import {
    ResumenDeEvento,
    agruparPorDia,
    diasDeLaGrilla,
    hoyYmd,
    mismoMes,
    sumarMeses,
    textoDeFecha,
} from '../../../common/calendario';
import {TipoVisible, textoDelEvento} from './calendario-comun';

const EVENTOS_POR_DIA = 4;

export function CalendarioMes({
    fecha,
    tipos,
    ocultos,
    onCambiarMes,
    onElegirDia,
}:{
    fecha:string,
    tipos:TipoVisible[],
    ocultos:Set<string>,
    onCambiarMes:(fecha:string) => void,
    onElegirDia:(fecha:string) => void,
}){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const [resumen, setResumen] = React.useState<ResumenDeEvento[]>([]);
    const [cargando, setCargando] = React.useState(true);
    const dias = React.useMemo(() => diasDeLaGrilla(fecha), [fecha]);
    const hoy = hoyYmd();

    React.useEffect(() => {
        let cancelado = false;
        setCargando(true);
        conn.ajax.calendario_eventos({desde:dias[0], hasta:dias[dias.length - 1]})
            .then(filas => { if(!cancelado){ setResumen(filas); } })
            .catch(err => { if(!cancelado){ mostrarError(err, 'No se pudo cargar el calendario'); setResumen([]); } })
            .finally(() => { if(!cancelado){ setCargando(false); } });
        return () => { cancelado = true; };
    }, [conn, dias, mostrarError]);

    const tipoPorCodigo = React.useMemo(() => new Map(tipos.map(t => [t.tipo, t])), [tipos]);
    const porDia = React.useMemo(() => agruparPorDia(
        resumen.filter(e => tipoPorCodigo.has(e.tipo) && !ocultos.has(e.tipo)),
        tipo => tipoPorCodigo.get(tipo)?.orden ?? 0,
    ), [ocultos, resumen, tipoPorCodigo]);

    return <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{mb:1}}>
            <IconButton aria-label="mes anterior" title="Mes anterior" onClick={() => onCambiarMes(sumarMeses(fecha, -1))}>
                <ChevronLeft/>
            </IconButton>
            <IconButton aria-label="mes siguiente" title="Mes siguiente" onClick={() => onCambiarMes(sumarMeses(fecha, 1))}>
                <ChevronRight/>
            </IconButton>
            <Button size="small" variant="outlined" onClick={() => onCambiarMes(hoy)}>Hoy</Button>
            <Typography variant="h6" sx={{ml:1, '&::first-letter':{textTransform:'uppercase'}}}>
                {textoDeFecha(fecha, {month:'long', year:'numeric'})}
            </Typography>
            {cargando ? <CircularProgress size={20}/> : null}
        </Stack>
        <Box sx={{display:'grid', gridTemplateColumns:'repeat(7, minmax(0, 1fr))', border:1, borderColor:'divider'}}>
            {dias.slice(0, 7).map(dia => <Box key={`cabecera-${dia}`}
                sx={{p:0.5, textAlign:'center', borderBottom:1, borderColor:'divider', bgcolor:'action.hover'}}>
                <Typography variant="caption" sx={{textTransform:'capitalize', fontWeight:600}}>
                    {textoDeFecha(dia, {weekday:'short'})}
                </Typography>
            </Box>)}
            {dias.map(dia => {
                const eventos = porDia.get(dia) ?? [];
                const esHoy = dia === hoy;
                return <Box
                    key={dia}
                    role="button"
                    aria-label={textoDeFecha(dia, {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
                    onClick={() => onElegirDia(dia)}
                    sx={{
                        minHeight:118, p:0.5, cursor:'pointer', overflow:'hidden',
                        borderRight:1, borderBottom:1, borderColor:'divider',
                        bgcolor:mismoMes(dia, fecha) ? 'background.paper' : 'action.hover',
                        '&:hover':{bgcolor:'action.selected'},
                    }}
                >
                    <Typography variant="body2" sx={{
                        fontWeight:esHoy ? 700 : 400,
                        color:mismoMes(dia, fecha) ? 'text.primary' : 'text.disabled',
                        ...(esHoy ? {bgcolor:'primary.main', color:'primary.contrastText', borderRadius:'50%',
                            width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center'} : {}),
                    }}>
                        {Number(dia.slice(8))}
                    </Typography>
                    <Stack spacing={0.5} sx={{mt:0.5}}>
                        {eventos.slice(0, EVENTOS_POR_DIA).map(e => <Chip
                            key={`${e.tipo}-${e.grupo}`}
                            size="small"
                            color={tipoPorCodigo.get(e.tipo)?.color ?? 'default'}
                            label={textoDelEvento(tipoPorCodigo.get(e.tipo), e.titulo, e.cantidad)}
                            title={textoDelEvento(tipoPorCodigo.get(e.tipo), e.titulo, e.cantidad)}
                            sx={{justifyContent:'flex-start', maxWidth:'100%'}}
                        />)}
                        {eventos.length > EVENTOS_POR_DIA
                            ? <Typography variant="caption" color="text.secondary">+{eventos.length - EVENTOS_POR_DIA} más</Typography>
                            : null}
                    </Stack>
                </Box>;
            })}
        </Box>
    </Box>;
}
