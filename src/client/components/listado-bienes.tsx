import * as React from "react";
import { useMemo, useState, useEffect } from 'react';
import { DataGrid, GridRowsProp, GridColDef } from '@mui/x-data-grid';
import { IconButton, CircularProgress } from '@mui/material';
import { Link } from 'react-router-dom';

interface ListadoBienesProps {
    onViewDetails: (bien: Bien) => void;
    filterCriteria?: (bien: Bien) => boolean;
}

export function ListadoBienes({ onViewDetails, filterCriteria }: ListadoBienesProps) {
    const [bienes, setBienes] = useState<Bien[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const response = await my.ajax.traer_bienes();
                setBienes(response.map((bien: Bien) => ({ ...bien })));
            } catch (err) {
                setError(err instanceof Error ? err : new Error(String(err)));
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const filteredBienes = useMemo(() => {
        if (filterCriteria) {
            return bienes.filter(filterCriteria);
        }
        return bienes;
    }, [bienes, filterCriteria]);

    const columns: GridColDef[] = useMemo(() => [
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
                            onClick={() => onViewDetails(bien)}
                        >
                            <span className="mdi mdi-eye"></span>
                        </IconButton>
                    </>
                );
            },
        },
    ], [onViewDetails]);

    const rows: GridRowsProp = useMemo(() => 
        filteredBienes.map((bien, index) => ({
            id: index + 1,
            ...bien,
            opciones: "",
        }))
    , [filteredBienes]);

    if (loading) return <CircularProgress />;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <div style={{ width: '100%', height: 400 }}>
            <DataGrid rows={rows} columns={columns} />
        </div>
    );
}