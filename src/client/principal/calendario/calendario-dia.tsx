import * as React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Link,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import {ChevronLeft, ChevronRight, OpenInNew} from '@mui/icons-material';
import {DataGrid, GridColDef, GridPaginationModel} from '@mui/x-data-grid';

import {useAvisos, useConexion} from '../base/contexto-base';
import {formatearValor} from '../base/formato-valores';
import {bienesGridLocaleText} from '../localizacion-grid';
import {unmountConnectedAppInventario} from '../render-connected-app-inventario';
import {hoyYmd, sumarDias, textoDeFecha} from '../../../common/calendario';
import {BienDelGrupo, GrupoDelDia, TipoVisible} from './calendario-comun';

function irA(hash:string){
    unmountConnectedAppInventario();
    location.hash = hash;
}

function texto(valor:unknown):string{
    return formatearValor(valor).trim();
}

function Ubicacion({sector, responsable, espacio}:{sector:unknown, responsable:unknown, espacio:unknown}){
    const lineas = [texto(sector), texto(responsable), texto(espacio)].filter(l => l !== '');
    if(lineas.length === 0){
        return <Typography variant="body2" color="text.disabled">—</Typography>;
    }
    return <Box sx={{py:0.5}}>
        {lineas.map((l, i) => <Typography key={i} variant="body2" sx={{lineHeight:1.3}}>{l}</Typography>)}
    </Box>;
}

const A_CARGO_COMO:Record<string, string> = {
    directo:'responsable directo',
    sector:'responsable del sector',
};

function columnasDelTipo(tipo:string, grupo:GrupoDelDia):GridColDef[]{
    const bien:GridColDef[] = [
        {
            field:'ficha', headerName:'Ficha', width:110, sortable:false,
            renderCell:({row}) => <Link component="button" variant="body2"
                title={`Abrir la ficha del bien ${row.ficha}`}
                onClick={() => irA(`w=principal&ficha=${encodeURIComponent(String(row.ficha))}`)}>
                {String(row.ficha)}
            </Link>,
        },
        {
            field:'bien', headerName:'Bien', flex:1, minWidth:220, sortable:false,
            renderCell:({row}) => <Box sx={{py:0.5}}>
                <Typography variant="body2" sx={{lineHeight:1.3}}>{texto(row.detalle) || '—'}</Typography>
                <Typography variant="caption" color="text.secondary">
                    {[texto(row.bien_grupo), texto(row.marca), texto(row.modelo), row.serie ? `serie ${texto(row.serie)}` : '']
                        .filter(p => p !== '').join(' · ')}
                </Typography>
            </Box>,
        },
    ];
    switch(tipo){
        case 'MOVIMIENTO':
            return [
                {field:'hora', headerName:'Hora', width:70, sortable:false},
                ...bien,
                {field:'de', headerName:'De', width:230, sortable:false,
                    renderCell:({row}) => <Ubicacion sector={row.de_sector} responsable={row.de_responsable} espacio={row.de_espacio}/>},
                {field:'a', headerName:'A', width:230, sortable:false,
                    renderCell:({row}) => <Ubicacion sector={row.a_sector} responsable={row.a_responsable} espacio={row.a_espacio}/>},
                {field:'usuario', headerName:'Usuario', width:110, sortable:false},
            ];
        case 'BAJA':
            return [
                {field:'hora', headerName:'Hora', width:70, sortable:false},
                ...bien,
                {field:'paso', headerName:'Paso', width:120, sortable:false, valueGetter:(v:unknown) => texto(v) || grupo.titulo},
                {field:'motivo', headerName:'Motivo', width:180, sortable:false},
                {field:'respaldo', headerName:'Respaldo', width:100, sortable:false},
                {field:'usuario', headerName:'Usuario', width:110, sortable:false},
            ];
        case 'CONTROL':
            return [...bien,
                {field:'ultimo_control', headerName:'Último control', width:120, sortable:false,
                    valueFormatter:(v:unknown) => formatearValor(v)},
                {field:'cargado', headerName:'Cargado', width:140, sortable:false,
                    valueFormatter:(v:unknown) => formatearValor(v)},
                {field:'usuario', headerName:'Controló', width:110, sortable:false},
                {field:'sector', headerName:'Sector', width:160, sortable:false},
                {field:'responsable', headerName:'Responsable', width:200, sortable:false},
            ];
        case 'EGRESO':
            return [...bien,
                {field:'a_cargo_como', headerName:'A cargo como', width:190, sortable:false,
                    valueGetter:(v:unknown) => A_CARGO_COMO[String(v)] ?? texto(v)},
            ];
        default:
            return bien;
    }
}

function TablaDeBienes({fecha, grupo}:{fecha:string, grupo:GrupoDelDia}){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const [filas, setFilas] = React.useState<(BienDelGrupo & {id:string})[]>([]);
    const [total, setTotal] = React.useState(grupo.cantidad);
    const [cargando, setCargando] = React.useState(true);
    const [paginacion, setPaginacion] = React.useState<GridPaginationModel>({page:0, pageSize:25});
    const columnas = React.useMemo(() => columnasDelTipo(grupo.tipo, grupo), [grupo]);

    React.useEffect(() => {
        let cancelado = false;
        setCargando(true);
        const desde = paginacion.page * paginacion.pageSize;
        conn.ajax.calendario_dia_bienes({fecha, tipo:grupo.tipo, grupo:grupo.grupo, desde, cantidad:paginacion.pageSize})
            .then(bienes => {
                if(cancelado){ return; }
                setFilas(bienes.map((b, i) => ({...b, id:`${b.ficha}-${desde + i}`})));
                if(bienes.length > 0){ setTotal(Number(bienes[0].total)); }
            })
            .catch(err => { if(!cancelado){ mostrarError(err, 'No se pudieron cargar los bienes del evento'); setFilas([]); } })
            .finally(() => { if(!cancelado){ setCargando(false); } });
        return () => { cancelado = true; };
    }, [conn, fecha, grupo, mostrarError, paginacion]);

    return <DataGrid
        rows={filas}
        columns={columnas}
        loading={cargando}
        rowCount={total}
        paginationMode="server"
        paginationModel={paginacion}
        onPaginationModelChange={setPaginacion}
        pageSizeOptions={[10, 25, 50, 100]}
        getRowHeight={() => 'auto'}
        disableRowSelectionOnClick
        disableColumnMenu
        autoHeight
        density="compact"
        localeText={bienesGridLocaleText}
    />;
}

export function CalendarioDia({
    fecha,
    tipos,
    ocultos,
    onCambiarDia,
    onVolverAlMes,
}:{
    fecha:string,
    tipos:TipoVisible[],
    ocultos:Set<string>,
    onCambiarDia:(fecha:string) => void,
    onVolverAlMes:() => void,
}){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const [grupos, setGrupos] = React.useState<GrupoDelDia[]>([]);
    const [cargando, setCargando] = React.useState(true);

    React.useEffect(() => {
        let cancelado = false;
        setCargando(true);
        conn.ajax.calendario_dia({fecha})
            .then(filas => { if(!cancelado){ setGrupos(filas); } })
            .catch(err => { if(!cancelado){ mostrarError(err, 'No se pudo cargar el día'); setGrupos([]); } })
            .finally(() => { if(!cancelado){ setCargando(false); } });
        return () => { cancelado = true; };
    }, [conn, fecha, mostrarError]);

    const porTipo = tipos
        .map(t => ({tipo:t, grupos:grupos.filter(g => g.tipo === t.tipo)}))
        .filter(g => g.grupos.length > 0);
    const visibles = porTipo.filter(g => !ocultos.has(g.tipo.tipo));

    return <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{mb:1}} flexWrap="wrap" useFlexGap>
            <IconButton aria-label="día anterior" title="Día anterior" onClick={() => onCambiarDia(sumarDias(fecha, -1))}>
                <ChevronLeft/>
            </IconButton>
            <IconButton aria-label="día siguiente" title="Día siguiente" onClick={() => onCambiarDia(sumarDias(fecha, 1))}>
                <ChevronRight/>
            </IconButton>
            <Button size="small" variant="outlined" onClick={() => onCambiarDia(hoyYmd())}>Hoy</Button>
            <Button size="small" onClick={onVolverAlMes}>Ver el mes</Button>
            <Typography variant="h6" sx={{ml:1, '&::first-letter':{textTransform:'uppercase'}}}>
                {textoDeFecha(fecha, {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
            </Typography>
            {cargando ? <CircularProgress size={20}/> : null}
        </Stack>

        {porTipo.length
            ? <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{mb:2}}>
                {porTipo.map(({tipo, grupos:delTipo}) => <Chip
                    key={tipo.tipo}
                    color={tipo.color}
                    variant={ocultos.has(tipo.tipo) ? 'outlined' : 'filled'}
                    label={`${tipo.etiqueta}: ${delTipo.reduce((suma, g) => suma + Number(g.cantidad), 0)}`}
                />)}
            </Stack>
            : null}

        {!cargando && visibles.length === 0
            ? <Alert severity="info">No hay eventos para este día.</Alert>
            : <Stack spacing={3}>
                {visibles.map(({tipo, grupos:delTipo}) => <Box key={tipo.tipo}>
                    <Typography variant="subtitle1" sx={{
                        mb:1, fontWeight:600, pl:1, borderLeft:4,
                        borderColor:tipo.color === 'default' ? 'grey.500' : `${tipo.color}.main`,
                    }}>
                        {tipo.etiqueta}
                    </Typography>
                    <Stack spacing={2}>
                        {delTipo.map(g => <Paper key={`${g.tipo}-${g.grupo}`} variant="outlined" sx={{p:1.5}}>
                            <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap sx={{mb:1}}>
                                {g.hora ? <Typography sx={{fontWeight:600}} color="text.secondary">{g.hora}</Typography> : null}
                                {g.titulo ? <Typography sx={{fontWeight:600}}>{g.titulo}</Typography> : null}
                                <Typography color="text.secondary">
                                    {g.cantidad} {Number(g.cantidad) === 1 ? 'bien' : 'bienes'}
                                </Typography>
                                {g.usuarios
                                    ? <Typography color="text.secondary">· {g.usuarios}</Typography>
                                    : null}
                                <Box sx={{flex:1}}/>
                                {g.enlace
                                    ? <Button size="small" startIcon={<OpenInNew/>} onClick={() => irA(g.enlace!)}>
                                        Abrir solicitud
                                    </Button>
                                    : null}
                            </Stack>
                            <TablaDeBienes fecha={fecha} grupo={g}/>
                        </Paper>)}
                    </Stack>
                </Box>)}
            </Stack>}
    </Box>;
}
