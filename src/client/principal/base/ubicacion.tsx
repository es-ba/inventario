import * as React from 'react';
import {Box, Typography} from '@mui/material';

import {formatearValor} from './formato-valores';

export function Ubicacion({sector, responsable, espacio}:{sector:unknown, responsable:unknown, espacio:unknown}){
    const lineas = [sector, responsable, espacio].map(valor => formatearValor(valor).trim()).filter(l => l !== '');
    if(lineas.length === 0){
        return <Typography variant="body2" color="text.disabled">—</Typography>;
    }
    return <Box sx={{py:0.5}}>
        {lineas.map((l, i) => <Typography key={i} variant="body2" sx={{lineHeight:1.3}}>{l}</Typography>)}
    </Box>;
}
