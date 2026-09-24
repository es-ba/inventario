import * as React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import {PersonAdd, PersonOff, Refresh} from '@mui/icons-material';
import {DataGrid, GridColDef, GridRowSelectionModel} from '@mui/x-data-grid';
import type {FixedFields} from 'frontend-plus';

import {useAvisos, useConexion} from '../base/contexto-base';
import {formatearValor} from '../base/formato-valores';
import {TabPanel, propsDeSolapa} from '../base/tab-panel';
import type {Fila} from '../base/tipos-tabla';
import {bienesGridLocaleText} from '../localizacion-grid';
import {BienFormulario} from '../bien/bien-formulario';

declare module 'frontend-plus' {
    interface BEAPI {
        responsables_inactivar:(params:{responsables:string}) => Promise<{message:string}>;
        responsables_alta_siper:(params:{idpers:string}) => Promise<{message:string}>;
    }
}

const SITUACIONES:{situacion:string, color:'default'|'success'|'warning'|'error'|'info'}[] = [
    {situacion:'inactivo siper', color:'error'},
    {situacion:'alta', color:'info'},
    {situacion:'posible duplicado', color:'warning'},
    {situacion:'inactivo en inventario', color:'warning'},
    {situacion:'ausente en siper', color:'warning'},
    {situacion:'sólo en inventario', color:'default'},
    {situacion:'sincronizado', color:'success'},
];
const COLOR = new Map(SITUACIONES.map(s => [s.situacion, s.color]));
const TODAS = '__todas__';

function useTabla(tabla:string, descripcion:string, version:number){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const [filas, setFilas] = React.useState<Fila[]>([]);
    const [cargando, setCargando] = React.useState(true);
    React.useEffect(() => {
        let vigente = true;
        setCargando(true);
        (conn.ajax.table_data({table:tabla, fixedFields:[] as FixedFields, paramfun:{}}) as unknown as Promise<Fila[]>)
            .then(datos => { if(vigente) setFilas(datos); })
            .catch(err => { if(vigente){ mostrarError(err, `No se pudo cargar ${descripcion}`); setFilas([]); } })
            .finally(() => { if(vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [conn, descripcion, mostrarError, tabla, version]);
    return {filas, cargando};
}

const texto = (valor:unknown) => formatearValor(valor);
const nombre = (fila:Fila) =>
    [fila.apellido, fila.nombre].map(v => String(v ?? '').trim()).filter(Boolean).join(', ');
const aCargo = (fila:Fila) =>
    Number(fila.bienes_directos ?? 0) + Number(fila.bienes_en_uso ?? 0) + Number(fila.sectores_a_cargo ?? 0);
const sePuedeInactivar = (fila:Fila) => fila.responsable != null && fila.activo_inventario === true;
const sePuedeDarDeAlta = (fila:Fila) => fila.situacion === 'alta' || fila.situacion === 'posible duplicado';

function Personas({version, onCambio}:{version:number, onCambio:() => void}){
    const conn = useConexion();
    const {mostrarError, mostrarMensaje} = useAvisos();
    const {filas, cargando} = useTabla('siper_conciliacion', 'la lista de personas', version);
    const recepciones = useTabla('siper_recepciones', 'las recepciones de siper', version);
    const [situacion, setSituacion] = React.useState(TODAS);
    const [seleccion, setSeleccion] = React.useState<GridRowSelectionModel>([]);
    const [dialogo, setDialogo] = React.useState<'inactivar'|'alta'|null>(null);
    const [trabajando, setTrabajando] = React.useState(false);

    const ultima = recepciones.filas[0];
    const cuenta = React.useMemo(() => {
        const porSituacion = new Map<string, number>();
        for(const f of filas) porSituacion.set(String(f.situacion), (porSituacion.get(String(f.situacion)) ?? 0) + 1);
        return porSituacion;
    }, [filas]);
    const visibles = React.useMemo(
        () => situacion === TODAS ? filas : filas.filter(f => f.situacion === situacion),
        [filas, situacion],
    );
    const elegidas = filas.filter(f => seleccion.includes(String(f.clave)));
    const aInactivar = elegidas.filter(sePuedeInactivar);
    const aDarDeAlta = elegidas.filter(sePuedeDarDeAlta);

    const ejecutar = async (accion:() => Promise<{message:string}>, error:string) => {
        setTrabajando(true);
        try{
            mostrarMensaje((await accion()).message);
            setDialogo(null);
            setSeleccion([]);
            onCambio();
        }catch(err){
            mostrarError(err, error);
        }finally{
            setTrabajando(false);
        }
    };
    const inactivar = () => ejecutar(
        () => conn.ajax.responsables_inactivar({responsables:JSON.stringify(aInactivar.map(f => String(f.responsable)))}),
        'No se pudieron desactivar las personas',
    );
    const darDeAlta = () => ejecutar(
        () => conn.ajax.responsables_alta_siper({idpers:JSON.stringify(aDarDeAlta.map(f => String(f.idper)))}),
        'No se pudieron dar de alta las personas',
    );

    const columnas:GridColDef[] = [
        {field:'situacion', headerName:'Situación', width:180,
            renderCell:params => <Chip size="small" color={COLOR.get(String(params.value)) ?? 'default'} label={String(params.value)}/>},
        {field:'responsable', headerName:'Código de responsable', width:150},
        {field:'idper', headerName:'Identificador en Siper', width:170},
        {field:'apellido', headerName:'Apellido', flex:1, minWidth:130},
        {field:'nombre', headerName:'Nombre', flex:1, minWidth:130},
        {field:'activo_inventario', headerName:'Activo en inventario', width:150, type:'boolean'},
        {field:'activo_siper', headerName:'Activo en siper', width:130, type:'boolean'},
        {field:'fecha_egreso', headerName:'Egreso (siper)', width:120, valueFormatter:texto},
        {field:'bienes_directos', headerName:'Bienes directos', width:120, type:'number'},
        {field:'bienes_en_uso', headerName:'Bienes en uso', width:120, type:'number'},
        {field:'sectores_a_cargo', headerName:'Sectores a cargo', width:130, type:'number'},
    ];

    const conPendientes = aInactivar.filter(f => aCargo(f) > 0);
    const duplicados = aDarDeAlta.filter(f => f.situacion === 'posible duplicado');

    return <Stack spacing={2}>
        {ultima
            ? <Typography variant="body2" color="text.secondary">
                {`Última recepción de siper: ${texto(ultima.fecha)} por ${ultima.usuario ?? 'sistema'}, ${ultima.personas} personas`}
            </Typography>
            : null}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`todas: ${filas.length}`} variant={situacion === TODAS ? 'filled' : 'outlined'}
                onClick={() => setSituacion(TODAS)}/>
            {SITUACIONES.filter(s => cuenta.has(s.situacion)).map(s => <Chip
                key={s.situacion}
                color={s.color}
                variant={situacion === s.situacion ? 'filled' : 'outlined'}
                label={`${s.situacion}: ${cuenta.get(s.situacion)}`}
                onClick={() => setSituacion(situacion === s.situacion ? TODAS : s.situacion)}
            />)}
        </Stack>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button color="error" variant="contained" startIcon={<PersonOff/>}
                disabled={aInactivar.length === 0} onClick={() => setDialogo('inactivar')}>
                desactivar ({aInactivar.length})
            </Button>
            <Button variant="contained" startIcon={<PersonAdd/>}
                disabled={aDarDeAlta.length === 0} onClick={() => setDialogo('alta')}>
                dar de alta ({aDarDeAlta.length})
            </Button>
        </Stack>
        {cargando
            ? <Box sx={{display:'flex', justifyContent:'center', p:4}}><CircularProgress/></Box>
            : <DataGrid
                rows={visibles}
                columns={columnas}
                getRowId={fila => String(fila.clave)}
                checkboxSelection
                keepNonExistentRowsSelected
                rowSelectionModel={seleccion}
                onRowSelectionModelChange={setSeleccion}
                autoHeight
                density="compact"
                pageSizeOptions={[25, 50, 100]}
                initialState={{pagination:{paginationModel:{pageSize:25}}}}
                localeText={bienesGridLocaleText}
            />}
        <Dialog open={dialogo === 'inactivar'} onClose={() => setDialogo(null)} maxWidth="sm" fullWidth>
            <DialogTitle>Desactivar {aInactivar.length} {aInactivar.length === 1 ? 'persona' : 'personas'}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Alert severity="info">
                        Un responsable inactivo no se puede asignar en solicitudes, movimientos ni como jefe de sector.
                        Lo que ya tiene a cargo no cambia.
                    </Alert>
                    {conPendientes.length
                        ? <Alert severity="warning">
                            <Typography variant="body2" sx={{mb:1}}>
                                Les quedan bienes y sectores a cargo; después hay que reasignarlos desde «A cargo de inactivos»:
                            </Typography>
                            {conPendientes.map(f => <Typography key={String(f.clave)} variant="body2">
                                {String(f.responsable)} ({nombre(f)}): {String(f.bienes_directos)} bienes directos,
                                {' '}{String(f.bienes_en_uso)} en uso, {String(f.sectores_a_cargo)} sectores
                            </Typography>)}
                        </Alert>
                        : <Alert severity="success">Ninguno tiene bienes ni sectores a cargo.</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDialogo(null)}>Cancelar</Button>
                <Button color="error" variant="contained" disabled={trabajando}
                    startIcon={trabajando ? <CircularProgress size={16}/> : undefined}
                    onClick={() => void inactivar()}>
                    Desactivar
                </Button>
            </DialogActions>
        </Dialog>
        <Dialog open={dialogo === 'alta'} onClose={() => setDialogo(null)} maxWidth="sm" fullWidth>
            <DialogTitle>Dar de alta {aDarDeAlta.length} {aDarDeAlta.length === 1 ? 'persona' : 'personas'}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Alert severity="info">
                        Cada alta usa el identificador en Siper. Si el sector de Siper no existe en inventario, queda sin sector.
                    </Alert>
                    {duplicados.length
                        ? <Alert severity="warning">
                            <Typography variant="body2" sx={{mb:1}}>
                                Coinciden por apellido y nombre con un responsable creado en inventario; revisar que no sea la misma persona:
                            </Typography>
                            {duplicados.map(f => <Typography key={String(f.clave)} variant="body2">
                                {String(f.idper)} ({nombre(f)})
                            </Typography>)}
                        </Alert>
                        : null}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDialogo(null)}>Cancelar</Button>
                <Button variant="contained" disabled={trabajando}
                    startIcon={trabajando ? <CircularProgress size={16}/> : undefined}
                    onClick={() => void darDeAlta()}>
                    Dar de alta
                </Button>
            </DialogActions>
        </Dialog>
    </Stack>;
}

function ACargoDeInactivos({version, onAbrirBien}:{version:number, onAbrirBien:(ficha:string) => void}){
    const {filas, cargando} = useTabla('responsables_inactivos_a_cargo', 'lo que quedó a cargo de responsables inactivos', version);
    const porVinculo = React.useMemo(() => {
        const cuenta = new Map<string, number>();
        for(const f of filas) cuenta.set(String(f.vinculo), (cuenta.get(String(f.vinculo)) ?? 0) + 1);
        return [...cuenta];
    }, [filas]);

    const columnas:GridColDef[] = [
        {field:'acciones', headerName:'Acciones', width:140, sortable:false, filterable:false,
            renderCell:({row}) => row.ficha
                ? <Button onClick={() => onAbrirBien(String(row.ficha))}>Abrir bien</Button>
                : <Button component="a" target="_blank" rel="noopener noreferrer"
                    href={`menu?w=table&table=sectores&ff=${encodeURIComponent(JSON.stringify({sector:row.sector}))}`}>
                    Abrir sector
                </Button>},
        {field:'vinculo', headerName:'Vínculo', width:160},
        {field:'responsable', headerName:'Código de responsable', width:150},
        {field:'responsable_nombre', headerName:'Nombre', flex:1, minWidth:160},
        {field:'ficha', headerName:'Ficha', width:110},
        {field:'bienes__detalle', headerName:'Bien', flex:1, minWidth:160},
        {field:'sector', headerName:'Sector', width:160,
            valueGetter:(_v, fila) => [fila.sector, fila.sectores__sigla].filter(Boolean).join(' - ')},
    ];

    return <Stack spacing={2}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {porVinculo.length
                ? porVinculo.map(([vinculo, n]) => <Chip key={vinculo} color="warning" variant="outlined" label={`${vinculo}: ${n}`}/>)
                : <Chip color="success" variant="outlined" label="Nada a cargo de responsables inactivos"/>}
        </Stack>
        {cargando
            ? <Box sx={{display:'flex', justifyContent:'center', p:4}}><CircularProgress/></Box>
            : <DataGrid
                rows={filas}
                columns={columnas}
                getRowId={fila => `${fila.vinculo}|${fila.objeto}`}
                autoHeight
                density="compact"
                pageSizeOptions={[25, 50, 100]}
                initialState={{pagination:{paginationModel:{pageSize:25}}}}
                localeText={bienesGridLocaleText}
            />}
    </Stack>;
}

export function PersonasSiper(){
    const [ficha, setFicha] = React.useState<string|null>(null);
    const [solapa, setSolapa] = React.useState(0);
    const [version, setVersion] = React.useState(0);
    const recargar = React.useCallback(() => setVersion(v => v + 1), []);

    return <Box sx={{p:{xs:1, md:2}}}>
        {ficha != null ? <BienFormulario ficha={ficha} onVolver={() => { setFicha(null); recargar(); }}/> : null}
        <Box sx={{display:ficha == null ? 'block' : 'none'}}>
        <Stack direction="row" alignItems="center">
            <Tabs value={solapa} onChange={(_e, valor:number) => setSolapa(valor)} variant="scrollable" sx={{flex:1}}>
                <Tab label="Personas" {...propsDeSolapa(0)}/>
                <Tab label="A cargo de inactivos" {...propsDeSolapa(1)}/>
            </Tabs>
            <Button startIcon={<Refresh/>} onClick={recargar}>Actualizar</Button>
        </Stack>
        <TabPanel value={solapa} index={0}><Personas version={version} onCambio={recargar}/></TabPanel>
        <TabPanel value={solapa} index={1}><ACargoDeInactivos version={version} onAbrirBien={setFicha}/></TabPanel>
        </Box>
    </Box>;
}
