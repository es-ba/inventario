import * as React from 'react';
import {
    Alert, Autocomplete, Box, Button, Checkbox, Collapse, FormControlLabel, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {Download, FilterList} from '@mui/icons-material';

import type {BienesAgrupadoFila, FiltroDeLista} from '../../../common/bienes-agrupar';
import {useAvisos, useConexion} from '../base/contexto-base';
import {Cargando} from '../base/cargando';
import {leerTabla} from '../base/referencias';
import type {Fila} from '../base/tipos-tabla';
import {Barra, Cantidad, SEPARADOR, descargarCsv, encabezadosDeTipos, estadosDesde, tiposDesde} from '../categorias/bienes-por-categoria';
import {
    EN_USO, consultaDelReporte, nombreDelCsv, opcionesDeSectores, porcentaje,
    type CategoriaDeCatalogo, type ColumnaDeEstado, type ColumnaDeTipo, type Cuenta, type EstadoDeCatalogo, type FiltroPrevio, type OpcionDeFiltro,
    type TipoDeCatalogo,
} from '../categorias/categorias-datos';
import {
    DIMENSIONES_DE_LA_TABLA, DIMENSIONES_DE_TIPOS_DE_LA_TABLA, alternarElegido, armarArbolDeModelos, armarFacetas, camposDelReporte, csvDeModelos,
    destinoDeCelda, filtrosDeFacetas, pedidosDeFacetas,
    type ArbolDeModelos, type AtributoDeCatalogo, type CampoDelBien, type CeldaDeModelos, type Elegidos, type Faceta, type NodoDeModelos, type Paso,
    type SubcategoriaDeCatalogo,
} from './modelos-datos';

type Catalogos = {
    categorias:CategoriaDeCatalogo[],
    subcategorias:SubcategoriaDeCatalogo[],
    estados:EstadoDeCatalogo[],
    atributos:AtributoDeCatalogo[],
    areas:OpcionDeFiltro[],
    tipos:TipoDeCatalogo[],
};

const texto = (valor:unknown) => valor == null ? '' : String(valor).trim();
const numeroONulo = (valor:unknown) => valor == null || valor === '' ? null : Number(valor);

const VALORES_A_LA_VISTA = 8;

type Filtros = Pick<CeldaDeModelos, 'previos' | 'filtros'>;

type Filas = {filas:BienesAgrupadoFila[], deTipos:BienesAgrupadoFila[]};

function CeldasDeEstadoDeModelos({cuenta, columnas, tipos, celda}:{cuenta:Cuenta, columnas:ColumnaDeEstado[], tipos:ColumnaDeTipo[], celda:CeldaDeModelos}){
    return <>
        {columnas.map(columna => <TableCell key={columna.clave} align="right">
            <Cantidad valor={cuenta.porEstado[columna.clave] ?? 0} destino={destinoDeCelda({...celda, estado:columna})}/>
        </TableCell>)}
        <TableCell align="right" sx={SEPARADOR}>
            <Cantidad valor={cuenta.enUso} destino={destinoDeCelda({...celda, enUso:true})}/>
        </TableCell>
        {tipos.map((tipo, indice) => <TableCell key={tipo.clave} align="right" sx={indice ? undefined : SEPARADOR}>
            <Cantidad valor={cuenta.porTipo[tipo.clave] ?? 0} destino={destinoDeCelda({...celda, tipo})}/>
        </TableCell>)}
    </>;
}

function FacetaDeCampo({faceta, onAlternar}:{faceta:Faceta, onAlternar:(campo:CampoDelBien, paso:Paso) => void}){
    const [todos, setTodos] = React.useState(false);
    const visibles = todos ? faceta.valores : faceta.valores.filter((valor, indice) => indice < VALORES_A_LA_VISTA || valor.elegido);
    return <Box component="fieldset" sx={{border:0, p:0, m:0, mb:2}}>
        <Typography component="legend" variant="subtitle2" sx={{mb:0.5}}>{faceta.campo.etiqueta}</Typography>
        <Box sx={todos ? {maxHeight:320, overflowY:'auto'} : undefined}>
            {visibles.map(valor => <FormControlLabel key={valor.valor ?? ''} sx={{display:'flex', mr:0, alignItems:'flex-start'}}
                control={<Checkbox size="small" checked={valor.elegido} onChange={() => onAlternar(faceta.campo, valor)} sx={{py:0.25}}/>}
                label={<Typography variant="body2" sx={{pt:0.5, color:valor.valor == null ? 'text.secondary' : undefined}}>
                    {valor.nombre} <Box component="span" sx={{color:'text.secondary'}}>({valor.cantidad})</Box>
                </Typography>}
            />)}
        </Box>
        {faceta.valores.length > VALORES_A_LA_VISTA
            ? <Button size="small" onClick={() => setTodos(!todos)}>{todos ? 'Ver menos' : `Ver todos (${faceta.valores.length})`}</Button>
            : null}
    </Box>;
}

function ColumnaDeFacetas({facetas, cargando, elegidos, onAlternar, onLimpiar}:{
    facetas:Faceta[]|null, cargando:boolean, elegidos:number, onAlternar:(campo:CampoDelBien, paso:Paso) => void, onLimpiar:() => void,
}){
    return <Box component="aside" aria-label="filtros por marca y atributos" sx={{opacity:cargando ? 0.6 : 1}}>
        <Stack direction="row" alignItems="center" sx={{mb:1}}>
            <Typography variant="subtitle1" sx={{flex:1, fontWeight:600}}>Filtrar</Typography>
            {elegidos ? <Button size="small" onClick={onLimpiar}>Limpiar</Button> : null}
        </Stack>
        {facetas == null ? <Cargando/> : null}
        {facetas && !facetas.length ? <Typography variant="body2" color="text.secondary">Ningún bien tiene marca ni atributos cargados.</Typography> : null}
        {facetas?.map(faceta => <FacetaDeCampo key={faceta.campo.dimension} faceta={faceta} onAlternar={onAlternar}/>)}
    </Box>;
}


function FilaDeNodo({nodo, columnas, tipos, filtros, angosta}:{
    nodo:NodoDeModelos, columnas:ColumnaDeEstado[], tipos:ColumnaDeTipo[], filtros:Filtros, angosta:boolean,
}){
    const celda:CeldaDeModelos = {...filtros, nodo};
    const deCategoria = nodo.nivel === 'categoria';
    return <TableRow hover sx={{bgcolor:deCategoria ? 'action.hover' : undefined}}>
        <TableCell sx={{pl:deCategoria ? 2 : 4, fontWeight:deCategoria ? 600 : undefined, color:nodo.valor == null ? 'text.secondary' : undefined}}>
            {nodo.nombre}
        </TableCell>
        <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{minWidth:48, textAlign:'right'}}><Cantidad valor={nodo.cuenta.total} destino={destinoDeCelda(celda)} fuerte/></Box>
                <Barra proporcion={nodo.proporcion}/>
                {angosta ? null : <Typography variant="body2" color="text.secondary" sx={{minWidth:44, textAlign:'right'}} title="Parte del total">
                    {porcentaje(nodo.proporcion)}
                </Typography>}
            </Stack>
        </TableCell>
        {angosta ? null : <CeldasDeEstadoDeModelos cuenta={nodo.cuenta} columnas={columnas} tipos={tipos} celda={celda}/>}
    </TableRow>;
}

function TablaDeModelos({arbol, filtros}:{arbol:ArbolDeModelos, filtros:Filtros}){
    const theme = useTheme();
    const angosta = useMediaQuery(theme.breakpoints.down('sm'));
    const {columnas, tipos} = arbol;
    return <TableContainer>
        <Table size="small" aria-label="bienes por categoría y subcategoría">
            <TableHead>
                <TableRow>
                    <TableCell>Categoría / subcategoría</TableCell>
                    <TableCell sx={{width:angosta ? '45%' : '20%'}}>Cantidad</TableCell>
                    {angosta ? null : columnas.map(columna =>
                        <TableCell key={columna.clave} align="right" title={columna.descripcion ?? undefined}>{columna.etiqueta}</TableCell>)}
                    {angosta ? null : <TableCell align="right" sx={{...SEPARADOR, whiteSpace:'nowrap'}}
                        title="Bienes cuyo último movimiento tiene cargado un responsable de uso; se cuenta aparte del estado">
                        {EN_USO.titulo}
                    </TableCell>}
                    {angosta ? null : encabezadosDeTipos(tipos)}
                </TableRow>
            </TableHead>
            <TableBody>
                {arbol.raices.map(categoria => <React.Fragment key={categoria.id}>
                    <FilaDeNodo nodo={categoria} columnas={columnas} tipos={tipos} filtros={filtros} angosta={angosta}/>
                    {categoria.hijos.map(subcategoria =>
                        <FilaDeNodo key={subcategoria.id} nodo={subcategoria} columnas={columnas} tipos={tipos} filtros={filtros} angosta={angosta}/>)}
                </React.Fragment>)}
                <TableRow sx={{'& > *':{fontWeight:700}}}>
                    <TableCell sx={{fontWeight:700}}>Total</TableCell>
                    <TableCell>
                        <Box sx={{minWidth:48, textAlign:'right', display:'inline-block'}}>
                            <Cantidad valor={arbol.total.total} destino={destinoDeCelda(filtros)} fuerte/>
                        </Box>
                    </TableCell>
                    {angosta ? null : <CeldasDeEstadoDeModelos cuenta={arbol.total} columnas={columnas} tipos={tipos} celda={filtros}/>}
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

export function BienesPorModelo(){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const [catalogos, setCatalogos] = React.useState<Catalogos|null>(null);
    const [area, setArea] = React.useState<OpcionDeFiltro|null>(null);
    const [categoria, setCategoria] = React.useState<CategoriaDeCatalogo|null>(null);
    const [subcategoria, setSubcategoria] = React.useState<SubcategoriaDeCatalogo|null>(null);
    const [elegidos, setElegidos] = React.useState<Elegidos>({});
    const [facetas, setFacetas] = React.useState<Faceta[]|null>(null);
    const [cargandoFacetas, setCargandoFacetas] = React.useState(false);
    const secuenciaDeFacetas = React.useRef(0);
    const [filas, setFilas] = React.useState<Filas|null>(null);
    const [error, setError] = React.useState<string|null>(null);
    const secuencia = React.useRef(0);
    const theme = useTheme();
    const angosta = useMediaQuery(theme.breakpoints.down('lg'));
    const [verFacetas, setVerFacetas] = React.useState(false);

    const previos = React.useMemo<FiltroPrevio[]>(() => [
        ...(area ? [{dimension:'sector_rama', etiqueta:'sector y subsectores', valor:area.valor, texto:area.texto}] : []),
        ...(subcategoria
            ? [{dimension:'subcategoria', etiqueta:'subcategoría', valor:subcategoria.subcategoria, texto:subcategoria.nombre}]
            : categoria ? [{dimension:'categoria', etiqueta:'categoría', valor:categoria.categoria, texto:categoria.nombre}] : []),
    ], [area, categoria, subcategoria]);

    const campos = React.useMemo(() => catalogos ? camposDelReporte(catalogos.atributos) : [], [catalogos]);
    const filtrosDeLista = React.useMemo<FiltroDeLista[]>(() => filtrosDeFacetas(campos, elegidos), [campos, elegidos]);
    const filtros = React.useMemo<Filtros>(() => ({previos, filtros:filtrosDeLista}), [previos, filtrosDeLista]);

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

    React.useEffect(() => {
        if(!campos.length){ return; }
        const numero = ++secuenciaDeFacetas.current;
        setCargandoFacetas(true);
        Promise.all(pedidosDeFacetas(campos, elegidos).map(pedido => conn.ajax.bienes_buscar_agrupado({
            consulta:JSON.stringify({...consultaDelReporte(previos, [], pedido.filtros), conjuntos:pedido.campos.map(campo => [campo.dimension])}),
        }).then(respuesta => pedido.campos.map((campo, indice) => [campo.dimension, respuesta.conjuntos[indice]] as const)))).then(porPedido => {
            if(numero === secuenciaDeFacetas.current){
                setFacetas(armarFacetas(campos, new Map(([] as (readonly [string, BienesAgrupadoFila[]])[]).concat(...porPedido)), elegidos));
                setCargandoFacetas(false);
            }
        }).catch(err => {
            if(numero === secuenciaDeFacetas.current){
                setCargandoFacetas(false);
                mostrarError(err, 'No se pudieron cargar los filtros');
            }
        });
    }, [conn, mostrarError, campos, previos, elegidos]);

    React.useEffect(() => {
        if(!campos.length){ return; }
        const numero = ++secuencia.current;
        setFilas(null);
        setError(null);
        conn.ajax.bienes_buscar_agrupado({
            consulta:JSON.stringify({
                ...consultaDelReporte(filtros.previos, [], filtros.filtros),
                conjuntos:[DIMENSIONES_DE_LA_TABLA, DIMENSIONES_DE_TIPOS_DE_LA_TABLA],
            }),
        }).then(({conjuntos:[deEstados, deTipos]}) => {
            if(numero === secuencia.current){ setFilas({filas:deEstados, deTipos}); }
        }).catch(err => {
            if(numero === secuencia.current){ setError(err instanceof Error ? err.message : String(err)); }
        });
    }, [conn, campos, filtros]);

    const arbol = React.useMemo(() => catalogos && filas
        ? armarArbolDeModelos(filas.filas, filas.deTipos, catalogos.subcategorias, catalogos.categorias, catalogos.estados, catalogos.tipos)
        : null, [catalogos, filas]);

    const elegirCategoria = (opcion:CategoriaDeCatalogo|null) => {
        setCategoria(opcion);
        if(subcategoria && subcategoria.categoria !== opcion?.categoria){ setSubcategoria(null); }
    };

    const elegirSubcategoria = (opcion:SubcategoriaDeCatalogo|null) => {
        setSubcategoria(opcion);
        if(opcion){ setCategoria(catalogos?.categorias.find(cat => cat.categoria === opcion.categoria) ?? null); }
    };

    const descargar = () => {
        if(arbol){ descargarCsv(csvDeModelos(arbol), nombreDelCsv(previos, new Date(), 'bienes-por-atributos')); }
    };

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
            <Box sx={{flex:1, display:{xs:'none', sm:'block'}}}/>
            {angosta
                ? <Button variant="outlined" startIcon={<FilterList/>} onClick={() => setVerFacetas(!verFacetas)} aria-expanded={verFacetas}>
                    Filtrar{filtrosDeLista.length ? ` (${filtrosDeLista.length})` : ''}
                </Button>
                : null}
            <Button variant="outlined" startIcon={<Download/>} onClick={descargar} disabled={!arbol}>Descargar</Button>
        </Stack>
        <Box sx={{display:'grid', gridTemplateColumns:{xs:'minmax(0, 1fr)', lg:'240px minmax(0, 1fr)'}, gap:3, alignItems:'start'}}>
            <Collapse in={!angosta || verFacetas}>
                <ColumnaDeFacetas facetas={facetas} cargando={cargandoFacetas} elegidos={filtrosDeLista.length}
                    onAlternar={(campo, paso) => setElegidos(anteriores => alternarElegido(anteriores, campo, paso))}
                    onLimpiar={() => setElegidos({})}/>
            </Collapse>
            <Box>
                <Typography variant="body2" color="text.secondary" sx={{mb:1}}>
                    Bienes activos que podés ver{previos.map(previo => `, ${previo.etiqueta} ${previo.texto}`).join('')}{filtrosDeLista
                        .map(filtro => `, ${filtro.targetLabel.toLowerCase()} ${filtro.valueLabels.join(' o ')}`).join('')}. Tildá
                    en Filtrar la marca y los atributos que buscás; tocá un número para ver esos bienes.
                </Typography>
                {error ? <Alert severity="error">{error}</Alert> : null}
                {!arbol && !error ? <Cargando/> : null}
                {arbol && !arbol.raices.length ? <Alert severity="info">No hay bienes con estos filtros.</Alert> : null}
                {arbol && arbol.raices.length ? <TablaDeModelos arbol={arbol} filtros={filtros}/> : null}
            </Box>
        </Box>
    </Box>;
}
