import * as React from "react";
import { createRoot } from 'react-dom/client';
import { 
    ICON,
} from 'frontend-plus';
import { useState } from "react";
import { BrowserRouter, Link} from 'react-router-dom';
import {
    AppBar, IconButton,
    List, ListItem, ListItemButton, ListItemText, 
    SwipeableDrawer,
    Toolbar, Typography,
} from "@mui/material";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// aca se importan y asigna la paleta de colores para los temas, es un array con el hue y el shade en el indice
import { indigo } from '@mui/material/colors';
import _AgregarComprobante from "./components/formulario-comprobante";
import { AppRoutes } from "./routes";
import { InventarioProvider } from './contexts/inventario-contexto';

const theme = createTheme({
  palette: {
    primary: {
        main: indigo [400]
    },
    secondary: {
        main: '#f44336',
    },
  },
});

// @ts-ignore 
var my = myOwn;

class DmCaptureError extends React.Component<
    {children:any},
    {hasError:boolean, error:Error|{message:string}, info?:any}
> {
    constructor(props:{children:any}) {
        super(props);
        this.state = { hasError: false, error:{message:''} };
    }
    override componentDidCatch(error:Error, info:any){
        this.setState({ hasError: true , error, info });
    }
    override render(){
        if(this.state.hasError){
            return <>
                <Typography>Hubo un problema en la programación del dipositivo móvil.</Typography>
                <Typography>Error detectado:</Typography>
                <Typography>{this.state.error.message}</Typography>
                <Typography>{JSON.stringify(this.state.info)}</Typography>
            </>;
        }
        return this.props.children;
    }
}

interface LayoutProps {
    children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <>
        {children}
        </>
    );
}

export default Layout;

function MenuAppBar(props: {baseUrl: string, subtitle: string, setSubtitle?: (subtitle: string) => void} = {baseUrl: "/", subtitle: "Subtitulo"}) {
    const {baseUrl, subtitle, setSubtitle} = props; 
    var [menuOpened, setMenuOpened] = useState(false);

    return <>        
    <AppBar position="static">
        <Toolbar>
            <IconButton edge="start" color="inherit" aria-label="menu" onClick={()=>setMenuOpened(true)}>
                <ICON.Menu/>
            </IconButton>
            <Typography>
                {subtitle}
            </Typography>
        </Toolbar>
    </AppBar> 
    <SwipeableDrawer
      open={menuOpened}
      onClose={() => setMenuOpened(false)}
      onOpen={() => setMenuOpened(true)}
    >
      <div
        role="presentation"
        onClick={() => setMenuOpened(false)}
        onKeyDown={() => setMenuOpened(false)}
        style={{ width: 250 }}
      >
        <List>
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to={`${baseUrl}/react`}
              onClick={() => {
                if (setSubtitle) {
                  setSubtitle('Bienes');
                }
              }}
            >
              <ListItemText primary="Listado" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to={`${baseUrl}/react/grid`}
            >
              <ListItemText primary="Grid" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemText primary="Bien" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemText primary="Comprobantes" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemText primary="Declaraciones" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemText primary="Supervisión" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemText primary="Papelera recupero" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                window.location.href = './login';
              }}
            >
              <ListItemText primary="Administrar" />
            </ListItemButton>
          </ListItem>
        </List>
      </div>
    </SwipeableDrawer>
    </>;
}

function AppPrincipal(){
    //@ts-ignore
    const baseUrl = "/inventario";
    const [subtitle, setSubtitle] = useState('Inicio');
    return (
        <InventarioProvider>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <DmCaptureError>
                    <BrowserRouter>                
                        <MenuAppBar baseUrl={baseUrl} subtitle={subtitle} setSubtitle={setSubtitle} />
                        <Layout>
                            <AppRoutes />
                        </Layout>
                    </BrowserRouter>       
                </DmCaptureError>
            </ThemeProvider>
        </InventarioProvider>
    );
}

export function mostrarPrincipal(){
    document.documentElement.setAttribute('letra','chica');
    const domNode = document.getElementById('total-layout')!;
    const root = createRoot(domNode);
    root.render(<AppPrincipal />);
}

