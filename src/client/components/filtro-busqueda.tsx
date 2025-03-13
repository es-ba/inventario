import * as React from "react";
import { useState, useCallback } from "react";
import { TextField, Button, Box, MenuItem } from "@mui/material";

interface FiltroBusquedaProps {
  onFilterChange: (filters: FilterCriteria) => void;
  campos?: string[];
}

export interface FilterCriteria {
  campo: string;
  valor: string;
}

export function FiltroBusqueda({ onFilterChange, campos = [] }: FiltroBusquedaProps) {
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
      onFilterChange({ campo, valor });
    }
  }, [campo, valor, onFilterChange]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFilterApply();
    }
  }, [handleFilterApply]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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
        sx={{ flexGrow: 1 }}
        InputProps={{
          startAdornment: (
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
              <span className="mdi mdi-magnify" style={{ fontSize: '24px' }}></span>
            </Box>
          ),
        }}
      />

      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleFilterApply}
        sx={{ ml: 2, height: 40, alignSelf: 'center', mt: 1 }}
      >
        Buscar
      </Button>
    </Box>
  );
}
