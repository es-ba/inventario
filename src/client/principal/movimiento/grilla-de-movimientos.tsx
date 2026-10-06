import * as React from 'react';
import {Box, Link, Typography} from '@mui/material';
import {DataGrid, GridColDef, GridPaginationModel} from '@mui/x-data-grid';

import {useSalida} from '../base/contexto-base';
import {formatearValor} from '../base/formato-valores';
import {Ubicacion} from '../base/ubicacion';
import type {Fila} from '../base/tipos-tabla';
import {momentoDe} from '../bien/historial-datos';
import {gridLocaleText} from '../localizacion-grid';
import {irA} from '../render-connected-app-inventario';

function texto(valor:unknown):string{
    return formatearValor(valor).trim();
}

export function GrillaDeMovimientos({
    filas,
    cargando = false,
    sinSolicitud = false,
}:{
    filas:Fila[],
    cargando?:boolean,
    sinSolicitud?:boolean,
}){
    const solicitarSalida = useSalida();
    const [paginacion, setPaginacion] = React.useState<GridPaginationModel>({page:0, pageSize:25});

    const columnas = React.useMemo<GridColDef[]>(() => {
        const solicitud:GridColDef = {
            field:'acta_origen', headerName:'Solicitud', width:100,
            valueGetter:(valor:unknown) => valor == null ? null : Number(valor),
            renderCell:({row}) => row.acta_origen == null ? null : <Link component="button" variant="body2"
                title={`Abrir la solicitud ${row.acta_origen}`}
                onClick={() => solicitarSalida(() => irA(`w=solicitudes&acta=${encodeURIComponent(String(row.acta_origen))}`))}>
                {String(row.acta_origen)}
            </Link>,
        };
        return [
            {
                field:'registrado', headerName:'Registrado', width:150,
                valueGetter:(_v, fila) => momentoDe(fila.momento) || momentoDe(fila.fecha_movimiento),
                valueFormatter:(_v, fila) => texto(fila.momento ?? fila.fecha_movimiento),
            },
            {
                field:'ficha', headerName:'Ficha', width:110,
                renderCell:({row}) => <Link component="button" variant="body2"
                    title={`Abrir la ficha del bien ${row.ficha}`}
                    onClick={() => solicitarSalida(() => irA(`w=principal&ficha=${encodeURIComponent(String(row.ficha))}`))}>
                    {String(row.ficha)}
                </Link>,
            },
            {
                field:'bien', headerName:'Bien', flex:1, minWidth:220,
                renderCell:({row}) => <Box sx={{py:0.5}}>
                    <Typography variant="body2" sx={{lineHeight:1.3}}>{texto(row.bien) || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {[texto(row.grupo), texto(row.marca), texto(row.modelo), row.serie ? `serie ${texto(row.serie)}` : '']
                            .filter(parte => parte !== '').join(' · ')}
                    </Typography>
                </Box>,
            },
            {
                field:'de', headerName:'De', width:230, sortable:false,
                renderCell:({row}) => <Ubicacion sector={row.de_sector} responsable={row.de_responsable} espacio={row.de_espacio}/>,
            },
            {
                field:'a', headerName:'A', width:230, sortable:false,
                renderCell:({row}) => <Ubicacion sector={row.a_sector} responsable={row.a_responsable} espacio={row.a_espacio}/>,
            },
            {field:'accion', headerName:'Acción', width:130},
            ...(sinSolicitud ? [] : [solicitud]),
            {field:'usuario_creacion', headerName:'Usuario', width:120},
        ];
    }, [sinSolicitud, solicitarSalida]);

    return <DataGrid
        rows={filas}
        columns={columnas}
        loading={cargando}
        getRowId={fila => `${fila.ficha}|${fila.orden}`}
        paginationModel={paginacion}
        onPaginationModelChange={setPaginacion}
        initialState={{sorting:{sortModel:[{field:'registrado', sort:'desc'}]}}}
        pageSizeOptions={[25, 50, 100]}
        getRowHeight={() => 'auto'}
        disableRowSelectionOnClick
        autoHeight
        density="compact"
        localeText={gridLocaleText('No hay movimientos')}
    />;
}
