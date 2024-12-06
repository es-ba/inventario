import * as React from "react";
import * as ReactDOM from "react-dom";
import { useEffect, useState } from "react";

import {
    AppBar, Box, Fab, IconButton,
    // Link,
    List, ListItem, ListItemText, 
    Modal, 
    Paper, 
    SwipeableDrawer,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Toolbar, Typography,
    Tabs,
    Tab,
    TextField
} from "@mui/material";

import AgregarBien from "./formulario-bien";


// @ts-ignore 
var my=myOwn;

type Bien = {
    ficha:string
    observacion:string
    integrado?:string
    fecha?:string
}

async function fetchBienes() {
    const response = await my.ajax.traer_bienes();
    return response;
}

// @ts-ignore ejemplo_publicaciones viene sin tipo y es una global
var bieness:Bien[]=[
    {
        ficha:'1',
        observacion: 'observciones del bien 1',
        integrado: 'no sé qué es esto',
        fecha:'2024-06-14',

    },
    {
        ficha:'2',
        observacion: 'observciones del bien 3',
        integrado: 'no sé qué es esto otro',
        fecha:'2024-06-13'
    },

].map(bien=>({...bien, fecha:new Date(bien.fecha)}))

var bienMockup:Bien = {
    ficha: '9874359875489',
    observacion: 'observacion'
 }

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
  }

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
      </div>
    );
  }

  function a11yProps(index: number) {
    return {
      id: `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`,
    };
  }

function AppPrincipalOk(){
    var [menuOpened, setMenuOpened] = useState(false);
    var [subtitle, setSubtitle]= useState("");
    const [bienes, setBienes] = useState<Bien[]>([]);
    // @ts-ignore
    const [bien, setBien] = useState<Bien>(bienMockup);
    const [modalOpen, setModalOpen] = useState(false);
    const [pantallaActual, setPantallaActual] = useState("listado");
    
    const [bienTab, setBienesTab] = React.useState(0);

    
    // @ts-ignore
    const handleBienesTab = (event: React.SyntheticEvent, newValue: number) => {
        setBienesTab(newValue);
    };

    useEffect(() => {
        setSubtitle('Listado de bienes')
        async function traerBienes() {
            const bienes = await fetchBienes();
            setBienes(bienes.map((bien: Bien) => ({ ...bien})));
        }
        traerBienes();
        setBien(bienMockup);
    }, []);

    const handleInsert = (nuevoBien: Bien) => {
        setBienes([...bienes, { ...nuevoBien }]);
    };

    const handleOpen = () => setModalOpen(true);
    const handleClose = () => setModalOpen(false);

    // metodo para mostrar en 'pantalla' en base al valor de pantallaActual
    const renderPantallaActual = () => {
        switch (pantallaActual) {
            case "listado":
                return (
                    <div>
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
                                        {bienes.map(bien => (
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
                );
            case "bien":
                return <div>
                    <Box sx={{ width: '100%' }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={bienTab} onChange={handleBienesTab} aria-label="basic tabs example">
                            <Tab label="Item One" {...a11yProps(0)} />
                            <Tab label="Item Two" {...a11yProps(1)} />
                            <Tab label="Item Three" {...a11yProps(2)} />
                            </Tabs>
                        </Box>
                        <CustomTabPanel value={bienTab} index={0}>
                            
                            <TextField id="ficha" value={bien.ficha} label="ficha" variant="standard" />
                        </CustomTabPanel>
                        <CustomTabPanel value={bienTab} index={1}>
                            Item Two
                        </CustomTabPanel>
                        <CustomTabPanel value={bienTab} index={2}>
                            Item Three
                        </CustomTabPanel>
                        </Box>

                </div>;
            default:
                return <div>no se encontro la pantalla</div>;
        }
    };

    return <>
        <AppBar position="static">
            <Toolbar>
                <IconButton edge="start" color="inherit" aria-label="menu"  onClick={()=>setMenuOpened(true)}>
                    ≡
                </IconButton>
                <Typography>
                    {subtitle}
                </Typography>
            </Toolbar>
        </AppBar>
        <div className="pantalla">
        {/* aca va el contenido de la pantalla */}
        {renderPantallaActual()}
        </div>
        <div className="seccion-final"></div>
        <Fab color="primary" aria-label="add" onClick={handleOpen}>

        </Fab>
        
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
                    {/* items del menu */}
                    <ListItem 
                        onClick={()=>{
                            setMenuOpened(false);
                        }}
                    >
                        <ListItemText primary="Listado" 
                            onClick={()=>{
                                setPantallaActual("listado");
                            }}
                        />
                    </ListItem>
                    <ListItem 
                        onClick={()=>{
                            setMenuOpened(false);
                        }}
                    >
                        <ListItemText primary="Bien" 
                            onClick={()=>{
                                
                                setPantallaActual("bien");
                            }}
                        />
                    </ListItem>
                    <ListItem 
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
        <Modal open={modalOpen} onClose={handleClose}>
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4 }}>
                <AgregarBien onInsert={handleInsert} />
            </Box>
        </Modal>
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
