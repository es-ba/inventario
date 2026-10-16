import * as React from 'react';
import {
    Alert, Autocomplete, Box, Button, Chip, IconButton, Link, Stack, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Tabs, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {ArrowBack, Download, KeyboardArrowDown, KeyboardArrowRight} from '@mui/icons-material';

import {useAvisos, useConexion} from '../base/contexto-base';
import {Cargando} from '../base/cargando';
import {leerTabla} from '../base/referencias';
import {
    Barra, Cantidad, CeldasDeEstado, SEPARADOR, VistaDelReporte, descargarReporte, destinoDe, encabezadosDeTipos, estadosDesde,
    tiposDesde, useReporteDeCategorias,
} from '../categorias/bienes-por-categoria';
import {EN_USO, consultaDelReporte, porcentaje, type Celda, type ColumnaDeEstado, type ColumnaDeTipo} from '../categorias/categorias-datos';
import {
    DIMENSIONES_DEL_ORGANIGRAMA, PREVIOS_SIN_SECTOR, abiertosAlEntrar, ancestros, aplanar, armarOrganigrama,
    coincide, etiquetaDeArea, previosDeArea,
    type NodoDelOrganigrama, type Organigrama,
} from './organigrama-datos';

const idDeFila = (sector:string) => `organigrama-${sector}`;

function FilaDeArea({nodo, columnas, tipos, abiertos, marcado, angosta, conNombre, onAlternar, onAbrir}:{
    nodo:NodoDelOrganigrama, columnas:ColumnaDeEstado[], tipos:ColumnaDeTipo[], abiertos:Set<string>, marcado:string|null, angosta:boolean, conNombre:boolean,
    onAlternar:(sector:string) => void, onAbrir:(nodo:NodoDelOrganigrama) => void,
}){
    const abierto = abiertos.has(nodo.sector);
    const rama:Celda = {previos:previosDeArea(nodo, true)};
    const propia:Celda = {previos:previosDeArea(nodo, false)};
    return <>
        <TableRow id={idDeFila(nodo.sector)} hover selected={marcado === nodo.sector}>
            <TableCell sx={{pl:1 + nodo.nivel * 2.5}}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    {nodo.hijos.length
                        ? <IconButton size="small" aria-label={abierto ? `cerrar ${nodo.sigla}` : `abrir ${nodo.sigla}`}
                            aria-expanded={abierto} onClick={() => onAlternar(nodo.sector)}>
                            {abierto ? <KeyboardArrowDown/> : <KeyboardArrowRight/>}
                        </IconButton>
                        : <Box sx={{width:34, flexShrink:0}}/>}
                    <Link component="button" underline="hover" onClick={() => onAbrir(nodo)} title={`${etiquetaDeArea(nodo)}: ver sus bienes por categoría`}
                        sx={{font:'inherit', textAlign:'left', color:'text.primary'}}>
                        <Box component="span" sx={{fontWeight:600}}>{nodo.sigla || nodo.sector}</Box>
                        {nodo.nombre && conNombre
                            ? <Box component="span" sx={{color:'text.secondary'}}> — {nodo.nombre}</Box>
                            : null}
                    </Link>
                    {nodo.activo ? null : <Chip size="small" label="inactivo" variant="outlined"/>}
                </Stack>
            </TableCell>
            {angosta ? null : <TableCell align="right"><Cantidad valor={nodo.propios.total} destino={destinoDe(propia)}/></TableCell>}
            <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{minWidth:48, textAlign:'right'}}><Cantidad valor={nodo.rama.total} destino={destinoDe(rama)} fuerte/></Box>
                    <Barra proporcion={nodo.proporcion}/>
                    <Typography variant="body2" color="text.secondary" sx={{minWidth:44, textAlign:'right'}} title="Parte del total general">
                        {porcentaje(nodo.proporcion)}
                    </Typography>
                </Stack>
            </TableCell>
            {angosta ? null : <TableCell align="right">{nodo.personasRama.toLocaleString('es-AR')}</TableCell>}
            <CeldasDeEstado cuenta={nodo.rama} columnas={angosta ? [] : columnas} celda={rama} tipos={tipos}/>
        </TableRow>
        {abierto
            ? nodo.hijos.map(hijo => <FilaDeArea key={hijo.sector} nodo={hijo} columnas={columnas} tipos={tipos} abiertos={abiertos}
                marcado={marcado} angosta={angosta} conNombre={conNombre} onAlternar={onAlternar} onAbrir={onAbrir}/>)
            : null}
    </>;
}

function ArbolDelOrganigrama({organigrama, abiertos, marcado, onAlternar, onAbrir}:{
    organigrama:Organigrama, abiertos:Set<string>, marcado:string|null,
    onAlternar:(sector:string) => void, onAbrir:(nodo:NodoDelOrganigrama) => void,
}){
    const theme = useTheme();
    const angosta = useMediaQuery(theme.breakpoints.down('sm'));
    const conNombre = !useMediaQuery(theme.breakpoints.down('lg'));
    const columnas = organigrama.columnas;
    const filaTotal = (titulo:string, cuenta:Organigrama['total'], celda:Celda, siempre:boolean) => <TableRow sx={{'& > *':{fontWeight:700}}}>
        <TableCell sx={{fontWeight:700}}>{titulo}</TableCell>
        {angosta ? null : <TableCell/>}
        <TableCell>
            <Box sx={{minWidth:48, textAlign:'right', display:'inline-block'}}>
                <Cantidad valor={cuenta.total} destino={destinoDe(celda, siempre)} fuerte/>
            </Box>
        </TableCell>
        {angosta ? null : <TableCell/>}
        <CeldasDeEstado cuenta={cuenta} columnas={angosta ? [] : columnas} celda={celda} tipos={organigrama.tipos}/>
    </TableRow>;
    return <TableContainer>
        <Table size="small" aria-label="bienes por sector">
            <TableHead>
                <TableRow>
                    <TableCell>Área</TableCell>
                    {angosta ? null : <TableCell align="right" title="Bienes del área sin sus subsectores">Propios</TableCell>}
                    <TableCell sx={{width:angosta ? '50%' : '26%'}} title="Bienes del área y de todos sus subsectores">Con subsectores</TableCell>
                    {angosta ? null : <TableCell align="right" title="Personas del área y de sus subsectores">Personas</TableCell>}
                    {angosta ? null : encabezadosDeEstado(columnas)}
                    {angosta ? null : <TableCell align="right" sx={{...SEPARADOR, whiteSpace:'nowrap'}}
                        title="Bienes cuyo último movimiento tiene cargado un responsable de uso; se cuenta aparte del estado">
                        {EN_USO.titulo}
                    </TableCell>}
                    {angosta ? null : encabezadosDeTipos(organigrama.tipos)}
                </TableRow>
            </TableHead>
            <TableBody>
                {organigrama.raices.map(raiz => <FilaDeArea key={raiz.sector} nodo={raiz} columnas={columnas} tipos={organigrama.tipos} abiertos={abiertos}
                    marcado={marcado} angosta={angosta} conNombre={conNombre} onAlternar={onAlternar} onAbrir={onAbrir}/>)}
                {organigrama.sinSector.total ? filaTotal('Sin sector', organigrama.sinSector, {previos:PREVIOS_SIN_SECTOR}, false) : null}
                {filaTotal('Total general', organigrama.total, {previos:[]}, true)}
            </TableBody>
        </Table>
    </TableContainer>;
}

function encabezadosDeEstado(columnas:ColumnaDeEstado[]){
    return columnas.map(columna =>
        <TableCell key={columna.clave} align="right" title={columna.descripcion ?? undefined}>{columna.etiqueta}</TableCell>);
}

function BienesDeArea({nodo, onVolver}:{nodo:NodoDelOrganigrama, onVolver:() => void}){
    const [conSubsectores, setConSubsectores] = React.useState(true);
    const previos = React.useMemo(() => previosDeArea(nodo, conSubsectores), [nodo, conSubsectores]);
    const {reporte, error} = useReporteDeCategorias(previos);
    return <>
        <Stack direction={{xs:'column', sm:'row'}} spacing={2} alignItems={{xs:'flex-start', sm:'center'}} sx={{mb:1}}>
            <Button startIcon={<ArrowBack/>} onClick={onVolver}>Volver al organigrama</Button>
            <Typography variant="h6" component="h2" sx={{flex:1}}>{etiquetaDeArea(nodo)}</Typography>
            <Button variant="outlined" startIcon={<Download/>} onClick={() => reporte && descargarReporte(reporte, previos)} disabled={!reporte}>
                Descargar
            </Button>
        </Stack>
        <Tabs value={conSubsectores ? 'rama' : 'propios'} onChange={(_evento, valor:string) => setConSubsectores(valor === 'rama')} sx={{mb:2}}>
            <Tab value="rama" label={`Con subsectores (${nodo.rama.total.toLocaleString('es-AR')})`}/>
            <Tab value="propios" label={`Sólo el área (${nodo.propios.total.toLocaleString('es-AR')})`}/>
        </Tabs>
        <Typography variant="body2" color="text.secondary" sx={{mb:1}}>
            Bienes activos que podés ver. Tocá un número para ver esos bienes.
        </Typography>
        <VistaDelReporte reporte={reporte} error={error} previos={previos}/>
    </>;
}

export function BienesPorSector(){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const [organigrama, setOrganigrama] = React.useState<Organigrama|null>(null);
    const [error, setError] = React.useState<string|null>(null);
    const [abiertos, setAbiertos] = React.useState<Set<string>>(new Set());
    const [marcado, setMarcado] = React.useState<string|null>(null);
    const [detalle, setDetalle] = React.useState<NodoDelOrganigrama|null>(null);

    React.useEffect(() => {
        let cancelado = false;
        Promise.all([
            leerTabla(conn, 'sectores'),
            leerTabla(conn, 'reporte_bienes_por_sector'),
            leerTabla(conn, 'estados_bien'),
            leerTabla(conn, 'tipo_asignacion'),
            conn.ajax.bienes_buscar_agrupado({consulta:JSON.stringify(consultaDelReporte([], DIMENSIONES_DEL_ORGANIGRAMA))}),
        ]).then(([sectores, personas, estados, tipos, agrupado]) => {
            if(cancelado){ return; }
            const armado = armarOrganigrama(sectores, agrupado.rows, personas, estadosDesde(estados), tiposDesde(tipos));
            setOrganigrama(armado);
            setAbiertos(abiertosAlEntrar(armado));
        }).catch(err => {
            if(!cancelado){
                setError(err instanceof Error ? err.message : String(err));
                mostrarError(err, 'No se pudo cargar el organigrama');
            }
        });
        return () => { cancelado = true; };
    }, [conn, mostrarError]);

    React.useEffect(() => {
        if(marcado && !detalle){
            document.getElementById(idDeFila(marcado))?.scrollIntoView({block:'center'});
        }
    }, [marcado, detalle]);

    const areas = React.useMemo(() => organigrama ? aplanar(organigrama) : [], [organigrama]);

    const alternar = React.useCallback((sector:string) => setAbiertos(anteriores => {
        const nuevos = new Set(anteriores);
        if(nuevos.has(sector)){ nuevos.delete(sector); }else{ nuevos.add(sector); }
        return nuevos;
    }), []);

    const irAlArea = (nodo:NodoDelOrganigrama|null) => {
        if(!nodo || !organigrama){ return; }
        setAbiertos(anteriores => new Set([...anteriores, ...ancestros(organigrama, nodo.sector)]));
        setMarcado(nodo.sector);
    };

    return <Box sx={{p:{xs:2, sm:3}, maxWidth:1300, mx:'auto'}}>
        <Box sx={{display:detalle ? 'none' : 'block'}}>
            <Autocomplete
                options={areas}
                getOptionLabel={etiquetaDeArea}
                filterOptions={(opciones, {inputValue}) => opciones.filter(nodo => coincide(nodo, inputValue))}
                onChange={(_evento, nodo) => irAlArea(nodo)}
                isOptionEqualToValue={(a, b) => a.sector === b.sector}
                sx={{mb:2, width:{xs:'100%', sm:420}}}
                renderInput={params => <TextField {...params} label="Buscar área" placeholder="Sigla o nombre" size="small"/>}
            />
            <Typography variant="body2" color="text.secondary" sx={{mb:1}}>
                Bienes activos que podés ver, por el organigrama. Tocá un número para ver esos bienes, o el nombre de un área para verlos por categoría.
            </Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {!organigrama && !error ? <Cargando/> : null}
            {organigrama
                ? <ArbolDelOrganigrama organigrama={organigrama} abiertos={abiertos} marcado={marcado}
                    onAlternar={alternar} onAbrir={setDetalle}/>
                : null}
        </Box>
        {detalle ? <BienesDeArea key={detalle.sector} nodo={detalle} onVolver={() => setDetalle(null)}/> : null}
    </Box>;
}
