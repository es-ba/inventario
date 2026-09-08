import * as React from 'react';
import {
    Alert,
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
    Typography,
} from '@mui/material';
import type {Connector, FieldDefinition} from 'frontend-plus';

import {FormFieldRenderer} from './base/form-field-renderer';
import type {Fila} from './base/tipos-tabla';


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

function campoDeReferencia(name:keyof Cabecera, title:string, references:string, target:string){
    return {
        name, typeName:'text', title, references,
        referencesFields:[{source:name, target}],
    } as unknown as FieldDefinition;
}

const CAMPO_ACCION =
    campoDeReferencia('accion'         , 'acción'             , 'acciones_movimiento', 'accion_movimiento');

const CAMPOS = [
    campoDeReferencia('responsable'    , 'responsable'        , 'responsables'   , 'responsable'),
    campoDeReferencia('sector'           , 'sector'               , 'sectores'          , 'sector'),
    campoDeReferencia('sede'           , 'sede'               , 'sedes'          , 'sede'),
    campoDeReferencia('espacio'        , 'espacio'            , 'espacios'       , 'espacio'),
    {name:'puesto', typeName:'integer', title:'puesto'} as unknown as FieldDefinition,
    campoDeReferencia('tipo_asignacion', 'tipo de asignación' , 'tipo_asignacion', 'tipo_asignacion'),
    campoDeReferencia('modalidad_uso'  , 'modalidad de uso'   , 'modalidad_uso'  , 'modalidad_uso'),
];

type Cabecera = {
    accion:string,
    responsable:string,
    sector:string,
    sede:string,
    espacio:string,
    puesto:string,
    tipo_asignacion:string,
    modalidad_uso:string,
};

const CABECERA_VACIA:Cabecera = {
    accion:'', responsable:'', sector:'', sede:'', espacio:'', puesto:'',
    tipo_asignacion:'', modalidad_uso:'',
};

const CAMPOS_DE_DESTINO:(keyof Cabecera)[] = [
    'responsable', 'sector', 'sede', 'espacio', 'puesto', 'tipo_asignacion', 'modalidad_uso',
];

export function MoverBienes({
    abierto,
    conn,
    fichas,
    onCerrar,
    onCreada,
}:{
    abierto:boolean,
    conn:Connector,
    fichas:string[],
    onCerrar:() => void,
    onCreada:(mensaje:string) => void,
}){
    const [modo, setModo] = React.useState<'acta'|'directo'>('acta');
    const [detalle, setDetalle] = React.useState('');
    const [cabecera, setCabecera] = React.useState<Cabecera>(CABECERA_VACIA);
    const [error, setError] = React.useState<string|null>(null);
    const [trabajando, setTrabajando] = React.useState(false);

    const ponerCampo = React.useCallback(
        (nombre:string, valor:unknown) => setCabecera(previa => ({
            ...previa,
            [nombre]:valor == null ? '' : String(valor),
        })),
        [],
    );

    React.useEffect(() => {
        if(abierto){
            setModo('acta');
            setDetalle('');
            setCabecera(CABECERA_VACIA);
            setError(null);
        }
    }, [abierto]);

    const hayDestino = CAMPOS_DE_DESTINO.some(campo => String(cabecera[campo] ?? '').trim() !== '');
    const puedeCrear = hayDestino && fichas.length > 0;

    const crear = React.useCallback(async () => {
        setTrabajando(true);
        setError(null);
        try{
            const {accion, ...destino} = cabecera;
            const comun = {
                fichas:JSON.stringify(fichas),
                detalle:detalle.trim(),
                ...destino,
            };
            const resultado = modo === 'directo'
                ? await conn.ajax.bienes_mover_directo(comun)
                : await conn.ajax.solicitud_crear_desde_bienes({...comun, accion});
            onCreada(resultado.message);
            onCerrar();
        }catch(err){
            setError(err instanceof Error ? err.message : String(err));
        }finally{
            setTrabajando(false);
        }
    }, [cabecera, conn, detalle, fichas, modo, onCerrar, onCreada]);

    return <Dialog open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth>
        <DialogTitle>
            Mover {fichas.length} {fichas.length === 1 ? 'bien' : 'bienes'}
        </DialogTitle>
        <DialogContent dividers>
            <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={modo}
                onChange={(_e, valor) => { if(valor){ setModo(valor); setError(null); } }}
                sx={{mb:2}}
            >
                <ToggleButton value="acta">con acta</ToggleButton>
                <ToggleButton value="directo">directo</ToggleButton>
            </ToggleButtonGroup>

            <Typography variant="body2" color="text.secondary" sx={{mb:2}}>
                {modo === 'acta'
                    ? 'Se crea una solicitud de movimiento con los bienes seleccionados,'
                        + ' con su número de acta asignado automáticamente. Los movimientos'
                        + ' se registran cuando la solicitud recorra el circuito y llegue'
                        + ' a Procesada.'
                    : 'Los movimientos se registran ahora mismo, sin acta y sin pasar por'
                        + ' el circuito de aprobación. Queda asentado en el historial de'
                        + ' cada bien.'}
            </Typography>

            <Stack spacing={2}>
                {(modo === 'acta' ? [CAMPO_ACCION, ...CAMPOS] : CAMPOS).map(campo => <FormFieldRenderer
                    key={campo.name}
                    field={campo}
                    row={cabecera as unknown as Fila}
                    setField={ponerCampo}
                    size="small"
                />)}
                <TextField
                    label="detalle"
                    value={detalle}
                    onChange={evento => setDetalle(evento.target.value)}
                    size="small"
                    multiline
                    minRows={2}
                />
            </Stack>

            {!hayDestino
                ? <Alert severity="info" sx={{mt:2}}>
                    Indicá al menos un dato de destino: responsable, sector, sede o espacio.
                </Alert>
                : null}
            {error ? <Alert severity="error" sx={{mt:2}}>{error}</Alert> : null}
        </DialogContent>
        <DialogActions>
            <Button onClick={onCerrar} disabled={trabajando}>cancelar</Button>
            <Button
                variant="contained"
                onClick={() => void crear()}
                disabled={!puedeCrear || trabajando}
                startIcon={trabajando ? <CircularProgress size={16}/> : undefined}
            >
                {modo === 'directo' ? 'mover ahora' : 'crear solicitud'}
            </Button>
        </DialogActions>
    </Dialog>;
}
