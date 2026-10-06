import * as React from 'react';
import {Alert, Box, Button, CircularProgress, Stack, TextField, Typography} from '@mui/material';

import {useConexion} from '../base/contexto-base';
import type {Fila} from '../base/tipos-tabla';
import {leerTabla} from '../base/referencias';
import {irA} from '../render-connected-app-inventario';
import {SeccionesDeBien, useDescripcionDeEstado} from '../bien/vista-rapida-bien';
import {seccionesDeVistaRapida} from '../bien/vista-rapida-datos';
import {fichaDesdeCodigoLeido} from '../../../common/codigos-barra';
import {LectorDeCamara, MotivoSinCamara} from './lector-de-camara';

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

export function EscanearBien(){
    const conn = useConexion();
    const descripcionDeEstado = useDescripcionDeEstado();
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
            const [bien] = await leerTabla(conn, 'bienes', [{fieldName:'ficha', value:ficha}]);
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

    const otro = <Button variant="outlined" onClick={() => setEstado({nombre:'leyendo'})}>
        {motivo == null ? 'Escanear otro' : 'Buscar otro'}
    </Button>;

    return <Box sx={{p:2, maxWidth:640, mx:'auto'}}>
        <Stack spacing={2}>
            {motivo != null ? <Alert severity="warning">{TEXTO_POR_MOTIVO[motivo]}</Alert> : null}

            {estado.nombre === 'leyendo' && motivo == null
                ? <>
                    <LectorDeCamara onLeido={alLeer} onSinCamara={setMotivo}/>
                    <Typography variant="body2" color="text.secondary">
                        Apuntá la cámara al código de barras de la etiqueta.
                    </Typography>
                </>
                : null}

            {estado.nombre === 'buscando'
                ? <Box sx={{display:'flex', justifyContent:'center', p:4}}><CircularProgress/></Box>
                : null}

            {estado.nombre === 'aviso'
                ? <>
                    <Alert severity="info">{estado.texto}</Alert>
                    <Box>{otro}</Box>
                </>
                : null}

            {estado.nombre === 'bien'
                ? <>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="contained"
                            onClick={() => irA(`w=principal&ficha=${encodeURIComponent(String(estado.bien.ficha))}`)}
                        >
                            Abrir ficha
                        </Button>
                        {otro}
                    </Stack>
                    <Box><SeccionesDeBien secciones={seccionesDeVistaRapida(estado.bien, descripcionDeEstado)}/></Box>
                </>
                : null}

            <Stack direction="row" spacing={1}>
                <TextField
                    size="small"
                    label="Ficha"
                    value={manual}
                    onChange={evento => setManual(evento.target.value)}
                    onKeyDown={evento => {
                        if(evento.key === 'Enter'){
                            evento.preventDefault();
                            buscarManual();
                        }
                    }}
                    inputProps={{inputMode:'numeric'}}
                    sx={{flex:1}}
                />
                <Button variant="outlined" onClick={buscarManual} disabled={manual.trim() === ''}>Buscar</Button>
            </Stack>
        </Stack>
    </Box>;
}
