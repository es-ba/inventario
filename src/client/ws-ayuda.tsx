import * as React from 'react';
import {Box, List, ListItemButton, ListItemText, MenuItem, Paper, TextField} from '@mui/material';
import type {Connector} from 'frontend-plus';

import {renderConnectedAppInventario} from './principal/render-connected-app-inventario';
import {PantallaInventario} from './principal/base/pantalla-inventario';
import {MANUAL, seccionDeAyuda} from './principal/ayuda/manual';
import {TextoDeAyuda} from './principal/ayuda/texto-de-ayuda';

function PantallaAyuda({inicial}:{inicial:unknown}){
    const [clave, setClave] = React.useState(() => seccionDeAyuda(inicial).clave);
    const seccion = seccionDeAyuda(clave);
    const elegir = (nueva:string) => {
        setClave(nueva);
        history.replaceState(null, '', `#w=ayuda&seccion=${nueva}`);
        window.scrollTo(0, 0);
    };
    return <PantallaInventario titulo="Manual de uso">
        <Box sx={{display:'flex', gap:2, p:{xs:1, md:2}, alignItems:'flex-start'}}>
            <Paper variant="outlined" sx={{display:{xs:'none', md:'block'}, width:260, flexShrink:0, position:'sticky', top:16}}>
                <List dense component="nav" aria-label="secciones del manual">
                    {MANUAL.map(s => <ListItemButton key={s.clave} selected={s.clave === clave} onClick={() => elegir(s.clave)}>
                        <ListItemText primary={s.titulo}/>
                    </ListItemButton>)}
                </List>
            </Paper>
            <Box sx={{flex:1, minWidth:0, maxWidth:860}}>
                <TextField
                    select
                    size="small"
                    label="Sección"
                    value={clave}
                    onChange={evento => elegir(evento.target.value)}
                    fullWidth
                    sx={{display:{md:'none'}, mb:2}}
                >
                    {MANUAL.map(s => <MenuItem key={s.clave} value={s.clave}>{s.titulo}</MenuItem>)}
                </TextField>
                <TextoDeAyuda texto={seccion.texto} onSeccion={elegir}/>
            </Box>
        </Box>
    </PantallaInventario>;
}

// @ts-ignore backend-plus amplía dinámicamente el mapa de wScreens.
myOwn.wScreens.ayuda = function ayuda(addrParams:any){
    const layout = document.getElementById('total-layout');
    if(layout == null){
        throw new Error('No se encontró el contenedor total-layout');
    }
    renderConnectedAppInventario(
        myOwn as never as Connector,
        {...addrParams},
        layout,
        () => <PantallaAyuda inicial={addrParams.seccion}/>
    );
};
