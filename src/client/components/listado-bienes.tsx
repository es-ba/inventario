import { DataGrid, GridRowsProp, GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { Box, Tabs, Tab, TextField, IconButton, Modal } from '@mui/material';
import * as React from "react";
import { Link } from 'react-router-dom';
import TabPanel from '../common/tabpanel';
import DetalleBien from "./detalle-bien";

interface ListadoBienesProps {
    bienes: Bien[];
}

function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

export function ListadoBienes({ bienes }: ListadoBienesProps) {
    const [bienTab, setBienesTab] = React.useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedBien, setSelectedBien] = useState<Bien | null>(null);

    // @ts-ignore
    const handleBienesTab = (event: React.SyntheticEvent, newValue: number) => {
        setBienesTab(newValue);
    };

    const handleOpenModal = (bien: Bien) => {
        setSelectedBien(bien);
        setModalOpen(true);
    };

    const handleClose = () => setModalOpen(false);

    const columns: GridColDef[] = [
        { field: 'ficha', headerName: 'Ficha' },
        { field: 'serie', headerName: 'Serie' },
        { field: 'espacio', headerName: 'Espacio' },
        { field: 'area', headerName: 'Área' },
        { field: 'responsable', headerName: 'Responsable' },
        { field: 'grupo', headerName: 'Grupo' },
        { field: 'detalle', headerName: 'Detalle' },
        { field: 'observacion', headerName: 'Observación' },
        {
            field: "opciones",
            headerName: "Opciones",
            width: 150,
            renderCell: (params) => {
                const ficha = params.row.ficha;
                const bien = params.row;
                return (
                    <>
                        <IconButton
                            component={Link}
                            to={`${baseUrl}/react/bien/edit/${ficha}`}
                        >
                            <span className="mdi mdi-pencil"></span>
                        </IconButton>
                        <IconButton
                            onClick={() => handleOpenModal(bien)}
                        >
                            <span className="mdi mdi-eye"></span>
                        </IconButton>
                    </>
                );
            },
        },
    ];

    console.log(bienes);
    const rows: GridRowsProp = bienes.map((bien, index) => ({
        id: index + 1,
        ...bien,
        opciones: "",
    }));

    return (
        <>
            <div className="componente-pantalla">
                <Box sx={{ width: '100%' }}>
                    <Box className="tabs-container" sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs className="tabs" value={bienTab} onChange={handleBienesTab} aria-label="basic tabs example">
                            <Tab
                                label={
                                    <div className="tab-label">
                                        <div className="tab-number" style={{ fontSize: '20px', fontWeight: 'bold' }}>3.200</div>
                                        <div className="tab-text">Bienes activos</div>
                                    </div>
                                }
                                {...a11yProps(0)}
                            />
                            <Tab
                                label={
                                    <div className="tab-label">
                                        <div className="tab-number" style={{ fontSize: '20px', fontWeight: 'bold' }}>500</div>
                                        <div className="tab-text">Bienes en baja</div>
                                    </div>
                                }
                                {...a11yProps(1)}
                            />
                            <Tab
                                label={
                                    <div className="tab-label">
                                        <div className="tab-number" style={{ fontSize: '20px', fontWeight: 'bold' }}>3.700</div>
                                        <div className="tab-text">Total de bienes</div>
                                    </div>
                                }
                                {...a11yProps(2)}
                            />
                        </Tabs>
                    </Box>
                    <TabPanel value={bienTab} index={0}>
                        <div><h6 style={{ marginTop: 'auto', marginBottom: '2px', color: '#474747' }}>Filtros de busqueda</h6></div>
                        <div style={{ marginBottom: '30px' }}>
                            <TextField label="Seleccionar filtro" name="filtro" margin="normal" />
                            <TextField
                                style={{ marginLeft: '20px' }}
                                label="Agregar filtro de busqueda"
                                name="filtro-busqueda"
                                margin="normal"
                                InputProps={{
                                    startAdornment: (
                                        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '8px' }}>
                                            <span className="mdi mdi-magnify" style={{ fontSize: '24px' }}></span>
                                        </div>
                                    ),
                                }}
                            />
                        </div>
                        <div>
                            <DataGrid rows={rows} columns={columns} />
                        </div>
                    </TabPanel>
                    <TabPanel value={bienTab} index={1}>
                        <div><h6 style={{ marginTop: 'auto', marginBottom: '2px', color: '#474747' }}>Filtros de busqueda</h6></div>
                        <div style={{ marginBottom: '30px' }}>
                            <TextField label="Seleccionar filtro" name="filtro" margin="normal" />
                            <TextField
                                style={{ marginLeft: '20px' }}
                                label="Agregar filtro de busqueda"
                                name="filtro-busqueda"
                                margin="normal"
                                InputProps={{
                                    startAdornment: (
                                        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '8px' }}>
                                            <span className="mdi mdi-magnify" style={{ fontSize: '24px' }}></span>
                                        </div>
                                    ),
                                }}
                            />
                        </div>
                        <div>
                            <DataGrid rows={rows} columns={columns} />
                        </div>
                    </TabPanel>
                    <TabPanel value={bienTab} index={2}>
                    </TabPanel>
                </Box>
            </div>
            <Modal open={modalOpen} onClose={handleClose}>
                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4 }}>
                    {selectedBien && <DetalleBien bien={selectedBien} />}
                </Box>
            </Modal>
        </>
    );
}