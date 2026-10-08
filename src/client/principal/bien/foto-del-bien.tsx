import * as React from 'react';
import {Box, Button, ButtonBase, CircularProgress, Dialog, Typography} from '@mui/material';
import {PhotoCamera} from '@mui/icons-material';

import {useAvisos, useConexion, usePermisos} from '../base/contexto-base';
import {NOMBRE_DE_FOTO, medidasDeFoto} from '../../../common/fotos';

async function achicarFoto(archivo:File):Promise<File>{
    const imagen = await createImageBitmap(archivo, {imageOrientation:'from-image'});
    try{
        const {ancho, alto} = medidasDeFoto(imagen.width, imagen.height);
        const lienzo = document.createElement('canvas');
        lienzo.width = ancho;
        lienzo.height = alto;
        const contexto = lienzo.getContext('2d')!;
        contexto.fillStyle = '#fff';
        contexto.fillRect(0, 0, ancho, alto);
        contexto.drawImage(imagen, 0, 0, ancho, alto);
        const blob = await new Promise<Blob|null>(resolver => lienzo.toBlob(resolver, 'image/jpeg', 0.8));
        if(blob == null){
            throw new Error('sin imagen');
        }
        return new File([blob], NOMBRE_DE_FOTO, {type:'image/jpeg'});
    }finally{
        imagen.close();
    }
}

export function FotoDelBien({
    ficha,
    numero,
    puedeSacar = false,
    lado = 96,
}:{
    ficha:string,
    numero:unknown,
    puedeSacar?:boolean,
    lado?:number,
}){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const permisos = usePermisos();
    const [subida, setSubida] = React.useState<{ficha:string, numero:number}|null>(null);
    const [rota, setRota] = React.useState<string|null>(null);
    const [grande, setGrande] = React.useState(false);
    const [subiendo, setSubiendo] = React.useState(false);
    const inputArchivo = React.useRef<HTMLInputElement|null>(null);

    const actual = subida?.ficha === ficha ? subida.numero : numero;
    const url = actual == null || actual === ''
        ? null
        : `download/adjunto_bien?ficha=${encodeURIComponent(ficha)}&numero_adjunto=${encodeURIComponent(String(actual))}`;
    const hayFoto = url != null && rota !== url;
    const sacar = puedeSacar && permisos.guardar && ficha !== '';

    const subir = async (archivo:File) => {
        setSubiendo(true);
        try{
            const foto = await achicarFoto(archivo).catch(() => {
                throw new Error('No pude leer la imagen. Probá con una foto en formato JPG o PNG.');
            });
            const {row} = await conn.ajax.archivo_subir({ficha, es_foto:true, files:[foto]});
            setSubida({ficha, numero:Number(row.numero_adjunto)});
        }catch(err){
            mostrarError(err, 'No se pudo guardar la foto');
        }finally{
            setSubiendo(false);
            if(inputArchivo.current){
                inputArchivo.current.value = '';
            }
        }
    };

    if(!hayFoto && !sacar){
        return null;
    }
    const descripcion = `Foto de la ficha ${ficha}`;

    const cuadro = {width:lado, height:lado, borderRadius:1, overflow:'hidden'};
    const elegir = () => inputArchivo.current?.click();

    return <Box sx={{display:'flex', flexDirection:'column', alignItems:'center', gap:0.5, flexShrink:0}}>
        {hayFoto
            ? <ButtonBase onClick={() => setGrande(true)} title="Ver la foto en grande" sx={cuadro}>
                <Box
                    component="img"
                    src={url}
                    alt={descripcion}
                    onError={() => setRota(url)}
                    sx={{display:'block', width:'100%', height:'100%', objectFit:'cover'}}
                />
            </ButtonBase>
            : <ButtonBase
                onClick={elegir}
                disabled={subiendo}
                sx={{
                    ...cuadro,
                    display:'flex',
                    flexDirection:'column',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:0.5,
                    border:'1px dashed',
                    borderColor:'text.disabled',
                    color:'text.secondary',
                    bgcolor:'action.hover',
                }}
            >
                {subiendo ? <CircularProgress size={20}/> : <PhotoCamera fontSize="small"/>}
                <Typography variant="caption" sx={{lineHeight:1.1, textAlign:'center'}}>Sacar foto</Typography>
            </ButtonBase>}
        {hayFoto && sacar
            ? <Button
                size="small"
                startIcon={subiendo ? <CircularProgress size={14}/> : <PhotoCamera/>}
                disabled={subiendo}
                onClick={elegir}
            >
                Cambiar foto
            </Button>
            : null}
        {sacar
            ? <input
                ref={inputArchivo}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={evento => {
                    const archivo = evento.target.files?.[0];
                    if(archivo){
                        void subir(archivo);
                    }
                }}
            />
            : null}
        <Dialog open={grande && hayFoto} onClose={() => setGrande(false)} maxWidth="lg">
            {hayFoto
                ? <Box
                    component="img"
                    src={url}
                    alt={descripcion}
                    onClick={() => setGrande(false)}
                    sx={{display:'block', maxWidth:'100%', maxHeight:'85vh'}}
                />
                : null}
        </Dialog>
    </Box>;
}
