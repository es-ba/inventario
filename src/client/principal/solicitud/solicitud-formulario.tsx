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

import {useAvisos, useConexion} from '../base/contexto-base';
import {useEstructuraTabla} from '../base/cache-tablas';
import {AdjuntosPanel} from '../base/adjuntos-panel';
import {FormFieldRenderer} from '../base/form-field-renderer';
import {TabPanel, propsDeSolapa} from '../base/tab-panel';
import {useRowEditor} from '../base/use-row-editor';
import type {Fila} from '../base/tipos-tabla';
import {SolicitudAcciones, accionesDe, etiquetaDeAccion} from './solicitud-acciones';
import {SolicitudBienes} from './solicitud-bienes';
import {SolicitudDocumentos} from './solicitud-documentos';


const ESTADO_EDITABLE = 'B';

const CAMPOS_CABECERA = [
    'acta', 'tipo_asignacion', 'modalidad_uso',
    'responsable', 'sector', 'sede', 'espacio',
    'enusode_responsable', 'usuario_final', 'solicitado_por', 'firmado_por', 'detalle',
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
}:{
    acta?:string,
    onVolver:() => void,
}){
    const conn = useConexion();
    const {mostrarError, mostrarMensaje} = useAvisos();
    const {definicion} = useEstructuraTabla('movimientos_solicitudes');
    const [filaInicial, setFilaInicial] = React.useState<Fila|undefined>(undefined);
    const [cargando, setCargando] = React.useState(Boolean(acta));
    const [noEncontrada, setNoEncontrada] = React.useState(false);
    const [solapa, setSolapa] = React.useState(0);
    const [version, setVersion] = React.useState(0);

    React.useEffect(() => {
        if(!acta){
            setFilaInicial(undefined);
            setCargando(false);
            return;
        }
        let cancelado = false;
        setCargando(true);
        setNoEncontrada(false);
        const camposFijos:FixedFields = [{fieldName:'acta', value:acta}];
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
            .catch(err => { if(!cancelado){ mostrarError(err, `No se pudo leer la solicitud ${acta}`); } })
            .finally(() => { if(!cancelado){ setCargando(false); } });
        return () => { cancelado = true; };
    }, [conn, acta, mostrarError, version]);

    const definicionSegura = definicion ?? {fields:[], primaryKey:['acta']};
    const editor = useRowEditor({
        tabla:'movimientos_solicitudes',
        definicion:definicionSegura,
        filaInicial,
    });

    const subirAdjunto = React.useCallback(
        (archivo:File) => conn.ajax.archivo_solicitud_subir({
            acta:String(acta ?? ''),
            detalle:'',
            files:[archivo],
        }),
        [acta, conn],
    );

    if(cargando || definicion == null){
        return <Box sx={{display:'flex', justifyContent:'center', p:6}}><CircularProgress/></Box>;
    }
    if(noEncontrada){
        return <Box sx={{p:3}}>
            <Alert severity="warning" action={<Button onClick={onVolver}>volver</Button>}>
                No se encontró la solicitud {acta}.
            </Alert>
        </Box>;
    }

    const retroceso = accionesDe(filaInicial?.acciones)
        .find(accion => accion.eaccion_direccion === 'retroceso');
    const hayComoRetroceder = retroceso != null;
    const nombreDeRetroceso = retroceso ? etiquetaDeAccion(retroceso) : '';

    const estado = String(editor.row.estado ?? '');
    const actaActual = String(editor.row.acta ?? acta ?? '');
    const guardada = Boolean(actaActual) && !editor.esAlta;
    const editable = !guardada || estado === ESTADO_EDITABLE;

    return <Box sx={{height:'100%', overflow:'auto', p:2}}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{mb:2}}>
            <IconButton onClick={onVolver} size="small" title="Volver al listado">
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
                    onEjecutada={() => setVersion(v => v + 1)}
                />
                : null}
        </Stack>

        {guardada && !editable
            ? <Alert severity="info" sx={{mb:2}}>
                {hayComoRetroceder
                    ? <>La solicitud salió de Borrador: su contenido ya no se edita. Para
                        cambiarla, usá el botón <b>{nombreDeRetroceso}</b> de arriba.</>
                    : <>La solicitud salió de Borrador y desde su estado actual
                        ({String(filaInicial?.estados__desc_estado ?? estado)}) no hay ninguna acción
                        que la haga volver atrás. Para reabrirla hay que declarar esa
                        transición en estados y acciones.</>}
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
                            field={field}
                            row={editor.row}
                            setField={editor.setField}
                            error={editor.errores[field.name]}
                            disabled={!editable || (nombre === 'acta' && guardada)}
                            multiline={esDetalle}
                            minRows={2}
                        />
                    </Box>;
                })}
            </Box>
            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{mt:3}}>
                <Button onClick={onVolver}>cancelar</Button>
                <Button
                    variant="contained"
                    disabled={!editable || !editor.puedeGuardar}
                    onClick={async () => {
                        if(await editor.guardar()){
                            mostrarMensaje(`Se guardó la solicitud ${actaActual || editor.row.acta}`);
                            setVersion(v => v + 1);
                        }
                    }}
                >
                    guardar
                </Button>
            </Stack>
        </TabPanel>

        <TabPanel value={solapa} index={1} sinRelleno>
            {guardada
                ? <SolicitudBienes acta={actaActual} soloLectura={!editable}/>
                : <Alert severity="info">Guardá la solicitud para agregarle bienes.</Alert>}
        </TabPanel>

        <TabPanel value={solapa} index={2} sinRelleno>
            {guardada
                ? <SolicitudDocumentos acta={actaActual}/>
                : <Alert severity="info">Guardá la solicitud para emitir documentos.</Alert>}
        </TabPanel>

        <TabPanel value={solapa} index={3} sinRelleno>
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
