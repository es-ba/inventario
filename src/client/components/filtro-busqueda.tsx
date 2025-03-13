import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { TextField, Button, Box, MenuItem } from "@mui/material";
import { useInventario, FilterCriteria } from "../contexts/inventario-contexto";

interface FiltroBusquedaProps {
  onFilterChange?: (filters: FilterCriteria) => void;
  campos?: string[];
}

export function FiltroBusqueda({ onFilterChange, campos = [] }: FiltroBusquedaProps) {
  const { filter, setFilter } = useInventario();
  const [campo, setCampo] = useState<string>(filter?.campo || "");
  const [valor, setValor] = useState<string>(filter?.valor || "");

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

  useEffect(() => {
    if (filter) {
      setCampo(filter.campo);
      setValor(filter.valor);
    }
  }, [filter]);

  const handleCampoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCampo(e.target.value);
  }, []);

  const handleValorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValor(e.target.value);
  }, []);

  const handleFilterApply = useCallback(() => {
    if (campo && valor) {
      const newFilter = { campo, valor };
      setFilter(newFilter);
      if (onFilterChange) {
        onFilterChange(newFilter);
      }
    }
  }, [campo, valor, setFilter, onFilterChange]);

  const handleClearFilter = useCallback(() => {
    setCampo("");
    setValor("");
    setFilter(null);
    if (onFilterChange) {
      onFilterChange({ campo: "", valor: "" });
    }
  }, [setFilter, onFilterChange]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFilterApply();
    }
  }, [handleFilterApply]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
      <TextField
        select
        label="Campo a filtrar"
        name="campo"
        value={campo}
        onChange={handleCampoChange}
        margin="normal"
        sx={{ mr: 2, minWidth: 200 }}
      >
        {camposDisponibles.map((option) => (
          <MenuItem key={option} value={option}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
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
        sx={{ flexGrow: 1, mr: 2 }}
        InputProps={{
          startAdornment: (
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
              <span className="mdi mdi-magnify" style={{ fontSize: '24px' }}></span>
            </Box>
          ),
        }}
      />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleFilterApply}
        >
          Buscar
        </Button>
        
        <Button 
          variant="outlined" 
          color="secondary" 
          onClick={handleClearFilter}
        >
          Limpiar
        </Button>
      </Box>
    </Box>
  );
}
