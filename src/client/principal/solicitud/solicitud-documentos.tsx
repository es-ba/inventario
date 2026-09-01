import * as React from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Link,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import {Delete, Description, Download, UploadFile} from '@mui/icons-material';
import type {FieldDefinition, FixedFields} from 'frontend-plus';

import {useAvisos, useConexion, usePermisos} from '../base/contexto-base';
import {FormFieldRenderer} from '../base/form-field-renderer';
import {formatearValor} from '../base/formato-valores';
import type {Fila} from '../base/tipos-tabla';


type TipoDocumento = 'comodato' | 'acta';

const ETIQUETA:Record<TipoDocumento, string> = {
    comodato:'Comodato',
    acta:'Acta de entrega y devolución',
};

declare module 'frontend-plus' {
    interface BEAPI {
        solicitud_documento_emitir:(params:{
            acta:string,
            tipo:string,
            representante:string,
            caracter_representante:string,
            entrega_representa:string,
            recibe_representa:string,
            operacion:string,
        }) => Promise<{message:string, version:number, codigo_contenido:string}>;
        solicitud_documento_firmado_subir:(params:{
            acta:string,
            tipo:string,
            version:number,
            files:File[],
        }) => Promise<{message:string}>;
    }
}

const CAMPO_REPRESENTANTE = {
    name:'representante',
    typeName:'text',
    title:'representante del IDECBA',
    references:'responsables',
    referencesFields:[{source:'representante', target:'responsable'}],
} as unknown as FieldDefinition;

const CAMPO_CARACTER = {
    name:'caracter_representante',
    typeName:'text',
    title:'en su carácter de',
    references:'jerarquias',
    referencesFields:[{source:'caracter_representante', target:'jerarquia'}],
} as unknown as FieldDefinition;

const OPERACIONES = [
    {valor:'entrega', etiqueta:'entrega'},
    {valor:'devolucion', etiqueta:'devolución'},
];

const DATOS_VACIOS = {
    representante:'',
    caracter_representante:'',
    entrega_representa:'',
    recibe_representa:'',
    operacion:'entrega',
};

export function SolicitudDocumentos({acta}:{acta:string}){
    const conn = useConexion();
    const {mostrarError, mostrarMensaje} = useAvisos();
    const permisos = usePermisos();
    const [filas, setFilas] = React.useState<Fila[]>([]);
    const [cargando, setCargando] = React.useState(true);
    const [emitiendo, setEmitiendo] = React.useState<TipoDocumento|null>(null);
    const [datos, setDatos] = React.useState(DATOS_VACIOS);
    const [subiendoEn, setSubiendoEn] = React.useState<string|null>(null);
    const inputArchivo = React.useRef<HTMLInputElement|null>(null);
    const destino = React.useRef<Fila|null>(null);

    const camposFijos = React.useMemo<FixedFields>(
        () => [{fieldName:'acta', value:acta}],
        [acta],
    );

    const cargar = React.useCallback(async () => {
        setCargando(true);
        try{
            const datosTabla = await conn.ajax.table_data({
                table:'solicitudes_documentos',
                fixedFields:camposFijos,
                paramfun:{},
            }) as unknown as Fila[];
            setFilas(datosTabla);
        }catch(err){
            mostrarError(err, 'No se pudieron cargar los documentos');
            setFilas([]);
        }finally{
            setCargando(false);
        }
    }, [camposFijos, conn, mostrarError]);

    React.useEffect(() => { void cargar(); }, [cargar]);

    const ponerDato = React.useCallback(
        (nombre:string, valor:unknown) =>
            setDatos(d => ({...d, [nombre]:valor == null ? '' : String(valor)})),
        [],
    );

    const emitir = React.useCallback(async () => {
        if(emitiendo == null){
            return;
        }
        try{
            const resultado = await conn.ajax.solicitud_documento_emitir({
                acta, tipo:emitiendo, ...datos,
            });
            mostrarMensaje(resultado.message);
            setEmitiendo(null);
            setDatos(DATOS_VACIOS);
            await cargar();
        }catch(err){
            mostrarError(err, 'No se pudo emitir el documento');
        }
    }, [acta, cargar, conn, datos, emitiendo, mostrarError, mostrarMensaje]);

    const subir = React.useCallback(async (archivo:File) => {
        const fila = destino.current;
        if(!fila){
            return;
        }
        const clave = `${fila.tipo}-${fila.version}`;
        setSubiendoEn(clave);
        try{
            const resultado = await conn.ajax.solicitud_documento_firmado_subir({
                acta,
                tipo:String(fila.tipo),
                version:Number(fila.version),
                files:[archivo],
            });
            mostrarMensaje(resultado.message);
            await cargar();
        }catch(err){
            mostrarError(err, 'No se pudo cargar el documento firmado');
        }finally{
            setSubiendoEn(null);
            destino.current = null;
            if(inputArchivo.current){
                inputArchivo.current.value = '';
            }
        }
    }, [acta, cargar, conn, mostrarError, mostrarMensaje]);

    const eliminar = React.useCallback(async (fila:Fila) => {
        const etiqueta = ETIQUETA[String(fila.tipo) as TipoDocumento] ?? String(fila.tipo);
        const aviso = fila.archivo_firmado != null
            ? `El ${etiqueta.toLowerCase()} versión ${fila.version} tiene cargado el archivo`
                + ' firmado. Si lo borrás se pierde también ese archivo. ¿Seguir?'
            : `¿Borrar el ${etiqueta.toLowerCase()} versión ${fila.version}?`;
        if(!window.confirm(aviso)){
            return;
        }
        try{
            await conn.ajax.table_record_delete({
                table:'solicitudes_documentos',
                primaryKeyValues:[acta, fila.tipo, fila.version],
            });
            mostrarMensaje(`Se borró el ${etiqueta.toLowerCase()} versión ${fila.version}.`);
            await cargar();
        }catch(err){
            mostrarError(err, 'No se pudo borrar el documento');
        }
    }, [acta, cargar, conn, mostrarError, mostrarMensaje]);

    const urlDescarga = (fila:Fila, firmado:boolean) =>
        'download/solicitud_documento'
        + `?acta=${encodeURIComponent(acta)}`
        + `&tipo=${encodeURIComponent(String(fila.tipo))}`
        + `&version=${encodeURIComponent(String(fila.version))}`
        + (firmado ? '&firmado=true' : '');

    return <Box>
        <Stack direction="row" spacing={2} sx={{mb:2}} flexWrap="wrap" useFlexGap>
            {!permisos.guardar ? null : (['comodato', 'acta'] as TipoDocumento[]).map(tipo => <Button
                key={tipo}
                variant="outlined"
                startIcon={<Description/>}
                onClick={() => setEmitiendo(tipo)}
            >
                emitir {ETIQUETA[tipo].toLowerCase()}
            </Button>)}
        </Stack>

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

        {cargando
            ? <Box sx={{display:'flex', justifyContent:'center', p:4}}><CircularProgress/></Box>
            : filas.length === 0
                ? <Typography variant="body2" color="text.secondary" sx={{p:2}}>
                    La solicitud todavía no tiene documentos emitidos.
                </Typography>
                : <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>documento</TableCell>
                            <TableCell>versión</TableCell>
                            <TableCell>código</TableCell>
                            <TableCell>emitido</TableCell>
                            <TableCell>firmado</TableCell>
                            <TableCell align="right">acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filas.map(fila => {
                            const clave = `${fila.tipo}-${fila.version}`;
                            const tieneFirmado = fila.archivo_firmado != null;
                            return <TableRow key={clave}>
                                <TableCell>{ETIQUETA[String(fila.tipo) as TipoDocumento] ?? String(fila.tipo)}</TableCell>
                                <TableCell>{String(fila.version ?? '')}</TableCell>
                                <TableCell>{formatearValor(fila.codigo_contenido)}</TableCell>
                                <TableCell>{formatearValor(fila.fecha)}</TableCell>
                                <TableCell>{tieneFirmado ? formatearValor(fila.fecha_firmado) : '—'}</TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        <Link href={urlDescarga(fila, false)} download title="descargar emitido">
                                            <IconButton size="small"><Download/></IconButton>
                                        </Link>
                                        {tieneFirmado
                                            ? <Link href={urlDescarga(fila, true)} download title="descargar firmado">
                                                <IconButton size="small" color="success"><Download/></IconButton>
                                            </Link>
                                            : null}
                                        <IconButton
                                            size="small"
                                            title={tieneFirmado ? 'reemplazar el firmado' : 'cargar el firmado'}
                                            disabled={subiendoEn === clave}
                                            onClick={() => {
                                                destino.current = fila;
                                                inputArchivo.current?.click();
                                            }}
                                        >
                                            {subiendoEn === clave
                                                ? <CircularProgress size={18}/>
                                                : <UploadFile/>}
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            title="borrar el documento"
                                            onClick={() => void eliminar(fila)}
                                        >
                                            <Delete/>
                                        </IconButton>
                                    </Stack>
                                </TableCell>
                            </TableRow>;
                        })}
                    </TableBody>
                </Table>
        }

        <Dialog open={emitiendo != null} onClose={() => setEmitiendo(null)} maxWidth="sm" fullWidth>
            <DialogTitle>Emitir {emitiendo ? ETIQUETA[emitiendo].toLowerCase() : ''}</DialogTitle>
            <DialogContent dividers>
                <Alert severity="info" sx={{mb:2}}>
                    Los bienes salen de la solicitud. Lo que no se complete acá queda como
                    línea de puntos para llenar a mano.
                </Alert>
                <Stack spacing={2}>
                    <FormFieldRenderer
                        field={CAMPO_REPRESENTANTE}
                        row={datos as unknown as Fila}
                        setField={ponerDato}
                        size="small"
                    />
                    <FormFieldRenderer
                        field={CAMPO_CARACTER}
                        row={datos as unknown as Fila}
                        setField={ponerDato}
                        size="small"
                    />
                    {emitiendo === 'acta' ? <>
                        <TextField
                            select
                            size="small"
                            label="el acta documenta una"
                            value={datos.operacion}
                            onChange={e => setDatos(d => ({...d, operacion:e.target.value}))}
                        >
                            {OPERACIONES.map(o =>
                                <MenuItem key={o.valor} value={o.valor}>{o.etiqueta}</MenuItem>
                            )}
                        </TextField>
                        <TextField
                            size="small"
                            label="entrega en representación de"
                            value={datos.entrega_representa}
                            onChange={e => setDatos(d => ({...d, entrega_representa:e.target.value}))}
                            helperText="si se deja vacío se usa el sector del representante"
                        />
                        <TextField
                            size="small"
                            label="recibe en representación de"
                            value={datos.recibe_representa}
                            onChange={e => setDatos(d => ({...d, recibe_representa:e.target.value}))}
                        />
                    </> : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setEmitiendo(null)}>cancelar</Button>
                <Button variant="contained" onClick={() => void emitir()}>emitir</Button>
            </DialogActions>
        </Dialog>
    </Box>;
}
