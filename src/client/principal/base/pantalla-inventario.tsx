import * as React from 'react';
import {AppBar, Box, Button, Collapse, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Paper, Stack, Toolbar, Typography} from '@mui/material';
import {Close, ExpandLess, ExpandMore, HelpOutline, Home, Menu as MenuIcon, OpenInNew} from '@mui/icons-material';

import {useSalida} from './contexto-base';
import {vinculo} from '../render-connected-app-inventario';
import {EntradaDeNavegacion, entradasDeNavegacion, ItemDeMenu} from './navegacion';
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

type Salir = (destino:() => void) => void;

function EntradasDeNavegacion({entradas, nivel, salir}:{entradas:EntradaDeNavegacion[], nivel:number, salir:Salir}){
    const [abiertos, setAbiertos] = React.useState<Record<string, boolean>>({});
    return <>
        {entradas.map(entrada => entrada.hijos
            ? <React.Fragment key={entrada.clave}>
                <ListItemButton sx={{pl:2 + nivel * 2}} onClick={() => setAbiertos(a => ({...a, [entrada.clave]:!a[entrada.clave]}))}>
                    <ListItemText primary={entrada.etiqueta}/>
                    {abiertos[entrada.clave] ? <ExpandLess/> : <ExpandMore/>}
                </ListItemButton>
                <Collapse in={!!abiertos[entrada.clave]} unmountOnExit>
                    <EntradasDeNavegacion entradas={entrada.hijos} nivel={nivel + 1} salir={salir}/>
                </Collapse>
            </React.Fragment>
            : <ListItemButton key={entrada.clave} component="a" sx={{pl:2 + nivel * 2}} {...vinculo(entrada.hash!, salir)}>
                <ListItemText primary={entrada.etiqueta}/>
            </ListItemButton>
        )}
    </>;
}

function PanelDeNavegacion({salir}:{salir:Salir}){
    const entradas = React.useMemo(
        () => entradasDeNavegacion((myOwn as unknown as {config:{menu?:ItemDeMenu[]}}).config.menu ?? []),
        []
    );
    return <Box sx={{width:{xs:'85vw', sm:320}}}>
        <List component="nav" aria-label="navegación">
            <ListItemButton component="a" {...vinculo('', salir)}>
                <Home sx={{mr:1}}/>
                <ListItemText primary="Volver al menú" primaryTypographyProps={{fontWeight:'bold'}}/>
            </ListItemButton>
            <Divider/>
            <EntradasDeNavegacion entradas={entradas} nivel={0} salir={salir}/>
        </List>
    </Box>;
}

export function PantallaInventario({titulo, ayuda, children}:{titulo:React.ReactNode, ayuda?:string, children:React.ReactNode}){
    const solicitarSalida = useSalida();
    const [ayudaAbierta, setAyudaAbierta] = React.useState(false);
    const [navegacionAbierta, setNavegacionAbierta] = React.useState(false);
    const salirA = (destino:() => void) => {
        setNavegacionAbierta(false);
        solicitarSalida(destino);
    };
    React.useEffect(() => {
        document.title = tituloDePagina(titulo);
    }, [titulo]);
    return <Paper square elevation={0} sx={{minHeight:'100vh'}}>
        <AppBar position="static">
            <Toolbar>
                <IconButton
                    color="inherit"
                    edge="start"
                    aria-label="ir a otra pantalla"
                    title="Ir a otra pantalla"
                    onClick={() => setNavegacionAbierta(true)}
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
        <Drawer anchor="left" open={navegacionAbierta} onClose={() => setNavegacionAbierta(false)}>
            <PanelDeNavegacion salir={salirA}/>
        </Drawer>
        {ayuda
            ? <Drawer anchor="right" open={ayudaAbierta} onClose={() => setAyudaAbierta(false)}>
                <PanelDeAyuda key={ayuda} inicial={ayuda} onCerrar={() => setAyudaAbierta(false)}/>
            </Drawer>
            : null}
    </Paper>;
}
