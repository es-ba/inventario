import * as React from 'react';
import {Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, Stack, TextField} from '@mui/material';
import {Add, Refresh} from '@mui/icons-material';
import {DataGrid, GridColDef, GridPaginationModel, GridRowParams, GridSortModel} from '@mui/x-data-grid';
import type {FixedFields} from 'frontend-plus';

import {useAvisos, useConexion, useInfoUsuario, usePermisos} from '../base/contexto-base';
import {useDatosReferencial} from '../base/cache-tablas';
import {formatearValor} from '../base/formato-valores';
import {gridLocaleText} from '../localizacion-grid';
import type {Fila} from '../base/tipos-tabla';
import {codigo, textoDeReferencia} from '../base/referencias';
import {EN_CURSO, TODAS, contarPorEstado, pasaSolicitud} from '../../../common/solicitudes';
import {SolicitudAcciones} from './solicitud-acciones';

export function SolicitudesListado({
    onAbrir,
    recargar,
}:{
    onAbrir:(acta?:string) => void,
    recargar:number,
}){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const permisos = usePermisos();
    const {usuario} = useInfoUsuario();
    const catalogoDeEstados = useDatosReferencial('estados');
    const [filas, setFilas] = React.useState<Fila[]>([]);
    const [cargando, setCargando] = React.useState(true);
    const [estado, setEstado] = React.useState(TODAS);
    const [soloMias, setSoloMias] = React.useState(false);
    const [busqueda, setBusqueda] = React.useState('');
    const [paginacion, setPaginacion] = React.useState<GridPaginationModel>({page:0, pageSize:25});
    const [orden, setOrden] = React.useState<GridSortModel>([{field:'acta', sort:'desc'}]);

    const cargar = React.useCallback(async () => {
        setCargando(true);
        try{
            const datos = await conn.ajax.table_data({
                table:'movimientos_solicitudes_acciones',
                fixedFields:[] as FixedFields,
                paramfun:{},
            }) as unknown as Fila[];
            setFilas(datos);
        }catch(err){
            mostrarError(err, 'No se pudieron cargar las solicitudes');
            setFilas([]);
        }finally{
            setCargando(false);
        }
    }, [conn, mostrarError]);

    React.useEffect(() => { void cargar(); }, [cargar, recargar]);

    const estados = React.useMemo(
        () => [...catalogoDeEstados.filas].sort((a, b) => Number(a.orden_estado ?? 0) - Number(b.orden_estado ?? 0)),
        [catalogoDeEstados.filas],
    );
    const descripcionDeEstado = React.useMemo(
        () => new Map(estados.map(e => [codigo(e, 'estado'), textoDeReferencia(e.estado, e.desc_estado)])),
        [estados],
    );

    const filtros = React.useMemo(
        () => ({estado, soloMias, usuario:String(usuario ?? ''), busqueda}),
        [busqueda, estado, soloMias, usuario],
    );
    const filasVisibles = React.useMemo(() => filas.filter(fila => pasaSolicitud(fila, filtros)), [filas, filtros]);
    const conteo = React.useMemo(() => contarPorEstado(filas, filtros), [filas, filtros]);

    const irAlPrincipio = () => setPaginacion(actual => ({...actual, page:0}));
    const elegirEstado = (valor:string) => {
        setEstado(valor);
        irAlPrincipio();
    };

    const columnas = React.useMemo<GridColDef[]>(() => [
        {
            field:'acta',
            headerName:'N.º de solicitud',
            type:'number',
            width:140,
            align:'left',
            headerAlign:'left',
            valueGetter:(value:unknown) => value == null ? null : Number(value),
        },
        {
            field:'estado',
            headerName:'Estado',
            width:130,
            valueGetter:(_v, fila) => descripcionDeEstado.get(codigo(fila, 'estado'))
                ?? textoDeReferencia(fila.estado, fila.estados__desc_estado),
            renderCell:(params) => params.value ? <Chip size="small" variant="outlined" label={String(params.value)}/> : null,
        },
        {
            field:'tipo_asignacion__descripcion',
            headerName:'Asignación',
            width:120,
            valueGetter:(_v, fila) => textoDeReferencia(
                fila.tipo_asignacion, fila.tipo_asignacion__descripcion,
            ),
        },
        {
            field:'responsables__apellido',
            headerName:'Responsable directo',
            flex:1,
            minWidth:140,
            valueGetter:(_v, fila) => textoDeReferencia(
                fila.responsable, fila.responsables__apellido, fila.responsables__nombre,
            ),
        },
        {
            field:'sectores__sigla',
            headerName:'Sector',
            width:120,
            valueGetter:(_v, fila) => textoDeReferencia(fila.sector, fila.sectores__sigla),
        },
        {
            field:'sedes__descripcion',
            headerName:'Sede',
            width:130,
            valueGetter:(_v, fila) => textoDeReferencia(fila.sede, fila.sedes__descripcion),
        },
        {
            field:'espacios__numero',
            headerName:'Espacio',
            width:130,
            valueGetter:(_v, fila) => textoDeReferencia(
                fila.espacio, fila.espacios__numero, fila.espacios__denominacion,
            ),
        },
        {
            field:'cantidad_bienes',
            headerName:'Bienes',
            type:'number',
            width:90,
            valueGetter:(value:unknown) => value == null ? 0 : Number(value),
        },
        {
            field:'fecha_creacion',
            headerName:'Creada',
            width:110,
            valueFormatter:(value:unknown) => formatearValor(value),
        },
        {field:'usuario_creacion', headerName:'Usuario', width:120},
        {
            field:'__acciones',
            headerName:'Acciones',
            width:260,
            sortable:false,
            filterable:false,
            disableColumnMenu:true,
            renderCell:(params) => <SolicitudAcciones
                acta={String(params.row.acta)}
                acciones={params.row.acciones}
                onEjecutada={() => void cargar()}
            />,
        },
    ], [cargar, descripcionDeEstado]);

    return <Box sx={{p:{xs:1, md:2}}}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{mb:2}}>
            <Box sx={{flex:1}}/>
            <Button startIcon={<Refresh/>} onClick={() => void cargar()} disabled={cargando}>
                Actualizar
            </Button>
            {permisos.guardar
                ? <Button variant="contained" startIcon={<Add/>} onClick={() => onAbrir(undefined)}>
                    Nueva solicitud
                </Button>
                : null}
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{mb:2}}>
            <Chip
                label={`todas: ${conteo.todas}`}
                variant={estado === TODAS ? 'filled' : 'outlined'}
                onClick={() => elegirEstado(TODAS)}
            />
            <Chip
                label={`en curso: ${conteo.enCurso}`}
                color="primary"
                variant={estado === EN_CURSO ? 'filled' : 'outlined'}
                onClick={() => elegirEstado(estado === EN_CURSO ? TODAS : EN_CURSO)}
            />
            {estados.map(fila => {
                const valor = codigo(fila, 'estado');
                return <Chip
                    key={valor}
                    label={`${descripcionDeEstado.get(valor)}: ${conteo.porEstado.get(valor) ?? 0}`}
                    variant={estado === valor ? 'filled' : 'outlined'}
                    onClick={() => elegirEstado(estado === valor ? TODAS : valor)}
                />;
            })}
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{mb:2}}>
            <TextField
                size="small"
                label="Buscar"
                helperText="N.º de solicitud, responsable, sector o ficha de un bien"
                value={busqueda}
                onChange={evento => {
                    setBusqueda(evento.target.value);
                    irAlPrincipio();
                }}
                sx={{minWidth:280}}
            />
            <FormControlLabel
                control={<Checkbox checked={soloMias} onChange={evento => {
                    setSoloMias(evento.target.checked);
                    irAlPrincipio();
                }}/>}
                label="Creadas por mí"
            />
        </Stack>

        {cargando && filas.length === 0
            ? <Box sx={{display:'flex', justifyContent:'center', p:6}}><CircularProgress/></Box>
            : <DataGrid
                rows={filasVisibles}
                columns={columnas}
                loading={cargando}
                getRowId={fila => String(fila.acta)}
                onRowClick={(params:GridRowParams) => onAbrir(String(params.row.acta))}
                paginationModel={paginacion}
                onPaginationModelChange={setPaginacion}
                sortModel={orden}
                onSortModelChange={setOrden}
                autoHeight
                density="compact"
                pageSizeOptions={[25, 50, 100]}
                localeText={gridLocaleText('No hay solicitudes')}
                sx={{cursor:'pointer'}}
            />
        }
    </Box>;
}
