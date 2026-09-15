import * as React from 'react';
import {Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField} from '@mui/material';
import type {FixedFields} from 'frontend-plus';
import {useAvisos, useConexion, usePermisos} from '../base/contexto-base';
import type {Fila} from '../base/tipos-tabla';
import {BajaBienes} from '../baja-bienes';

type Accion = 'aprobar'|'aprobar_directa'|'rechazar'|'restaurar';
const TITULOS:Record<Accion,string> = {
    aprobar:'Aprobar baja', aprobar_directa:'Dar de baja directamente',
    rechazar:'Rechazar baja', restaurar:'Restaurar bien',
};

declare module 'frontend-plus' {
    interface BEAPI {
        bienes_baja_accion:(params:{fichas:string,accion:Accion,motivo:string|null,documento_respaldo:string|null})=>Promise<{message:string,cantidad:number}>;
    }
}

export function AccionesBaja({fila,onAplicada}:{fila:Fila,onAplicada:()=>void}){
    const conn = useConexion();
    const permisos = usePermisos();
    const {mostrarMensaje} = useAvisos();
    const [solicitar, setSolicitar] = React.useState(false);
    const [accion, setAccion] = React.useState<Accion|null>(null);
    const [motivo,setMotivo] = React.useState('');
    const [documento,setDocumento] = React.useState('');
    const [adjuntos,setAdjuntos] = React.useState<Fila[]>([]);
    const [error,setError] = React.useState<string|null>(null);
    const [trabajando,setTrabajando] = React.useState(false);
    const ficha = String(fila.ficha ?? '');
    const estado = String(fila.estado_baja ?? '');
    const activo = fila.activo === true;
    const abrir = (nueva:Accion) => {
        setMotivo(''); setDocumento(''); setError(null); setAccion(nueva);
    };
    React.useEffect(()=>{
        if(accion !== 'aprobar' && accion !== 'aprobar_directa'){ return; }
        let cancelado = false;
        setAdjuntos([]);
        conn.ajax.table_data({table:'adjuntos_bienes',fixedFields:[{fieldName:'ficha',value:ficha}] as FixedFields,paramfun:{}})
            .then(datos=>{if(!cancelado){setAdjuntos((datos as unknown as Fila[]).filter(row=>!!row.archivo));}})
            .catch(err=>{if(!cancelado){setError(err instanceof Error ? err.message : String(err));}});
        return ()=>{cancelado=true;};
    },[accion,conn,ficha]);
    const ejecutar = async()=>{
        if(!accion){return;}
        setTrabajando(true); setError(null);
        try{
            const result = await conn.ajax.bienes_baja_accion({
                fichas:JSON.stringify([ficha]),accion,motivo:motivo.trim() || null,documento_respaldo:documento || null,
            });
            mostrarMensaje(result.message); setAccion(null); onAplicada();
        }catch(err){setError(err instanceof Error ? err.message : String(err));}
        finally{setTrabajando(false);}
    };
    if(!ficha){return null;}
    return <>
        <Stack direction="row" spacing={0.5}>
            {activo && (!estado || estado === 'RECHAZADA') && permisos.guardar
                ? <Button size="small" color="error" onClick={()=>setSolicitar(true)}>solicitar baja</Button> : null}
            {activo && (!estado || estado === 'RECHAZADA') && permisos.aprobarBaja
                ? <Button size="small" color="error" onClick={()=>abrir('aprobar_directa')}>baja directa</Button> : null}
            {activo && estado === 'SOLICITADA' && permisos.aprobarBaja ? <>
                <Button size="small" color="error" onClick={()=>abrir('aprobar')}>aprobar</Button>
                <Button size="small" onClick={()=>abrir('rechazar')}>rechazar</Button>
            </> : null}
            {!activo && permisos.restaurarBaja
                ? <Button size="small" onClick={()=>abrir('restaurar')}>restaurar</Button> : null}
        </Stack>
        <BajaBienes abierto={solicitar} conn={conn} fichas={[ficha]} onCerrar={()=>setSolicitar(false)}
            onAplicada={mensaje=>{mostrarMensaje(mensaje);onAplicada();}}/>
        <Dialog open={accion != null} onClose={()=>{if(!trabajando){setAccion(null);}}} maxWidth="sm" fullWidth>
            <DialogTitle>{accion ? TITULOS[accion] : ''} · ficha {ficha}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Alert severity="info">{accion === 'aprobar' || accion === 'aprobar_directa'
                        ? 'Al aprobar, el bien pasa a inactivo. Puede asociar un respaldo de la solapa Adjuntos si corresponde.'
                        : accion === 'restaurar' ? 'El bien volverá a estar activo. La baja anterior se conservará en la auditoría.'
                        : 'La solicitud será rechazada y el bien permanecerá activo.'}</Alert>
                    {accion === 'aprobar' || accion === 'aprobar_directa' ? <TextField select label="Adjunto de respaldo (opcional)" value={documento}
                        onChange={evento=>setDocumento(evento.target.value)} fullWidth>
                        <MenuItem value="">Sin respaldo</MenuItem>
                        {adjuntos.map(row=><MenuItem key={String(row.numero_adjunto)} value={String(row.numero_adjunto)}>
                            {String(row.numero_adjunto)} · {String(row.detalle || row.archivo)}
                        </MenuItem>)}
                    </TextField> : null}
                    {accion === 'aprobar_directa' || accion === 'rechazar' || accion === 'restaurar' ? <TextField label="Motivo" value={motivo}
                        onChange={evento=>setMotivo(evento.target.value)} multiline minRows={2} required fullWidth/> : null}
                    {error ? <Alert severity="error">{error}</Alert> : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button disabled={trabajando} onClick={()=>setAccion(null)}>cancelar</Button>
                <Button variant="contained" onClick={()=>void ejecutar()} disabled={trabajando
                    || ((accion === 'aprobar_directa' || accion === 'rechazar' || accion === 'restaurar') && !motivo.trim())}>confirmar</Button>
            </DialogActions>
        </Dialog>
    </>;
}
