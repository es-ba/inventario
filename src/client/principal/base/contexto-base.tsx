import * as React from 'react';
import {Alert, Snackbar, Button, Dialog, DialogTitle, DialogContent, DialogActions} from '@mui/material';
import type {Connector} from 'frontend-plus';

import type {InfoUsuario} from '../../../common/contracts';
import {mensajeDeError} from './tipos-tabla';

declare module 'frontend-plus' {
    interface BEAPI {
        info_usuario:() => Promise<InfoUsuario>;
    }
}

type Aviso = {
    texto:string,
    severidad:'error'|'success'|'info',
};

const SIN_PERMISOS:InfoUsuario = {
    usuario:'', rol:'',
    nombre:null, apellido:null, responsable:null, sector:null,
    puede_ver_todo:false, puede_ver_propio:false, puede_ver_dependientes:false,
    puede_ver_claves:false, puede_aprobar_baja:false, puede_restaurar_baja:false, puede_eliminar:false,
    puede_guardar:false, puede_mover:false, puede_controlar:false,
};

export type PedidoDeConfirmacion = {
    titulo:string,
    mensaje:string,
    confirmar:string,
    peligroso?:boolean,
};

type ValorContextoBase = {
    conn:Connector,
    confirmar:(pedido:PedidoDeConfirmacion) => Promise<boolean>,
    mostrarError:(err:unknown, prefijo?:string) => void,
    mostrarMensaje:(texto:string) => void,
    infoUsuario:InfoUsuario,
    registrarEdicion:(id:symbol, estado:{modificado:boolean, guardando:boolean}|null) => void,
    solicitarSalida:(salir:() => void) => void,
};

const ContextoBase = React.createContext<ValorContextoBase|null>(null);

export function BaseInventarioProvider({
    conn,
    children,
}:{
    conn:Connector,
    children:React.ReactNode,
}){
    const [aviso, setAviso] = React.useState<Aviso|null>(null);
    const ediciones = React.useRef(new Map<symbol, {modificado:boolean, guardando:boolean}>());
    const [confirmacion, setConfirmacion] =
        React.useState<(PedidoDeConfirmacion & {responder:(si:boolean) => void})|null>(null);
    const confirmar = React.useCallback((pedido:PedidoDeConfirmacion) => new Promise<boolean>(resolver => {
        setConfirmacion({...pedido, responder:si => { setConfirmacion(null); resolver(si); }});
    }), []);
    const registrarEdicion = React.useCallback((id:symbol, estado:{modificado:boolean, guardando:boolean}|null) => {
        if(estado){ ediciones.current.set(id, estado); }
        else { ediciones.current.delete(id); }
    }, []);
    const solicitarSalida = React.useCallback(async (salir:() => void) => {
        const estados = [...ediciones.current.values()];
        if(estados.some(e => e.guardando)){
            setAviso({texto:'Esperá a que termine el guardado.', severidad:'info'});
        }else if(!estados.some(e => e.modificado) || await confirmar({
            titulo:'Cambios sin guardar', mensaje:'Si salís, se descartarán los cambios pendientes.',
            confirmar:'Descartar y salir', peligroso:true,
        })){
            salir();
        }
    }, [confirmar]);
    React.useEffect(() => {
        const advertir = (evento:BeforeUnloadEvent) => {
            if([...ediciones.current.values()].some(e => e.modificado || e.guardando)){
                evento.preventDefault();
                evento.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', advertir);
        return () => window.removeEventListener('beforeunload', advertir);
    }, []);

    const mostrarError = React.useCallback((err:unknown, prefijo?:string) => {
        const texto = mensajeDeError(err);
        console.error('[inventario]', prefijo ?? '', err);
        setAviso({texto:prefijo ? `${prefijo}: ${texto}` : texto, severidad:'error'});
    }, []);

    const mostrarMensaje = React.useCallback((texto:string) => {
        setAviso({texto, severidad:'success'});
    }, []);

    const [infoUsuario, setInfoUsuario] = React.useState<InfoUsuario>(SIN_PERMISOS);
    React.useEffect(() => {
        let cancelado = false;
        conn.ajax.info_usuario().then(info => {
            if(!cancelado){
                setInfoUsuario(info);
            }
        }).catch(err => {
            console.error('[inventario] no se pudieron leer los permisos del usuario', err);
        });
        return () => { cancelado = true; };
    }, [conn]);

    const valor = React.useMemo(
        () => ({conn, confirmar, mostrarError, mostrarMensaje, infoUsuario, registrarEdicion, solicitarSalida}),
        [conn, confirmar, mostrarError, mostrarMensaje, infoUsuario, registrarEdicion, solicitarSalida],
    );

    return <ContextoBase.Provider value={valor}>
        {children}
        <Dialog open={confirmacion != null} onClose={() => confirmacion?.responder(false)}>
            <DialogTitle>{confirmacion?.titulo}</DialogTitle>
            <DialogContent>{confirmacion?.mensaje}</DialogContent>
            <DialogActions>
                <Button autoFocus onClick={() => confirmacion?.responder(false)}>Cancelar</Button>
                <Button color={confirmacion?.peligroso ? 'error' : 'primary'} variant="contained"
                    onClick={() => confirmacion?.responder(true)}>
                    {confirmacion?.confirmar}
                </Button>
            </DialogActions>
        </Dialog>
        <Snackbar
            open={aviso != null}
            autoHideDuration={aviso?.severidad === 'error' ? 12000 : 5000}
            onClose={() => setAviso(null)}
            anchorOrigin={{vertical:'bottom', horizontal:'center'}}
        >
            {aviso
                ? <Alert
                    severity={aviso.severidad}
                    onClose={() => setAviso(null)}
                    variant="filled"
                    sx={{maxWidth:600}}
                >
                    {aviso.texto}
                </Alert>
                : undefined}
        </Snackbar>
    </ContextoBase.Provider>;
}

function useContextoBase():ValorContextoBase{
    const contexto = React.useContext(ContextoBase);
    if(contexto == null){
        throw new Error('Falta envolver la pantalla en BaseInventarioProvider');
    }
    return contexto;
}

export function useConexion():Connector{
    return useContextoBase().conn;
}

export function useConfirmar(){
    return useContextoBase().confirmar;
}

export function useSalida(){
    return useContextoBase().solicitarSalida;
}

export function useRegistrarEdicion(modificado:boolean, guardando:boolean){
    const {registrarEdicion} = useContextoBase();
    const id = React.useRef(Symbol('edicion'));
    React.useEffect(() => {
        registrarEdicion(id.current, {modificado, guardando});
        return () => registrarEdicion(id.current, null);
    }, [registrarEdicion, modificado, guardando]);
}

export function useAvisos():Pick<ValorContextoBase, 'mostrarError'|'mostrarMensaje'>{
    const {mostrarError, mostrarMensaje} = useContextoBase();
    return {mostrarError, mostrarMensaje};
}

export function useInfoUsuario():InfoUsuario{
    return useContextoBase().infoUsuario;
}

export type Permisos = {
    guardar:boolean,
    eliminar:boolean,
    mover:boolean,
    aprobarBaja:boolean,
    restaurarBaja:boolean,
    verClaves:boolean,
    controlar:boolean,
};

export function usePermisos():Permisos{
    const info = useInfoUsuario();
    return React.useMemo(() => ({
        guardar:!!info.puede_guardar,
        eliminar:!!info.puede_eliminar,
        mover:!!info.puede_mover,
        aprobarBaja:!!info.puede_aprobar_baja,
        restaurarBaja:!!info.puede_restaurar_baja,
        verClaves:!!info.puede_ver_claves,
        controlar:!!info.puede_controlar,
    }), [info]);
}
