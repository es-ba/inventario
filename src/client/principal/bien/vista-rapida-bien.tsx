import * as React from 'react';
import {Box, Button, Chip, Divider, Drawer, IconButton, Stack, Typography} from '@mui/material';
import {ChevronLeft, ChevronRight, Close, OpenInNew} from '@mui/icons-material';

import {useDatosReferencial} from '../base/cache-tablas';
import {seccionesDeVistaRapida, vecinos, SIN_DATO} from './vista-rapida-datos';

type Fila = Record<string, unknown>;

export const ANCHO_VISTA_RAPIDA = 420;

export function VistaRapidaBien({
    fila,
    filas,
    onCambiar,
    onCerrar,
    onAbrirFicha,
}:{
    fila:Fila|null,
    filas:readonly Fila[],
    onCambiar:(ficha:string) => void,
    onCerrar:() => void,
    onAbrirFicha:(ficha:string) => void,
}){
    const estados = useDatosReferencial('estados_bien');
    const descripcionDeEstado = React.useCallback(
        (estado:string) => {
            const encontrado = estados.filas.find(e => e.estado_bien === estado);
            return encontrado?.descripcion == null ? null : String(encontrado.descripcion);
        },
        [estados.filas],
    );
    const ficha = fila == null ? null : String(fila.ficha);
    const {anterior, siguiente} = vecinos(filas, ficha);
    const secciones = fila == null ? [] : seccionesDeVistaRapida(fila, descripcionDeEstado);
    const estado = fila == null ? '' : String(fila.estado ?? '');

    return <Drawer
        anchor="right"
        variant="persistent"
        open={fila != null}
        PaperProps={{sx:{width:ANCHO_VISTA_RAPIDA, maxWidth:'90vw', p:2, boxSizing:'border-box'}}}
    >
        {fila == null ? null : <Stack spacing={2} sx={{height:'100%'}}>
            <Stack direction="row" alignItems="flex-start" spacing={1}>
                <Box sx={{flex:1, minWidth:0}}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                        <Typography variant="h6" component="h2" sx={{fontWeight:600}}>
                            Ficha {ficha}
                        </Typography>
                        {estado
                            ? <Chip size="small" variant="outlined" label={descripcionDeEstado(estado) ?? estado}/>
                            : null}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        {String(fila.detalle ?? '').trim() || SIN_DATO}
                    </Typography>
                </Box>
                <IconButton aria-label="cerrar vista rápida" title="Cerrar" onClick={onCerrar}>
                    <Close/>
                </IconButton>
            </Stack>

            <Box sx={{flex:1, overflowY:'auto'}}>
                {secciones.map(seccion => <Box key={seccion.titulo} sx={{mb:2}}>
                    <Typography variant="subtitle2" color="primary" sx={{mb:0.5}}>{seccion.titulo}</Typography>
                    <Divider sx={{mb:1}}/>
                    <Box component="dl" sx={{m:0, display:'grid', gridTemplateColumns:'max-content 1fr', columnGap:2, rowGap:0.5}}>
                        {seccion.datos.map(dato => <React.Fragment key={dato.etiqueta}>
                            <Typography component="dt" variant="body2" color="text.secondary">{dato.etiqueta}</Typography>
                            <Typography component="dd" variant="body2" sx={{m:0, wordBreak:'break-word',
                                color:dato.valor === SIN_DATO ? 'text.disabled' : 'text.primary'}}>
                                {dato.valor}
                            </Typography>
                        </React.Fragment>)}
                    </Box>
                </Box>)}
            </Box>

            <Stack direction="row" spacing={1} justifyContent="space-between">
                <Button startIcon={<ChevronLeft/>} disabled={anterior == null}
                    onClick={() => anterior && onCambiar(String(anterior.ficha))}>
                    Anterior
                </Button>
                <Button endIcon={<ChevronRight/>} disabled={siguiente == null}
                    onClick={() => siguiente && onCambiar(String(siguiente.ficha))}>
                    Siguiente
                </Button>
            </Stack>
            <Button variant="contained" startIcon={<OpenInNew/>} onClick={() => onAbrirFicha(ficha!)}>
                Abrir ficha completa
            </Button>
        </Stack>}
    </Drawer>;
}
