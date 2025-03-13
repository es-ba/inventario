import * as React from 'react';
import { createContext, useState, useContext, ReactNode, useEffect } from 'react';

export interface FilterCriteria {
  campo: string;
  valor: string;
}

interface InventarioContextType {
  filter: FilterCriteria | null;
  setFilter: (filter: FilterCriteria | null) => void;
  clearFilter: () => void;
}

const STORAGE_PREFIX = 'inventario_';
const FILTER_STORAGE_KEY = `${STORAGE_PREFIX}filter_state`;

const InventarioContexto = createContext<InventarioContextType | undefined>(undefined);

export function InventarioProvider({ children }: { children: ReactNode }) {
  const [filter, setFilterState] = useState<FilterCriteria | null>(() => {
    try {
      const storedFilter = localStorage.getItem(FILTER_STORAGE_KEY);
      return storedFilter ? JSON.parse(storedFilter) : null;
    } catch (error) {
      console.error('Error reading filter from localStorage:', error);
      return null;
    }
  });
  
  useEffect(() => {
    try {
      if (filter) {
        localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filter));
      } else {
        localStorage.removeItem(FILTER_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error saving filter to localStorage:', error);
    }
  }, [filter]);
  
  const setFilter = (newFilter: FilterCriteria | null) => {
    setFilterState(newFilter);
  };
  
  const clearFilter = () => {
    setFilterState(null);
  };
  
  const contextValue: InventarioContextType = {
    filter,
    setFilter,
    clearFilter,
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
