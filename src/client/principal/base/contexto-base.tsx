import * as React from 'react';
import {Alert, Snackbar} from '@mui/material';
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
    puede_ver_claves:false, puede_restaurar_baja:false, puede_eliminar:false,
    puede_guardar:false, puede_mover:false,
};

type ValorContextoBase = {
    conn:Connector,
    mostrarError:(err:unknown, prefijo?:string) => void,
    mostrarMensaje:(texto:string) => void,
    infoUsuario:InfoUsuario,
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
        () => ({conn, mostrarError, mostrarMensaje, infoUsuario}),
        [conn, mostrarError, mostrarMensaje, infoUsuario],
    );

    return <ContextoBase.Provider value={valor}>
        {children}
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
    restaurarBaja:boolean,
    verClaves:boolean,
};

export function usePermisos():Permisos{
    const info = useInfoUsuario();
    return React.useMemo(() => ({
        guardar:!!info.puede_guardar,
        eliminar:!!info.puede_eliminar,
        mover:!!info.puede_mover,
        restaurarBaja:!!info.puede_restaurar_baja,
        verClaves:!!info.puede_ver_claves,
    }), [info]);
}
