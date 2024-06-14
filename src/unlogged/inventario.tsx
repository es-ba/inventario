import * as React from "react";
import * as ReactDOM from "react-dom";
import {useState} from "react";

import {
    AppBar, Button, IconButton,
    // Link,
    List, ListItem, ListItemText, 
    SwipeableDrawer,
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

// @ts-ignore ejemplo_publicaciones viene sin tipo y es una global
var bieness:Bien[]=bienes.map(bien=>({...bien, fecha:new Date(bien.fecha)}))

function AppPrincipalOk(props:{bieness:Bien[]}){
    var [menuOpened, setMenuOpened] = useState(false);
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
        {props.bieness.map(bien=>
            <div key={bien.ficha}>
                <Typography variant="h2">
                    {bien.integrado}
                </Typography>
                <Typography variant="body2" className="bien-fecha">
                    {bien.fecha.toLocaleDateString()}
                </Typography>
                {/* <Typography variant="body2" className="bien-autor">
                    {bien.autor}
                </Typography>
                {publicacion.vinculos.map(v=>(
                    <div key={v.orden} className="publicacion-vinculo">
                        <Link href={v.vinculo}>
                            {v.vinculo}
                        </Link>
                    </div>
                ))} */}
                <Typography variant="body1">
                    {bien.observacion}
                </Typography>
            </div>
        )}
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
        <AppPrincipalOk bieness={bieness}/>
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
