import * as React from 'react';
import {Alert, Box, Button, Chip, CircularProgress, Divider, Stack, TextField, Typography} from '@mui/material';

import {useConexion} from '../base/contexto-base';
import type {Fila} from '../base/tipos-tabla';
import {irA} from '../render-connected-app-inventario';
import {useDescripcionDeEstado} from '../bien/vista-rapida-bien';
import {colorDeEstado} from '../bien/presentacion-bien';
import {FotoDelBien} from '../bien/foto-del-bien';
import {fichaDesdeCodigoLeido} from '../../../common/codigos-barra';
import {LectorDeCamara, MotivoSinCamara} from './lector-de-camara';
import {consultaPorFicha, seccionesDeEscaneo} from './escaneo-datos';

const TEXTO_POR_MOTIVO:Record<MotivoSinCamara, string> = {
    insegura:'La cámara necesita una conexión segura (https). Escribí la ficha.',
    sin_lector:'Este navegador no puede leer códigos con la cámara. Escribí la ficha.',
    sin_camara:'No se pudo abrir una cámara en este dispositivo. Escribí la ficha.',
    sin_permiso:'No hay permiso para usar la cámara. Habilitalo en el navegador o escribí la ficha.',
};

type Estado =
    | {nombre:'leyendo'}
    | {nombre:'buscando', ficha:string}
    | {nombre:'bien', bien:Fila}
    | {nombre:'aviso', texto:string};

function BienLeido({bien}:{bien:Fila}){
    const descripcionDeEstado = useDescripcionDeEstado();
    const estado = String(bien.estado ?? '').trim();
    const detalle = String(bien.detalle ?? '').trim();
    return <Box>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography variant="h5" component="h2" sx={{fontWeight:600}}>Ficha {String(bien.ficha)}</Typography>
            {estado ? <Chip size="small" color={colorDeEstado(estado)} label={descripcionDeEstado(estado) ?? estado}/> : null}
        </Stack>
        {detalle ? <Typography sx={{mt:0.5, mb:2, wordBreak:'break-word'}}>{detalle}</Typography> : null}
        <Box sx={{mb:2}}>
            <FotoDelBien ficha={String(bien.ficha)} numero={bien.foto} puedeSacar lado={120}/>
        </Box>
        {seccionesDeEscaneo(bien).map(seccion => <Box key={seccion.titulo} sx={{mb:2}}>
            <Typography variant="subtitle2" color="primary" sx={{mb:0.5}}>{seccion.titulo}</Typography>
            <Divider sx={{mb:1}}/>
            <Box component="dl" sx={{
                m:0,
                display:'grid',
                gridTemplateColumns:{xs:'repeat(2, minmax(0, 1fr))', sm:'repeat(3, minmax(0, 1fr))'},
                columnGap:2,
                rowGap:1,
            }}>
                {seccion.datos.map(dato => <Box key={dato.etiqueta} sx={{minWidth:0, gridColumn:dato.ancho ? '1 / -1' : 'auto'}}>
                    <Typography component="dt" variant="caption" color="text.secondary" display="block">{dato.etiqueta}</Typography>
                    <Typography component="dd" variant="body2" sx={{m:0, wordBreak:'break-word'}}>{dato.valor}</Typography>
                </Box>)}
            </Box>
        </Box>)}
    </Box>;
}

export function EscanearBien(){
    const conn = useConexion();
    const [estado, setEstado] = React.useState<Estado>({nombre:'leyendo'});
    const [motivo, setMotivo] = React.useState<MotivoSinCamara|null>(null);
    const [manual, setManual] = React.useState('');
    const enCurso = React.useRef(false);

    const buscar = React.useCallback(async (ficha:string) => {
        if(enCurso.current){
            return;
        }
        enCurso.current = true;
        setEstado({nombre:'buscando', ficha});
        try{
            const respuesta = await conn.ajax.bienes_buscar_avanzado({consulta:JSON.stringify(consultaPorFicha(ficha))});
            const bien = respuesta.rows?.[0];
            setEstado(bien ? {nombre:'bien', bien} : {nombre:'aviso', texto:`No encontré la ficha ${ficha}.`});
        }catch(err){
            setEstado({nombre:'aviso', texto:`No se pudo buscar la ficha ${ficha}: ${err instanceof Error ? err.message : String(err)}`});
        }finally{
            enCurso.current = false;
        }
    }, [conn]);

    const alLeer = React.useCallback((texto:string) => {
        const ficha = fichaDesdeCodigoLeido(texto);
        if(ficha != null){
            navigator.vibrate?.(100);
            void buscar(ficha);
        }
    }, [buscar]);

    const buscarManual = () => {
        const texto = manual.trim();
        if(texto){
            setManual('');
            void buscar(fichaDesdeCodigoLeido(texto) ?? texto);
        }
    };

    const leyendo = estado.nombre === 'leyendo';
    const otro = <Button variant="outlined" size="large" fullWidth onClick={() => setEstado({nombre:'leyendo'})}>
        {motivo == null ? 'Escanear otro' : 'Buscar otro'}
    </Button>;

    return <Box sx={{p:{xs:1.5, sm:2}, maxWidth:640, mx:'auto'}}>
        <Stack spacing={2}>
            {motivo != null ? <Alert severity="warning">{TEXTO_POR_MOTIVO[motivo]}</Alert> : null}

            {leyendo && motivo == null
                ? <>
                    <LectorDeCamara onLeido={alLeer} onSinCamara={setMotivo}/>
                    <Typography variant="body2" color="text.secondary" align="center">
                        Apuntá la cámara al código de barras de la etiqueta.
                    </Typography>
                </>
                : null}

            {leyendo
                ? <Stack direction="row" spacing={1}>
                    <TextField
                        label="Ficha"
                        value={manual}
                        onChange={evento => setManual(evento.target.value)}
                        onKeyDown={evento => {
                            if(evento.key === 'Enter'){
                                evento.preventDefault();
                                buscarManual();
                            }
                        }}
                        inputProps={{inputMode:'numeric', enterKeyHint:'search'}}
                        fullWidth
                    />
                    <Button variant="contained" size="large" onClick={buscarManual} disabled={manual.trim() === ''}>
                        Buscar
                    </Button>
                </Stack>
                : null}

            {estado.nombre === 'buscando'
                ? <Box sx={{display:'flex', justifyContent:'center', p:4}}><CircularProgress/></Box>
                : null}

            {estado.nombre === 'aviso'
                ? <>
                    <Alert severity="info">{estado.texto}</Alert>
                    {otro}
                </>
                : null}

            {estado.nombre === 'bien'
                ? <>
                    <BienLeido bien={estado.bien}/>
                    <Stack direction="row" spacing={1} sx={{
                        position:'sticky',
                        bottom:0,
                        zIndex:1,
                        py:1,
                        bgcolor:'background.paper',
                        borderTop:1,
                        borderColor:'divider',
                    }}>
                        {otro}
                        <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            onClick={() => irA(`w=principal&ficha=${encodeURIComponent(String(estado.bien.ficha))}`)}
                        >
                            Abrir ficha
                        </Button>
                    </Stack>
                </>
                : null}
        </Stack>
    </Box>;
}
