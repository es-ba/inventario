import * as React from 'react';
import {Box} from '@mui/material';

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

export function propsDeSolapa(index:number){
    return {
        id:`solapa-${index}`,
        'aria-controls':`panel-${index}`,
    };
}
