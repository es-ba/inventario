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
import {ExpandMore} from '@mui/icons-material';
import type {FieldDefinition, FixedFields, TableDefinition} from 'frontend-plus';

import {useAvisos, useConexion} from '../base/contexto-base';
import {useEstructuraTabla} from '../base/cache-tablas';
import {DetailTable} from '../base/detail-table';
import {FormFieldRenderer} from '../base/form-field-renderer';
import {TabPanel, propsDeSolapa} from '../base/tab-panel';
import {useRowEditor} from '../base/use-row-editor';
import type {Fila} from '../base/tipos-tabla';
import {AdjuntosBien} from './adjuntos-bien';
import {BienHeader} from './bien-header';
import {prepararEtiquetasCodigosBarra} from '../../../common/codigos-barra';
import {imprimirEtiquetasCodigosBarra} from '../imprimir-codigos-barra';

/*
    Formulario de un bien, con sus tablas de detalle.

    Las secciones agrupan los campos por tema. Lo que no esté listado en ninguna cae en
    "Otros datos": así, si mañana se agrega un campo a la tabla, aparece en el formulario
    en vez de quedar invisible para siempre.
*/

const SECCIONES:{titulo:string, campos:string[], abiertaPorDefecto?:boolean}[] = [
    {
        titulo:'Datos generales',
        campos:['ficha', 'numero_integrado', 'prd', 'clasificacion', 'tipo_bien', 'categoria', 'estado'],
        abiertaPorDefecto:true,
    },
    {
        titulo:'Clasificación contable',
        campos:['rubro', 'clase', 'cuenta', 'grupo'],
    },
    {
        titulo:'Identificación',
        campos:['marca', 'modelo', 'annio', 'serie', 'imei', 'caracteridentificador', 'estado_bien_viejo'],
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

/**
 * Campos que no van al formulario: los que la vista deriva del último movimiento
 * —se muestran en el encabezado— y los alias de texto que arma el SQL.
 */
function esCampoDelFormulario(field:FieldDefinition):boolean{
    if(field.clientSide){
        return false;
    }
    if(/_texto$/.test(field.name)){
        return false;
    }
    return field.editable !== false;
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
    return <Box sx={{display:'grid', gridTemplateColumns:{xs:'1fr', md:'1fr 1fr'}, gap:2}}>
        {campos.map(nombre => {
            const field = definicion.fields.find(candidato => candidato.name === nombre);
            if(!field){
                return null;
            }
            const esMultilinea = CAMPOS_MULTILINEA.has(nombre);
            return <Box key={nombre} sx={esMultilinea ? {gridColumn:{md:'span 2'}} : undefined}>
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
    /** undefined significa alta de un bien nuevo. */
    ficha?:string,
    onVolver:() => void,
}){
    const conn = useConexion();
    const {mostrarError, mostrarMensaje} = useAvisos();
    const {definicion} = useEstructuraTabla('bienes');
    const [filaInicial, setFilaInicial] = React.useState<Fila|undefined>(undefined);
    const [cargando, setCargando] = React.useState(Boolean(ficha));
    const [noEncontrado, setNoEncontrado] = React.useState(false);
    const [solapa, setSolapa] = React.useState(0);
    const [seccionAbierta, setSeccionAbierta] = React.useState<string>(SECCIONES[0].titulo);

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
    }, [conn, ficha, mostrarError]);

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
            etiqueta:'Historial',
            contenido:<DetailTable tabla="historial" camposFijos={{ficha:fichaActual}} titulo="Historial de cambios" soloLectura/>,
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
                <Button onClick={onVolver}>cancelar</Button>
                <Button
                    variant="contained"
                    disabled={!editor.puedeGuardar}
                    onClick={async () => {
                        if(await editor.guardar()){
                            mostrarMensaje(`Se guardó el bien ${fichaActual || editor.row.ficha}`);
                        }
                    }}
                >
                    guardar
                </Button>
            </Stack>
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
    </Box>;
}
