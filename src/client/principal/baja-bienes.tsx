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
} from '@mui/material';
import type {Connector, FieldDefinition} from 'frontend-plus';

import {FormFieldRenderer} from './base/form-field-renderer';
import type {Fila} from './base/tipos-tabla';

declare module 'frontend-plus' {
    interface BEAPI {
        bienes_dar_de_baja:(params:{fichas:string, motivo_baja:string}) => Promise<{
            message:string,
            pedidos:number,
            dados_de_baja:number,
        }>;
    }
}

export const CAMPO_MOTIVO = {
    name:'motivo_baja',
    typeName:'text',
    title:'Motivo de la baja',
    nullable:false,
    references:'motivos_baja',
    referencesFields:[{source:'motivo_baja', target:'motivo_baja'}],
} as unknown as FieldDefinition;

export function BajaBienes({
    abierto,
    directa = false,
    conn,
    fichas,
    onCerrar,
    onAplicada,
}:{
    abierto:boolean,
    directa?:boolean,
    conn:Connector,
    fichas:string[],
    onCerrar:() => void,
    onAplicada:(mensaje:string) => void,
}){
    const [motivo, setMotivo] = React.useState('');
    const [error, setError] = React.useState<string|null>(null);
    const [trabajando, setTrabajando] = React.useState(false);

    React.useEffect(() => {
        if(abierto){
            setMotivo('');
            setError(null);
        }
    }, [abierto]);

    const darDeBaja = React.useCallback(async () => {
        setTrabajando(true);
        setError(null);
        try{
            const resultado = directa ? await conn.ajax.bienes_baja_accion({
                fichas:JSON.stringify(fichas),
                accion:'aprobar_directa',
                motivo:motivo,
                documento_respaldo:null,
            }) : await conn.ajax.bienes_dar_de_baja({
                fichas:JSON.stringify(fichas),
                motivo_baja:motivo,
            });
            onAplicada(resultado.message);
            onCerrar();
        }catch(err){
            setError(err instanceof Error ? err.message : String(err));
        }finally{
            setTrabajando(false);
        }
    }, [conn, fichas, motivo, directa, onAplicada, onCerrar]);

    const cuantos = `${fichas.length} ${fichas.length === 1 ? 'bien' : 'bienes'}`;

    return <Dialog open={abierto} onClose={onCerrar} maxWidth="xs" fullWidth>
        <DialogTitle>{directa ? 'Dar de baja' : 'Solicitar baja de'} {cuantos}</DialogTitle>
        <DialogContent dividers>
            <Stack spacing={2}>
                <Alert severity="warning">
                    {directa
                        ? 'Los bienes seleccionados pasarán a inactivos al confirmar.'
                        : 'Se solicita la baja de los bienes seleccionados. Permanecen activos hasta que una persona autorizada apruebe la solicitud.'}
                </Alert>
                <FormFieldRenderer
                    field={CAMPO_MOTIVO}
                    row={{motivo_baja:motivo} as Fila}
                    setField={(_nombre, valor) => setMotivo(valor == null ? '' : String(valor))}
                    size="small"
                />
                {error ? <Alert severity="error">{error}</Alert> : null}
            </Stack>
        </DialogContent>
        <DialogActions>
            <Button onClick={onCerrar}>Cancelar</Button>
            <Button
                variant="contained"
                color="error"
                disabled={trabajando || motivo.trim() === '' || fichas.length === 0}
                startIcon={trabajando ? <CircularProgress size={16}/> : undefined}
                onClick={() => void darDeBaja()}
            >
                {directa ? 'Dar de baja' : 'Solicitar baja'}
            </Button>
        </DialogActions>
    </Dialog>;
}
