import * as React from "react";
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from "react";
import { DataGrid, GridRowsProp, GridColDef } from '@mui/x-data-grid';
import { BrowserRouter, Routes, Route, Link} from 'react-router-dom';
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
    TextField,
    //Autocomplete,
    //createFilterOptions,
    //MenuItem,
    //InputLabel,
    //FormHelperText,
    //FormControl,
    //Select,
    //NativeSelect,

} from "@mui/material";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// aca se importan y asigna la paleta de colores para los temas, es un array con el hue y el shade en el indice
import { purple } from '@mui/material/colors';

const theme = createTheme({
  palette: {
    primary: {
        main: purple[500]
    },
    secondary: {
        //o directamente
        main: '#f44336',
    },
  },
});


import AgregarBien from "./formulario-bien";


import _AgregarComprobante from "./formulario-comprobante";

// @ts-ignore 
var my=myOwn;

type Bien = {
    ficha:string
    observacion:string
    integrado?:string
    fecha?:string
    serie: string
    espacio:string
    area:string
    responsable:string
    grupo:string
    detalle:string
    opciones:string
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
        serie:'',
        espacio:''


    },
    {
        ficha:'2',
        observacion: 'observciones del bien 3',
        integrado: 'no sé qué es esto otro',
        fecha:'2024-06-13',
        serie:'',
        espacio:''
    },

].map(bien=>({...bien, fecha:new Date(bien.fecha)}))

var bienMockup:Bien = {
    ficha: '9874359875489',
    observacion: 'observacion',
    serie: "B385788",
    espacio:"302",
    area:"(1432) DI ADMINISTRACION",
    responsable:"(244) DANERI, ANA",
    grupo: "SIM",
    detalle: "LINEA 1158236954",
    opciones: ""
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

// @ts-ignore
function ListadoBienes(){
    const [bienes, setBienes] = useState<Bien[]>([]);
    const [bien, setBien] = useState<Bien>(bienMockup);
    const [modalOpen, setModalOpen] = useState(false);
    const [bienTab, setBienesTab] = React.useState(0);

    // @ts-ignore
    const handleBienesTab = (event: React.SyntheticEvent, newValue: number) => {
        setBienesTab(newValue);
    };

    useEffect(() => {
        // setSubtitle('Listado de bienes')
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

        //declaracion de las columnas, nombrres de campos y tipos
      const columns: GridColDef[] = [
        { field: 'ficha', headerName: 'Ficha' },
        { field: 'serie', headerName: 'Serie' },
        { field: 'espacio', headerName: 'Espacio' },
        { field: 'area', headerName: 'Área' },
        { field: 'responsable', headerName: 'Responsable' },
        { field: 'grupo', headerName: 'Grupo' },
        { field: 'detalle', headerName: 'Detalle' },
        { field: 'opciones', headerName: 'Opciones' },
      ];
      
      // valores de los bienes
      const rows: GridRowsProp = [
        {id :1 , ficha: '9874359875489', serie: 'B385788', espacio: '302', area:"(1432) DI ADMINISTRACION", responsable: "(244) DANERI, ANA", grupo: "SIM", detalle:"LINEA 1158236954", opciones:"", },
      ];
      

    return <>
    <div className="pantalla">
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={bienTab} onChange={handleBienesTab} aria-label="basic tabs example">
                <Tab label="Bienes Activos" {...a11yProps(0)} />
                <Tab label="Bienes en Baja" {...a11yProps(1)} />
                <Tab label="Total de Bienes" {...a11yProps(2)} />
                </Tabs>
            </Box>
            <CustomTabPanel value={bienTab} index={0}>
            {/* AGREGUE ESTOS TEXT FIELD SEGURO HAYA QUE HACERLO MEJOR */}
                <div><h6 style={{ marginTop:'auto', marginBottom: '2px', color: '#474747' }}>Filtros de busqueda</h6></div>
                <div style={{ marginBottom: '30px' }}>
                    <TextField label="Seleccionar filtro" name="filtro" margin="normal"/>
                    <TextField style={{ marginLeft: '20px' }} label="Agregar filtro" name="filtro-busqueda" margin="normal"/>
                </div>
                <div>
                    <DataGrid rows={rows} columns={columns}/>
                </div>
            </CustomTabPanel>
            <CustomTabPanel value={bienTab} index={1}>
                <div><h6 style={{ marginTop:'auto', marginBottom: '2px', color: '#474747' }}>Filtros de busqueda</h6></div>
                <div style={{ marginBottom: '30px' }}>
                    <TextField label="Seleccionar filtro" name="filtro" margin="normal"/>
                    <TextField style={{ marginLeft: '20px' }} label="Agregar filtro" name="filtro-busqueda" margin="normal"/>
                </div>
                <TextField id="ficha" value={bien.ficha} label="Ficha" variant="standard" />
                <TextField id="serie" value={bien.serie} label="Serie" variant="standard" />
                <TextField id="espacio" value={bien.espacio} label="Espacio" variant="standard" />
                <TextField id="area" value={bien.area} label="Área" variant="standard" />
                <TextField id="responsable" value={bien.responsable} label="Responsable" variant="standard" />
                <TextField id="grupo" value={bien.grupo} label="Grupo" variant="standard" />
                <TextField id="detalles" value={bien.detalle} label="Detalles" variant="standard" />
                <TextField id="opciones" value={bien.opciones} label="Opciones" variant="standard" />
            
            </CustomTabPanel>
            <CustomTabPanel value={bienTab} index={2}>
                
            </CustomTabPanel>
            </Box>
            </div>
            <div className="seccion-final"></div>
        <Fab color="primary" aria-label="add" onClick={handleOpen}>
        <div style={{ fontSize: '24px' }}>+</div>
        </Fab>
        <Modal open={modalOpen} onClose={handleClose}>
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4 }}>
                <AgregarBien onInsert={handleInsert} />
            </Box>
        </Modal>

    </>
}

// @ts-ignore
function ListadoBienesLegacy(){
    // @ts-ignore
    var [subtitle, setSubtitle]= useState("");
    const [bienes, setBienes] = useState<Bien[]>([]);
    // @ts-ignore
    const [bien, setBien] = useState<Bien>(bienMockup);
    const [modalOpen, setModalOpen] = useState(false);
    // @ts-ignore
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
                            <Tab label="Bienes Activos" {...a11yProps(0)} />
                            <Tab label="Bienes en Baja" {...a11yProps(1)} />
                            <Tab label="Total de Bienes" {...a11yProps(2)} />
                            </Tabs>
                        </Box>
                        <CustomTabPanel value={bienTab} index={0}>
                        {/* AGREGUE ESTOS TEXT FIELD SEGURO HAYA QUE HACERLO MEJOR */}
                            <div><h6 style={{ marginTop:'auto', marginBottom: '2px', color: '#474747' }}>Filtros de busqueda</h6></div>
                            <div style={{ marginBottom: '30px' }}>
                                <TextField label="Seleccionar filtro" name="filtro" margin="normal"/>
                                <TextField style={{ marginLeft: '20px' }} label="Agregar filtro" name="filtro-busqueda" margin="normal"/>
                            </div>
                            <div>
                            <TextField id="ficha" value={bien.ficha} label="Ficha" variant="standard" />
                            <TextField id="serie" value={bien.serie} label="Serie" variant="standard" />
                            <TextField id="espacio" value={bien.espacio} label="Espacio" variant="standard" />
                            <TextField id="area" value={bien.area} label="Área" variant="standard" />
                            <TextField id="responsable" value={bien.responsable} label="Responsable" variant="standard" />
                            <TextField id="grupo" value={bien.grupo} label="Grupo" variant="standard" />
                            <TextField id="detalles" value={bien.detalle} label="Detalles" variant="standard" />
                            <TextField id="opciones" value={bien.opciones} label="Opciones" variant="standard" />
                            </div>
                        </CustomTabPanel>
                        <CustomTabPanel value={bienTab} index={1}>
                            <div><h6 style={{ marginTop:'auto', marginBottom: '2px', color: '#474747' }}>Filtros de busqueda</h6></div>
                            <div style={{ marginBottom: '30px' }}>
                                <TextField label="Seleccionar filtro" name="filtro" margin="normal"/>
                                <TextField style={{ marginLeft: '20px' }} label="Agregar filtro" name="filtro-busqueda" margin="normal"/>
                            </div>
                            <TextField id="ficha" value={bien.ficha} label="Ficha" variant="standard" />
                            <TextField id="serie" value={bien.serie} label="Serie" variant="standard" />
                            <TextField id="espacio" value={bien.espacio} label="Espacio" variant="standard" />
                            <TextField id="area" value={bien.area} label="Área" variant="standard" />
                            <TextField id="responsable" value={bien.responsable} label="Responsable" variant="standard" />
                            <TextField id="grupo" value={bien.grupo} label="Grupo" variant="standard" />
                            <TextField id="detalles" value={bien.detalle} label="Detalles" variant="standard" />
                            <TextField id="opciones" value={bien.opciones} label="Opciones" variant="standard" />
                       
                        </CustomTabPanel>
                        <CustomTabPanel value={bienTab} index={2}>
                           
                        </CustomTabPanel>
                        </Box>

                </div>;
                case "Comprobantes":
                    return <div>
                     
                    
                        



                    </div>;
            default:
                return <div>no se encontro la pantalla</div>;
        }
    };

    return <>
        <div className="pantalla">
            {renderPantallaActual()}
        </div>
        <div className="seccion-final"></div>
        <Fab color="primary" aria-label="add" onClick={handleOpen}>
        <div style={{ fontSize: '24px' }}>+</div>
        </Fab>
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

interface LayoutProps {
    children?: React.ReactNode;
 }

const Layout: React.FC<LayoutProps> = ({ children }) => {
    
    return (
        <>
        abajo estan los children
        {children}
        </>
    );
}

export default Layout;

function MenuAppBar(props: {baseUrl: string, subtitle: string} = {baseUrl: "/", subtitle: "Subtitulo"}){
    const {baseUrl, subtitle} = props; 
    var [menuOpened, setMenuOpened] = useState(false);

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
        <nav>
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
                        <ListItemText
                    
                        />
                        <Link to={`${baseUrl}/react`}>Listado</Link>
                    </ListItem>
                    <ListItem 
                        onClick={()=>{
                            setMenuOpened(false);
                        }}
                    >

                        <ListItemText
                        />
                        <Link to={`${baseUrl}/react/grid`}>Grid</Link>
                    </ListItem>
                    <ListItem 
                        onClick={()=>{
                            setMenuOpened(false);
                        }}
                    >
                        <ListItemText primary="Bien" 
                            onClick={()=>{
                                
                            }}
                        />
                    </ListItem>
                    <ListItem 
                        onClick={()=>{
                            setMenuOpened(false);
                        }}
                    >
                        <ListItemText primary="Comprobantes" 
                            onClick={()=>{
                                
                            }}
                        />
                    </ListItem>
                    <ListItem 
                        onClick={()=>{
                            setMenuOpened(false);
                        }}
                    >
                        <ListItemText primary="Declaraciones" 
                            onClick={()=>{
                                
                            }}
                        />
                    </ListItem>
                    <ListItem 
                        onClick={()=>{
                            setMenuOpened(false);
                        }}
                    >
                        <ListItemText primary="Supervisión" 
                            onClick={()=>{
                                
                            }}
                        />
                    </ListItem>
                    <ListItem 
                        onClick={()=>{
                            setMenuOpened(false);
                        }}
                    >
                        <ListItemText primary="Papelera recupero" 
                            onClick={()=>{

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
        </nav>
        </>
}

function AppPrincipal(){
    //@ts-ignore
    const baseUrl = "/inventario";
    //consultar por la declaracion de la app, el themeprovider deberia englobarla pero funciona igual aca
    return <ThemeProvider theme={theme}>
        <CssBaseline />
        <DmCaptureError>
            <BrowserRouter>                
                <MenuAppBar baseUrl={baseUrl} subtitle="" />
                <Layout>

                    <Typography>nkjnkjfnsadlfnsdalkfjasdlkfjsd</Typography>
                </Layout>
                    {/* <nav>
                    
                        <Link to={`${baseUrl}/react`}>Home</Link>
                        <Link to={`${baseUrl}/react/grid`}>grid</Link>
                        
                    </nav> */}
                <Routes>
                    <Route path={`${baseUrl}/react`} element={<ListadoBienes />} />
                    {/* {<Route path={`${baseUrl}/react/grid`} element={<DataGrid rows={rows} columns={columns}/>} /> } */}
                </Routes>
                </BrowserRouter>       
        </DmCaptureError>
    </ThemeProvider>
}




export function mostrarPrincipal(){
    document.documentElement.setAttribute('letra','chica');
    const domNode = document.getElementById('total-layout')!;
    const root = createRoot(domNode);
    root.render(<AppPrincipal />);
}

