import * as React from 'react';
import {AppBar, Box, Button, Drawer, IconButton, Paper, Stack, Toolbar, Typography} from '@mui/material';
import {Close, HelpOutline, Menu as MenuIcon, OpenInNew} from '@mui/icons-material';

import {useSalida} from './contexto-base';
import {volverAlMenu} from '../render-connected-app-inventario';
import {tituloDePagina} from './formato-valores';
import {seccionDeAyuda} from '../ayuda/manual';
import {TextoDeAyuda} from '../ayuda/texto-de-ayuda';

function PanelDeAyuda({inicial, onCerrar}:{inicial:string, onCerrar:() => void}){
    const [clave, setClave] = React.useState(inicial);
    const seccion = seccionDeAyuda(clave);
    return <Box sx={{width:{xs:'100vw', sm:480}, p:2}}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{mb:2}}>
            <Button
                size="small"
                startIcon={<OpenInNew/>}
                href={`${location.pathname}${location.search}#w=ayuda&seccion=${seccion.clave}`}
                target="_blank"
            >
                Abrir el manual completo
            </Button>
            <Box sx={{flex:1}}/>
            <IconButton aria-label="cerrar la ayuda" title="Cerrar" onClick={onCerrar}><Close/></IconButton>
        </Stack>
        <TextoDeAyuda texto={seccion.texto} onSeccion={setClave}/>
    </Box>;
}

export function PantallaInventario({titulo, ayuda, children}:{titulo:React.ReactNode, ayuda?:string, children:React.ReactNode}){
    const solicitarSalida = useSalida();
    const [ayudaAbierta, setAyudaAbierta] = React.useState(false);
    React.useEffect(() => {
        document.title = tituloDePagina(titulo);
    }, [titulo]);
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
                <Typography variant="h6" component="h1" sx={{flex:1}}>{titulo}</Typography>
                {ayuda
                    ? <IconButton color="inherit" edge="end" aria-label="ayuda" title="Ayuda" onClick={() => setAyudaAbierta(true)}>
                        <HelpOutline/>
                    </IconButton>
                    : null}
            </Toolbar>
        </AppBar>
        {children}
        {ayuda
            ? <Drawer anchor="right" open={ayudaAbierta} onClose={() => setAyudaAbierta(false)}>
                <PanelDeAyuda key={ayuda} inicial={ayuda} onCerrar={() => setAyudaAbierta(false)}/>
            </Drawer>
            : null}
    </Paper>;
}
