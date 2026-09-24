import * as React from 'react';
import {Box, Button, Chip, CircularProgress, Stack} from '@mui/material';
import {Add, Refresh} from '@mui/icons-material';
import {DataGrid, GridColDef, GridRowParams} from '@mui/x-data-grid';
import type {FixedFields} from 'frontend-plus';

import {useAvisos, useConexion, usePermisos} from '../base/contexto-base';
import {formatearValor} from '../base/formato-valores';
import {bienesGridLocaleText} from '../localizacion-grid';
import type {Fila} from '../base/tipos-tabla';
import {SolicitudAcciones} from './solicitud-acciones';


const COLOR_POR_ESTADO:Record<string, 'default'|'info'|'warning'|'success'> = {
    B:'default', P:'warning', A:'info', F:'info', Pr:'success',
};

function textoDeReferencia(codigo:unknown, ...descripciones:unknown[]):string{
    const texto = descripciones
        .map(parte => String(parte ?? '').trim())
        .filter(parte => parte !== '')
        .join(' ');
    return texto !== '' ? texto : String(codigo ?? '').trim();
}

export function SolicitudesListado({
    onAbrir,
}:{
    onAbrir:(acta?:string) => void,
}){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const permisos = usePermisos();
    const [filas, setFilas] = React.useState<Fila[]>([]);
    const [cargando, setCargando] = React.useState(true);

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

    React.useEffect(() => { void cargar(); }, [cargar]);

    const columnas = React.useMemo<GridColDef[]>(() => [
        {field:'acta', headerName:'N.º de solicitud', width:140},
        {
            field:'estado',
            headerName:'Estado',
            width:130,
            renderCell:(params) => {
                const codigo = String(params.row.estado ?? '');
                const texto = String(params.row.estados__desc_estado ?? '') || codigo;
                return codigo
                    ? <Chip size="small" label={texto} color={COLOR_POR_ESTADO[codigo] ?? 'default'}/>
                    : null;
            },
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
    ], [cargar]);

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

        {cargando
            ? <Box sx={{display:'flex', justifyContent:'center', p:6}}><CircularProgress/></Box>
            : <DataGrid
                rows={filas}
                columns={columnas}
                getRowId={fila => String(fila.acta)}
                onRowClick={(params:GridRowParams) => onAbrir(String(params.row.acta))}
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
