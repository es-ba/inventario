import * as React from 'react';
import {Box, CircularProgress} from '@mui/material';

export function Cargando(){
    return <Box sx={{display:'flex', justifyContent:'center', p:6}}><CircularProgress aria-label="Cargando"/></Box>;
}
