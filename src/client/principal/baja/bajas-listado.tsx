import * as React from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {Refresh} from '@mui/icons-material';
import {DataGrid, GridColDef, GridRowParams} from '@mui/x-data-grid';
import type {FixedFields} from 'frontend-plus';

import {useAvisos, useConexion} from '../base/contexto-base';
import {useDatosReferencial} from '../base/cache-tablas';
import {formatearValor} from '../base/formato-valores';
import {bienesGridLocaleText} from '../localizacion-grid';
import type {Fila} from '../base/tipos-tabla';
import {AccionesBaja} from './acciones-baja';


const COLOR_POR_ESTADO:Record<string, 'default'|'info'|'warning'|'success'|'error'> = {
    SOLICITADA:'warning',
    APROBADA:'success',
    RECHAZADA:'error',
};

const SIN_ESTADO = '__sin_estado__';
const TODOS = '__todos__';

function textoDeReferencia(codigo:unknown, ...descripciones:unknown[]):string{
    const texto = descripciones
        .map(parte => String(parte ?? '').trim())
        .filter(parte => parte !== '')
        .join(' ');
    return texto !== '' ? texto : String(codigo ?? '').trim();
}

function codigo(fila:Fila, campo:string):string{
    return String(fila[campo] ?? '').trim();
}

export function BajasListado({
    onAbrirBien,
}:{
    onAbrirBien:(ficha:string) => void,
}){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const [filas, setFilas] = React.useState<Fila[]>([]);
    const [cargando, setCargando] = React.useState(true);
    const [estado, setEstado] = React.useState(TODOS);
    const [motivo, setMotivo] = React.useState(TODOS);
    const estados = useDatosReferencial('estados_baja');
    const motivos = useDatosReferencial('motivos_baja');

    const cargar = React.useCallback(async () => {
        setCargando(true);
        try{
            const datos = await conn.ajax.table_data({
                table:'bienes_baja',
                fixedFields:[] as FixedFields,
                paramfun:{},
            }) as unknown as Fila[];
            setFilas(datos);
        }catch(err){
            mostrarError(err, 'No se pudo cargar el proceso de baja');
            setFilas([]);
        }finally{
            setCargando(false);
        }
    }, [conn, mostrarError]);

    React.useEffect(() => { void cargar(); }, [cargar]);

    const porEstado = React.useMemo(() => {
        const cuenta = new Map<string, number>();
        for(const fila of filas){
            const clave = codigo(fila, 'estado_baja') || SIN_ESTADO;
            cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
        }
        return cuenta;
    }, [filas]);

    const filasVisibles = React.useMemo(() => filas.filter(fila => {
        const suEstado = codigo(fila, 'estado_baja') || SIN_ESTADO;
        const suMotivo = codigo(fila, 'motivo_baja');
        return (estado === TODOS || suEstado === estado)
            && (motivo === TODOS || suMotivo === motivo);
    }), [estado, filas, motivo]);

    const columnas = React.useMemo<GridColDef[]>(() => [
        {field:'acciones',headerName:'acciones',width:300,sortable:false,filterable:false,
            renderCell:params=><Box onClick={evento=>evento.stopPropagation()}><AccionesBaja fila={params.row} onAplicada={()=>void cargar()}/></Box>},
        {field:'ficha', headerName:'ficha', width:110},
        {
            field:'detalle',
            headerName:'descripción',
            flex:1,
            minWidth:180,
        },
        {
            field:'estado_baja',
            headerName:'estado',
            width:140,
            renderCell:(params) => {
                const valor = codigo(params.row, 'estado_baja');
                if(valor === ''){
                    return <Chip size="small" variant="outlined" label="sin estado"/>;
                }
                return <Chip
                    size="small"
                    color={COLOR_POR_ESTADO[valor] ?? 'default'}
                    label={textoDeReferencia(valor, params.row.estados_baja__descripcion)}
                />;
            },
        },
        {
            field:'motivo_baja',
            headerName:'motivo',
            width:150,
            valueGetter:(_v, fila) => textoDeReferencia(
                fila.motivo_baja, fila.motivos_baja__descripcion,
            ),
        },
        {
            field:'fecha_solicitud',
            headerName:'solicitada',
            width:110,
            valueFormatter:(value:unknown) => formatearValor(value),
        },
        {
            field:'fecha_finalizacion',
            headerName:'finalizada',
            width:110,
            valueFormatter:(value:unknown) => formatearValor(value),
        },
        {field:'autorizado_por', headerName:'autorizada por', width:150},
        {field:'documento_respaldo', headerName:'documento', width:150},
        {
            field:'responsable',
            headerName:'responsable',
            width:180,
            valueGetter:(_v, fila) => textoDeReferencia(
                fila.responsable, fila.responsables__apellido, fila.responsables__nombre,
            ),
        },
        {
            field:'sector',
            headerName:'sector',
            width:120,
            valueGetter:(_v, fila) => textoDeReferencia(fila.sector, fila.sectores__sigla),
        },
    ], [cargar]);

    const sinEstado = porEstado.get(SIN_ESTADO) ?? 0;

    return <Box sx={{p:{xs:1, md:2}}}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{mb:2}}>
            <Typography variant="h6" sx={{fontWeight:600}}>
                Proceso de baja
            </Typography>
            <Box sx={{flex:1}}/>
            <Button startIcon={<Refresh/>} onClick={() => void cargar()} disabled={cargando}>
                actualizar
            </Button>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{mb:2}}>
            <Chip
                label={`${filas.length} en proceso o de baja`}
                color="default"
                variant={estado === TODOS ? 'filled' : 'outlined'}
                onClick={() => setEstado(TODOS)}
            />
            {estados.filas.map(fila => {
                const valor = codigo(fila, 'estado_baja');
                return <Chip
                    key={valor}
                    label={`${textoDeReferencia(valor, fila.descripcion)}: ${porEstado.get(valor) ?? 0}`}
                    color={COLOR_POR_ESTADO[valor] ?? 'default'}
                    variant={estado === valor ? 'filled' : 'outlined'}
                    onClick={() => setEstado(estado === valor ? TODOS : valor)}
                />;
            })}
            <Chip
                label={`sin estado: ${sinEstado}`}
                variant={estado === SIN_ESTADO ? 'filled' : 'outlined'}
                onClick={() => setEstado(estado === SIN_ESTADO ? TODOS : SIN_ESTADO)}
            />
        </Stack>

        <Stack direction="row" spacing={2} sx={{mb:2}} flexWrap="wrap" useFlexGap>
            <TextField
                select
                size="small"
                label="estado"
                value={estado}
                onChange={evento => setEstado(evento.target.value)}
                sx={{minWidth:200}}
            >
                <MenuItem value={TODOS}>todos</MenuItem>
                {estados.filas.map(fila => {
                    const valor = codigo(fila, 'estado_baja');
                    return <MenuItem key={valor} value={valor}>
                        {textoDeReferencia(valor, fila.descripcion)}
                    </MenuItem>;
                })}
                <MenuItem value={SIN_ESTADO}>sin estado</MenuItem>
            </TextField>
            <TextField
                select
                size="small"
                label="motivo"
                value={motivo}
                onChange={evento => setMotivo(evento.target.value)}
                sx={{minWidth:200}}
            >
                <MenuItem value={TODOS}>todos</MenuItem>
                {motivos.filas.map(fila => {
                    const valor = codigo(fila, 'motivo_baja');
                    return <MenuItem key={valor} value={valor}>
                        {textoDeReferencia(valor, fila.descripcion)}
                    </MenuItem>;
                })}
            </TextField>
        </Stack>

        {cargando
            ? <Box sx={{display:'flex', justifyContent:'center', p:6}}><CircularProgress/></Box>
            : <DataGrid
                rows={filasVisibles}
                columns={columnas}
                getRowId={fila => String(fila.ficha)}
                onRowClick={(params:GridRowParams) => onAbrirBien(String(params.row.ficha))}
                autoHeight
                density="compact"
                pageSizeOptions={[25, 50, 100]}
                initialState={{pagination:{paginationModel:{pageSize:25}}}}
                localeText={bienesGridLocaleText}
                sx={{cursor:'pointer'}}
            />
        }
    </Box>;
}
