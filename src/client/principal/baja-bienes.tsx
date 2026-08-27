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

const CAMPO_MOTIVO = {
    name:'motivo_baja',
    typeName:'text',
    title:'motivo de la baja',
    nullable:false,
    references:'motivos_baja',
    referencesFields:[{source:'motivo_baja', target:'motivo_baja'}],
} as unknown as FieldDefinition;

export function BajaBienes({
    abierto,
    conn,
    fichas,
    onCerrar,
    onAplicada,
}:{
    abierto:boolean,
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
            const resultado = await conn.ajax.bienes_dar_de_baja({
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
    }, [conn, fichas, motivo, onAplicada, onCerrar]);

    const cuantos = `${fichas.length} ${fichas.length === 1 ? 'bien' : 'bienes'}`;

    return <Dialog open={abierto} onClose={onCerrar} maxWidth="xs" fullWidth>
        <DialogTitle>Dar de baja {cuantos}</DialogTitle>
        <DialogContent dividers>
            <Stack spacing={2}>
                <Alert severity="warning">
                    Los bienes pasan a estado BAJA. Los que ya estén de baja no se tocan:
                    volver a darlos de baja pisaría el motivo original.
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
            <Button onClick={onCerrar}>cancelar</Button>
            <Button
                variant="contained"
                color="error"
                disabled={trabajando || motivo.trim() === '' || fichas.length === 0}
                startIcon={trabajando ? <CircularProgress size={16}/> : undefined}
                onClick={() => void darDeBaja()}
            >
                dar de baja
            </Button>
        </DialogActions>
    </Dialog>;
}
