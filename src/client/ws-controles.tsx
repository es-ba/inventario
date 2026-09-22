import * as React from 'react';
import {AppBar, Box, IconButton, Paper, Toolbar, Typography} from '@mui/material';
import {Menu as MenuIcon} from '@mui/icons-material';
import type {Connector} from 'frontend-plus';

import {
    renderConnectedAppInventario,
    unmountConnectedAppInventario,
} from './principal/render-connected-app-inventario';
import {ControlesListado} from './principal/control/controles-listado';
import {ControlBien} from './principal/control/control-bien';
import type {Fila} from './principal/base/tipos-tabla';

type Abierto = {bien:Fila, lista:Fila[]};

function PantallaControles(){
    const [abierto, setAbierto] = React.useState<Abierto|null>(null);
    const [guardados, setGuardados] = React.useState(0);

    const siguiente = React.useMemo(() => {
        if(abierto == null){
            return null;
        }
        const posicion = abierto.lista.findIndex(fila => String(fila.ficha) === String(abierto.bien.ficha));
        return posicion >= 0 && posicion < abierto.lista.length - 1 ? abierto.lista[posicion + 1] : null;
    }, [abierto]);

    return <Paper square elevation={0} sx={{minHeight:'100vh'}}>
        <AppBar position="static">
            <Toolbar>
                <IconButton
                    color="inherit"
                    edge="start"
                    aria-label="volver al menú"
                    title="Volver al menú"
                    onClick={() => {
                        unmountConnectedAppInventario();
                        location.hash = '';
                    }}
                    sx={{mr:2}}
                >
                    <MenuIcon/>
                </IconButton>
                <Typography variant="h6" component="h1">
                    {abierto ? `Control - Bien ${abierto.bien.ficha}` : 'Control de bienes'}
                </Typography>
            </Toolbar>
        </AppBar>
        <Box sx={{display:abierto ? 'none' : 'block'}}>
            <ControlesListado
                recargar={guardados}
                onAbrirBien={(bien, lista) => setAbierto({bien, lista})}
            />
        </Box>
        {abierto
            ? <ControlBien
                key={String(abierto.bien.ficha)}
                bien={abierto.bien}
                onVolver={() => setAbierto(null)}
                onGuardado={() => setGuardados(n => n + 1)}
                onSiguiente={siguiente
                    ? () => setAbierto({bien:siguiente, lista:abierto.lista})
                    : null}
            />
            : null}
    </Paper>;
}

// @ts-ignore backend-plus amplía dinámicamente el mapa de wScreens.
myOwn.wScreens.controles = function controles(addrParams:any){
    const layout = document.getElementById('total-layout');
    if(layout == null){
        throw new Error('No se encontró el contenedor total-layout');
    }
    renderConnectedAppInventario(
        myOwn as never as Connector,
        {...addrParams},
        layout,
        () => <PantallaControles/>
    );
};
