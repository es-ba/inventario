import * as React from 'react';
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    Link,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Toolbar,
    Typography,
} from '@mui/material';
import {Delete, Download, UploadFile} from '@mui/icons-material';
import type {FixedFields} from 'frontend-plus';

import {useAvisos, useConexion} from '../base/contexto-base';
import type {Fila} from '../base/tipos-tabla';

/*
    Adjuntos de un bien.

    No usa DetailTable porque subir un archivo no es guardar una fila: va por el procedure
    archivo_subir con multipart, y la descarga es un GET al endpoint /download/adjunto_bien.
    El borrado sí es un table_record_save; el archivo físico lo elimina el cron de las 23:58
    a través de la tabla archivos_borrar.
*/

declare module 'frontend-plus' {
    interface BEAPI {
        archivo_subir:(params:{ficha:string, files:File[]}) => Promise<{
            message:string,
            nombre:string,
            row:Fila,
        }>;
    }
}

function nombreDeArchivo(ruta:unknown):string{
    const texto = ruta == null ? '' : String(ruta);
    const partes = texto.split('/');
    return partes[partes.length - 1] || texto;
}

function momento(valor:unknown):string{
    if(valor == null || valor === ''){
        return '';
    }
    const fecha = valor instanceof Date ? valor : new Date(String(valor));
    return Number.isNaN(fecha.getTime()) ? String(valor) : fecha.toLocaleString('es-AR');
}

export function AdjuntosBien({ficha}:{ficha:string}){
    const conn = useConexion();
    const {mostrarError, mostrarMensaje} = useAvisos();
    const [filas, setFilas] = React.useState<Fila[]>([]);
    const [cargando, setCargando] = React.useState(true);
    const [subiendo, setSubiendo] = React.useState(false);
    const [detalle, setDetalle] = React.useState('');
    const inputArchivo = React.useRef<HTMLInputElement|null>(null);

    const camposFijos = React.useMemo<FixedFields>(
        () => [{fieldName:'ficha', value:ficha}],
        [ficha],
    );

    const cargar = React.useCallback(async () => {
        setCargando(true);
        try{
            const datos = await conn.ajax.table_data({
                table:'adjuntos_bienes',
                fixedFields:camposFijos,
                paramfun:{},
            }) as unknown as Fila[];
            setFilas(datos);
        }catch(err){
            mostrarError(err, 'No se pudieron cargar los adjuntos');
            setFilas([]);
        }finally{
            setCargando(false);
        }
    }, [camposFijos, conn, mostrarError]);

    React.useEffect(() => { void cargar(); }, [cargar]);

    const subir = React.useCallback(async (archivo:File) => {
        setSubiendo(true);
        try{
            const resultado = await conn.ajax.archivo_subir({ficha, files:[archivo]});
            mostrarMensaje(resultado.message);
            setDetalle('');
            await cargar();
        }catch(err){
            mostrarError(err, 'No se pudo subir el archivo');
        }finally{
            setSubiendo(false);
            if(inputArchivo.current){
                inputArchivo.current.value = '';
            }
        }
    }, [cargar, conn, ficha, mostrarError, mostrarMensaje]);

    const borrar = React.useCallback(async (fila:Fila) => {
        if(!window.confirm(`¿Eliminar el adjunto ${nombreDeArchivo(fila.archivo)}?`)){
            return;
        }
        try{
            await conn.ajax.table_record_save({
                table:'adjuntos_bienes',
                primaryKeyValues:[fila.ficha, fila.numero_adjunto],
                newRow:null as never,
                oldRow:fila as never,
                status:'delete' as never,
            });
            await cargar();
        }catch(err){
            mostrarError(err, 'No se pudo eliminar el adjunto');
        }
    }, [cargar, conn, mostrarError]);

    return <Box>
        <Toolbar disableGutters sx={{display:'flex', gap:2, flexWrap:'wrap'}}>
            <TextField
                size="small"
                label="detalle del archivo"
                value={detalle}
                onChange={evento => setDetalle(evento.target.value)}
                sx={{minWidth:240}}
                helperText="opcional, se puede completar después en la grilla"
            />
            <Button
                variant="contained"
                startIcon={subiendo ? <CircularProgress size={16}/> : <UploadFile/>}
                disabled={subiendo}
                onClick={() => inputArchivo.current?.click()}
            >
                subir archivo
            </Button>
            <input
                ref={inputArchivo}
                type="file"
                hidden
                onChange={evento => {
                    const archivo = evento.target.files?.[0];
                    if(archivo){
                        void subir(archivo);
                    }
                }}
            />
        </Toolbar>

        {cargando
            ? <Box sx={{display:'flex', justifyContent:'center', p:4}}><CircularProgress/></Box>
            : filas.length === 0
                ? <Typography variant="body2" color="text.secondary" sx={{p:2}}>
                    El bien no tiene archivos adjuntos.
                </Typography>
                : <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>n°</TableCell>
                            <TableCell>archivo</TableCell>
                            <TableCell>detalle</TableCell>
                            <TableCell>usuario</TableCell>
                            <TableCell>fecha</TableCell>
                            <TableCell align="right">acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filas.map(fila => <TableRow key={String(fila.numero_adjunto)}>
                            <TableCell>{String(fila.numero_adjunto ?? '')}</TableCell>
                            <TableCell>{nombreDeArchivo(fila.archivo)}</TableCell>
                            <TableCell>{String(fila.detalle ?? '')}</TableCell>
                            <TableCell>{String(fila.usuario ?? '')}</TableCell>
                            <TableCell>{momento(fila.timestamp)}</TableCell>
                            <TableCell align="right">
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                    <Link
                                        href={'download/adjunto_bien'
                                            + `?ficha=${encodeURIComponent(String(fila.ficha))}`
                                            + `&numero_adjunto=${encodeURIComponent(String(fila.numero_adjunto))}`}
                                        download={nombreDeArchivo(fila.archivo)}
                                        title="descargar"
                                    >
                                        <IconButton size="small"><Download/></IconButton>
                                    </Link>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        title="eliminar"
                                        onClick={() => void borrar(fila)}
                                    >
                                        <Delete/>
                                    </IconButton>
                                </Stack>
                            </TableCell>
                        </TableRow>)}
                    </TableBody>
                </Table>
        }
    </Box>;
}
