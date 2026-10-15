import * as React from 'react';
import {
    Alert, Autocomplete, Box, Button, IconButton, Link, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {Download, KeyboardArrowDown, KeyboardArrowRight} from '@mui/icons-material';

import {useAvisos, useConexion} from '../base/contexto-base';
import {leerTabla} from '../base/referencias';
import type {Fila} from '../base/tipos-tabla';
import {irA} from '../render-connected-app-inventario';
import {
    armarReporte, consultaDelReporte, csvDelReporte, filtroDeCelda, hashDeBusqueda, nombreDelCsv,
    type CategoriaDeCatalogo, type Celda, type ColumnaDeEstado, type Cuenta, type EstadoDeCatalogo,
    type FilaDeCategoria, type Reporte, type SectorElegido,
} from './categorias-datos';

type Catalogos = {categorias:CategoriaDeCatalogo[], estados:EstadoDeCatalogo[], sectores:(SectorElegido & {etiqueta:string})[]};

const texto = (valor:unknown) => valor == null ? '' : String(valor).trim();
const numeroONulo = (valor:unknown) => valor == null || valor === '' ? null : Number(valor);

function catalogosDesde(categorias:Fila[], estados:Fila[], sectores:Fila[]):Catalogos{
    return {
        categorias:categorias.map(fila => ({
            categoria:texto(fila.categoria),
            nombre:texto(fila.nombre),
            orden:numeroONulo(fila.orden),
            aparte:fila.aparte === true,
        })),
        estados:estados.map(fila => ({
            estado:texto(fila.estado_bien),
            etiqueta:texto(fila.etiqueta),
            descripcion:texto(fila.descripcion) || null,
            orden:numeroONulo(fila.orden),
        })),
        sectores:sectores
            .map(fila => {
                const sigla = texto(fila.sigla);
                const nombre = texto(fila.nombre_sector);
                return {
                    sector:texto(fila.sector),
                    texto:sigla || nombre || texto(fila.sector),
                    etiqueta:[sigla, nombre].filter(Boolean).join(' — ') || texto(fila.sector),
                };
            })
            .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta)),
    };
}

function Cantidad({valor, destino, fuerte = false}:{valor:number, destino:string|null, fuerte?:boolean}){
    const contenido = <Box component="span" sx={{fontWeight:fuerte ? 700 : undefined}}>{valor.toLocaleString('es-AR')}</Box>;
    if(destino == null || valor === 0){
        return contenido;
    }
    return <Link component="button" underline="hover" title="Ver estos bienes" onClick={() => irA(destino)}
        sx={{font:'inherit', verticalAlign:'baseline'}}>
        {contenido}
    </Link>;
}

function Barra({proporcion}:{proporcion:number}){
    return <Box aria-hidden sx={{flex:1, minWidth:40, height:8, borderRadius:4, bgcolor:'action.hover'}}>
        <Box sx={{width:`${Math.round(proporcion * 100)}%`, height:'100%', borderRadius:4, bgcolor:'primary.main'}}/>
    </Box>;
}

function destinoDe(celda:Celda, siempre = false):string|null{
    const filtro = filtroDeCelda(celda);
    return filtro || siempre ? hashDeBusqueda(filtro) : null;
}

function CeldasDeEstado({cuenta, columnas, celda}:{cuenta:Cuenta, columnas:ColumnaDeEstado[], celda:Celda|null}){
    return <>{columnas.map(columna =>
        <TableCell key={columna.clave} align="right">
            <Cantidad valor={cuenta.porEstado[columna.clave] ?? 0} destino={celda ? destinoDe({...celda, estado:columna}) : null}/>
        </TableCell>
    )}</>;
}

function FilaCategoria({fila, columnas, sector, angosta}:{fila:FilaDeCategoria, columnas:ColumnaDeEstado[], sector:SectorElegido|null, angosta:boolean}){
    const [abierta, setAbierta] = React.useState(false);
    const celda:Celda = {sector, categoria:{valor:fila.categoria, nombre:fila.nombre}};
    const conDetalle = fila.subcategorias.some(sub => sub.subcategoria != null);
    const abrible = conDetalle || angosta;
    const columnasVisibles = angosta ? [] : columnas;
    return <>
        <TableRow hover sx={{'& > *':{borderBottom:abierta ? 'none' : undefined}}}>
            <TableCell padding="checkbox">
                {abrible
                    ? <IconButton size="small" aria-label={abierta ? `cerrar ${fila.nombre}` : `abrir ${fila.nombre}`}
                        aria-expanded={abierta} onClick={() => setAbierta(!abierta)}>
                        {abierta ? <KeyboardArrowDown/> : <KeyboardArrowRight/>}
                    </IconButton>
                    : null}
            </TableCell>
            <TableCell component="th" scope="row" sx={{fontWeight:600}}>{fila.nombre}</TableCell>
            <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{minWidth:48, textAlign:'right'}}><Cantidad valor={fila.cuenta.total} destino={destinoDe(celda)} fuerte/></Box>
                    <Barra proporcion={fila.proporcion}/>
                </Stack>
            </TableCell>
            <CeldasDeEstado cuenta={fila.cuenta} columnas={columnasVisibles} celda={celda}/>
        </TableRow>
        {abierta && angosta
            ? <TableRow>
                <TableCell/>
                <TableCell colSpan={2}>
                    <Stack direction="row" flexWrap="wrap" columnGap={2} rowGap={0.5}>
                        {columnas.map(columna => <Typography key={columna.clave} variant="body2" component="span">
                            {columna.etiqueta}:{' '}
                            <Cantidad valor={fila.cuenta.porEstado[columna.clave] ?? 0} destino={destinoDe({...celda, estado:columna})}/>
                        </Typography>)}
                    </Stack>
                </TableCell>
            </TableRow>
            : null}
        {abierta && conDetalle
            ? fila.subcategorias.map(sub => {
                const deSub:Celda = {sector, subcategoria:{valor:sub.subcategoria, nombre:sub.nombre}};
                return <TableRow key={sub.subcategoria ?? ''} sx={{bgcolor:'action.hover'}}>
                    <TableCell/>
                    <TableCell sx={{pl:4}}>{sub.nombre}</TableCell>
                    <TableCell>
                        <Box sx={{minWidth:48, textAlign:'right', display:'inline-block'}}>
                            <Cantidad valor={sub.cuenta.total} destino={destinoDe(deSub)}/>
                        </Box>
                    </TableCell>
                    <CeldasDeEstado cuenta={sub.cuenta} columnas={columnasVisibles} celda={deSub}/>
                </TableRow>;
            })
            : null}
    </>;
}

function FilaTotal({titulo, cuenta, columnas, destino, celda}:{titulo:string, cuenta:Cuenta, columnas:ColumnaDeEstado[], destino:string|null, celda:Celda|null}){
    return <TableRow sx={{'& > *':{fontWeight:700}}}>
        <TableCell/>
        <TableCell component="th" scope="row" sx={{fontWeight:700}}>{titulo}</TableCell>
        <TableCell>
            <Box sx={{minWidth:48, textAlign:'right', display:'inline-block'}}><Cantidad valor={cuenta.total} destino={destino} fuerte/></Box>
        </TableCell>
        <CeldasDeEstado cuenta={cuenta} columnas={columnas} celda={celda}/>
    </TableRow>;
}

function TablaDelReporte({reporte, sector, angosta}:{reporte:Reporte, sector:SectorElegido|null, angosta:boolean}){
    const columnas = angosta ? [] : reporte.columnas;
    const columnasDeFila = reporte.columnas;
    const anchoTotal = 3 + columnas.length;
    return <TableContainer>
        <Table size="small" aria-label="bienes por categoría">
            <TableHead>
                <TableRow>
                    <TableCell padding="checkbox"/>
                    <TableCell>Categoría</TableCell>
                    <TableCell sx={{width:angosta ? '50%' : '30%'}}>Total</TableCell>
                    {columnas.map(columna =>
                        <TableCell key={columna.clave} align="right" title={columna.descripcion ?? undefined}>{columna.etiqueta}</TableCell>)}
                </TableRow>
            </TableHead>
            <TableBody>
                {reporte.principal.map(fila =>
                    <FilaCategoria key={fila.categoria ?? ''} fila={fila} columnas={columnasDeFila} sector={sector} angosta={angosta}/>)}
                {reporte.aparte.length
                    ? <>
                        <FilaTotal titulo="Total principal" cuenta={reporte.totalPrincipal} columnas={columnas} destino={null} celda={null}/>
                        <TableRow>
                            <TableCell colSpan={anchoTotal} sx={{pt:3}}>
                                <Typography variant="subtitle2" color="text.secondary">Aparte: no suman al total principal</Typography>
                            </TableCell>
                        </TableRow>
                        {reporte.aparte.map(fila =>
                            <FilaCategoria key={fila.categoria ?? ''} fila={fila} columnas={columnasDeFila} sector={sector} angosta={angosta}/>)}
                        <FilaTotal titulo="Total aparte" cuenta={reporte.totalAparte} columnas={columnas} destino={null} celda={null}/>
                    </>
                    : null}
                <FilaTotal titulo="Total general" cuenta={reporte.total} columnas={columnas}
                    destino={destinoDe({sector}, true)} celda={{sector}}/>
            </TableBody>
        </Table>
    </TableContainer>;
}

export function BienesPorCategoria(){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const theme = useTheme();
    const angosta = useMediaQuery(theme.breakpoints.down('sm'));
    const [catalogos, setCatalogos] = React.useState<Catalogos|null>(null);
    const [sector, setSector] = React.useState<(SectorElegido & {etiqueta:string})|null>(null);
    const [filas, setFilas] = React.useState<Parameters<typeof armarReporte>[0]|null>(null);
    const [error, setError] = React.useState<string|null>(null);
    const secuencia = React.useRef(0);

    React.useEffect(() => {
        let cancelado = false;
        Promise.all([leerTabla(conn, 'categorias'), leerTabla(conn, 'estados_bien'), leerTabla(conn, 'sectores')])
            .then(([categorias, estados, sectores]) => {
                if(!cancelado){ setCatalogos(catalogosDesde(categorias, estados, sectores)); }
            })
            .catch(err => { if(!cancelado){ mostrarError(err, 'No se pudieron cargar los catálogos'); } });
        return () => { cancelado = true; };
    }, [conn, mostrarError]);

    React.useEffect(() => {
        const numero = ++secuencia.current;
        setFilas(null);
        setError(null);
        conn.ajax.bienes_buscar_agrupado({consulta:JSON.stringify(consultaDelReporte(sector))})
            .then(respuesta => { if(numero === secuencia.current){ setFilas(respuesta.rows); } })
            .catch(err => { if(numero === secuencia.current){ setError(err instanceof Error ? err.message : String(err)); } });
    }, [conn, sector]);

    const reporte = React.useMemo(
        () => catalogos && filas ? armarReporte(filas, catalogos.categorias, catalogos.estados) : null,
        [catalogos, filas],
    );

    const descargar = () => {
        if(!reporte){ return; }
        const url = URL.createObjectURL(new Blob([csvDelReporte(reporte)], {type:'text/csv;charset=utf-8'}));
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombreDelCsv(sector, new Date());
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
    };

    return <Box sx={{p:{xs:2, sm:3}, maxWidth:1200, mx:'auto'}}>
        <Stack direction={{xs:'column', sm:'row'}} spacing={2} alignItems={{xs:'stretch', sm:'center'}} sx={{mb:2}}>
            <Autocomplete
                options={catalogos?.sectores ?? []}
                value={sector}
                onChange={(_evento, valor) => setSector(valor)}
                getOptionLabel={opcion => opcion.etiqueta}
                isOptionEqualToValue={(a, b) => a.sector === b.sector}
                loading={!catalogos}
                sx={{width:{xs:'100%', sm:360}}}
                renderInput={params => <TextField {...params} label="Sector" placeholder="Todos" size="small"/>}
            />
            <Box sx={{flex:1, display:{xs:'none', sm:'block'}}}/>
            <Button variant="outlined" startIcon={<Download/>} onClick={descargar} disabled={!reporte}>Descargar</Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{mb:1}}>
            Bienes activos que podés ver{sector ? ` en ${sector.etiqueta}` : ''}. Tocá un número para ver esos bienes.
        </Typography>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {!reporte && !error ? <Typography color="text.secondary">Cargando…</Typography> : null}
        {reporte ? <TablaDelReporte reporte={reporte} sector={sector} angosta={angosta}/> : null}
    </Box>;
}
