import * as React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    CircularProgress,
    Stack,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import {Block, Edit, ExpandMore} from '@mui/icons-material';
import type {FieldDefinition, FixedFields, TableDefinition} from 'frontend-plus';

import {useAvisos, useConexion} from '../base/contexto-base';
import {useEstructuraTabla} from '../base/cache-tablas';
import {DetailTable} from '../base/detail-table';
import {FormFieldRenderer} from '../base/form-field-renderer';
import {formatearValor} from '../base/formato-valores';
import {TabPanel, propsDeSolapa} from '../base/tab-panel';
import {useRowEditor} from '../base/use-row-editor';
import type {Fila} from '../base/tipos-tabla';
import {AdjuntosBien} from './adjuntos-bien';
import {BienHeader, ResumenDelBien} from './bien-header';
import {BajaBienes} from '../baja-bienes';
import {prepararEtiquetasCodigosBarra} from '../../../common/codigos-barra';
import {imprimirEtiquetasCodigosBarra} from '../imprimir-codigos-barra';


const SECCIONES:{titulo:string, campos:string[], abiertaPorDefecto?:boolean}[] = [
    {
        titulo:'Datos generales',
        campos:['ficha', 'numero_integrado', 'prd', 'tipo_bien', 'categoria', 'activo'],
        abiertaPorDefecto:true,
    },
    {
        titulo:'Clasificación contable',
        campos:['rubro', 'clase', 'cuenta', 'grupo'],
    },
    {
        titulo:'Identificación',
        campos:['marca', 'modelo', 'annio', 'serie', 'imei', 'caracteridentificador', 'estado'],
    },
    {
        titulo:'Compra',
        campos:['orden_compra', 'importe', 'importetotal'],
    },
    {
        titulo:'Contrato',
        campos:['entidad_prestadora', 'fecha_inicio', 'fecha_fin', 'renovable', 'condiciones', 'costo_mensual'],
    },
    {
        titulo:'Baja',
        campos:['estado_baja', 'motivo_baja', 'fecha_solicitud', 'valor_residual', 'autorizado_por', 'documento_respaldo'],
    },
    {
        titulo:'Información adicional',
        campos:['ubicacion', 'aclaracion', 'observacion', 'detalle'],
    },
];

const CAMPOS_MULTILINEA = new Set(['observacion', 'detalle', 'aclaracion', 'condiciones']);

declare module 'frontend-plus' {
    interface BEAPI {
        bien_resumen:(params:{ficha:string}) => Promise<ResumenDelBien>;
    }
}

const CAMPOS_OCULTOS = new Set(['clasificacion']);

function esCampoDelFormulario(field:FieldDefinition):boolean{
    if(CAMPOS_OCULTOS.has(field.name)){
        return false;
    }
    if(field.clientSide){
        return false;
    }
    if(/_texto$/.test(field.name)){
        return false;
    }
    return field.editable !== false;
}

function valorLegible(field:FieldDefinition, row:Fila):{texto:string, codigo:string} {
    const codigo = formatearValor(row[field.name]);
    if(!field.references){
        return {texto:codigo, codigo:''};
    }
    const prefijo = `${field.references}__`;
    const descripcion = Object.keys(row)
        .filter(clave => clave.indexOf(prefijo) === 0)
        .map(clave => formatearValor(row[clave]))
        .filter(parte => parte !== '')
        .join(' ');
    return descripcion !== ''
        ? {texto:descripcion, codigo}
        : {texto:codigo, codigo:''};
}

function DatoLeido({field, row}:{field:FieldDefinition, row:Fila}){
    const {texto, codigo} = valorLegible(field, row);
    if(texto === ''){
        return null;
    }
    return <Box sx={{minWidth:0, py:0.5}}>
        <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.3}>
            {field.label ?? field.title ?? field.name}
        </Typography>
        <Typography variant="body2" sx={{wordBreak:'break-word'}}>
            {texto}
            {codigo !== ''
                ? <Typography component="span" variant="caption" color="text.disabled" sx={{ml:0.75}}>
                    {codigo}
                </Typography>
                : null}
        </Typography>
    </Box>;
}

function VistaDatos({definicion, row}:{definicion:TableDefinition, row:Fila}){
    const secciones = SECCIONES.map(seccion => {
        const campos = seccion.campos
            .map(nombre => definicion.fields.find(f => f.name === nombre))
            .filter((f):f is FieldDefinition => Boolean(f))
            .filter(f => valorLegible(f, row).texto !== '');
        return {titulo:seccion.titulo, campos};
    }).filter(seccion => seccion.campos.length > 0);

    if(secciones.length === 0){
        return <Alert severity="info" sx={{mt:2}}>El bien no tiene datos cargados todavía.</Alert>;
    }

    return <Stack spacing={2.5} sx={{mt:1}}>
        {secciones.map(seccion => <Box key={seccion.titulo}>
            <Typography
                variant="overline"
                color="text.secondary"
                sx={{display:'block', borderBottom:1, borderColor:'divider', mb:1}}
            >
                {seccion.titulo}
            </Typography>
            <Box sx={{
                display:'grid',
                gridTemplateColumns:{xs:'1fr', sm:'1fr 1fr', lg:'repeat(3, 1fr)'},
                columnGap:3,
                rowGap:0.5,
            }}>
                {seccion.campos.map(field =>
                    <DatoLeido key={field.name} field={field} row={row}/>
                )}
            </Box>
        </Box>)}
    </Stack>;
}

function SeccionDeCampos({
    definicion,
    campos,
    editor,
    fichaBloqueada,
}:{
    definicion:TableDefinition,
    campos:string[],
    editor:ReturnType<typeof useRowEditor>,
    fichaBloqueada:boolean,
}){
    return <Box sx={{
        display:'grid',
        gridTemplateColumns:{xs:'1fr', sm:'1fr 1fr', lg:'repeat(3, 1fr)'},
        gap:2,
    }}>
        {campos.map(nombre => {
            const field = definicion.fields.find(candidato => candidato.name === nombre);
            if(!field){
                return null;
            }
            const esMultilinea = CAMPOS_MULTILINEA.has(nombre);
            return <Box
                key={nombre}
                sx={esMultilinea ? {gridColumn:{sm:'span 2', lg:'span 3'}} : undefined}
            >
                <FormFieldRenderer
                    field={field}
                    row={editor.row}
                    setField={editor.setField}
                    error={editor.errores[field.name]}
                    disabled={nombre === 'ficha' && fichaBloqueada}
                    multiline={esMultilinea}
                    minRows={2}
                />
            </Box>;
        })}
    </Box>;
}

export function BienFormulario({
    ficha,
    onVolver,
}:{
    ficha?:string,
    onVolver:() => void,
}){
    const conn = useConexion();
    const {mostrarError, mostrarMensaje} = useAvisos();
    const {definicion} = useEstructuraTabla('bienes');
    const [filaInicial, setFilaInicial] = React.useState<Fila|undefined>(undefined);
    const [cargando, setCargando] = React.useState(Boolean(ficha));
    const [noEncontrado, setNoEncontrado] = React.useState(false);
    const [resumen, setResumen] = React.useState<ResumenDelBien|null>(null);
    const [solapa, setSolapa] = React.useState(0);
    const [seccionAbierta, setSeccionAbierta] = React.useState<string>(SECCIONES[0].titulo);
    const [editando, setEditando] = React.useState(!ficha);
    const [bajaAbierta, setBajaAbierta] = React.useState(false);
    const [version, setVersion] = React.useState(0);

    React.useEffect(() => {
        if(!ficha){
            setFilaInicial(undefined);
            setCargando(false);
            return;
        }
        let cancelado = false;
        setCargando(true);
        setNoEncontrado(false);
        const camposFijos:FixedFields = [{fieldName:'ficha', value:ficha}];
        conn.ajax.table_data({table:'bienes', fixedFields:camposFijos, paramfun:{}})
            .then(datos => {
                if(cancelado){
                    return;
                }
                const filas = datos as unknown as Fila[];
                if(filas.length === 0){
                    setNoEncontrado(true);
                }
                setFilaInicial(filas[0]);
            })
            .catch(err => {
                if(!cancelado){
                    mostrarError(err, `No se pudo leer el bien ${ficha}`);
                }
            })
            .finally(() => {
                if(!cancelado){
                    setCargando(false);
                }
            });
        return () => { cancelado = true; };
    }, [conn, ficha, mostrarError, version]);

    React.useEffect(() => {
        if(!ficha){
            setResumen(null);
            return;
        }
        let cancelado = false;
        conn.ajax.bien_resumen({ficha})
            .then(datos => { if(!cancelado){ setResumen(datos); } })
            .catch(err => { console.warn('[inventario] no se pudo leer el resumen del bien', err); });
        return () => { cancelado = true; };
    }, [conn, ficha]);

    const definicionSegura = definicion ?? {fields:[], primaryKey:['ficha']};
    const editor = useRowEditor({
        tabla:'bienes',
        definicion:definicionSegura,
        filaInicial,
    });

    const camposEnSecciones = React.useMemo(
        () => new Set(SECCIONES.reduce<string[]>((todos, seccion) => todos.concat(seccion.campos), [])),
        [],
    );
    const camposSueltos = React.useMemo(
        () => definicionSegura.fields
            .filter(field => esCampoDelFormulario(field) && !camposEnSecciones.has(field.name))
            .map(field => field.name),
        [camposEnSecciones, definicionSegura.fields],
    );

    const fichaActual = String(editor.row.ficha ?? ficha ?? '');
    const guardado = Boolean(fichaActual) && !editor.esAlta;

    const imprimirEtiqueta = React.useCallback(async () => {
        try{
            const etiquetas = prepararEtiquetasCodigosBarra([editor.row as never]);
            await imprimirEtiquetasCodigosBarra(etiquetas);
        }catch(err){
            mostrarError(err, 'No se pudo imprimir la etiqueta');
        }
    }, [editor.row, mostrarError]);

    if(cargando || definicion == null){
        return <Box sx={{display:'flex', justifyContent:'center', p:6}}><CircularProgress/></Box>;
    }
    if(noEncontrado){
        return <Box sx={{p:3}}>
            <Alert severity="warning" action={<Button onClick={onVolver}>volver</Button>}>
                No se encontró el bien con ficha {ficha}.
            </Alert>
        </Box>;
    }

    const solapasDeDetalle:{etiqueta:string, contenido:React.ReactNode}[] = [
        {
            etiqueta:'Atributos',
            contenido:<DetailTable tabla="bien_atributo" camposFijos={{ficha:fichaActual}} titulo="Atributos del bien"/>,
        },
        {
            etiqueta:'Movimientos',
            contenido:<DetailTable tabla="movimientos_bien" camposFijos={{ficha:fichaActual}} titulo="Movimientos" soloLectura/>,
        },
        {
            etiqueta:'Adjuntos',
            contenido:<AdjuntosBien ficha={fichaActual}/>,
        },
        {
            etiqueta:'Auditoría',
            contenido:<DetailTable tabla="historial_evento_bien" camposFijos={{ficha:fichaActual}} titulo="Eventos" soloLectura/>,
        },
        {
            etiqueta:'Declaraciones',
            contenido:<DetailTable tabla="declaraciones_bienes" camposFijos={{ficha:fichaActual}} titulo="Declaraciones" soloLectura/>,
        },
    ];

    return <Box sx={{height:'100%', overflow:'auto', p:2, pb:6}}>
        <BienHeader
            row={editor.row}
            resumen={guardado ? resumen : null}
            onVolver={onVolver}
            onImprimirEtiqueta={guardado ? () => void imprimirEtiqueta() : undefined}
        />

        <Tabs
            value={solapa}
            onChange={(_evento, valor:number) => setSolapa(valor)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{mb:2, borderBottom:1, borderColor:'divider'}}
        >
            <Tab label="Datos" {...propsDeSolapa(0)}/>
            {solapasDeDetalle.map((solapaDetalle, i) =>
                <Tab key={solapaDetalle.etiqueta} label={solapaDetalle.etiqueta} {...propsDeSolapa(i + 1)}/>
            )}
        </Tabs>

        <TabPanel value={solapa} index={0} sinRelleno>
            {!editando
                ? <>
                    <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{mb:1}}>
                        {}
                        {!editor.soloLectura && guardado && editor.row.activo !== false
                            ? <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Block/>}
                                onClick={() => setBajaAbierta(true)}
                            >
                                dar de baja
                            </Button>
                            : null}
                        {!editor.soloLectura
                            ? <Button variant="outlined" startIcon={<Edit/>} onClick={() => setEditando(true)}>
                                editar
                            </Button>
                            : null}
                    </Stack>
                    <VistaDatos definicion={definicion} row={editor.row}/>
                </>
                : <>
            {SECCIONES.map(seccion => <Accordion
                key={seccion.titulo}
                expanded={seccionAbierta === seccion.titulo}
                onChange={(_evento, abierta) => setSeccionAbierta(abierta ? seccion.titulo : '')}
            >
                <AccordionSummary expandIcon={<ExpandMore/>}>
                    <Typography fontWeight={600}>{seccion.titulo}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <SeccionDeCampos
                        definicion={definicion}
                        campos={seccion.campos}
                        editor={editor}
                        fichaBloqueada={guardado}
                    />
                </AccordionDetails>
            </Accordion>)}

            {camposSueltos.length
                ? <Accordion
                    expanded={seccionAbierta === 'otros'}
                    onChange={(_evento, abierta) => setSeccionAbierta(abierta ? 'otros' : '')}
                >
                    <AccordionSummary expandIcon={<ExpandMore/>}>
                        <Typography fontWeight={600}>Otros datos</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <SeccionDeCampos
                            definicion={definicion}
                            campos={camposSueltos}
                            editor={editor}
                            fichaBloqueada={guardado}
                        />
                    </AccordionDetails>
                </Accordion>
                : null}

            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{mt:3}}>
                <Button onClick={() => { if(guardado){ setEditando(false); } else { onVolver(); } }}>
                    cancelar
                </Button>
                <Button
                    variant="contained"
                    disabled={!editor.puedeGuardar}
                    onClick={async () => {
                        if(await editor.guardar()){
                            mostrarMensaje(`Se guardó el bien ${fichaActual || editor.row.ficha}`);
                            setEditando(false);
                        }
                    }}
                >
                    guardar
                </Button>
            </Stack>
                </>
            }
        </TabPanel>

        {solapasDeDetalle.map((solapaDetalle, i) =>
            <TabPanel key={solapaDetalle.etiqueta} value={solapa} index={i + 1} sinRelleno>
                {guardado
                    ? solapaDetalle.contenido
                    : <Alert severity="info" sx={{mt:2}}>
                        Guardá el bien para poder trabajar con {solapaDetalle.etiqueta.toLowerCase()}.
                    </Alert>}
            </TabPanel>
        )}

        <BajaBienes
            abierto={bajaAbierta}
            conn={conn}
            fichas={fichaActual ? [fichaActual] : []}
            onCerrar={() => setBajaAbierta(false)}
            onAplicada={(mensaje) => {
                mostrarMensaje(mensaje);
                setVersion(v => v + 1);
            }}
        />
    </Box>;
}
