import * as React from 'react';
import {Box, Button, CircularProgress, IconButton, Stack, Typography} from '@mui/material';
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
import {TipoVisible, colorDelTipo, fondoDelTipo, textoDelEvento} from './calendario-comun';

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
        <Box sx={{display:'grid', gridTemplateColumns:'repeat(7, minmax(0, 1fr))', gap:'1px', p:'1px',
            bgcolor:'divider', borderRadius:2, overflow:'hidden'}}>
            {dias.slice(0, 7).map(dia => <Box key={`cabecera-${dia}`} sx={{p:0.75, textAlign:'center', bgcolor:'grey.100'}}>
                <Typography variant="caption" color="text.secondary" sx={{textTransform:'capitalize', fontWeight:600}}>
                    {textoDeFecha(dia, {weekday:'short'})}
                </Typography>
            </Box>)}
            {dias.map(dia => {
                const eventos = porDia.get(dia) ?? [];
                const visibles = eventos.length > EVENTOS_POR_DIA ? eventos.slice(0, EVENTOS_POR_DIA - 1) : eventos;
                const esHoy = dia === hoy;
                return <Box
                    key={dia}
                    role="button"
                    aria-label={textoDeFecha(dia, {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
                    onClick={() => onElegirDia(dia)}
                    sx={{
                        minHeight:128, p:0.5, cursor:'pointer', overflow:'hidden',
                        bgcolor:mismoMes(dia, fecha) ? 'background.paper' : 'grey.50',
                        '&:hover':{bgcolor:'grey.100'},
                    }}
                >
                    <Typography variant="body2" sx={{
                        width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%',
                        color:mismoMes(dia, fecha) ? 'text.primary' : 'text.disabled',
                        ...(esHoy ? {fontWeight:700, bgcolor:'primary.main', color:'primary.contrastText'} : {}),
                    }}>
                        {Number(dia.slice(8))}
                    </Typography>
                    <Stack spacing={0.25} sx={{mt:0.5}}>
                        {visibles.map(e => {
                            const tipo = tipoPorCodigo.get(e.tipo);
                            const color = tipo?.color ?? 'default';
                            return <Box
                                key={`${e.tipo}-${e.grupo}`}
                                title={textoDelEvento(tipo, e.titulo, e.cantidad)}
                                sx={{display:'flex', gap:0.5, px:0.75, borderRadius:1,
                                    bgcolor:fondoDelTipo(color), borderLeft:3, borderColor:colorDelTipo(color)}}
                            >
                                <Typography variant="caption" noWrap sx={{flex:1}}>{textoDelEvento(tipo, e.titulo)}</Typography>
                                <Typography variant="caption" sx={{fontWeight:700}}>{e.cantidad}</Typography>
                            </Box>;
                        })}
                        {eventos.length > visibles.length
                            ? <Typography variant="caption" color="text.secondary" sx={{px:0.75}}>+{eventos.length - visibles.length} más</Typography>
                            : null}
                    </Stack>
                </Box>;
            })}
        </Box>
    </Box>;
}
