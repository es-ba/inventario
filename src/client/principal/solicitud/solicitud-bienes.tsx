import * as React from 'react';
import {
    Box,
    CircularProgress,
    IconButton,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tabs,
    Typography,
} from '@mui/material';
import {Delete} from '@mui/icons-material';
import type {FixedFields} from 'frontend-plus';

import {useAvisos, useConexion} from '../base/contexto-base';
import {formatearValor} from '../base/formato-valores';
import {TabPanel, propsDeSolapa} from '../base/tab-panel';
import type {Fila} from '../base/tipos-tabla';
import {BusquedaBienes} from '../busqueda-bienes';

/*
    Bienes de una solicitud, en dos solapas: los que ya tiene y la búsqueda para sumarle
    más.

    Para agregar se usa la misma pantalla de búsqueda de bienes que existe suelta, no una
    búsqueda propia. Es la que ya sabe filtrar por cualquier campo o atributo con
    operadores y AND/OR, mostrar en qué área, sede y espacio está cada bien y quién lo
    tiene, elegir columnas y seleccionar de a muchos. Duplicar eso en chico daba siempre
    una versión peor: se le pasa una acción de selección y alcanza.

    Cuando la solicitud dejó de ser editable (ya salió de Borrador), queda sólo la lista:
    es lo que se va a mover y no debería cambiar sin volver atrás.
*/

declare module 'frontend-plus' {
    interface BEAPI {
        solicitud_bienes_agregar:(params:{acta:string, fichas:string}) => Promise<{
            agregados:number,
            repetidos:number,
            message:string,
        }>;
    }
}

export function SolicitudBienes({
    acta,
    soloLectura = false,
}:{
    acta:string,
    soloLectura?:boolean,
}){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const [filas, setFilas] = React.useState<Fila[]>([]);
    const [cargando, setCargando] = React.useState(true);
    const [solapa, setSolapa] = React.useState(0);

    const camposFijos = React.useMemo<FixedFields>(
        () => [{fieldName:'acta', value:acta}],
        [acta],
    );

    const cargar = React.useCallback(async () => {
        setCargando(true);
        try{
            const datos = await conn.ajax.table_data({
                table:'movimientos_solicitud_bien',
                fixedFields:camposFijos,
                paramfun:{},
            }) as unknown as Fila[];
            setFilas(datos);
        }catch(err){
            mostrarError(err, 'No se pudieron cargar los bienes de la solicitud');
            setFilas([]);
        }finally{
            setCargando(false);
        }
    }, [camposFijos, conn, mostrarError]);

    React.useEffect(() => { void cargar(); }, [cargar]);

    const yaEstan = React.useMemo(
        () => new Set(filas.map(fila => String(fila.ficha))),
        [filas],
    );

    const quitar = React.useCallback(async (fila:Fila) => {
        if(!window.confirm(`¿Quitar el bien ${fila.ficha} de la solicitud?`)){
            return;
        }
        try{
            await conn.ajax.table_record_delete({
                table:'movimientos_solicitud_bien',
                primaryKeyValues:[fila.acta, fila.ficha],
            });
            await cargar();
        }catch(err){
            mostrarError(err, 'No se pudo quitar el bien');
        }
    }, [cargar, conn, mostrarError]);

    const agregarSeleccionados = React.useCallback(async (fichas:string[]) => {
        const resultado = await conn.ajax.solicitud_bienes_agregar({
            acta,
            fichas:JSON.stringify(fichas),
        });
        await cargar();
        // Volver a la lista es lo que deja ver el resultado del agregado.
        setSolapa(0);
        return resultado.message;
    }, [acta, cargar, conn]);

    const listado = <>
        {cargando
            ? <Box sx={{display:'flex', justifyContent:'center', p:4}}><CircularProgress/></Box>
            : filas.length === 0
                ? <Typography variant="body2" color="text.secondary" sx={{p:2}}>
                    La solicitud todavía no tiene bienes.
                </Typography>
                : <>
                    <Typography variant="body2" color="text.secondary" sx={{mb:1}}>
                        {filas.length} {filas.length === 1 ? 'bien' : 'bienes'}
                    </Typography>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>ficha</TableCell>
                                <TableCell>descripción</TableCell>
                                <TableCell>modelo</TableCell>
                                <TableCell>serie</TableCell>
                                <TableCell>observaciones</TableCell>
                                <TableCell>verificado</TableCell>
                                {soloLectura ? null : <TableCell align="right">acciones</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filas.map(fila => <TableRow key={String(fila.ficha)}>
                                <TableCell>{String(fila.ficha ?? '')}</TableCell>
                                <TableCell>{formatearValor(fila.bienes__detalle)}</TableCell>
                                <TableCell>{formatearValor(fila.bienes__modelo)}</TableCell>
                                <TableCell>{formatearValor(fila.bienes__serie)}</TableCell>
                                <TableCell>{formatearValor(fila.observaciones)}</TableCell>
                                <TableCell>{formatearValor(fila.verificado)}</TableCell>
                                {soloLectura ? null : <TableCell align="right">
                                    <IconButton
                                        size="small"
                                        color="error"
                                        title="quitar de la solicitud"
                                        onClick={() => void quitar(fila)}
                                    >
                                        <Delete/>
                                    </IconButton>
                                </TableCell>}
                            </TableRow>)}
                        </TableBody>
                    </Table>
                </>
        }
    </>;

    if(soloLectura){
        return <Box>{listado}</Box>;
    }

    return <Box>
        <Tabs
            value={solapa}
            onChange={(_evento, valor:number) => setSolapa(valor)}
            sx={{mb:2, borderBottom:1, borderColor:'divider'}}
        >
            <Tab label={`En la solicitud (${filas.length})`} {...propsDeSolapa(0)}/>
            <Tab label="Agregar bienes" {...propsDeSolapa(1)}/>
        </Tabs>

        <TabPanel value={solapa} index={0} sinRelleno>{listado}</TabPanel>

        <TabPanel value={solapa} index={1} sinRelleno>
            <BusquedaBienes
                conn={conn}
                fixedFields={[]}
                fichasExcluidas={yaEstan}
                accionSeleccion={{
                    etiqueta:'Agregar a la solicitud',
                    ejecutar:agregarSeleccionados,
                }}
            />
        </TabPanel>
    </Box>;
}
