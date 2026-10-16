import * as React from 'react';
import {
    Alert, Autocomplete, Box, Button, IconButton, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {Download, KeyboardArrowDown, KeyboardArrowRight} from '@mui/icons-material';

import {claveDeAtributo} from '../../../common/bienes-agrupar';
import {useAvisos, useConexion} from '../base/contexto-base';
import {leerTabla} from '../base/referencias';
import type {Fila} from '../base/tipos-tabla';
import {Barra, Cantidad, SEPARADOR, descargarCsv, encabezadosDeTipos, estadosDesde, tiposDesde} from '../categorias/bienes-por-categoria';
import {
    EN_USO, consultaDelReporte, hashDeBusqueda, nombreDelCsv, opcionesDeAgrupado, opcionesDeSectores, porcentaje,
    type CategoriaDeCatalogo, type ColumnaDeEstado, type ColumnaDeTipo, type Cuenta, type EstadoDeCatalogo, type FiltroPrevio, type OpcionDeFiltro,
    type TipoDeCatalogo,
} from '../categorias/categorias-datos';
import {
    armarArbolDeModelos, camposDelReporte, csvDeModelos, dimensionesDeTiposDelCampo, dimensionesDelCampo, filtrarArbol, filtroDeCeldaDeModelos,
    type ArbolDeModelos, type AtributoDeCatalogo, type CeldaDeModelos, type NodoDeModelos, type RespuestaDeCampo, type SubcategoriaDeCatalogo,
} from './modelos-datos';

type Catalogos = {
    categorias:CategoriaDeCatalogo[],
    subcategorias:SubcategoriaDeCatalogo[],
    estados:EstadoDeCatalogo[],
    atributos:AtributoDeCatalogo[],
    areas:OpcionDeFiltro[],
    tipos:TipoDeCatalogo[],
};

type FiltroDeAtributo = {atributo:AtributoDeCatalogo|null, valor:OpcionDeFiltro|null};

const texto = (valor:unknown) => valor == null ? '' : String(valor).trim();
const numeroONulo = (valor:unknown) => valor == null || valor === '' ? null : Number(valor);

const destinoDe = (celda:CeldaDeModelos) => hashDeBusqueda(filtroDeCeldaDeModelos(celda));

const pedirAgrupado = (conn:ReturnType<typeof useConexion>, previos:FiltroPrevio[], dimensiones:readonly string[]) =>
    conn.ajax.bienes_buscar_agrupado({consulta:JSON.stringify(consultaDelReporte(previos, dimensiones))}).then(respuesta => respuesta.rows);

function CeldasDeEstadoDeModelos({cuenta, columnas, tipos, celda}:{cuenta:Cuenta, columnas:ColumnaDeEstado[], tipos:ColumnaDeTipo[], celda:CeldaDeModelos}){
    return <>
        {columnas.map(columna => {
            const filtro = filtroDeCeldaDeModelos({...celda, estado:columna});
            return <TableCell key={columna.clave} align="right">
                <Cantidad valor={cuenta.porEstado[columna.clave] ?? 0} destino={filtro ? hashDeBusqueda(filtro) : null}/>
            </TableCell>;
        })}
        <TableCell align="right" sx={SEPARADOR}>
            <Cantidad valor={cuenta.enUso} destino={destinoDe({...celda, enUso:true})}/>
        </TableCell>
        {tipos.map((tipo, indice) => <TableCell key={tipo.clave} align="right" sx={indice ? undefined : SEPARADOR}>
            <Cantidad valor={cuenta.porTipo[tipo.clave] ?? 0} destino={destinoDe({...celda, tipo})}/>
        </TableCell>)}
    </>;
}

function FilaDeNodo({nodo, columnas, tipos, previos, abiertos, angosta, onAlternar}:{
    nodo:NodoDeModelos, columnas:ColumnaDeEstado[], tipos:ColumnaDeTipo[], previos:FiltroPrevio[], abiertos:Set<string>,
    angosta:boolean, onAlternar:(id:string) => void,
}){
    const abierto = abiertos.has(nodo.id);
    const celda:CeldaDeModelos = {previos, nodo};
    const esCampo = nodo.nivel === 'campo';
    const fondo = nodo.profundidad ? undefined : 'action.hover';
    return <>
        <TableRow hover sx={{bgcolor:fondo}}>
            <TableCell sx={{pl:1 + nodo.profundidad * 2.5}} colSpan={esCampo ? columnas.length + tipos.length + 3 : undefined}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    {nodo.hijos.length
                        ? <IconButton size="small" aria-label={abierto ? `cerrar ${nodo.nombre}` : `abrir ${nodo.nombre}`}
                            aria-expanded={abierto} onClick={() => onAlternar(nodo.id)}>
                            {abierto ? <KeyboardArrowDown/> : <KeyboardArrowRight/>}
                        </IconButton>
                        : <Box sx={{width:34, flexShrink:0}}/>}
                    <Box component="span" sx={{
                        fontWeight:nodo.nivel === 'valor' ? undefined : 600,
                        fontStyle:esCampo ? 'italic' : undefined,
                        color:esCampo || nodo.valor == null ? 'text.secondary' : undefined,
                    }}>
                        {nodo.nombre}
                    </Box>
                </Stack>
            </TableCell>
            {esCampo ? null : <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{minWidth:48, textAlign:'right'}}><Cantidad valor={nodo.cuenta.total} destino={destinoDe(celda)} fuerte/></Box>
                    <Barra proporcion={nodo.proporcion}/>
                    {angosta ? null : <Typography variant="body2" color="text.secondary" sx={{minWidth:44, textAlign:'right'}} title="Parte del total">
                        {porcentaje(nodo.proporcion)}
                    </Typography>}
                </Stack>
            </TableCell>}
            {esCampo || angosta ? null : <CeldasDeEstadoDeModelos cuenta={nodo.cuenta} columnas={columnas} tipos={tipos} celda={celda}/>}
        </TableRow>
        {abierto
            ? nodo.hijos.map(hijo => <FilaDeNodo key={hijo.id} nodo={hijo} columnas={columnas} tipos={tipos} previos={previos}
                abiertos={abiertos} angosta={angosta} onAlternar={onAlternar}/>)
            : null}
    </>;
}

function ArbolDeBienes({arbol, raices, previos, abiertos, onAlternar}:{
    arbol:ArbolDeModelos, raices:NodoDeModelos[], previos:FiltroPrevio[], abiertos:Set<string>, onAlternar:(id:string) => void,
}){
    const theme = useTheme();
    const angosta = useMediaQuery(theme.breakpoints.down('sm'));
    const columnas = arbol.columnas;
    return <TableContainer>
        <Table size="small" aria-label="bienes por categoría, subcategoría y atributos">
            <TableHead>
                <TableRow>
                    <TableCell>Categoría / subcategoría / atributo / valor</TableCell>
                    <TableCell sx={{width:angosta ? '45%' : '20%'}}>Cantidad</TableCell>
                    {angosta ? null : columnas.map(columna =>
                        <TableCell key={columna.clave} align="right" title={columna.descripcion ?? undefined}>{columna.etiqueta}</TableCell>)}
                    {angosta ? null : <TableCell align="right" sx={{...SEPARADOR, whiteSpace:'nowrap'}}
                        title="Bienes cuyo último movimiento tiene cargado un responsable de uso; se cuenta aparte del estado">
                        {EN_USO.titulo}
                    </TableCell>}
                    {angosta ? null : encabezadosDeTipos(arbol.tipos)}
                </TableRow>
            </TableHead>
            <TableBody>
                {raices.map(raiz => <FilaDeNodo key={raiz.id} nodo={raiz} columnas={columnas} tipos={arbol.tipos} previos={previos}
                    abiertos={abiertos} angosta={angosta} onAlternar={onAlternar}/>)}
                <TableRow sx={{'& > *':{fontWeight:700}}}>
                    <TableCell sx={{fontWeight:700}}>Total</TableCell>
                    <TableCell>
                        <Box sx={{minWidth:48, textAlign:'right', display:'inline-block'}}>
                            <Cantidad valor={arbol.total.total} destino={destinoDe({previos})} fuerte/>
                        </Box>
                    </TableCell>
                    {angosta ? null : <CeldasDeEstadoDeModelos cuenta={arbol.total} columnas={columnas} tipos={arbol.tipos} celda={{previos}}/>}
                </TableRow>
            </TableBody>
        </Table>
    </TableContainer>;
}

function catalogosDesde(categorias:Fila[], subcategorias:Fila[], estados:Fila[], atributos:Fila[], sectores:Fila[], tipos:Fila[]):Catalogos{
    return {
        categorias:categorias.map(fila => ({
            categoria:texto(fila.categoria), nombre:texto(fila.nombre), orden:numeroONulo(fila.orden), aparte:fila.aparte === true,
        })).sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity) || a.nombre.localeCompare(b.nombre)),
        subcategorias:subcategorias.map(fila => ({subcategoria:texto(fila.subcategoria), nombre:texto(fila.nombre), categoria:texto(fila.categoria)})),
        estados:estadosDesde(estados),
        atributos:atributos.map(fila => ({atributo:texto(fila.atributo), nombre:texto(fila.nombre) || texto(fila.atributo)}))
            .filter(fila => fila.atributo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
        areas:opcionesDeSectores(sectores),
        tipos:tiposDesde(tipos),
    };
}

function abiertosAlEntrar(raices:NodoDeModelos[], delBuscador:Set<string>):Set<string>{
    const abiertos = new Set(delBuscador);
    const [categoria, ...otrasCategorias] = raices;
    if(!categoria || otrasCategorias.length){ return abiertos; }
    abiertos.add(categoria.id);
    const [subcategoria, ...otrasSubcategorias] = categoria.hijos;
    if(!subcategoria || otrasSubcategorias.length){ return abiertos; }
    abiertos.add(subcategoria.id);
    subcategoria.hijos.forEach(campo => abiertos.add(campo.id));
    return abiertos;
}

export function BienesPorModelo(){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const [catalogos, setCatalogos] = React.useState<Catalogos|null>(null);
    const [area, setArea] = React.useState<OpcionDeFiltro|null>(null);
    const [categoria, setCategoria] = React.useState<CategoriaDeCatalogo|null>(null);
    const [subcategoria, setSubcategoria] = React.useState<SubcategoriaDeCatalogo|null>(null);
    const [filtroDeAtributo, setFiltroDeAtributo] = React.useState<FiltroDeAtributo>({atributo:null, valor:null});
    const [valoresDelAtributo, setValoresDelAtributo] = React.useState<OpcionDeFiltro[]|null>(null);
    const [buscado, setBuscado] = React.useState('');
    const [respuestas, setRespuestas] = React.useState<RespuestaDeCampo[]|null>(null);
    const [error, setError] = React.useState<string|null>(null);
    const [abiertos, setAbiertos] = React.useState<Set<string>>(new Set());
    const secuencia = React.useRef(0);

    const deClasificacion = React.useMemo<FiltroPrevio[]>(() => [
        ...(area ? [{dimension:'sector_rama', etiqueta:'sector y subsectores', valor:area.valor, texto:area.texto}] : []),
        ...(subcategoria
            ? [{dimension:'subcategoria', etiqueta:'subcategoría', valor:subcategoria.subcategoria, texto:subcategoria.nombre}]
            : categoria ? [{dimension:'categoria', etiqueta:'categoría', valor:categoria.categoria, texto:categoria.nombre}] : []),
    ], [area, categoria, subcategoria]);

    const previos = React.useMemo<FiltroPrevio[]>(() => {
        const {atributo, valor} = filtroDeAtributo;
        return atributo && valor
            ? [...deClasificacion, {dimension:claveDeAtributo(atributo.atributo), etiqueta:atributo.nombre, valor:valor.valor, texto:valor.texto}]
            : deClasificacion;
    }, [deClasificacion, filtroDeAtributo]);

    const subcategoriasOfrecidas = React.useMemo(() => (catalogos?.subcategorias ?? [])
        .filter(sub => !categoria || sub.categoria === categoria.categoria)
        .sort((a, b) => a.nombre.localeCompare(b.nombre)), [catalogos, categoria]);

    React.useEffect(() => {
        let cancelado = false;
        Promise.all(['categorias', 'subcategorias', 'estados_bien', 'bienes_atributos', 'sectores', 'tipo_asignacion'].map(tabla => leerTabla(conn, tabla)))
            .then(([categorias, subcategorias, estados, atributos, sectores, tipos]) => {
                if(!cancelado){ setCatalogos(catalogosDesde(categorias, subcategorias, estados, atributos, sectores, tipos)); }
            })
            .catch(err => {
                if(!cancelado){
                    setError(err instanceof Error ? err.message : String(err));
                    mostrarError(err, 'No se pudieron cargar los catálogos');
                }
            });
        return () => { cancelado = true; };
    }, [conn, mostrarError]);

    const atributoDelFiltro = filtroDeAtributo.atributo;
    React.useEffect(() => {
        setValoresDelAtributo(null);
        if(!atributoDelFiltro){ return; }
        let cancelado = false;
        pedirAgrupado(conn, deClasificacion, [claveDeAtributo(atributoDelFiltro.atributo)])
            .then(filas => { if(!cancelado){ setValoresDelAtributo(opcionesDeAgrupado(filas)); } })
            .catch(err => { if(!cancelado){ mostrarError(err, 'No se pudieron cargar los valores del atributo'); } });
        return () => { cancelado = true; };
    }, [conn, mostrarError, deClasificacion, atributoDelFiltro]);

    React.useEffect(() => {
        if(!catalogos){ return; }
        const numero = ++secuencia.current;
        setRespuestas(null);
        setError(null);
        Promise.all(camposDelReporte(catalogos.atributos).map(campo => Promise.all([
            pedirAgrupado(conn, previos, dimensionesDelCampo(campo)),
            pedirAgrupado(conn, previos, dimensionesDeTiposDelCampo(campo)),
        ]).then(([filas, deTipos]) => ({campo, filas, deTipos})))).then(delReporte => {
            if(numero === secuencia.current){ setRespuestas(delReporte); }
        }).catch(err => {
            if(numero === secuencia.current){ setError(err instanceof Error ? err.message : String(err)); }
        });
    }, [conn, catalogos, previos]);

    const arbol = React.useMemo(() => catalogos && respuestas
        ? armarArbolDeModelos(respuestas, catalogos.subcategorias, catalogos.categorias, catalogos.estados, catalogos.tipos)
        : null, [catalogos, respuestas]);
    const filtrado = React.useMemo(() => arbol ? filtrarArbol(arbol.raices, buscado) : null, [arbol, buscado]);

    React.useEffect(() => {
        setAbiertos(filtrado ? abiertosAlEntrar(filtrado.raices, filtrado.abiertos) : new Set());
    }, [filtrado]);

    const alternar = React.useCallback((id:string) => setAbiertos(anteriores => {
        const nuevos = new Set(anteriores);
        if(nuevos.has(id)){ nuevos.delete(id); }else{ nuevos.add(id); }
        return nuevos;
    }), []);

    const elegirCategoria = (opcion:CategoriaDeCatalogo|null) => {
        setCategoria(opcion);
        if(subcategoria && subcategoria.categoria !== opcion?.categoria){ setSubcategoria(null); }
    };

    const elegirSubcategoria = (opcion:SubcategoriaDeCatalogo|null) => {
        setSubcategoria(opcion);
        if(opcion){ setCategoria(catalogos?.categorias.find(cat => cat.categoria === opcion.categoria) ?? null); }
    };

    const descargar = () => arbol && descargarCsv(csvDeModelos({...arbol, raices:filtrado?.raices ?? arbol.raices}),
        nombreDelCsv(previos, new Date(), 'bienes-por-atributos'));

    const ancho = {width:{xs:'100%', sm:240}};

    return <Box sx={{p:{xs:2, sm:3}, maxWidth:1400, mx:'auto'}}>
        <Stack direction={{xs:'column', sm:'row'}} spacing={2} alignItems={{xs:'stretch', sm:'center'}} sx={{mb:2}} flexWrap="wrap" useFlexGap>
            <Autocomplete
                options={catalogos?.areas ?? []}
                value={area}
                onChange={(_evento, opcion) => setArea(opcion)}
                getOptionLabel={opcion => opcion.etiqueta}
                isOptionEqualToValue={(a, b) => a.valor === b.valor}
                loading={!catalogos}
                sx={{width:{xs:'100%', sm:320}}}
                renderInput={params => <TextField {...params} label="Área (con subsectores)" placeholder="Todas" size="small"/>}
            />
            <Autocomplete
                options={catalogos?.categorias ?? []}
                value={categoria}
                onChange={(_evento, opcion) => elegirCategoria(opcion)}
                getOptionLabel={opcion => opcion.nombre}
                isOptionEqualToValue={(a, b) => a.categoria === b.categoria}
                loading={!catalogos}
                sx={ancho}
                renderInput={params => <TextField {...params} label="Categoría" placeholder="Todas" size="small"/>}
            />
            <Autocomplete
                options={subcategoriasOfrecidas}
                value={subcategoria}
                onChange={(_evento, opcion) => elegirSubcategoria(opcion)}
                getOptionLabel={opcion => opcion.nombre}
                isOptionEqualToValue={(a, b) => a.subcategoria === b.subcategoria}
                loading={!catalogos}
                sx={ancho}
                renderInput={params => <TextField {...params} label="Subcategoría" placeholder="Todas" size="small"/>}
            />
            <Autocomplete
                options={catalogos?.atributos ?? []}
                value={filtroDeAtributo.atributo}
                onChange={(_evento, opcion) => setFiltroDeAtributo({atributo:opcion, valor:null})}
                getOptionLabel={opcion => opcion.nombre}
                isOptionEqualToValue={(a, b) => a.atributo === b.atributo}
                loading={!catalogos}
                sx={ancho}
                renderInput={params => <TextField {...params} label="Filtrar por atributo" placeholder="Ninguno" size="small"/>}
            />
            <Autocomplete
                options={valoresDelAtributo ?? []}
                value={filtroDeAtributo.valor}
                onChange={(_evento, opcion) => setFiltroDeAtributo(anterior => ({...anterior, valor:opcion}))}
                getOptionLabel={opcion => opcion.etiqueta}
                isOptionEqualToValue={(a, b) => a.valor === b.valor}
                disabled={!filtroDeAtributo.atributo}
                loading={!!filtroDeAtributo.atributo && !valoresDelAtributo}
                sx={ancho}
                renderInput={params => <TextField {...params} label="Valor del atributo" placeholder="Todos" size="small"/>}
            />
            <TextField label="Buscar atributo o valor" size="small" value={buscado} onChange={evento => setBuscado(evento.target.value)} sx={ancho}/>
            <Box sx={{flex:1, display:{xs:'none', sm:'block'}}}/>
            <Button variant="outlined" startIcon={<Download/>} onClick={descargar} disabled={!arbol}>Descargar</Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{mb:1}}>
            Bienes activos que podés ver{previos.map(previo => `, ${previo.etiqueta} ${previo.texto}`).join('')}. Abrí una subcategoría para ver su marca, modelo y atributos; tocá un número para ver esos bienes.
        </Typography>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {!arbol && !error ? <Typography color="text.secondary">Cargando…</Typography> : null}
        {arbol && filtrado && !filtrado.raices.length
            ? <Alert severity="info">{buscado.trim() ? `Nada coincide con «${buscado.trim()}».` : 'No hay bienes con estos filtros.'}</Alert>
            : null}
        {arbol && filtrado && filtrado.raices.length
            ? <ArbolDeBienes arbol={arbol} raices={filtrado.raices} previos={previos} abiertos={abiertos} onAlternar={alternar}/>
            : null}
    </Box>;
}
