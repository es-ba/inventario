import * as React from "react";
import * as ReactDOM from "react-dom";
import { useEffect, useState } from "react";

import {
    AppBar, Button, IconButton,
    // Link,
    List, ListItem, ListItemText, 
    Paper, 
    SwipeableDrawer,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Toolbar, Typography
} from "@mui/material";


// @ts-ignore 
var my=myOwn;

type Bien = {
    ficha:string
    observacion:string
    integrado:string
    fecha:Date
}

async function fetchBienes() {
    const response = await my.ajax.traer_bienes();
    if (Array.isArray(response)) {
        return response;
    } else {
        return [response];
    }
}


// @ts-ignore ejemplo_publicaciones viene sin tipo y es una global
var bieness:Bien[]=[
    {
        ficha:'1',
        observacion: 'observciones del bien 1',
        integrado: 'no sé qué es esto',
        fecha:'2024-06-14'
    },
    {
        ficha:'2',
        observacion: 'observciones del bien 3',
        integrado: 'no sé qué es esto otro',
        fecha:'2024-06-13'
    },

].map(bien=>({...bien, fecha:new Date(bien.fecha)}))

function AppPrincipalOk(){
    var [menuOpened, setMenuOpened] = useState(false);
    const [bieness, setBieness] = useState<Bien[]>([]);

    useEffect(() => {
        async function loadBienes() {
            const bienes = await fetchBienes();
            console.log(bienes)
            setBieness(bienes.map((bien: Bien) => ({ ...bien})));
        }
        loadBienes();
    }, []);

    return <>
        <AppBar position="static">
            <Toolbar>
                <IconButton edge="start" color="inherit" aria-label="menu"  onClick={()=>setMenuOpened(true)}>
                    ≡
                </IconButton>
            <Typography>
                Inventario
            </Typography>
            <Button color="inherit"></Button>
            </Toolbar>
        </AppBar>
        <div className="pantalla">
        <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Ficha</TableCell>
                            <TableCell>Integrado</TableCell>
                            {/* <TableCell>Fecha</TableCell> */}
                            <TableCell>Observación</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bieness.map(bien => (
                            <TableRow key={bien.ficha}>
                                <TableCell>{bien.ficha}</TableCell>
                                <TableCell>{bien.integrado}</TableCell>
                                {/* <TableCell>{bien.fecha.toLocaleDateString()}</TableCell> */}
                                <TableCell>{bien.observacion}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
        <div className="seccion-final"></div>
        <SwipeableDrawer  
            open={menuOpened}
            onClose={()=>setMenuOpened(false)}
            onOpen={()=>setMenuOpened(true)}
        >
            <div
                role="presentation"
                onClick={()=>setMenuOpened(false)}
                onKeyDown={()=>setMenuOpened(false)}
            >
                <List>
                    <ListItem button 
                        onClick={()=>{
                            setMenuOpened(false);
                        }}
                    >
                        <ListItemText primary="administrar" 
                            onClick={()=>{
                                window.location.href="./login"
                            }}
                        />
                    </ListItem>
               </List>
            </div>
        </SwipeableDrawer>
    </>;
}


class DmCaptureError extends React.Component<
    {children:any},
    {hasError:boolean, error:Error|{message:string}, info?:any}
>{
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

function AppPrincipal(){
    return <DmCaptureError>
        <AppPrincipalOk />
    </DmCaptureError>
}

export function mostrarPrincipal(){
    console.log('mostrarprincipal')
    document.documentElement.setAttribute('letra','chica');
    ReactDOM.render(
        <AppPrincipal/>, 
        document.getElementById('main_layout')
    )
}

// @ts-ignore addrParams tiene un tipo que acá no importa
export async function pantallaPrincipal(_addrParams){
    mostrarPrincipal();
}

if(typeof window !== 'undefined'){
    // @ts-ignore para hacerlo
    window.pantallaPrincipal = pantallaPrincipal;
}
