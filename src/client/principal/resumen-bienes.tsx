import * as React from 'react';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {Add, Close} from '@mui/icons-material';
import {DataGrid, GridColDef} from '@mui/x-data-grid';
import type {Connector} from 'frontend-plus';

import type {BienesBusquedaRequest} from '../../common/contracts';
import {MAXIMO_DIMENSIONES} from '../../common/bienes-agrupar';
import type {
    BienesAgrupadoFila,
    BienesAgrupadoResponse,
    BienesDimensionesResponse,
    DimensionAgrupar,
    DimensionDisponible,
    GrupoFiltro,
} from '../../common/bienes-agrupar';
import {bienesGridLocaleText} from './localizacion-grid';


declare module 'frontend-plus' {
    interface BEAPI {
        bienes_buscar_agrupado:(params:{consulta:string}) => Promise<BienesAgrupadoResponse>;
        bienes_dimensiones_agrupar:(params:Record<string, never>) => Promise<BienesDimensionesResponse>;
    }
}

const SIN_DATO = '(sin dato)';
type FilaResumen = BienesAgrupadoFila & {id:string};

function idDeValores(valores:(string|null)[]):string{
    return JSON.stringify(valores.map(valor => valor ?? null));
}

export function grupoDeFila(dimensiones:DimensionAgrupar[], fila:BienesAgrupadoFila):GrupoFiltro[]{
    return dimensiones.map((dimension, i) => ({dimension, valor:fila.valores[i] ?? null}));
}

function SelectorDimension({
    etiqueta,
    opciones,
    valor,
    excluidas,
    onChange,
}:{
    etiqueta:string,
    opciones:DimensionDisponible[],
    valor:DimensionAgrupar|null,
    excluidas:DimensionAgrupar[],
    onChange:(valor:DimensionAgrupar|null) => void,
}){
    const disponibles = opciones.filter(opcion => !excluidas.includes(opcion.clave));
    return <Autocomplete
        size="small"
        options={disponibles}
        groupBy={opcion => opcion.familia}
        getOptionLabel={opcion => opcion.etiqueta}
        isOptionEqualToValue={(opcion, elegida) => opcion.clave === elegida.clave}
        value={opciones.find(opcion => opcion.clave === valor) ?? null}
        onChange={(_evento, elegida) => onChange(elegida?.clave ?? null)}
        sx={{minWidth:260}}
        renderInput={params => <TextField {...params} label={etiqueta}/>}
    />;
}

export function ResumenBienes({
    conn,
    consulta,
    version,
    visible,
    grupoActivo,
    onElegirGrupo,
}:{
    conn:Connector,
    consulta:BienesBusquedaRequest,
    version:number,
    visible:boolean,
    grupoActivo:GrupoFiltro[]|null,
    onElegirGrupo:(grupo:GrupoFiltro[], textos:string[], etiquetas:string[]) => void,
}){
    const [opciones, setOpciones] = React.useState<DimensionDisponible[]>([]);
    const [elegidas, setElegidas] = React.useState<(DimensionAgrupar|null)[]>(['responsable_sector']);
    const [respuesta, setRespuesta] = React.useState<BienesAgrupadoResponse|null>(null);
    const [cargando, setCargando] = React.useState(false);
    const [error, setError] = React.useState<string|null>(null);
    const secuencia = React.useRef(0);

    React.useEffect(() => {
        let cancelado = false;
        conn.ajax.bienes_dimensiones_agrupar({})
            .then(respuesta => { if(!cancelado){ setOpciones(respuesta.dimensiones); } })
            .catch(err => { if(!cancelado){ setError(err instanceof Error ? err.message : String(err)); } });
        return () => { cancelado = true; };
    }, [conn]);

    const dimensiones = React.useMemo<DimensionAgrupar[]>(
        () => elegidas.filter((d):d is DimensionAgrupar => d != null),
        [elegidas],
    );
    const etiquetaDe = React.useCallback(
        (clave:DimensionAgrupar) => opciones.find(opcion => opcion.clave === clave)?.etiqueta ?? clave,
        [opciones],
    );
    const claveConsulta = JSON.stringify(consulta);
    const claveDimensiones = JSON.stringify(dimensiones);

    React.useEffect(() => {
        if(!visible){
            return;
        }
        if(dimensiones.length === 0){
            ++secuencia.current;
            setCargando(false);
            setRespuesta(null);
            return;
        }
        const numero = ++secuencia.current;
        setCargando(true);
        setError(null);
        conn.ajax.bienes_buscar_agrupado({
            consulta:JSON.stringify({...consulta, agruparPor:dimensiones}),
        }).then(resultado => {
            if(numero === secuencia.current){ setRespuesta(resultado); }
        }).catch(err => {
            if(numero === secuencia.current){
                setError(err instanceof Error ? err.message : String(err));
                setRespuesta(null);
            }
        }).finally(() => {
            if(numero === secuencia.current){ setCargando(false); }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conn, claveConsulta, claveDimensiones, version, visible]);

    const dimensionesRespuesta = respuesta?.dimensiones ?? dimensiones;

    const idActivo = grupoActivo
        && grupoActivo.length === dimensionesRespuesta.length
        && grupoActivo.every((parte, i) => parte.dimension === dimensionesRespuesta[i])
        ? idDeValores(grupoActivo.map(parte => parte.valor))
        : null;

    const filas = React.useMemo<FilaResumen[]>(
        () => (respuesta?.rows ?? []).map(fila => ({...fila, id:idDeValores(fila.valores)})),
        [respuesta],
    );

    const columnas = React.useMemo<GridColDef<FilaResumen>[]>(() => [
        ...dimensionesRespuesta.map((dimension, i):GridColDef<FilaResumen> => ({
            field:`dimension_${i}`,
            headerName:etiquetaDe(dimension),
            flex:1,
            minWidth:200,
            valueGetter:(_valor, fila) => fila.textos[i] ?? fila.valores[i] ?? SIN_DATO,
        })),
        {
            field:'cantidad',
            headerName:'Cantidad',
            type:'number',
            width:120,
        },
    ], [dimensionesRespuesta, etiquetaDe]);

    return <Box>
        <Stack direction="row" spacing={2} sx={{mb:2}} flexWrap="wrap" useFlexGap alignItems="center">
            {elegidas.map((elegida, posicion) => <Stack key={posicion} direction="row" alignItems="center">
                <SelectorDimension
                    etiqueta={posicion === 0 ? 'Agrupar por' : 'Y por'}
                    opciones={opciones}
                    valor={elegida}
                    excluidas={dimensiones.filter(d => d !== elegida)}
                    onChange={valor => setElegidas(previas =>
                        previas.map((previa, i) => i === posicion ? valor : previa))}
                />
                {elegidas.length > 1
                    ? <IconButton
                        size="small"
                        title="Quitar"
                        onClick={() => setElegidas(previas => previas.filter((_d, i) => i !== posicion))}
                    >
                        <Close fontSize="small"/>
                    </IconButton>
                    : null}
            </Stack>)}
            {elegidas.length < MAXIMO_DIMENSIONES
                ? <Button
                    size="small"
                    startIcon={<Add/>}
                    disabled={elegidas.some(d => d == null)}
                    onClick={() => setElegidas(previas => [...previas, null])}
                >
                    Agregar campo
                </Button>
                : null}
            <Box sx={{flex:1}}/>
            {respuesta
                ? <Typography variant="body2" color="text.secondary">
                    {respuesta.total} {respuesta.total === 1 ? 'bien' : 'bienes'} en {filas.length} {filas.length === 1 ? 'grupo' : 'grupos'}
                </Typography>
                : null}
        </Stack>
        {error ? <Alert severity="error" sx={{mb:2}}>{error}</Alert> : null}
        <Box sx={{height:'calc(100vh - 380px)', minHeight:420, width:'100%'}}>
            <DataGrid
                rows={filas}
                columns={columnas}
                loading={cargando}
                density="compact"
                onRowClick={({row}) => {
                    const fila = row as FilaResumen;
                    onElegirGrupo(
                        grupoDeFila(dimensionesRespuesta, fila),
                        dimensionesRespuesta.map((_d, i) => fila.textos[i] ?? fila.valores[i] ?? SIN_DATO),
                        dimensionesRespuesta.map(etiquetaDe),
                    );
                }}
                initialState={{sorting:{sortModel:[{field:'cantidad', sort:'desc'}]}}}
                pageSizeOptions={[25, 50, 100]}
                localeText={bienesGridLocaleText}
                getRowClassName={({id}) => id === idActivo ? 'grupo-visto' : ''}
                sx={{cursor:'pointer', '& .grupo-visto':{bgcolor:'action.selected'}}}
            />
        </Box>
    </Box>;
}
