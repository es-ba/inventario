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
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import {ArrowForward, ContentCopy} from '@mui/icons-material';
import type {Connector, FieldDefinition} from 'frontend-plus';

import {FormFieldRenderer} from './base/form-field-renderer';
import {useDestinoDelSector} from './base/destino-del-sector';
import {useSalida} from './base/contexto-base';
import {unmountConnectedAppInventario} from './render-connected-app-inventario';
import type {Fila} from './base/tipos-tabla';
import {
    CampoDelMovimiento,
    CAMPOS_DEL_MOVIMIENTO,
    Destino,
    OrigenDeCampo,
    copiarTodoElOrigen,
    destinoAEnviar,
    origenDeCampo,
} from '../../common/movimiento-origen';


declare module 'frontend-plus' {
    interface BEAPI {
        bienes_mover_directo:(params:{
            fichas:string,
            tipo_asignacion:string,
            modalidad_uso:string,
            responsable:string,
            sector:string,
            sede:string,
            espacio:string,
            puesto:string,
            enusode:string,
            enusode_responsable:string,
            detalle:string,
        }) => Promise<{
            message:string,
            movimientos:number,
            no_encontrados:number,
        }>;
        solicitud_crear_desde_bienes:(params:{
            fichas:string,
            tipo_asignacion:string,
            modalidad_uso:string,
            responsable:string,
            sector:string,
            sede:string,
            espacio:string,
            puesto:string,
            enusode:string,
            enusode_responsable:string,
            accion:string,
            detalle:string,
        }) => Promise<{
            message:string,
            acta:string,
            estado:string,
            bienes:number,
            no_encontrados:number,
        }>;
    }
}

function campoDeReferencia(name:string, title:string, references:string, target:string){
    return {
        name, typeName:'text', title, references,
        referencesFields:[{source:name, target}],
    } as unknown as FieldDefinition;
}

const CAMPO_ACCION =
    campoDeReferencia('accion', 'acción', 'acciones_movimiento', 'accion_movimiento');

const CAMPOS:Record<CampoDelMovimiento, FieldDefinition> = {
    sector:campoDeReferencia('sector', 'sector', 'sectores', 'sector'),
    responsable:campoDeReferencia('responsable', 'responsable directo', 'responsables', 'responsable'),
    sede:campoDeReferencia('sede', 'sede', 'sedes', 'sede'),
    espacio:campoDeReferencia('espacio', 'espacio', 'espacios', 'espacio'),
    puesto:{name:'puesto', typeName:'integer', title:'Puesto'} as unknown as FieldDefinition,
    tipo_asignacion:campoDeReferencia('tipo_asignacion', 'tipo de asignación', 'tipo_asignacion', 'tipo_asignacion'),
    modalidad_uso:campoDeReferencia('modalidad_uso', 'modalidad de uso', 'modalidad_uso', 'modalidad_uso'),
    enusode_responsable:campoDeReferencia('enusode_responsable', 'responsable de uso', 'responsables', 'responsable'),
};

function TextoDeOrigen({origen}:{origen:OrigenDeCampo}){
    const [desplegado, setDesplegado] = React.useState(false);
    if(origen.valores.length === 0){
        return null;
    }
    if(origen.valores.length === 1){
        const [valor] = origen.valores;
        return <>
            <Typography variant="body2">{valor.texto}</Typography>
            {valor.detalle
                ? <Typography variant="caption" color="text.secondary">{valor.detalle}</Typography>
                : null}
        </>;
    }
    if(origen.valores.length <= 3 || desplegado){
        return <Stack spacing={0.25}>
            {origen.valores.map(valor => <Box key={valor.codigo ?? ''}>
                <Typography variant="body2">{valor.texto} ({valor.cantidad})</Typography>
                {valor.detalle
                    ? <Typography variant="caption" color="text.secondary">{valor.detalle}</Typography>
                    : null}
            </Box>)}
        </Stack>;
    }
    return <Typography
        variant="body2"
        sx={{cursor:'pointer', textDecoration:'underline dotted'}}
        onClick={() => setDesplegado(true)}
    >
        varios ({origen.valores.length})
    </Typography>;
}

export type ResultadoMovimiento =
    | {modo:'acta', message:string, acta:string, estado:string, bienes:number, no_encontrados:number}
    | {modo:'directo', message:string, movimientos:number, no_encontrados:number};

export function AvisoMovimiento({resultado, onCerrar}:{resultado:ResultadoMovimiento, onCerrar:() => void}){
    const solicitarSalida = useSalida();
    return <Alert severity="success" onClose={onCerrar} sx={{mb:2}}
        action={resultado.modo === 'acta' ? <Button onClick={() => solicitarSalida(() => {
            unmountConnectedAppInventario();
            location.hash = `w=solicitudes&acta=${encodeURIComponent(resultado.acta)}`;
        })}>Abrir solicitud N.º {resultado.acta}</Button> : undefined}>
        {resultado.message}
    </Alert>;
}

export function MoverBienes({
    abierto,
    conn,
    bienes,
    onCerrar,
    onCreada,
}:{
    abierto:boolean,
    conn:Connector,
    bienes:Fila[],
    onCerrar:() => void,
    onCreada:(resultado:ResultadoMovimiento) => void,
}){
    const [modo, setModo] = React.useState<'acta'|'directo'>('acta');
    const [accion, setAccion] = React.useState('');
    const [detalle, setDetalle] = React.useState('');
    const [destino, setDestino] = React.useState<Destino>({});
    const [error, setError] = React.useState<string|null>(null);
    const [trabajando, setTrabajando] = React.useState(false);
    const enviando = React.useRef(false);

    const fichas = React.useMemo(() => bienes.map(bien => String(bien.ficha)), [bienes]);
    const origenes = React.useMemo(() => {
        const porCampo = {} as Record<CampoDelMovimiento, OrigenDeCampo>;
        for(const campo of CAMPOS_DEL_MOVIMIENTO){
            porCampo[campo] = origenDeCampo(bienes, campo);
        }
        return porCampo;
    }, [bienes]);

    const {admitirPara, destinoAlCambiarSector} = useDestinoDelSector(destino.sector ?? '');

    React.useEffect(() => {
        if(abierto){
            setModo('acta');
            setAccion('');
            setDetalle('');
            setDestino({});
            setError(null);
        }
    }, [abierto]);

    const ponerValor = (campo:CampoDelMovimiento, valor:unknown) => {
        const texto = valor == null ? '' : String(valor);
        setDestino(previo => {
            const nuevo:Destino = {...previo, [campo]:texto};
            if(campo === 'sector'){
                nuevo.espacio = destinoAlCambiarSector(texto, {espacio:previo.espacio ?? ''}).espacio;
            }
            return nuevo;
        });
    };

    const aEnviar = destinoAEnviar(destino);
    const puedeCrear = Object.keys(aEnviar).length > 0 && fichas.length > 0;

    const crear = React.useCallback(async () => {
        if(enviando.current){ return; }
        enviando.current = true;
        setTrabajando(true);
        setError(null);
        try{
            const comun = {
                fichas:JSON.stringify(fichas),
                detalle:detalle.trim(),
                tipo_asignacion:'', modalidad_uso:'', responsable:'', sector:'', sede:'', espacio:'', puesto:'',
                enusode:'', enusode_responsable:'',
                ...destinoAEnviar(destino),
            };
            const resultado:ResultadoMovimiento = modo === 'directo'
                ? {modo:'directo', ...await conn.ajax.bienes_mover_directo(comun)}
                : {modo:'acta', ...await conn.ajax.solicitud_crear_desde_bienes({...comun, accion})};
            onCreada(resultado);
            onCerrar();
        }catch(err){
            setError(err instanceof Error ? err.message : String(err));
        }finally{
            enviando.current = false;
            setTrabajando(false);
        }
    }, [accion, conn, destino, detalle, fichas, modo, onCerrar, onCreada]);

    const columnas = {xs:'1fr', md:'1fr 32px 1.3fr 48px'};

    const filaDeCampo = (campo:CampoDelMovimiento) => {
        const origen = origenes[campo];
        const codigo = origen.codigoUnico;
        return <Box
            key={campo}
            sx={{display:'grid', gridTemplateColumns:columnas, gap:1, alignItems:'center', py:0.75}}
        >
            <Box sx={{order:{xs:2, md:1}}}>
                <Typography variant="caption" color="text.secondary" sx={{display:{md:'none'}}}>
                    origen · {CAMPOS[campo].title}
                </Typography>
                <TextoDeOrigen origen={origen}/>
            </Box>
            <Box sx={{order:{xs:3, md:2}, display:{xs:'none', md:'flex'}, justifyContent:'center'}}>
                <ArrowForward fontSize="small" color="disabled"/>
            </Box>
            <Box sx={{order:{xs:1, md:3}, minWidth:0}}>
                <FormFieldRenderer
                    field={CAMPOS[campo]}
                    row={{[campo]:destino[campo] ?? ''} as Fila}
                    setField={(_nombre, valor) => ponerValor(campo, valor)}
                    admitir={admitirPara(campo)}
                    size="small"
                    disabled={trabajando}
                />
            </Box>
            <Box sx={{order:4}}>
                <Tooltip title={codigo == null
                    ? 'El origen no es único o está sin asignar'
                    : 'Copiar el origen al destino'}>
                    <span>
                        <Button
                            size="small"
                            disabled={codigo == null || trabajando}
                            onClick={() => ponerValor(campo, codigo)}
                        >
                            <ContentCopy fontSize="small"/>
                        </Button>
                    </span>
                </Tooltip>
            </Box>
        </Box>;
    };

    return <Dialog open={abierto} onClose={() => { if(!enviando.current){ onCerrar(); } }} maxWidth="md" fullWidth>
        <DialogTitle>
            Mover {fichas.length} {fichas.length === 1 ? 'bien' : 'bienes'}
        </DialogTitle>
        <DialogContent dividers>
            <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={modo}
                disabled={trabajando}
                onChange={(_e, valor) => { if(valor){ setModo(valor); setError(null); } }}
                sx={{mb:2}}
            >
                <ToggleButton value="acta">Crear solicitud de movimiento</ToggleButton>
                <ToggleButton value="directo">Registrar movimiento inmediato</ToggleButton>
            </ToggleButtonGroup>

            {modo === 'acta' ? <>
                <Typography variant="body2" color="text.secondary" sx={{mb:2}}>
                    Se crea una solicitud de movimiento con los bienes seleccionados.
                    Los movimientos se registran cuando la solicitud se procesa.
                </Typography>
                <Box sx={{mb:2}}>
                    <FormFieldRenderer
                        field={CAMPO_ACCION}
                        row={{accion} as Fila}
                        setField={(_nombre, valor) => setAccion(valor == null ? '' : String(valor))}
                        size="small"
                        disabled={trabajando}
                    />
                </Box>
            </> : <Typography variant="body2" sx={{mb:2}}>El destino se aplica inmediatamente y queda registrado en el historial de cada bien.</Typography>}

            <Stack direction="row" alignItems="center" spacing={2} sx={{mb:1}}>
                <Box sx={{flex:1}}/>
                <Button size="small" startIcon={<ContentCopy/>}
                    disabled={trabajando}
                    onClick={() => setDestino(previo => copiarTodoElOrigen(previo, origenes))}>
                    Copiar valores del origen
                </Button>
            </Stack>

            <Box sx={{
                display:{xs:'none', md:'grid'},
                gridTemplateColumns:columnas,
                gap:1,
                borderBottom:1,
                borderColor:'divider',
                pb:0.5,
            }}>
                <Typography variant="subtitle2" sx={{fontWeight:600}}>Origen</Typography>
                <Box/>
                <Typography variant="subtitle2" sx={{fontWeight:600}}>Destino</Typography>
                <Box/>
            </Box>

            <Stack divider={<Box sx={{borderBottom:1, borderColor:'divider'}}/>}>
                {CAMPOS_DEL_MOVIMIENTO.map(filaDeCampo)}
            </Stack>

            <TextField
                label="Detalle"
                disabled={trabajando}
                value={detalle}
                onChange={evento => setDetalle(evento.target.value)}
                size="small"
                multiline
                minRows={2}
                fullWidth
                sx={{mt:2}}
            />

            {!puedeCrear
                ? <Alert severity="info" sx={{mt:2}}>
                    Indicá al menos un dato de destino: responsable, sector, sede o espacio.
                </Alert>
                : null}
            {error ? <Alert severity="error" sx={{mt:2}}>{error}</Alert> : null}
        </DialogContent>
        <DialogActions>
            <Button onClick={onCerrar} disabled={trabajando}>Cancelar</Button>
            <Button
                variant="contained"
                onClick={() => void crear()}
                disabled={!puedeCrear || trabajando}
                startIcon={trabajando ? <CircularProgress size={16}/> : undefined}
            >
                {modo === 'directo' ? 'Registrar movimiento inmediato' : 'Crear solicitud'}
            </Button>
        </DialogActions>
    </Dialog>;
}
