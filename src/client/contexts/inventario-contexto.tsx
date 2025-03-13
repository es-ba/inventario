import * as React from 'react';
import { createContext, useState, useContext, ReactNode, useEffect } from 'react';

export interface FilterCriteria {
  id: string;
  campo: string;
  valor: string;
}

interface InventarioContextType {
  filters: FilterCriteria[];
  addFilter: (filter: Omit<FilterCriteria, "id">) => void;
  removeFilter: (id: string) => void;
  clearAllFilters: () => void;
}

const STORAGE_PREFIX = 'inventario_';
const FILTERS_STORAGE_KEY = `${STORAGE_PREFIX}filters_state`;

const InventarioContexto = createContext<InventarioContextType | undefined>(undefined);

export function InventarioProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterCriteria[]>(() => {
    try {
      const storedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      return storedFilters ? JSON.parse(storedFilters) : [];
    } catch (error) {
      console.error('Error reading filters from localStorage:', error);
      return [];
    }
  });
  
  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
    }
  }, [filters]);
  
  const addFilter = (filter: Omit<FilterCriteria, "id">) => {
    const existingFilterIndex = filters.findIndex(f => f.campo === filter.campo);
    
    if (existingFilterIndex >= 0) {
      const newFilters = [...filters];
      newFilters[existingFilterIndex] = {
        ...filter,
        id: newFilters[existingFilterIndex].id
      };
      setFilters(newFilters);
    } else {
      setFilters([...filters, {
        ...filter,
        id: Date.now().toString()
      }]);
    }
  };
  
  const removeFilter = (id: string) => {
    setFilters(filters.filter(filter => filter.id !== id));
  };
  
  const clearAllFilters = () => {
    setFilters([]);
  };
  
  const contextValue: InventarioContextType = {
    filters,
    addFilter,
    removeFilter,
    clearAllFilters
  };
  
  return (
    <InventarioContexto.Provider value={contextValue}>
      {children}
    </InventarioContexto.Provider>
  );
}

export function useInventario() {
  const context = useContext(InventarioContexto);
  if (context === undefined) {
    throw new Error('useInventario no se puede usar fuera de InventarioContexto');
  }
  return context;
}
