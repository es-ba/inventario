import * as React from 'react';
import {Alert, Snackbar} from '@mui/material';
import type {Connector} from 'frontend-plus';

import {mensajeDeError} from './tipos-tabla';

/*
    Contexto base de las pantallas React.

    Resuelve las dos cosas que en el repo de frontend aparte daba frontend-plus-react:
    el acceso al backend (allá useApiCall, acá el Connector de backend-plus) y los avisos
    al usuario (allá useSnackbar). Tenerlo en un contexto evita ir pasando `conn` por
    props a través de toda la jerarquía de componentes.
*/

type Aviso = {
    texto:string,
    severidad:'error'|'success'|'info',
};

type ValorContextoBase = {
    conn:Connector,
    mostrarError:(err:unknown, prefijo?:string) => void,
    mostrarMensaje:(texto:string) => void,
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
        // El error completo va a la consola: el usuario ve el mensaje, quien depura ve todo.
        console.error('[inventario]', prefijo ?? '', err);
        setAviso({texto:prefijo ? `${prefijo}: ${texto}` : texto, severidad:'error'});
    }, []);

    const mostrarMensaje = React.useCallback((texto:string) => {
        setAviso({texto, severidad:'success'});
    }, []);

    const valor = React.useMemo(
        () => ({conn, mostrarError, mostrarMensaje}),
        [conn, mostrarError, mostrarMensaje],
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
