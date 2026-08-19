import * as React from 'react';
import {Box, Button, Chip, CircularProgress, Stack, Typography} from '@mui/material';
import {Add, Refresh} from '@mui/icons-material';
import {DataGrid, GridColDef, GridRowParams} from '@mui/x-data-grid';
import type {FixedFields} from 'frontend-plus';

import {useAvisos, useConexion} from '../base/contexto-base';
import {formatearValor} from '../base/formato-valores';
import {bienesGridLocaleText} from '../localizacion-grid';
import type {Fila} from '../base/tipos-tabla';
import {SolicitudAcciones} from './solicitud-acciones';

/*
    Listado de solicitudes de movimiento.

    Lee movimientos_solicitudes_acciones, que es la misma tabla más una columna con las
    acciones que su estado habilita. Así cada fila puede mostrar sus botones sin que el
    cliente sepa nada de la máquina de estados.
*/

const COLOR_POR_ESTADO:Record<string, 'default'|'info'|'warning'|'success'> = {
    B:'default', P:'warning', A:'info', F:'info', Pr:'success',
};

/**
 * Texto de una referencia. Si ninguna descripción vino —dato incompleto en el referencial—
 * cae al código: es feo pero identifica, y una celda vacía no dice nada.
 */
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

    /*
        Las columnas descriptivas son las que agrega backend-plus por cada foreign key, con
        el nombre <alias>__<campo>. En el listado se muestra el texto y no el código: "B",
        "27" o "138" no le dicen nada a nadie. El código sigue estando en la fila y se ve
        entero al abrir la solicitud.
    */
    const columnas = React.useMemo<GridColDef[]>(() => [
        {field:'acta', headerName:'acta', width:120},
        {
            field:'estado',
            headerName:'estado',
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
            field:'responsables__apellido',
            headerName:'responsable',
            flex:1,
            minWidth:140,
            valueGetter:(_v, fila) => textoDeReferencia(
                fila.responsable, fila.responsables__apellido, fila.responsables__nombre,
            ),
        },
        {
            field:'areas__sigla',
            headerName:'área',
            width:120,
            valueGetter:(_v, fila) => textoDeReferencia(fila.area, fila.areas__sigla),
        },
        {
            field:'sedes__descripcion',
            headerName:'sede',
            width:130,
            valueGetter:(_v, fila) => textoDeReferencia(fila.sede, fila.sedes__descripcion),
        },
        {
            field:'espacios__numero',
            headerName:'espacio',
            width:130,
            valueGetter:(_v, fila) => textoDeReferencia(
                fila.espacio, fila.espacios__numero, fila.espacios__denominacion,
            ),
        },
        {
            field:'fecha_creacion',
            headerName:'creada',
            width:110,
            valueFormatter:(value:unknown) => formatearValor(value),
        },
        {field:'usuario_creacion', headerName:'usuario', width:120},
        {
            field:'__acciones',
            headerName:'acciones',
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
            <Typography variant="h6" sx={{fontWeight:600}}>
                Solicitudes de movimiento
            </Typography>
            <Box sx={{flex:1}}/>
            <Button startIcon={<Refresh/>} onClick={() => void cargar()} disabled={cargando}>
                actualizar
            </Button>
            <Button variant="contained" startIcon={<Add/>} onClick={() => onAbrir(undefined)}>
                nueva solicitud
            </Button>
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
