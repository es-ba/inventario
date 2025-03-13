import * as React from "react";
import { useState, useCallback } from "react";
import { TextField, Button, Box, MenuItem, Chip, Typography, Stack, Paper } from "@mui/material";
import { useInventario } from "../contexts/inventario-contexto";

interface FiltroBusquedaProps {
  campos?: string[];
}

export function FiltroBusqueda({ campos = [] }: FiltroBusquedaProps) {
  const { filters, addFilter, removeFilter, clearAllFilters } = useInventario();
  const [campo, setCampo] = useState<string>("");
  const [valor, setValor] = useState<string>("");

  const camposDisponibles = campos.length > 0 ? campos : [
    "ficha",
    "serie",
    "espacio",
    "area",
    "responsable",
    "grupo",
    "detalle",
    "observacion",
    "estado"
  ];

  const handleCampoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCampo(e.target.value);
  }, []);

  const handleValorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValor(e.target.value);
  }, []);

  const handleFilterApply = useCallback(() => {
    if (campo && valor) {
      addFilter({ campo, valor });
      setValor(""); // Clear only the value field for quick consecutive filters
    }
  }, [campo, valor, addFilter]);

  const handleClearAll = useCallback(() => {
    setCampo("");
    setValor("");
    clearAllFilters();
  }, [clearAllFilters]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFilterApply();
    }
  }, [handleFilterApply]);

  const getFieldDisplayName = useCallback((fieldName: string) => {
    return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  }, []);

  return (
    <Paper elevation={0} sx={{ p: 2, mb: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
      <Typography variant="h6" gutterBottom>Filtros de búsqueda</Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Campo a filtrar"
          name="campo"
          value={campo}
          onChange={handleCampoChange}
          margin="normal"
          size="small"
          sx={{ mr: 2, minWidth: 200 }}
        >
          {camposDisponibles.map((option) => (
            <MenuItem key={option} value={option}>
              {getFieldDisplayName(option)}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Valor a buscar"
          name="valor"
          value={valor}
          onChange={handleValorChange}
          onKeyPress={handleKeyPress}
          margin="normal"
          size="small"
          sx={{ flexGrow: 1, mr: 2 }}
          InputProps={{
            startAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                <span className="mdi mdi-magnify" style={{ fontSize: '24px' }}></span>
              </Box>
            ),
          }}
        />

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleFilterApply}
            disabled={!campo || !valor}
            size="small"
          >
            Agregar filtro
          </Button>
          
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleClearAll}
            disabled={filters.length === 0}
            size="small"
          >
            Limpiar todo
          </Button>
        </Box>
      </Box>

      {filters.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Filtros activos:</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {filters.map(filter => (
              <Chip
                key={filter.id}
                label={`${getFieldDisplayName(filter.campo)}: ${filter.valor}`}
                onDelete={() => removeFilter(filter.id)}
                color="primary"
                variant="outlined"
                size="small"
              />
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );
}
