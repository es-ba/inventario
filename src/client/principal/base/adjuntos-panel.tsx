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
    Toolbar,
    Typography,
} from '@mui/material';
import {Delete, Download, UploadFile} from '@mui/icons-material';
import type {FixedFields} from 'frontend-plus';

import {useAvisos, useConexion, usePermisos} from './contexto-base';
import {formatearValor} from './formato-valores';
import type {Fila} from './tipos-tabla';


export type AdjuntosPanelProps = {
    tabla:string,
    campoClave:string,
    valorClave:string,
    campoNumero:string,
    endpointDescarga:string,
    subir:(archivo:File) => Promise<{message:string}>,
    soloLectura?:boolean,
};

function nombreDeArchivo(ruta:unknown):string{
    const texto = ruta == null ? '' : String(ruta);
    const partes = texto.split('/');
    return partes[partes.length - 1] || texto;
}

export function AdjuntosPanel({
    tabla,
    campoClave,
    valorClave,
    campoNumero,
    endpointDescarga,
    subir,
    soloLectura: soloLecturaPedida = false,
}:AdjuntosPanelProps){
    const conn = useConexion();
    const {mostrarError, mostrarMensaje} = useAvisos();
    const permisos = usePermisos();
    const soloLectura = soloLecturaPedida || !permisos.guardar;
    const [filas, setFilas] = React.useState<Fila[]>([]);
    const [cargando, setCargando] = React.useState(true);
    const [subiendo, setSubiendo] = React.useState(false);
    const inputArchivo = React.useRef<HTMLInputElement|null>(null);

    const camposFijos = React.useMemo<FixedFields>(
        () => [{fieldName:campoClave, value:valorClave}],
        [campoClave, valorClave],
    );

    const cargar = React.useCallback(async () => {
        setCargando(true);
        try{
            const datos = await conn.ajax.table_data({
                table:tabla,
                fixedFields:camposFijos,
                paramfun:{},
            }) as unknown as Fila[];
            setFilas(datos);
        }catch(err){
            mostrarError(err, `No se pudieron cargar los adjuntos`);
            setFilas([]);
        }finally{
            setCargando(false);
        }
    }, [camposFijos, conn, mostrarError, tabla]);

    React.useEffect(() => { void cargar(); }, [cargar]);

    const subirArchivo = React.useCallback(async (archivo:File) => {
        setSubiendo(true);
        try{
            const resultado = await subir(archivo);
            mostrarMensaje(resultado.message);
            await cargar();
        }catch(err){
            mostrarError(err, 'No se pudo subir el archivo');
        }finally{
            setSubiendo(false);
            if(inputArchivo.current){
                inputArchivo.current.value = '';
            }
        }
    }, [cargar, mostrarError, mostrarMensaje, subir]);

    const borrar = React.useCallback(async (fila:Fila) => {
        if(!window.confirm(`¿Eliminar el adjunto ${nombreDeArchivo(fila.archivo)}?`)){
            return;
        }
        try{
            await conn.ajax.table_record_delete({
                table:tabla,
                primaryKeyValues:[fila[campoClave], fila[campoNumero]],
            });
            await cargar();
        }catch(err){
            mostrarError(err, 'No se pudo eliminar el adjunto');
        }
    }, [campoClave, campoNumero, cargar, conn, mostrarError, tabla]);

    const urlDescarga = (fila:Fila) => endpointDescarga
        + `?${campoClave}=${encodeURIComponent(String(fila[campoClave]))}`
        + `&${campoNumero}=${encodeURIComponent(String(fila[campoNumero]))}`;

    return <Box>
        {soloLectura ? null : <Toolbar disableGutters sx={{display:'flex', gap:2}}>
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
                        void subirArchivo(archivo);
                    }
                }}
            />
        </Toolbar>}

        {cargando
            ? <Box sx={{display:'flex', justifyContent:'center', p:4}}><CircularProgress/></Box>
            : filas.length === 0
                ? <Typography variant="body2" color="text.secondary" sx={{p:2}}>
                    No hay archivos adjuntos.
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
                        {filas.map(fila => <TableRow key={String(fila[campoNumero])}>
                            <TableCell>{String(fila[campoNumero] ?? '')}</TableCell>
                            <TableCell>{nombreDeArchivo(fila.archivo)}</TableCell>
                            <TableCell>{formatearValor(fila.detalle)}</TableCell>
                            <TableCell>{formatearValor(fila.usuario)}</TableCell>
                            <TableCell>{formatearValor(fila.timestamp)}</TableCell>
                            <TableCell align="right">
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                    <Link
                                        href={urlDescarga(fila)}
                                        download={nombreDeArchivo(fila.archivo)}
                                        title="descargar"
                                    >
                                        <IconButton size="small"><Download/></IconButton>
                                    </Link>
                                    {soloLectura ? null : <IconButton
                                        size="small"
                                        color="error"
                                        title="eliminar"
                                        onClick={() => void borrar(fila)}
                                    >
                                        <Delete/>
                                    </IconButton>}
                                </Stack>
                            </TableCell>
                        </TableRow>)}
                    </TableBody>
                </Table>
        }
    </Box>;
}
