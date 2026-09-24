import * as React from 'react';
import {AppBar, IconButton, Paper, Toolbar, Typography} from '@mui/material';
import {Menu as MenuIcon} from '@mui/icons-material';
import type {Connector} from 'frontend-plus';

import {
    renderConnectedAppInventario,
    unmountConnectedAppInventario,
} from './principal/render-connected-app-inventario';
import {PersonasSiper} from './principal/siper/personas-siper';
import {useSalida} from './principal/base/contexto-base';

function PantallaSiper(){
    const solicitarSalida = useSalida();
    return <Paper square elevation={0} sx={{minHeight:'100vh'}}>
        <AppBar position="static">
            <Toolbar>
                <IconButton
                    color="inherit"
                    edge="start"
                    aria-label="volver al menú"
                    title="Volver al menú"
                    onClick={() => solicitarSalida(() => {
                        unmountConnectedAppInventario();
                        location.hash = '';
                    })}
                    sx={{mr:2}}
                >
                    <MenuIcon/>
                </IconButton>
                <Typography variant="h6" component="h1">Siper - Personas</Typography>
            </Toolbar>
        </AppBar>
        <PersonasSiper/>
    </Paper>;
}

// @ts-ignore backend-plus amplía dinámicamente el mapa de wScreens.
myOwn.wScreens.siper = function siper(addrParams:any){
    const layout = document.getElementById('total-layout');
    if(layout == null){
        throw new Error('No se encontró el contenedor total-layout');
    }
    renderConnectedAppInventario(
        myOwn as never as Connector,
        {...addrParams},
        layout,
        () => <PantallaSiper/>
    );
};
