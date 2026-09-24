import * as React from 'react';
import {
    AppBar,
    Box,
    IconButton,
    Paper,
    Toolbar,
    Typography,
} from '@mui/material';
import {Menu as MenuIcon} from '@mui/icons-material';
import type {Connector, FixedFields} from 'frontend-plus';
import {BusquedaBienes} from './principal/busqueda-bienes';
import {BienFormulario} from './principal/bien/bien-formulario';
import {useSalida} from './principal/base/contexto-base';
import './ws-solicitudes';
import './ws-bajas';
import './ws-controles';
import './ws-siper';
import {
    renderConnectedAppInventario,
    unmountConnectedAppInventario,
} from './principal/render-connected-app-inventario';

type Vista =
    {nombre:'busqueda'}
    | {nombre:'bien', ficha?:string};

function PantallaPrincipal({
    conn,
    fixedFields,
}:{
    conn:Connector;
    fixedFields:FixedFields;
}){
    const [vista, setVista] = React.useState<Vista>({nombre:'busqueda'});
    const solicitarSalida = useSalida();
    const [actualizacion, setActualizacion] = React.useState<{ficha:string, version:number}>();

    const volverAlMenu = () => {
        unmountConnectedAppInventario();
        location.hash = '';
    };

    return <Paper square elevation={0} sx={{minHeight:'100vh'}}>
        <AppBar position="static">
            <Toolbar>
                <IconButton
                    color="inherit"
                    edge="start"
                    aria-label="volver al menú"
                    title="Volver al menú"
                    onClick={() => solicitarSalida(volverAlMenu)}
                    sx={{mr:2}}
                >
                    <MenuIcon/>
                </IconButton>
                <Typography variant="h6" component="h1">
                    {vista.nombre === 'bien'
                        ? `Inventario - Bien ${vista.ficha ?? 'nuevo'}`
                        : 'Inventario - Principal'}
                </Typography>
            </Toolbar>
        </AppBar>
        {vista.nombre === 'bien'
            ? <BienFormulario
                ficha={vista.ficha}
                onVolver={() => setVista({nombre:'busqueda'})}
                onGuardado={fila => setActualizacion(anterior => ({ficha:String(fila.ficha), version:(anterior?.version ?? 0) + 1}))}
            />
            : null}
        <Box sx={{display:vista.nombre === 'busqueda' ? 'block' : 'none'}}>
            <BusquedaBienes
                conn={conn}
                fixedFields={fixedFields}
                visible={vista.nombre === 'busqueda'}
                actualizacion={actualizacion}
                onAbrirBien={ficha => setVista({nombre:'bien', ficha})}
                onNuevoBien={() => setVista({nombre:'bien', ficha:undefined})}
            />
        </Box>
    </Paper>;
}

// @ts-ignore backend-plus amplía dinámicamente el mapa de wScreens.
myOwn.wScreens.principal = function principal(addrParams:any){
    const layout = document.getElementById('total-layout');
    if(layout == null){
        throw new Error('No se encontró el contenedor total-layout');
    }
    renderConnectedAppInventario(
        myOwn as never as Connector,
        {...addrParams},
        layout,
        ({conn, fixedFields}) =>
            <PantallaPrincipal conn={conn} fixedFields={fixedFields}/>
    );
};
