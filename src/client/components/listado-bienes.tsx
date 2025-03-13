import * as React from "react";
import { useMemo, useState, useEffect } from 'react';
import { DataGrid, GridRowsProp, GridColDef } from '@mui/x-data-grid';
import { IconButton, CircularProgress, Box, Typography, Paper } from '@mui/material';
import { Link } from 'react-router-dom';
import { FiltroBusqueda } from './filtro-busqueda';
import { useInventario } from '../contexts/inventario-contexto';

interface ListadoBienesProps {
    onViewDetails: (bien: Bien) => void;
    filterCriteria?: (bien: Bien) => boolean;
    onResultsCount?: (count: number) => void;
}

export function ListadoBienes({ onViewDetails, filterCriteria, onResultsCount }: ListadoBienesProps) {
    const [bienes, setBienes] = useState<Bien[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const { filters } = useInventario();
    
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
        let result = bienes;
        
        if (filters.length > 0) {
            result = result.filter(bien => {
                return filters.every(filter => {
                    const fieldValue = bien[filter.campo as keyof Bien];
                    return fieldValue && 
                           typeof fieldValue === 'string' && 
                           fieldValue.toLowerCase().includes(filter.valor.toLowerCase());
                });
            });
        }
        
        // Apply prop filter if any
        if (filterCriteria) {
            result = result.filter(filterCriteria);
        }
        
        return result;
    }, [bienes, filters, filterCriteria]);

    useEffect(() => {
        if (onResultsCount && !loading) {
            onResultsCount(filteredBienes.length);
        }
    }, [filteredBienes, onResultsCount, loading]);

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
                            size="small"
                        >
                            <span className="mdi mdi-pencil"></span>
                        </IconButton>
                        <IconButton
                            onClick={() => onViewDetails(bien)}
                            size="small"
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
        <>
            <FiltroBusqueda />
            
            <Paper elevation={0} sx={{ p: 2, backgroundColor: 'transparent' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                        Mostrando {filteredBienes.length} de {bienes.length} bienes
                    </Typography>
                    
                    {filters.length > 0 && filteredBienes.length !== bienes.length && (
                        <Typography variant="body2" color="text.secondary">
                            {Math.round((filteredBienes.length / bienes.length) * 100)}% del total
                        </Typography>
                    )}
                </Box>
                
                <div style={{ height: 400, width: '100%' }}>
                    <DataGrid 
                        rows={rows} 
                        columns={columns}
                        disableRowSelectionOnClick
                        autoHeight
                        density="compact"
                        pageSizeOptions={[10, 25, 50, 100]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 25 } },
                        }}
                    />
                </div>
            </Paper>
        </>
    );
}