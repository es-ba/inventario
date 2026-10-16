import * as React from 'react';
import {Autocomplete, Box, Button, Stack, Tab, Tabs, TextField, Typography} from '@mui/material';
import {ArrowBack, Download} from '@mui/icons-material';
import {DataGrid, GridColDef} from '@mui/x-data-grid';

import {useAvisos, useConexion} from '../base/contexto-base';
import {leerTabla} from '../base/referencias';
import {gridLocaleText} from '../localizacion-grid';
import {descargarReporte, useReporteDeCategorias, VistaDelReporte} from '../categorias/bienes-por-categoria';
import {
    VINCULOS, cantidadDelVinculo, filasDeResponsables, pasaBusqueda, previosDeResponsable,
    type ResponsableDelReporte, type Vinculo,
} from './responsables-datos';

const numero = (titulo:string, field:keyof ResponsableDelReporte, width = 120):GridColDef<ResponsableDelReporte> =>
    ({field, headerName:titulo, type:'number', width});

const COLUMNAS:GridColDef<ResponsableDelReporte>[] = [
    {field:'nombre', headerName:'Responsable', flex:1, minWidth:220},
    numero('A cargo', 'aCargo'),
    numero('En uso', 'enUso'),
    numero('Bienes de sectores a cargo', 'bienesDeSectoresACargo', 190),
    numero('Personas a cargo', 'personasACargo', 140),
    numero('Sectores', 'sectores', 100),
    numero('Sedes', 'sedes', 90),
];

function ListaDeResponsables({filas, cargando, onAbrir}:{
    filas:ResponsableDelReporte[], cargando:boolean, onAbrir:(fila:ResponsableDelReporte) => void,
}){
    const [buscado, setBuscado] = React.useState('');
    const visibles = React.useMemo(() => filas.filter(fila => pasaBusqueda(fila, buscado)), [buscado, filas]);
    return <>
        <Autocomplete<ResponsableDelReporte, false, false, true>
            freeSolo
            options={filas}
            value={null}
            inputValue={buscado}
            onInputChange={(_evento, valor, motivo) => { if(motivo !== 'reset'){ setBuscado(valor); } }}
            onChange={(_evento, opcion) => { if(opcion && typeof opcion !== 'string'){ onAbrir(opcion); } }}
            getOptionLabel={opcion => typeof opcion === 'string' ? opcion : opcion.nombre}
            filterOptions={(opciones, {inputValue}) => opciones.filter(opcion => pasaBusqueda(opcion, inputValue))}
            renderOption={(props, opcion) => {
                const {key, ...resto} = props as React.HTMLAttributes<HTMLLIElement> & {key?:React.Key};
                return <li {...resto} key={key ?? opcion.responsable}>
                    <Box>
                        {opcion.nombre}
                        <Typography variant="body2" color="text.secondary">
                            {opcion.aCargo.toLocaleString('es-AR')} a cargo · {opcion.enUso.toLocaleString('es-AR')} en uso
                        </Typography>
                    </Box>
                </li>;
            }}
            blurOnSelect
            loading={cargando}
            sx={{mb:2, width:{xs:'100%', sm:360}}}
            renderInput={params => <TextField {...params} size="small" label="Buscar responsable"/>}
        />
        <Typography variant="body2" color="text.secondary" sx={{mb:1}}>
            Bienes activos que podés ver. Elegí una persona en el buscador o tocala en la lista para ver sus bienes por categoría.
        </Typography>
        <DataGrid
            rows={visibles}
            columns={COLUMNAS}
            getRowId={fila => fila.responsable}
            loading={cargando}
            onRowClick={params => onAbrir(params.row)}
            autoHeight
            density="compact"
            pageSizeOptions={[25, 50, 100]}
            initialState={{pagination:{paginationModel:{pageSize:25}}}}
            localeText={gridLocaleText('No hay responsables con bienes')}
            sx={{cursor:'pointer'}}
        />
    </>;
}

function BienesDeResponsable({fila, onVolver}:{fila:ResponsableDelReporte, onVolver:() => void}){
    const [vinculo, setVinculo] = React.useState<Vinculo>(fila.aCargo || !fila.enUso ? 'cargo' : 'uso');
    const previos = React.useMemo(() => previosDeResponsable(fila, vinculo), [fila, vinculo]);
    const {reporte, error} = useReporteDeCategorias(previos);
    return <>
        <Stack direction={{xs:'column', sm:'row'}} spacing={2} alignItems={{xs:'flex-start', sm:'center'}} sx={{mb:1}}>
            <Button startIcon={<ArrowBack/>} onClick={onVolver}>Volver a la lista</Button>
            <Typography variant="h6" component="h2" sx={{flex:1}}>{fila.nombre}</Typography>
            <Button variant="outlined" startIcon={<Download/>} onClick={() => reporte && descargarReporte(reporte, previos)} disabled={!reporte}>
                Descargar
            </Button>
        </Stack>
        <Tabs value={vinculo} onChange={(_evento, valor:Vinculo) => setVinculo(valor)} sx={{mb:2}}>
            {VINCULOS.map(v => <Tab key={v.vinculo} value={v.vinculo}
                label={`${v.titulo} (${cantidadDelVinculo(fila, v.vinculo).toLocaleString('es-AR')})`}/>)}
        </Tabs>
        <Typography variant="body2" color="text.secondary" sx={{mb:1}}>
            {vinculo === 'cargo'
                ? 'Bienes activos de los sectores de los que es responsable (sin subsectores).'
                : 'Bienes activos que tiene en uso.'} Tocá un número para ver esos bienes.
        </Typography>
        <VistaDelReporte reporte={reporte} error={error} previos={previos}/>
    </>;
}

export function BienesPorResponsable(){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const [filas, setFilas] = React.useState<ResponsableDelReporte[]>([]);
    const [cargando, setCargando] = React.useState(true);
    const [abierta, setAbierta] = React.useState<ResponsableDelReporte|null>(null);

    React.useEffect(() => {
        let cancelado = false;
        leerTabla(conn, 'reporte_bienes_por_responsable')
            .then(datos => { if(!cancelado){ setFilas(filasDeResponsables(datos)); } })
            .catch(err => { if(!cancelado){ mostrarError(err, 'No se pudo cargar el reporte'); } })
            .finally(() => { if(!cancelado){ setCargando(false); } });
        return () => { cancelado = true; };
    }, [conn, mostrarError]);

    return <Box sx={{p:{xs:2, sm:3}, maxWidth:1200, mx:'auto'}}>
        <Box sx={{display:abierta ? 'none' : 'block'}}>
            <ListaDeResponsables filas={filas} cargando={cargando} onAbrir={setAbierta}/>
        </Box>
        {abierta
            ? <BienesDeResponsable key={abierta.responsable} fila={abierta} onVolver={() => setAbierta(null)}/>
            : null}
    </Box>;
}
