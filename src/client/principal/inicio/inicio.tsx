import * as React from 'react';
import {Avatar, Box, Button, InputAdornment, Paper, TextField, Typography} from '@mui/material';
import {
    AccountTree, Category, FactCheck, Inventory2, MeetingRoom, MenuBook, People, Search, Tune,
} from '@mui/icons-material';

import {useInfoUsuario} from '../base/contexto-base';
import {entradasDelMenu} from '../base/navegacion';
import {irA, vinculo} from '../render-connected-app-inventario';
import {
    REPORTES, TAREAS, destinosDisponibles, hashDeBusquedaRapida, nombreDePila, saludo, type Destino,
} from './inicio-datos';

const ICONOS:Record<string, React.ReactElement> = {
    principal:<Search/>,
    mis_bienes:<Inventory2/>,
    control_bienes:<FactCheck/>,
    ayuda:<MenuBook/>,
    bienes_por_categoria:<Category/>,
    bienes_por_sector:<AccountTree/>,
    bienes_por_responsable:<People/>,
    bienes_por_modelo:<Tune/>,
    reporte_bienes_por_espacio:<MeetingRoom/>,
};

function Tarjeta({destino, grande = false}:{destino:Destino, grande?:boolean}){
    return <Paper
        variant="outlined"
        component="a"
        {...vinculo(destino.hash)}
        sx={{
            p:grande ? 2.5 : 2,
            display:'flex',
            gap:2,
            alignItems:'flex-start',
            textDecoration:'none',
            color:'inherit',
            transition:'border-color .15s, box-shadow .15s, transform .15s',
            '&:hover, &:focus-visible':{borderColor:'primary.main', boxShadow:3, transform:'translateY(-2px)'},
        }}
    >
        <Avatar sx={{bgcolor:grande ? 'primary.main' : 'action.selected', color:grande ? 'primary.contrastText' : 'primary.main'}}>
            {ICONOS[destino.nombre]}
        </Avatar>
        <Box sx={{minWidth:0}}>
            <Typography variant="subtitle1" component="div" sx={{fontWeight:600, lineHeight:1.3}}>
                {destino.titulo.charAt(0).toLocaleUpperCase('es') + destino.titulo.slice(1)}
            </Typography>
            <Typography variant="body2" color="text.secondary">{destino.descripcion}</Typography>
        </Box>
    </Paper>;
}

function Seccion({titulo, destinos, grande = false}:{titulo:string, destinos:Destino[], grande?:boolean}){
    if(!destinos.length){
        return null;
    }
    return <Box component="section" sx={{mb:4}}>
        <Typography variant="overline" component="h2" color="text.secondary" sx={{display:'block', mb:1}}>{titulo}</Typography>
        <Box sx={{display:'grid', gridTemplateColumns:`repeat(auto-fill, minmax(${grande ? 260 : 240}px, 1fr))`, gap:2}}>
            {destinos.map(destino => <Tarjeta key={destino.nombre} destino={destino} grande={grande}/>)}
        </Box>
    </Box>;
}

export function Inicio(){
    const {nombre} = useInfoUsuario();
    const [texto, setTexto] = React.useState('');
    const entradas = React.useMemo(entradasDelMenu, []);
    const tareas = React.useMemo(() => destinosDisponibles(entradas, TAREAS), [entradas]);
    const reportes = React.useMemo(() => destinosDisponibles(entradas, REPORTES), [entradas]);
    const pila = nombreDePila(nombre);

    return <Box sx={{p:{xs:2, sm:3}, maxWidth:1100, mx:'auto'}}>
        <Box sx={theme => ({
            mb:4,
            p:{xs:2.5, sm:4},
            borderRadius:2,
            color:'primary.contrastText',
            background:`linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 60%, ${theme.palette.secondary.main} 140%)`,
        })}>
            <Typography variant="h4" component="h2" sx={{fontWeight:600}}>
                {saludo(new Date().getHours())}{pila ? `, ${pila}` : ''}
            </Typography>
            <Typography sx={{mt:0.5, mb:3, opacity:0.9}}>¿Qué necesitás hacer hoy?</Typography>
            <Box
                component="form"
                role="search"
                onSubmit={(evento:React.FormEvent) => {
                    evento.preventDefault();
                    irA(hashDeBusquedaRapida(texto));
                }}
                sx={{display:'flex', gap:1, maxWidth:640}}
            >
                <TextField
                    fullWidth
                    size="small"
                    value={texto}
                    onChange={evento => setTexto(evento.target.value)}
                    onKeyDown={evento => {
                        if(evento.key === 'Enter'){
                            evento.preventDefault();
                            irA(hashDeBusquedaRapida(texto));
                        }
                    }}
                    placeholder="Buscá un bien por ficha, serie o descripción"
                    inputProps={{'aria-label':'Buscar un bien'}}
                    InputProps={{
                        startAdornment:<InputAdornment position="start"><Search/></InputAdornment>,
                        sx:{bgcolor:'background.paper', borderRadius:1},
                    }}
                />
                <Button type="submit" variant="contained" color="secondary" disableElevation>Buscar</Button>
            </Box>
        </Box>
        <Seccion titulo="Tareas frecuentes" destinos={tareas} grande/>
        <Seccion titulo="Reportes" destinos={reportes}/>
    </Box>;
}
