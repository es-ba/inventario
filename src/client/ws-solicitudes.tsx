import * as React from 'react';
import {AppBar, IconButton, Paper, Toolbar, Typography} from '@mui/material';
import {Menu as MenuIcon} from '@mui/icons-material';
import type {Connector} from 'frontend-plus';

import {
    renderConnectedAppInventario,
    unmountConnectedAppInventario,
} from './principal/render-connected-app-inventario';
import {SolicitudesListado} from './principal/solicitud/solicitudes-listado';
import {SolicitudFormulario} from './principal/solicitud/solicitud-formulario';

type Vista =
    {nombre:'listado'}
    | {nombre:'solicitud', acta?:string};

function PantallaSolicitudes(){
    const [vista, setVista] = React.useState<Vista>({nombre:'listado'});

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
                    {vista.nombre === 'solicitud'
                        ? `Solicitud ${vista.acta ?? 'nueva'}`
                        : 'Solicitudes de movimiento'}
                </Typography>
            </Toolbar>
        </AppBar>
        {vista.nombre === 'solicitud'
            ? <SolicitudFormulario
                acta={vista.acta}
                onVolver={() => setVista({nombre:'listado'})}
            />
            : <SolicitudesListado
                onAbrir={acta => setVista({nombre:'solicitud', acta})}
            />
        }
    </Paper>;
}

// @ts-ignore backend-plus amplía dinámicamente el mapa de wScreens.
myOwn.wScreens.solicitudes = function solicitudes(addrParams:any){
    const layout = document.getElementById('total-layout');
    if(layout == null){
        throw new Error('No se encontró el contenedor total-layout');
    }
    renderConnectedAppInventario(
        myOwn as never as Connector,
        {...addrParams},
        layout,
        () => <PantallaSolicitudes/>
    );
};
