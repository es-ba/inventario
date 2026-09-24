import * as React from 'react';
import {AppBar, IconButton, Paper, Toolbar, Typography} from '@mui/material';
import {Menu as MenuIcon} from '@mui/icons-material';
import type {Connector} from 'frontend-plus';

import {
    renderConnectedAppInventario,
    unmountConnectedAppInventario,
} from './principal/render-connected-app-inventario';
import {BajasListado} from './principal/baja/bajas-listado';
import {BienFormulario} from './principal/bien/bien-formulario';
import {useSalida} from './principal/base/contexto-base';

type Vista =
    {nombre:'listado'}
    | {nombre:'bien', ficha:string};

function PantallaBajas(){
    const solicitarSalida = useSalida();
    const [vista, setVista] = React.useState<Vista>({nombre:'listado'});

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
                <Typography variant="h6" component="h1">
                    {vista.nombre === 'bien'
                        ? `Baja - Bien ${vista.ficha}`
                        : 'Proceso de baja'}
                </Typography>
            </Toolbar>
        </AppBar>
        {vista.nombre === 'bien'
            ? <BienFormulario
                ficha={vista.ficha}
                onVolver={() => setVista({nombre:'listado'})}
            />
            : <BajasListado
                onAbrirBien={ficha => setVista({nombre:'bien', ficha})}
            />
        }
    </Paper>;
}

// @ts-ignore backend-plus amplía dinámicamente el mapa de wScreens.
myOwn.wScreens.bajas = function bajas(addrParams:any){
    const layout = document.getElementById('total-layout');
    if(layout == null){
        throw new Error('No se encontró el contenedor total-layout');
    }
    renderConnectedAppInventario(
        myOwn as never as Connector,
        {...addrParams},
        layout,
        () => <PantallaBajas/>
    );
};
