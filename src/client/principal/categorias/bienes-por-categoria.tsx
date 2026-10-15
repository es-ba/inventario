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
    FILTROS_DEL_REPORTE, armarReporte, consultaDelReporte, csvDelReporte, filtroDeCelda, hashDeBusqueda, nombreDelCsv,
    EN_USO, opcionesDeAgrupado, opcionesDeSectores, porcentaje,
    type CategoriaDeCatalogo, type Celda, type ColumnaDeEstado, type Cuenta, type EstadoDeCatalogo,
    type FilaDeCategoria, type FiltroPrevio, type OpcionDeFiltro, type Reporte,
} from './categorias-datos';

type Catalogos = {categorias:CategoriaDeCatalogo[], estados:EstadoDeCatalogo[], sectores:OpcionDeFiltro[]};

type DimensionDeFiltro = typeof FILTROS_DEL_REPORTE[number]['dimension'];

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
        sectores:opcionesDeSectores(sectores),
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

const SEPARADOR = {borderLeft:1, borderLeftColor:'divider'};

function CeldasDeEstado({cuenta, columnas, celda}:{cuenta:Cuenta, columnas:ColumnaDeEstado[], celda:Celda|null}){
    return <>{columnas.map(columna =>
        <TableCell key={columna.clave} align="right">
            <Cantidad valor={cuenta.porEstado[columna.clave] ?? 0} destino={celda ? destinoDe({...celda, estado:columna}) : null}/>
        </TableCell>
    )}
    {columnas.length
        ? <TableCell align="right" sx={SEPARADOR}>
            <Cantidad valor={cuenta.enUso} destino={celda ? destinoDe({...celda, enUso:true}) : null}/>
        </TableCell>
        : null}</>;
}

function FilaCategoria({fila, columnas, previos, angosta}:{fila:FilaDeCategoria, columnas:ColumnaDeEstado[], previos:FiltroPrevio[], angosta:boolean}){
    const [abierta, setAbierta] = React.useState(false);
    const celda:Celda = {previos, categoria:{valor:fila.categoria, nombre:fila.nombre}};
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
                    <Typography variant="body2" color="text.secondary" sx={{minWidth:44, textAlign:'right'}}
                        title="Parte del total general">
                        {porcentaje(fila.proporcion)}
                    </Typography>
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
                    <Typography variant="body2" sx={{mt:0.5}}>
                        {EN_USO.titulo}:{' '}
                        <Cantidad valor={fila.cuenta.enUso} destino={destinoDe({...celda, enUso:true})}/>
                    </Typography>
                </TableCell>
            </TableRow>
            : null}
        {abierta && conDetalle
            ? fila.subcategorias.map(sub => {
                const deSub:Celda = {previos, subcategoria:{valor:sub.subcategoria, nombre:sub.nombre}};
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

function TablaDelReporte({reporte, previos, angosta}:{reporte:Reporte, previos:FiltroPrevio[], angosta:boolean}){
    const columnas = angosta ? [] : reporte.columnas;
    const columnasDeFila = reporte.columnas;
    const anchoTotal = 3 + (columnas.length ? columnas.length + 1 : 0);
    return <TableContainer>
        <Table size="small" aria-label="bienes por categoría">
            <TableHead>
                <TableRow>
                    <TableCell padding="checkbox"/>
                    <TableCell>Categoría</TableCell>
                    <TableCell sx={{width:angosta ? '50%' : '30%'}}>Total</TableCell>
                    {columnas.map(columna =>
                        <TableCell key={columna.clave} align="right" title={columna.descripcion ?? undefined}>{columna.etiqueta}</TableCell>)}
                    {columnas.length
                        ? <TableCell align="right" sx={{...SEPARADOR, whiteSpace:'nowrap'}} title="Bienes que alguien tiene en uso (dato «en uso de» cargado); se cuenta aparte del estado">
                            {EN_USO.titulo}
                        </TableCell>
                        : null}
                </TableRow>
            </TableHead>
            <TableBody>
                {reporte.principal.map(fila =>
                    <FilaCategoria key={fila.categoria ?? ''} fila={fila} columnas={columnasDeFila} previos={previos} angosta={angosta}/>)}
                {reporte.aparte.length
                    ? <>
                        <FilaTotal titulo="Total principal" cuenta={reporte.totalPrincipal} columnas={columnas} destino={null} celda={null}/>
                        <TableRow>
                            <TableCell colSpan={anchoTotal} sx={{pt:3}}>
                                <Typography variant="subtitle2" color="text.secondary">Aparte: no suman al total principal</Typography>
                            </TableCell>
                        </TableRow>
                        {reporte.aparte.map(fila =>
                            <FilaCategoria key={fila.categoria ?? ''} fila={fila} columnas={columnasDeFila} previos={previos} angosta={angosta}/>)}
                        <FilaTotal titulo="Total aparte" cuenta={reporte.totalAparte} columnas={columnas} destino={null} celda={null}/>
                    </>
                    : null}
                <FilaTotal titulo="Total general" cuenta={reporte.total} columnas={columnas}
                    destino={destinoDe({previos}, true)} celda={{previos}}/>
            </TableBody>
        </Table>
    </TableContainer>;
}

function ReferenciaDeColumnas({columnas}:{columnas:ColumnaDeEstado[]}){
    const items = [
        ...columnas,
        {clave:EN_USO.dimension, etiqueta:EN_USO.titulo, descripcion:'Alguien tiene el bien en uso: está cargado el dato «en uso de» de la ficha. Se cuenta aparte del estado, por eso no suma con las columnas anteriores.'},
    ];
    return <Box sx={{mt:3}}>
        <Typography variant="subtitle2" gutterBottom>Qué significa cada columna</Typography>
        <Box component="dl" sx={{m:0, display:'grid', gridTemplateColumns:{xs:'1fr', sm:'max-content 1fr'}, columnGap:2, rowGap:0.5}}>
            {items.map(({clave, etiqueta, descripcion}) => <React.Fragment key={clave}>
                <Typography component="dt" variant="body2" sx={{fontWeight:600}}>{etiqueta}</Typography>
                <Typography component="dd" variant="body2" color="text.secondary" sx={{m:0, mb:{xs:1, sm:0}}}>{descripcion ?? ''}</Typography>
            </React.Fragment>)}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{mt:1}}>
            Cada bien está en un solo estado: el sistema lo calcula y la suma de los estados es el total.
        </Typography>
    </Box>;
}

function SelectorDeFiltro({titulo, opciones, valor, cargando, onCambio}:{
    titulo:string, opciones:OpcionDeFiltro[], valor:OpcionDeFiltro|null, cargando:boolean, onCambio:(opcion:OpcionDeFiltro|null) => void,
}){
    const conElegida = valor && !opciones.some(opcion => opcion.valor === valor.valor) ? [valor, ...opciones] : opciones;
    return <Autocomplete
        options={conElegida}
        value={valor}
        onChange={(_evento, opcion) => onCambio(opcion)}
        getOptionLabel={opcion => opcion.etiqueta}
        isOptionEqualToValue={(a, b) => a.valor === b.valor}
        loading={cargando}
        sx={{width:{xs:'100%', sm:320}}}
        renderInput={params => <TextField {...params} label={titulo} placeholder="Todos" size="small"/>}
    />;
}

export function BienesPorCategoria(){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const theme = useTheme();
    const angosta = useMediaQuery(theme.breakpoints.down('sm'));
    const [catalogos, setCatalogos] = React.useState<Catalogos|null>(null);
    const [elegidos, setElegidos] = React.useState<Partial<Record<DimensionDeFiltro, OpcionDeFiltro>>>({});
    const [enUsoDe, setEnUsoDe] = React.useState<OpcionDeFiltro[]|null>(null);
    const [filas, setFilas] = React.useState<Parameters<typeof armarReporte>[0]|null>(null);
    const [error, setError] = React.useState<string|null>(null);
    const secuencia = React.useRef(0);

    const previos = React.useMemo<FiltroPrevio[]>(() => FILTROS_DEL_REPORTE
        .filter(({dimension}) => elegidos[dimension])
        .map(({dimension, etiqueta}) => ({dimension, etiqueta, valor:elegidos[dimension]!.valor, texto:elegidos[dimension]!.texto})),
    [elegidos]);
    const delSector = React.useMemo(() => previos.filter(previo => previo.dimension === 'sector'), [previos]);

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
        let cancelado = false;
        setEnUsoDe(null);
        conn.ajax.bienes_buscar_agrupado({consulta:JSON.stringify(consultaDelReporte(delSector, ['enusode_responsable']))})
            .then(respuesta => { if(!cancelado){ setEnUsoDe(opcionesDeAgrupado(respuesta.rows)); } })
            .catch(err => { if(!cancelado){ mostrarError(err, 'No se pudieron cargar las personas'); setEnUsoDe([]); } });
        return () => { cancelado = true; };
    }, [conn, delSector, mostrarError]);

    React.useEffect(() => {
        const numero = ++secuencia.current;
        setFilas(null);
        setError(null);
        conn.ajax.bienes_buscar_agrupado({consulta:JSON.stringify(consultaDelReporte(previos))})
            .then(respuesta => { if(numero === secuencia.current){ setFilas(respuesta.rows); } })
            .catch(err => { if(numero === secuencia.current){ setError(err instanceof Error ? err.message : String(err)); } });
    }, [conn, previos]);

    const reporte = React.useMemo(
        () => catalogos && filas ? armarReporte(filas, catalogos.categorias, catalogos.estados) : null,
        [catalogos, filas],
    );

    const elegir = (dimension:DimensionDeFiltro, opcion:OpcionDeFiltro|null) =>
        setElegidos(anteriores => {
            const nuevos = {...anteriores};
            if(opcion){ nuevos[dimension] = opcion; }else{ delete nuevos[dimension]; }
            return nuevos;
        });

    const descargar = () => {
        if(!reporte){ return; }
        const url = URL.createObjectURL(new Blob([csvDelReporte(reporte)], {type:'text/csv;charset=utf-8'}));
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombreDelCsv(previos, new Date());
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
    };

    const opcionesDe:Record<DimensionDeFiltro, OpcionDeFiltro[]|null> = {
        sector:catalogos?.sectores ?? null,
        enusode_responsable:enUsoDe,
    };

    return <Box sx={{p:{xs:2, sm:3}, maxWidth:1200, mx:'auto'}}>
        <Stack direction={{xs:'column', sm:'row'}} spacing={2} alignItems={{xs:'stretch', sm:'center'}} sx={{mb:2}}>
            {FILTROS_DEL_REPORTE.map(({dimension, titulo}) => <SelectorDeFiltro key={dimension}
                titulo={titulo}
                opciones={opcionesDe[dimension] ?? []}
                valor={elegidos[dimension] ?? null}
                cargando={opcionesDe[dimension] == null}
                onCambio={opcion => elegir(dimension, opcion)}
            />)}
            <Box sx={{flex:1, display:{xs:'none', sm:'block'}}}/>
            <Button variant="outlined" startIcon={<Download/>} onClick={descargar} disabled={!reporte}>Descargar</Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{mb:1}}>
            Bienes activos que podés ver{previos.map(previo => `, ${previo.etiqueta} ${previo.texto}`).join('')}. Tocá un número para ver esos bienes.
        </Typography>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {!reporte && !error ? <Typography color="text.secondary">Cargando…</Typography> : null}
        {reporte ? <TablaDelReporte reporte={reporte} previos={previos} angosta={angosta}/> : null}
        {reporte ? <ReferenciaDeColumnas columnas={reporte.columnas}/> : null}
    </Box>;
}
