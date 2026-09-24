import * as React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Toolbar,
    Typography,
} from '@mui/material';
import {ExpandMore, Refresh} from '@mui/icons-material';
import type {FixedFields} from 'frontend-plus';

import {useAvisos, useConexion} from '../base/contexto-base';
import {formatearValor} from '../base/formato-valores';
import type {Fila} from '../base/tipos-tabla';


export type EventoConCambios = {evento:Fila, cambios:Fila[]};

export function agruparCambiosPorEvento(eventos:Fila[], cambios:Fila[]):EventoConCambios[]{
    const porOrden = new Map<string, Fila[]>();
    for(const cambio of cambios){
        const clave = String(cambio.orden);
        porOrden.set(clave, [...(porOrden.get(clave) ?? []), cambio]);
    }
    return [...eventos]
        .sort((a, b) => Number(b.orden) - Number(a.orden))
        .map(evento => ({
            evento,
            cambios:(porOrden.get(String(evento.orden)) ?? [])
                .slice()
                .sort((a, b) => String(a.campo).localeCompare(String(b.campo))),
        }));
}

function resumenDeCambios(cambios:Fila[]):string{
    if(cambios.length === 1 && cambios[0].campo === '*'){
        return String(cambios[0].valor_nuevo ?? '').toLowerCase();
    }
    if(cambios.length === 0){
        return 'sin cambios de campos';
    }
    return cambios.length === 1 ? '1 campo' : `${cambios.length} campos`;
}

function valor(dato:unknown){
    const texto = formatearValor(dato);
    return texto === ''
        ? <Typography component="span" variant="body2" color="text.disabled">Vacío</Typography>
        : texto;
}

export function AuditoriaBien({ficha}:{ficha:string}){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const [eventos, setEventos] = React.useState<EventoConCambios[]>([]);
    const [cargando, setCargando] = React.useState(true);

    const cargar = React.useCallback(async () => {
        setCargando(true);
        try{
            const fixedFields:FixedFields = [{fieldName:'ficha', value:ficha}];
            const [cabeceras, detalle] = await Promise.all([
                conn.ajax.table_data({table:'historial_evento_bien', fixedFields, paramfun:{}}),
                conn.ajax.table_data({table:'historial_bienes', fixedFields, paramfun:{}}),
            ]);
            setEventos(agruparCambiosPorEvento(
                cabeceras as unknown as Fila[], detalle as unknown as Fila[]));
        }catch(err){
            mostrarError(err, `No se pudo leer la auditoría del bien ${ficha}`);
            setEventos([]);
        }finally{
            setCargando(false);
        }
    }, [conn, ficha, mostrarError]);

    React.useEffect(() => { void cargar(); }, [cargar]);

    return <Box>
        <Toolbar disableGutters sx={{display:'flex', justifyContent:'space-between'}}>
            <Typography variant="h6">Eventos</Typography>
            <Button startIcon={<Refresh/>} onClick={() => void cargar()} disabled={cargando}>
                Actualizar
            </Button>
        </Toolbar>
        {cargando
            ? <Box sx={{display:'flex', justifyContent:'center', p:4}}><CircularProgress/></Box>
            : eventos.length === 0
            ? <Alert severity="info">El bien no tiene eventos registrados.</Alert>
            : eventos.map(({evento, cambios}) => {
                const detallables = cambios.filter(cambio => cambio.campo !== '*');
                return <Accordion key={String(evento.orden)} disableGutters>
                    <AccordionSummary expandIcon={<ExpandMore/>}>
                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Chip size="small" label={String(evento.accion ?? '')}/>
                            <Typography variant="body2">{formatearValor(evento.fecha)}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {String(evento.usuario ?? '')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                · {resumenDeCambios(cambios)}
                            </Typography>
                            {evento.motivo
                                ? <Typography variant="body2" sx={{fontStyle:'italic'}}>
                                    {String(evento.motivo)}
                                </Typography>
                                : null}
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                        {detallables.length === 0
                            ? <Typography variant="body2" color="text.secondary">
                                No hay cambios de campos para mostrar en este evento.
                            </Typography>
                            : <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Campo</TableCell>
                                        <TableCell>Valor anterior</TableCell>
                                        <TableCell>Valor nuevo</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {detallables.map(cambio => <TableRow key={String(cambio.campo)}>
                                        <TableCell>{String(cambio.campo)}</TableCell>
                                        <TableCell sx={{wordBreak:'break-word'}}>{valor(cambio.valor_anterior)}</TableCell>
                                        <TableCell sx={{wordBreak:'break-word'}}>{valor(cambio.valor_nuevo)}</TableCell>
                                    </TableRow>)}
                                </TableBody>
                            </Table>}
                    </AccordionDetails>
                </Accordion>;
            })}
    </Box>;
}
