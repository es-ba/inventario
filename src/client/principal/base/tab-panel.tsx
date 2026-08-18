import * as React from 'react';
import {Box} from '@mui/material';

/** Panel de una solapa, con los atributos de accesibilidad que espera MUI Tabs. */
export function TabPanel({
    children,
    value,
    index,
    sinRelleno = false,
}:{
    children?:React.ReactNode,
    value:number,
    index:number,
    sinRelleno?:boolean,
}){
    return <div
        role="tabpanel"
        hidden={value !== index}
        id={`panel-${index}`}
        aria-labelledby={`solapa-${index}`}
    >
        {value === index ? <Box sx={{p:sinRelleno ? 0 : 2}}>{children}</Box> : null}
    </div>;
}

/** Props para el <Tab> que se enlaza con el panel de arriba. */
export function propsDeSolapa(index:number){
    return {
        id:`solapa-${index}`,
        'aria-controls':`panel-${index}`,
    };
}
