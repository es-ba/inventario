import * as React from "react";
import { useState, useCallback } from 'react';
import { Fab, Box, Tabs, Tab, TextField, Modal } from '@mui/material';
import { ListadoBienes } from "../components/listado-bienes";
import DetalleBien from "../components/detalle-bien";
import TabPanel from '../common/tabpanel';
import { Link } from "react-router-dom";

function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

function BienesPage() {
    const [bienTab, setBienesTab] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedBien, setSelectedBien] = useState<Bien | null>(null);

    // @ts-ignore
    const handleBienesTab = useCallback((event: React.SyntheticEvent, newValue: number) => {
        setBienesTab(newValue);
    }, []);

    const handleViewDetails = useCallback((bien: Bien) => {
        setSelectedBien(bien);
        setModalOpen(true);
    }, []);

    const handleModalClose = useCallback(() => {
        setModalOpen(false);
    }, []);

    return (
        <div>
            <h1>Bienes</h1>
            
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
                    <ListadoBienes onViewDetails={handleViewDetails} />
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
                    <ListadoBienes 
                        onViewDetails={handleViewDetails} 
                        filterCriteria={(bien) => bien.observacion.includes("baja")}
                    />
                </TabPanel>
                <TabPanel value={bienTab} index={2}>
                    <ListadoBienes onViewDetails={handleViewDetails} />
                </TabPanel>
            </Box>

            <div className="seccion-final"></div>
            <Fab color="primary" aria-label="add" component={Link} to={`${baseUrl}/react/bien/add`}>
                <div style={{ fontSize: '24px' }}>+</div>
            </Fab>

            <Modal open={modalOpen} onClose={handleModalClose}>
                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4 }}>
                    {selectedBien && <DetalleBien bien={selectedBien} />}
                </Box>
            </Modal>
        </div>
    );
}

export default BienesPage;
