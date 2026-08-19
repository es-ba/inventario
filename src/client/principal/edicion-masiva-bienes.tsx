import * as React from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {Add, Delete} from '@mui/icons-material';
import type {Connector, FieldDefinition, TableDefinition} from 'frontend-plus';

import {FormFieldRenderer} from './base/form-field-renderer';

/*
    Edición masiva de bienes.

    El formulario arranca vacío y el usuario agrega los campos que quiere cambiar. Sólo se
    tocan los campos agregados: uno ausente no se modifica. Para vaciar hay un checkbox
    explícito, porque "dejar en blanco" y "no tocar" son cosas distintas y confundirlas es
    la forma clásica de arruinar datos en lote.

    Antes de aplicar siempre se previsualiza: el servidor cuenta cuántos bienes cambian de
    verdad por cada campo, y recién sobre esos números se confirma.
*/

declare module 'frontend-plus' {
    interface BEAPI {
        bienes_edicion_masiva:(params:{
            fichas:string,
            cambios:string,
            dryRun:boolean,
        }) => Promise<{
            message:string,
            modificados?:number,
            alcanzados:number,
            seleccionados:number,
            cambian:Record<string, number>,
        }>;
    }
}

/** Los mismos que bloquea el servidor; acá sólo para no ofrecerlos. */
const CAMPOS_BLOQUEADOS = new Set([
    'ficha', 'activo', 'estado_baja', 'motivo_baja',
    'area', 'sede', 'espacio', 'responsable', 'enusode',
]);

type CambioEnEdicion = {
    id:string,
    campo:string,
    /** El valor tal como lo devuelve el control: código de la FK, opción, texto o fecha. */
    valor:unknown,
    vaciar:boolean,
};

function tieneValor(cambio:CambioEnEdicion):boolean{
    if(cambio.vaciar){
        return true;
    }
    return cambio.valor != null && String(cambio.valor).trim() !== '';
}

function camposEditables(definicion:TableDefinition|null):FieldDefinition[]{
    if(definicion == null){
        return [];
    }
    return definicion.fields.filter(field =>
        field.editable !== false
        && !field.clientSide
        && field.inTable !== false
        && !CAMPOS_BLOQUEADOS.has(field.name)
    );
}

export function EdicionMasivaBienes({
    abierto,
    conn,
    definicion,
    fichas,
    onCerrar,
    onAplicado,
}:{
    abierto:boolean,
    conn:Connector,
    definicion:TableDefinition|null,
    fichas:string[],
    onCerrar:() => void,
    onAplicado:(mensaje:string) => void,
}){
    const [cambios, setCambios] = React.useState<CambioEnEdicion[]>([]);
    const [previsualizacion, setPrevisualizacion] = React.useState<string|null>(null);
    const [error, setError] = React.useState<string|null>(null);
    const [trabajando, setTrabajando] = React.useState(false);

    const disponibles = React.useMemo(() => camposEditables(definicion), [definicion]);

    React.useEffect(() => {
        if(abierto){
            setCambios([]);
            setPrevisualizacion(null);
            setError(null);
        }
    }, [abierto]);

    // Cualquier cambio en el formulario invalida la previsualización anterior.
    const actualizar = (id:string, patch:Partial<CambioEnEdicion>) => {
        setCambios(previos => previos.map(c => c.id === id ? {...c, ...patch} : c));
        setPrevisualizacion(null);
    };

    const usados = new Set(cambios.map(c => c.campo));
    const completos = cambios.filter(c => c.campo !== '' && tieneValor(c));
    const puedeAplicar = completos.length > 0 && completos.length === cambios.length;

    /*
        El renderer escribe por nombre de campo, no sobre "el valor de este renglón". Eso
        importa en las FK compuestas: elegir una cuenta setea rubro, clase y cuenta a la
        vez. Cada uno de esos se guarda como su propio cambio, que es lo correcto — editar
        la cuenta sin su rubro y su clase no tendría sentido.
    */
    const escribirCampo = React.useCallback((idOrigen:string, nombre:string, valor:unknown) => {
        setPrevisualizacion(null);
        setCambios(previos => {
            const origen = previos.find(c => c.id === idOrigen);
            if(origen && nombre === origen.campo){
                return previos.map(c => c.id === idOrigen ? {...c, valor} : c);
            }
            const existente = previos.find(c => c.campo === nombre);
            if(existente){
                return previos.map(c => c.campo === nombre ? {...c, valor, vaciar:false} : c);
            }
            return [...previos, {
                id:`c${Date.now()}${nombre}`,
                campo:nombre,
                valor,
                vaciar:false,
            }];
        });
    }, []);

    const llamar = React.useCallback(async (dryRun:boolean) => {
        setTrabajando(true);
        setError(null);
        try{
            const resultado = await conn.ajax.bienes_edicion_masiva({
                fichas:JSON.stringify(fichas),
                cambios:JSON.stringify(completos.map(c => ({
                    campo:c.campo,
                    valor:c.vaciar ? null : (typeof c.valor === 'string' ? c.valor.trim() : c.valor ?? null),
                }))),
                dryRun,
            });
            if(dryRun){
                setPrevisualizacion(resultado.message);
            }else{
                onAplicado(resultado.message);
                onCerrar();
            }
        }catch(err){
            setError(err instanceof Error ? err.message : String(err));
            setPrevisualizacion(null);
        }finally{
            setTrabajando(false);
        }
    }, [completos, conn, fichas, onAplicado, onCerrar]);

    return <Dialog open={abierto} onClose={onCerrar} maxWidth="md" fullWidth>
        <DialogTitle>
            Editar {fichas.length} {fichas.length === 1 ? 'bien' : 'bienes'}
        </DialogTitle>
        <DialogContent dividers>
            <Typography variant="body2" color="text.secondary" sx={{mb:2}}>
                Sólo se modifican los campos que agregues. El resto queda como está.
            </Typography>

            <Stack spacing={2}>
                {cambios.map(cambio => {
                    const field = disponibles.find(f => f.name === cambio.campo);
                    return <Stack key={cambio.id} direction="row" spacing={1} alignItems="flex-start">
                        <TextField
                            select
                            size="small"
                            label="campo"
                            value={cambio.campo}
                            onChange={evento => actualizar(cambio.id, {
                                campo:evento.target.value,
                                // El valor anterior no sirve para otro campo.
                                valor:null,
                            })}
                            sx={{minWidth:220}}
                        >
                            {disponibles
                                .filter(f => f.name === cambio.campo || !usados.has(f.name))
                                .map(f => <MenuItem key={f.name} value={f.name}>
                                    {f.label ?? f.title ?? f.name}
                                </MenuItem>)}
                        </TextField>
                        <Box sx={{flex:1, minWidth:0}}>
                            {field && !cambio.vaciar
                                ? <FormFieldRenderer
                                    field={{...field, label:'nuevo valor', nullable:true}}
                                    row={{[field.name]:cambio.valor}}
                                    setField={(nombre, valor) => escribirCampo(cambio.id, nombre, valor)}
                                    size="small"
                                />
                                : <TextField
                                    size="small"
                                    label="nuevo valor"
                                    value=""
                                    disabled
                                    fullWidth
                                    helperText={cambio.vaciar
                                        ? 'el campo va a quedar vacío'
                                        : 'elegí primero el campo'}
                                />}
                        </Box>
                        <FormControlLabel
                            control={<Checkbox
                                checked={cambio.vaciar}
                                onChange={(_e, marcado) => actualizar(cambio.id, {vaciar:marcado})}
                            />}
                            label="vaciar"
                            sx={{whiteSpace:'nowrap', mt:0.5}}
                        />
                        <IconButton
                            size="small"
                            sx={{mt:0.5}}
                            title="quitar"
                            onClick={() => {
                                setCambios(previos => previos.filter(c => c.id !== cambio.id));
                                setPrevisualizacion(null);
                            }}
                        >
                            <Delete/>
                        </IconButton>
                    </Stack>;
                })}
            </Stack>

            <Button
                startIcon={<Add/>}
                sx={{mt:2}}
                disabled={disponibles.length === 0 || usados.size >= disponibles.length}
                onClick={() => {
                    setCambios(previos => [...previos, {
                        id:`c${Date.now()}${previos.length}`,
                        campo:'',
                        valor:'',
                        vaciar:false,
                    }]);
                    setPrevisualizacion(null);
                }}
            >
                agregar campo
            </Button>

            {previsualizacion
                ? <Alert severity="info" sx={{mt:2}}>{previsualizacion}</Alert>
                : null}
            {error
                ? <Alert severity="error" sx={{mt:2}}>{error}</Alert>
                : null}
            {previsualizacion == null && !error && puedeAplicar
                ? <Box sx={{mt:2}}>
                    <Typography variant="caption" color="text.secondary">
                        Previsualizá antes de aplicar para ver cuántos bienes cambian realmente.
                    </Typography>
                </Box>
                : null}
        </DialogContent>
        <DialogActions>
            <Button onClick={onCerrar} disabled={trabajando}>cancelar</Button>
            <Button
                onClick={() => void llamar(true)}
                disabled={!puedeAplicar || trabajando}
                startIcon={trabajando ? <CircularProgress size={16}/> : undefined}
            >
                previsualizar
            </Button>
            <Button
                variant="contained"
                onClick={() => void llamar(false)}
                disabled={!puedeAplicar || trabajando || previsualizacion == null}
            >
                aplicar
            </Button>
        </DialogActions>
    </Dialog>;
}
