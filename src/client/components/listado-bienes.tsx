import { DataGrid, GridRowsProp, GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { Box, Tabs, Tab, TextField, IconButton } from '@mui/material';
import * as React from "react";
import TabPanel from './common/tabpanel';

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

interface ListadoBienesProps {
    bienes: Bien[];
}

function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

// @ts-ignore
export function ListadoBienes({ bienes }: ListadoBienesProps) {
    // const [bienes, setBienes] = useState<Bien[]>([]);
    // @ts-ignore
    const [bien, setBien] = useState<Bien>(bienMockup);
    const [bienTab, setBienesTab] = React.useState(0);

    // @ts-ignore
    const handleBienesTab = (event: React.SyntheticEvent, newValue: number) => {
        setBienesTab(newValue);
    };

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
    {id :2 , ficha: '9874359875489', serie: 'B385788', espacio: '302', area:"(1432) DI ADMINISTRACION", responsable: "(244) DANERI, ANA", grupo: "SIM", detalle:"LINEA 1158236954", opciones:"", },
    {id :3 , ficha: '9874359875489', serie: 'B385788', espacio: '302', area:"(1432) DI ADMINISTRACION", responsable: "(244) DANERI, ANA", grupo: "SIM", detalle:"LINEA 1158236954", opciones:"", },
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
            <TabPanel value={bienTab} index={0}>
                {/* AGREGUE ESTOS TEXT FIELD SEGURO HAYA QUE HACERLO MEJOR */}
                <div><h6 style={{ marginTop:'auto', marginBottom: '2px', color: '#474747' }}>Filtros de busqueda</h6></div>
                <div style={{ marginBottom: '30px' }}>
                    <TextField label="Seleccionar filtro" name="filtro" margin="normal"/>
                    <TextField style={{ marginLeft: '20px' }} label="Agregar filtro" name="filtro-busqueda" margin="normal"/>
                </div>
                <div>
                    <DataGrid rows={rows} columns={columns}/>
                </div>
            </TabPanel>
            <TabPanel value={bienTab} index={1}>
                <div><h6 style={{ marginTop:'auto', marginBottom: '2px', color: '#474747' }}>Filtros de busqueda</h6></div>
                <div style={{ marginBottom: '30px' }}>
                    <TextField label="Seleccionar filtro" name="filtro" margin="normal"/>
                    {/* <TextField style={{ marginLeft: '20px' }} label="Agregar filtro" name="filtro-busqueda" margin="normal"/> */}
                    <TextField
                    style={{ marginLeft: '20px' }}
                    label="Agregar filtro de busqueda"
                    name="filtro-busqueda"
                    margin="normal"
                    InputProps={{
                    startAdornment: (
            <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '8px' }}>
                <span className="mdi mdi-magnify" style={{ fontSize: '24px'}}></span>
            </div>
        ),
    }}
/>
                </div>
                <TextField id="ficha" value={bien.ficha} label="Ficha" variant="standard" />
                <TextField id="serie" value={bien.serie} label="Serie" variant="standard" />
                <TextField id="espacio" value={bien.espacio} label="Espacio" variant="standard" />
                <TextField id="area" value={bien.area} label="Área" variant="standard" />
                <TextField id="responsable" value={bien.responsable} label="Responsable" variant="standard" />
                <TextField id="grupo" value={bien.grupo} label="Grupo" variant="standard" />
                <TextField id="detalles" value={bien.detalle} label="Detalles" variant="standard" />
                {/* <TextField id="opciones" value={bien.opciones} label="Opciones" variant="standard" /> */}
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
        <TextField 
            id="opciones" 
            value={bien.opciones} 
            label="Opciones" 
            variant="standard" 
            style={{ flexGrow: 1 }}
        />
        <IconButton>
        <span className="mdi mdi-pencil"></span>
        </IconButton>
        <IconButton>
        <span className="mdi mdi-eye"></span>
        </IconButton>
    </div>
                <div>
                <DataGrid rows={rows} columns={columns}/>
                </div>
              
            
            </TabPanel>
            <TabPanel value={bienTab} index={2}>

            </TabPanel>
            </Box>
            </div>
    </>
}