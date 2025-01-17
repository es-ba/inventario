import * as React from "react";
import { useState, useEffect } from 'react';
import { Box, Fab, Modal } from '@mui/material';
import { ListadoBienes } from "../components/listado-bienes";
import AgregarBien from "../components/detalle-bien";
import { Link } from "react-router-dom";

async function fetchBienes() {
    const response = await my.ajax.traer_bienes();
    return response;
}

function BienesPage() {
    //   const { bienes, loading, error, setBienes } = useFetchBienes();
    const [bienes, setBienes] = useState<Bien[]>([]);
    const [modalOpen, setModalOpen] = useState(false);

    const handleOpen = () => setModalOpen(true);
    const handleClose = () => setModalOpen(false);

    const handleInsert = (nuevoBien: Bien) => {
    setBienes([...bienes, nuevoBien]);
    handleClose();
    };

    useEffect(() => {
        // setSubtitle('Listado de bienes')
        async function traerBienes() {
            const bienes = await fetchBienes();
            setBienes(bienes.map((bien: Bien) => ({ ...bien})));
        }
        traerBienes();
        // setBien(bienMockup);
    }, []);

    //   if (loading) return <div>Cargando bienes...</div>;
    //   if (error) return <div>Error: {error}</div>;

    return (
        <div>
        <h1>Bienes</h1>
        <ListadoBienes bienes={bienes} />
        <div className="seccion-final"></div>
            <Fab color="primary" aria-label="add" component={Link}
                    to={`${baseUrl}/react/bien`}>
            <div style={{ fontSize: '24px' }}>+</div>
            </Fab>
            <Fab color="primary" aria-label="add" onClick={handleOpen}>
            <div style={{ fontSize: '24px' }}>*</div>
            </Fab>
            <Modal open={modalOpen} onClose={handleClose}>
                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4 }}>
                    <AgregarBien onInsert={handleInsert} />
                </Box>
            </Modal>
        </div>
    );
}

export default BienesPage;
