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
import {leerTabla} from '../base/referencias';
import {
    EntradaDeHistorial,
    TIPOS_DE_ENTRADA,
    TipoDeEntrada,
    agruparCambiosPorEvento,
    armarHistorial,
} from './historial-datos';

const COLOR_POR_TIPO:Record<TipoDeEntrada, 'default'|'primary'|'secondary'> = {
    cambio:'default',
    movimiento:'primary',
    control:'secondary',
};

function valor(dato:unknown){
    const texto = formatearValor(dato);
    return texto === ''
        ? <Typography component="span" variant="body2" color="text.disabled">Vacío</Typography>
        : texto;
}

function DetalleDeEntrada({entrada}:{entrada:EntradaDeHistorial}){
    return <Stack spacing={1}>
        {entrada.detalle.map((linea, i) => <Typography key={i} variant="body2">{linea}</Typography>)}
        {entrada.cambios.length
            ? <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Campo</TableCell>
                        <TableCell>Valor anterior</TableCell>
                        <TableCell>Valor nuevo</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {entrada.cambios.map(cambio => <TableRow key={String(cambio.campo)}>
                        <TableCell>{String(cambio.campo)}</TableCell>
                        <TableCell sx={{wordBreak:'break-word'}}>{valor(cambio.valor_anterior)}</TableCell>
                        <TableCell sx={{wordBreak:'break-word'}}>{valor(cambio.valor_nuevo)}</TableCell>
                    </TableRow>)}
                </TableBody>
            </Table>
            : null}
        {entrada.detalle.length === 0 && entrada.cambios.length === 0
            ? <Typography variant="body2" color="text.secondary">Sin más detalle.</Typography>
            : null}
    </Stack>;
}

export function HistorialBien({ficha}:{ficha:string}){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const [entradas, setEntradas] = React.useState<EntradaDeHistorial[]>([]);
    const [cargando, setCargando] = React.useState(true);
    const [tipos, setTipos] = React.useState<Set<TipoDeEntrada>>(() => new Set(TIPOS_DE_ENTRADA.map(t => t.tipo)));

    const cargar = React.useCallback(async () => {
        setCargando(true);
        try{
            const porFicha:FixedFields = [{fieldName:'ficha', value:ficha}];
            const [eventos, cambios, movimientos, controles, items] = await Promise.all([
                leerTabla(conn, 'historial_evento_bien', porFicha),
                leerTabla(conn, 'historial_bienes', porFicha),
                leerTabla(conn, 'movimientos_bien', porFicha),
                leerTabla(conn, 'controles_bien', porFicha),
                leerTabla(conn, 'items_control', []),
            ]);
            const controlesConItems = await Promise.all(controles.map(async control => ({
                ...control,
                items:await leerTabla(conn, 'controles_bien_items', [{fieldName:'control', value:control.control}]),
            })));
            const descripciones = new Map(items.map(i => [String(i.item), String(i.descripcion ?? i.item)]));
            setEntradas(armarHistorial({
                eventos:agruparCambiosPorEvento(eventos, cambios),
                movimientos,
                controles:controlesConItems,
                descripcionDeItem:item => descripciones.get(item) ?? item,
            }));
        }catch(err){
            mostrarError(err, `No se pudo leer el historial del bien ${ficha}`);
            setEntradas([]);
        }finally{
            setCargando(false);
        }
    }, [conn, ficha, mostrarError]);

    React.useEffect(() => { void cargar(); }, [cargar]);

    const cuenta = (tipo:TipoDeEntrada) => entradas.filter(e => e.tipo === tipo).length;
    const visibles = entradas.filter(e => tipos.has(e.tipo));
    const alternar = (tipo:TipoDeEntrada) => setTipos(anteriores => {
        const nuevos = new Set(anteriores);
        if(nuevos.has(tipo)){ nuevos.delete(tipo); }else{ nuevos.add(tipo); }
        return nuevos;
    });

    return <Box>
        <Toolbar disableGutters sx={{display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:1}}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {TIPOS_DE_ENTRADA.map(({tipo, etiqueta}) => <Chip
                    key={tipo}
                    label={`${etiqueta}: ${cuenta(tipo)}`}
                    color={COLOR_POR_TIPO[tipo]}
                    variant={tipos.has(tipo) ? 'filled' : 'outlined'}
                    onClick={() => alternar(tipo)}
                />)}
            </Stack>
            <Button startIcon={<Refresh/>} onClick={() => void cargar()} disabled={cargando}>
                Actualizar
            </Button>
        </Toolbar>
        {cargando
            ? <Box sx={{display:'flex', justifyContent:'center', p:4}}><CircularProgress/></Box>
            : visibles.length === 0
            ? <Alert severity="info">El bien no tiene historial para mostrar.</Alert>
            : visibles.map(entrada => <Accordion key={entrada.clave} disableGutters>
                <AccordionSummary expandIcon={<ExpandMore/>}>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Chip size="small" color={COLOR_POR_TIPO[entrada.tipo]} label={entrada.titulo}/>
                        <Typography variant="body2">{formatearValor(entrada.fecha)}</Typography>
                        <Typography variant="body2" color="text.secondary">{entrada.usuario}</Typography>
                        {entrada.detalle[0]
                            ? <Typography variant="body2" color="text.secondary" noWrap sx={{maxWidth:420}}>
                                · {entrada.detalle[0]}
                            </Typography>
                            : null}
                    </Stack>
                </AccordionSummary>
                <AccordionDetails>
                    <DetalleDeEntrada entrada={entrada}/>
                </AccordionDetails>
            </Accordion>)}
    </Box>;
}
