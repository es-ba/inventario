import * as React from "react";
import { useState, useEffect } from 'react';
import { Fab } from '@mui/material';
import { ListadoBienes } from "../components/listado-bienes";
import { Link } from "react-router-dom";

function useFetchBienes() {
    const [bienes, setBienes] = useState<Bien[]>([]);
    
    useEffect(() => {
        async function fetchData() {
            const response = await my.ajax.traer_bienes();
            setBienes(response.map((bien: Bien) => ({ ...bien })));
        }
        fetchData();
    }, []);
    
    return bienes;
}

function BienesPage() {
    const bienes = useFetchBienes();

    return (
        <div>
        <h1>Bienes</h1>
        <ListadoBienes bienes={bienes} />
        <div className="seccion-final"></div>
            <Fab color="primary" aria-label="add" component={Link}
                    to={`${baseUrl}/react/bien/add`}>
            <div style={{ fontSize: '24px' }}>+</div>
            </Fab>
        </div>
    );
}

export default BienesPage;
