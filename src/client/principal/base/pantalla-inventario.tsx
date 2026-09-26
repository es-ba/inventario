import * as React from 'react';
import {AppBar, IconButton, Paper, Toolbar, Typography} from '@mui/material';
import {Menu as MenuIcon} from '@mui/icons-material';

import {useSalida} from './contexto-base';
import {volverAlMenu} from '../render-connected-app-inventario';

export function PantallaInventario({titulo, children}:{titulo:React.ReactNode, children:React.ReactNode}){
    const solicitarSalida = useSalida();
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
                <Typography variant="h6" component="h1">{titulo}</Typography>
            </Toolbar>
        </AppBar>
        {children}
    </Paper>;
}
