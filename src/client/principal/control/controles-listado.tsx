import * as React from 'react';
import {
    Box,
    Button,
    Chip,
    MenuItem,
    Stack,
    TextField,
} from '@mui/material';
import {Refresh} from '@mui/icons-material';
import {
    DataGrid,
    GridColDef,
    GridPaginationModel,
    GridRowParams,
    GridSortModel,
    gridFilteredSortedRowIdsSelector,
    useGridApiRef,
} from '@mui/x-data-grid';
import type {FixedFields} from 'frontend-plus';

import {useAvisos, useConexion} from '../base/contexto-base';
import {capitalizar, formatearValor} from '../base/formato-valores';
import {bienesGridLocaleText} from '../localizacion-grid';
import type {Fila} from '../base/tipos-tabla';
import {SITUACIONES_DE_CONTROL, SituacionDeControl, buscarBienParaControl} from '../../../common/controles';

const COLOR_POR_SITUACION:Record<SituacionDeControl, 'error'|'warning'|'success'> = {
    NUNCA:'error',
    VENCIDO:'warning',
    VIGENTE:'success',
};

const TODOS = '__todos__';

export function textoDeReferencia(codigo:unknown, ...descripciones:unknown[]):string{
    const texto = descripciones
        .map(parte => String(parte ?? '').trim())
        .filter(parte => parte !== '')
        .join(' ');
    return texto !== '' ? texto : String(codigo ?? '').trim();
}

export function codigoDeClase(fila:Fila):string{
    return [codigo(fila, 'rubro'), codigo(fila, 'clase')].filter(parte => parte !== '').join('.');
}

export function claseDe(fila:Fila):string{
    const nombre = String(fila.clases__nombre ?? '').trim();
    return nombre !== '' ? `${codigoDeClase(fila)} — ${nombre}` : codigoDeClase(fila);
}

export function espacioDe(fila:Fila):string{
    return textoDeReferencia(fila.espacio, fila.espacios__numero, fila.espacios__denominacion);
}

export function responsableDelSectorDe(fila:Fila):string{
    return textoDeReferencia(fila.responsable_sector,
        fila.responsable_sector__apellido, fila.responsable_sector__nombre);
}

function codigo(fila:Fila, campo:string):string{
    return String(fila[campo] ?? '').trim();
}

function opcionesDe(filas:Fila[], campo:string|((fila:Fila) => string), texto:(fila:Fila) => string){
    const vistas = new Map<string, string>();
    for(const fila of filas){
        const valor = typeof campo === 'string' ? codigo(fila, campo) : campo(fila);
        if(valor !== '' && !vistas.has(valor)){
            vistas.set(valor, texto(fila));
        }
    }
    return [...vistas].sort((a, b) => a[1].localeCompare(b[1]));
}

export function ChipSituacion({situacion}:{situacion:string}){
    return <Chip
        size="small"
        color={COLOR_POR_SITUACION[situacion as SituacionDeControl] ?? 'default'}
        label={capitalizar(situacion.toLowerCase())}
    />;
}

export function ControlesListado({
    recargar,
    onAbrirBien,
}:{
    recargar:number,
    onAbrirBien:(bien:Fila, lista:Fila[]) => void,
}){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const apiRef = useGridApiRef();
    const [filas, setFilas] = React.useState<Fila[]>([]);
    const [cargando, setCargando] = React.useState(true);
    const [situacion, setSituacion] = React.useState(TODOS);
    const [clase, setClase] = React.useState(TODOS);
    const [grupo, setGrupo] = React.useState(TODOS);
    const [sector, setSector] = React.useState(TODOS);
    const [espacio, setEspacio] = React.useState(TODOS);
    const [busqueda, setBusqueda] = React.useState('');
    const [paginacion, setPaginacion] = React.useState<GridPaginationModel>({page:0, pageSize:25});
    const [orden, setOrden] = React.useState<GridSortModel>([]);

    const cargar = React.useCallback(async () => {
        setCargando(true);
        try{
            const datos = await conn.ajax.table_data({
                table:'bienes_control',
                fixedFields:[] as FixedFields,
                paramfun:{},
            }) as unknown as Fila[];
            setFilas(datos);
        }catch(err){
            mostrarError(err, 'No se pudo cargar el control de bienes');
        }finally{
            setCargando(false);
        }
    }, [conn, mostrarError]);

    React.useEffect(() => { void cargar(); }, [cargar, recargar]);

    const porSituacion = React.useMemo(() => {
        const cuenta = new Map<string, number>();
        for(const fila of filas){
            const clave = codigo(fila, 'situacion');
            cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
        }
        return cuenta;
    }, [filas]);

    const clases = React.useMemo(() => opcionesDe(filas, codigoDeClase, claseDe), [filas]);
    const grupos = React.useMemo(
        () => opcionesDe(filas, 'grupo', f => textoDeReferencia(f.grupo, f.grupos__descripcion)),
        [filas],
    );
    const sectores = React.useMemo(
        () => opcionesDe(filas, 'sector', f => textoDeReferencia(f.sector, f.sectores__sigla)),
        [filas],
    );
    const espacios = React.useMemo(() => opcionesDe(filas, 'espacio', espacioDe), [filas]);

    const filasVisibles = React.useMemo(() => {
        const buscado = busqueda.trim().toLowerCase();
        return filas.filter(fila =>
            (situacion === TODOS || codigo(fila, 'situacion') === situacion)
            && (clase === TODOS || codigoDeClase(fila) === clase)
            && (grupo === TODOS || codigo(fila, 'grupo') === grupo)
            && (sector === TODOS || codigo(fila, 'sector') === sector)
            && (espacio === TODOS || codigo(fila, 'espacio') === espacio)
            && (buscado === ''
                || codigo(fila, 'ficha').toLowerCase().includes(buscado)
                || codigo(fila, 'serie').toLowerCase().includes(buscado))
        );
    }, [busqueda, clase, espacio, filas, grupo, sector, situacion]);

    const listaEnOrden = React.useCallback(():Fila[] => {
        const porFicha = new Map(filasVisibles.map(fila => [codigo(fila, 'ficha'), fila]));
        return gridFilteredSortedRowIdsSelector(apiRef)
            .map(id => porFicha.get(String(id)))
            .filter((fila):fila is Fila => fila != null);
    }, [apiRef, filasVisibles]);

    const abrirPorFicha = () => {
        const texto = busqueda.trim();
        if(texto === ''){
            return;
        }
        const {bien, error} = buscarBienParaControl(texto, filas, filasVisibles);
        if(!bien){
            if(error){ mostrarError(new Error(error)); }
            return;
        }
        onAbrirBien(bien, listaEnOrden());
    };

    const columnas = React.useMemo<GridColDef[]>(() => [
        {field:'ficha', headerName:'Ficha', width:110},
        {field:'clase', headerName:'Clase', width:150, valueGetter:(_v, fila) => claseDe(fila)},
        {
            field:'grupo',
            headerName:'Grupo',
            width:140,
            valueGetter:(_v, fila) => textoDeReferencia(fila.grupo, fila.grupos__descripcion),
        },
        {field:'detalle', headerName:'Descripción', flex:1, minWidth:180},
        {
            field:'marca',
            headerName:'Marca',
            width:120,
            valueGetter:(_v, fila) => textoDeReferencia(fila.marca, fila.marcas__descripcion),
        },
        {field:'serie', headerName:'Serie', width:140},
        {
            field:'sector',
            headerName:'Sector',
            width:100,
            valueGetter:(_v, fila) => textoDeReferencia(fila.sector, fila.sectores__sigla),
        },
        {field:'espacio', headerName:'Espacio', width:150, valueGetter:(_v, fila) => espacioDe(fila)},
        {
            field:'responsable_sector',
            headerName:'Responsable del sector',
            width:170,
            valueGetter:(_v, fila) => responsableDelSectorDe(fila),
        },
        {
            field:'fecha_ultimo_control',
            headerName:'Último control',
            width:120,
            valueFormatter:(value:unknown) => formatearValor(value),
        },
        {
            field:'dias_desde_control',
            headerName:'Días',
            type:'number',
            width:80,
            valueGetter:(value:unknown) => value == null ? null : Number(value),
        },
        {
            field:'situacion',
            headerName:'Situación',
            width:110,
            renderCell:params => <ChipSituacion situacion={codigo(params.row, 'situacion')}/>,
        },
    ], []);

    const filtro = (
        etiqueta:string,
        valor:string,
        cambiar:(valor:string) => void,
        opciones:[string, string][],
    ) => <TextField
        select
        size="small"
        label={etiqueta}
        value={valor}
        onChange={evento => cambiar(evento.target.value)}
        sx={{minWidth:160}}
    >
        <MenuItem value={TODOS}>Todos</MenuItem>
        {opciones.map(([clave, texto]) => <MenuItem key={clave} value={clave}>{texto}</MenuItem>)}
    </TextField>;

    return <Box sx={{p:{xs:1, md:2}}}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{mb:2}}>
            <Box sx={{flex:1}}/>
            <Button startIcon={<Refresh/>} onClick={() => void cargar()} disabled={cargando}>
                Actualizar
            </Button>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{mb:2}}>
            <Chip
                label={`${filas.length} dispositivos`}
                variant={situacion === TODOS ? 'filled' : 'outlined'}
                onClick={() => setSituacion(TODOS)}
            />
            {SITUACIONES_DE_CONTROL.map(valor => <Chip
                key={valor}
                label={`${valor.toLowerCase()}: ${porSituacion.get(valor) ?? 0}`}
                color={COLOR_POR_SITUACION[valor]}
                variant={situacion === valor ? 'filled' : 'outlined'}
                onClick={() => setSituacion(situacion === valor ? TODOS : valor)}
            />)}
        </Stack>

        <Stack direction="row" spacing={2} sx={{mb:2}} flexWrap="wrap" useFlexGap>
            <TextField
                size="small"
                label="Ficha, serie o código de barras"
                helperText="Enter abre la ficha o una única coincidencia de serie"
                value={busqueda}
                onChange={evento => setBusqueda(evento.target.value)}
                onKeyDown={evento => {
                    if(evento.key === 'Enter'){
                        evento.preventDefault();
                        abrirPorFicha();
                    }
                }}
                autoFocus
                sx={{minWidth:220}}
            />
            {filtro('situación', situacion, setSituacion,
                SITUACIONES_DE_CONTROL.map(s => [s, s.toLowerCase()]))}
            {filtro('clase', clase, setClase, clases)}
            {filtro('grupo', grupo, setGrupo, grupos)}
            {filtro('sector', sector, setSector, sectores)}
            {filtro('espacio', espacio, setEspacio, espacios)}
        </Stack>

        <DataGrid
            apiRef={apiRef}
            rows={filasVisibles}
            columns={columnas}
            loading={cargando}
            getRowId={fila => String(fila.ficha)}
            onRowClick={(params:GridRowParams) => onAbrirBien(params.row as Fila, listaEnOrden())}
            paginationModel={paginacion}
            onPaginationModelChange={setPaginacion}
            sortModel={orden}
            onSortModelChange={setOrden}
            autoHeight
            density="compact"
            pageSizeOptions={[25, 50, 100]}
            localeText={bienesGridLocaleText}
            sx={{cursor:'pointer'}}
        />
    </Box>;
}
