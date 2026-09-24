import * as React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Stack,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import {ArrowBack} from '@mui/icons-material';
import type {FixedFields} from 'frontend-plus';

import {useAvisos, useConexion, useSalida} from '../base/contexto-base';
import {useEstructuraTabla} from '../base/cache-tablas';
import {AdjuntosPanel} from '../base/adjuntos-panel';
import {FormFieldRenderer} from '../base/form-field-renderer';
import {TabPanel, propsDeSolapa} from '../base/tab-panel';
import {useDestinoDelSector} from '../base/destino-del-sector';
import {useRowEditor} from '../base/use-row-editor';
import type {Fila} from '../base/tipos-tabla';
import {SolicitudAcciones, accionesDe, etiquetaDeAccion} from './solicitud-acciones';
import {SolicitudBienes} from './solicitud-bienes';
import {SolicitudDocumentos} from './solicitud-documentos';


const ESTADO_EDITABLE = 'B';

const CAMPOS_CABECERA = [
    'acta', 'accion', 'tipo_asignacion', 'modalidad_uso',
    'sector', 'responsable', 'sede', 'espacio', 'puesto',
    'enusode_responsable', 'autorizado_por', 'firmado_por', 'detalle',
];

declare module 'frontend-plus' {
    interface BEAPI {
        archivo_solicitud_subir:(params:{acta:string, detalle:string, files:File[]}) => Promise<{
            message:string,
        }>;
    }
}

function colorDeEstado(estado:string):'default'|'info'|'warning'|'success'{
    if(estado === 'B'){ return 'default'; }
    if(estado === 'Pr'){ return 'success'; }
    if(estado === 'F' || estado === 'A'){ return 'info'; }
    return 'warning';
}

export function SolicitudFormulario({
    acta,
    onVolver,
    onIdentificada,
}:{
    acta?:string,
    onVolver:() => void,
    onIdentificada?:(acta:string) => void,
}){
    const solicitarSalida = useSalida();
    const conn = useConexion();
    const {mostrarError, mostrarMensaje} = useAvisos();
    const {definicion} = useEstructuraTabla('movimientos_solicitudes');
    const [filaInicial, setFilaInicial] = React.useState<Fila|undefined>(undefined);
    const [cargando, setCargando] = React.useState(Boolean(acta));
    const [noEncontrada, setNoEncontrada] = React.useState(false);
    const [solapa, setSolapa] = React.useState(0);
    const [version, setVersion] = React.useState(0);
    const [actaGuardada, setActaGuardada] = React.useState(acta);
    const [errorCarga, setErrorCarga] = React.useState(false);
    const [guardadaEnSesion, setGuardadaEnSesion] = React.useState(false);

    React.useEffect(() => {
        if(!actaGuardada){
            setFilaInicial(undefined);
            setCargando(false);
            return;
        }
        let cancelado = false;
        setCargando(true);
        setNoEncontrada(false);
        setErrorCarga(false);
        const camposFijos:FixedFields = [{fieldName:'acta', value:actaGuardada}];
        conn.ajax.table_data({
            table:'movimientos_solicitudes_acciones',
            fixedFields:camposFijos,
            paramfun:{},
        })
            .then(datos => {
                if(cancelado){
                    return;
                }
                const filas = datos as unknown as Fila[];
                if(filas.length === 0){
                    setNoEncontrada(true);
                }
                setFilaInicial(filas[0]);
            })
            .catch(err => { if(!cancelado){ setErrorCarga(true); mostrarError(err, `No se pudo leer la solicitud ${actaGuardada}`); } })
            .finally(() => { if(!cancelado){ setCargando(false); } });
        return () => { cancelado = true; };
    }, [conn, actaGuardada, mostrarError, version]);

    const definicionSegura = definicion ?? {fields:[], primaryKey:['acta']};
    const editor = useRowEditor({
        tabla:'movimientos_solicitudes',
        definicion:definicionSegura,
        filaInicial,
        onGuardado:fila => {
            const numero = String(fila.acta);
            setGuardadaEnSesion(true);
            setActaGuardada(numero);
            onIdentificada?.(numero);
            mostrarMensaje(`Se guardó la solicitud ${numero}.`);
            setVersion(v => v + 1);
        },
    });

    const {admitirPara, destinoAlCambiarSector} = useDestinoDelSector(editor.row.sector);
    const {row:filaEditada, setField} = editor;
    const asignarCampo = React.useCallback((nombre:string, valor:unknown) => {
        const cambiaSector = nombre === 'sector' && (filaEditada.sector ?? null) !== (valor ?? null);
        setField(nombre, valor);
        if(cambiaSector){
            const {espacio} = destinoAlCambiarSector(valor, filaEditada);
            setField('espacio', espacio || null);
        }
    }, [filaEditada, setField, destinoAlCambiarSector]);

    const actaActual = String(editor.row.acta ?? actaGuardada ?? '');
    const subirAdjunto = React.useCallback(
        (archivo:File) => conn.ajax.archivo_solicitud_subir({
            acta:actaActual,
            detalle:'',
            files:[archivo],
        }),
        [actaActual, conn],
    );

    if(cargando || definicion == null){
        return <Box sx={{display:'flex', justifyContent:'center', p:6}}><CircularProgress/></Box>;
    }
    if(noEncontrada){
        return <Box sx={{p:3}}>
            <Alert severity="warning" action={<Button onClick={onVolver}>Volver</Button>}>
                No se encontró la solicitud {acta}.
            </Alert>
        </Box>;
    }

    const retroceso = accionesDe(filaInicial?.acciones)
        .find(accion => accion.eaccion_direccion === 'retroceso');
    const hayComoRetroceder = retroceso != null;
    const nombreDeRetroceso = retroceso ? etiquetaDeAccion(retroceso) : '';

    const estado = String(editor.row.estado ?? '');
    const guardada = Boolean(actaActual) && !editor.esAlta;
    const editable = !guardada || estado === ESTADO_EDITABLE;

    return <Box sx={{height:'100%', overflow:'auto', p:2}}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{mb:2}}>
            <IconButton onClick={() => solicitarSalida(onVolver)} size="small" title="Volver al listado">
                <ArrowBack/>
            </IconButton>
            <Typography variant="h6" sx={{fontWeight:600}}>
                Solicitud {actaActual || 'nueva'}
            </Typography>
            {estado
                ? <Chip
                    size="small"
                    color={colorDeEstado(estado)}
                    label={String(filaInicial?.estados__desc_estado ?? estado)}
                />
                : null}
            <Box sx={{flex:1}}/>
            {guardada
                ? <SolicitudAcciones
                    acta={actaActual}
                    acciones={filaInicial?.acciones}
                    disabled={editor.modificado || editor.guardando || errorCarga}
                    onEjecutada={() => setVersion(v => v + 1)}
                />
                : null}
        </Stack>

        {errorCarga ? <Alert severity="error" sx={{mb:2}}
            action={<Button onClick={() => setVersion(v => v + 1)}>Reintentar</Button>}>
            {guardadaEnSesion ? 'La solicitud se guardó, pero no se pudo actualizar su información.' : 'No se pudo cargar la solicitud.'}
        </Alert> : null}
        {editor.modificado ? <Alert severity="info" sx={{mb:2}}
            action={<Button disabled={editor.guardando} onClick={editor.descartar}>Descartar cambios</Button>}>
            Cambios sin guardar. Guardá o descartá los cambios antes de ejecutar una acción o emitir documentos.
        </Alert> : null}

        {guardada && !editable
            ? <Alert severity="info" sx={{mb:2}}>
                {hayComoRetroceder
                    ? <>La solicitud salió de Borrador: su contenido ya no se edita. Para
                        cambiarla, usá el botón <b>{nombreDeRetroceso}</b> de arriba.</>
                    : <>Esta solicitud no puede reabrirse desde su estado actual. Consultá al administrador.</>}
            </Alert>
            : null}

        <Tabs
            value={solapa}
            onChange={(_evento, valor:number) => setSolapa(valor)}
            sx={{mb:2, borderBottom:1, borderColor:'divider'}}
        >
            <Tab label="Datos" {...propsDeSolapa(0)}/>
            <Tab label="Bienes" {...propsDeSolapa(1)}/>
            <Tab label="Documentos" {...propsDeSolapa(2)}/>
            <Tab label="Adjuntos" {...propsDeSolapa(3)}/>
        </Tabs>

        <TabPanel value={solapa} index={0} sinRelleno>
            <Box sx={{display:'grid', gridTemplateColumns:{xs:'1fr', md:'1fr 1fr'}, gap:2}}>
                {CAMPOS_CABECERA.map(nombre => {
                    const field = definicion.fields.find(f => f.name === nombre);
                    if(!field){
                        return null;
                    }
                    const esDetalle = nombre === 'detalle';
                    return <Box key={nombre} sx={esDetalle ? {gridColumn:{md:'span 2'}} : undefined}>
                        <FormFieldRenderer
                            field={nombre === 'acta' ? {...field, label:'N.º de solicitud'} : field}
                            row={editor.row}
                            setField={asignarCampo}
                            admitir={admitirPara(nombre)}
                            error={editor.errores[field.name]}
                            disabled={!editable || editor.guardando || errorCarga || (nombre === 'acta' && guardada)}
                            multiline={esDetalle}
                            minRows={2}
                        />
                    </Box>;
                })}
            </Box>
            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{mt:3}}>
                <Button disabled={editor.guardando} onClick={() => solicitarSalida(onVolver)}>Cancelar</Button>
                <Button
                    variant="contained"
                    disabled={!editable || !editor.puedeGuardar || errorCarga}
                    onClick={() => void editor.guardar()}
                >
                    Guardar
                </Button>
            </Stack>
        </TabPanel>

        <TabPanel value={solapa} index={1} sinRelleno>
            <Alert severity="info" sx={{mb:2}}>Agregar o quitar bienes se guarda inmediatamente. Descartar la cabecera no revierte estas operaciones.</Alert>
            {guardada
                ? <SolicitudBienes acta={actaActual} soloLectura={!editable}/>
                : <Alert severity="info">Guardá la solicitud para agregarle bienes.</Alert>}
        </TabPanel>

        <TabPanel value={solapa} index={2} sinRelleno>
            {guardada
                ? <SolicitudDocumentos acta={actaActual} disabled={editor.modificado || editor.guardando || errorCarga}/>
                : <Alert severity="info">Guardá la solicitud para emitir documentos.</Alert>}
        </TabPanel>

        <TabPanel value={solapa} index={3} sinRelleno>
            <Alert severity="info" sx={{mb:2}}>Los adjuntos se guardan inmediatamente. Descartar la cabecera no elimina los archivos subidos.</Alert>
            {guardada
                ? <AdjuntosPanel
                    tabla="adjuntos_solicitudes"
                    campoClave="acta"
                    valorClave={actaActual}
                    campoNumero="numero_adjunto"
                    endpointDescarga="download/adjunto_solicitud"
                    subir={subirAdjunto}
                />
                : <Alert severity="info">Guardá la solicitud para subir adjuntos.</Alert>}
        </TabPanel>
    </Box>;
}
