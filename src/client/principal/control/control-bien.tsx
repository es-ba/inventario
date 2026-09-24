import * as React from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    MenuItem,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import {ArrowBack} from '@mui/icons-material';
import type {Connector, FixedFields} from 'frontend-plus';

import {useAvisos, useConexion, usePermisos} from '../base/contexto-base';
import {formatearValor} from '../base/formato-valores';
import type {Fila} from '../base/tipos-tabla';
import {armarGruposPorItem, itemAplica, VALORES_SI_NO} from '../../../common/controles';
import {espacioDe, responsableDelSectorDe, textoDeReferencia} from './controles-listado';

declare module 'frontend-plus' {
    interface BEAPI {
        control_registrar:(params:{
            ficha:string,
            fecha:string|null,
            observacion:string|null,
            items:string,
        }) => Promise<{message:string, control:number}>,
    }
}

type Catalogo = {
    items:Fila[],
    opciones:Fila[],
    grupos:Fila[],
};

type ControlConItems = Fila & {items:Fila[]};

const CATALOGO_VACIO:Catalogo = {items:[], opciones:[], grupos:[]};

function leer(conn:Connector, tabla:string, fixedFields:{fieldName:string, value:unknown}[] = []):Promise<Fila[]>{
    return conn.ajax.table_data({
        table:tabla,
        fixedFields:fixedFields as FixedFields,
        paramfun:{},
    }) as unknown as Promise<Fila[]>;
}

function porOrden(a:Fila, b:Fila):number{
    return Number(a.orden ?? 0) - Number(b.orden ?? 0);
}

function claveDeOrden(control:Fila):string{
    const [dia, mes, anio] = formatearValor(control.fecha).split('/');
    return `${anio}${mes}${dia}` + String(control.control ?? '').padStart(20, '0');
}

function textoDeOpcion(valor:unknown):string{
    return String(valor ?? '').replace(/_/g, ' ').toLowerCase();
}

function textoDeValor(tipo:unknown, valor:unknown):string{
    if(tipo === 'si_no'){
        return valor === 'SI' ? 'sí' : valor === 'NO' ? 'no' : String(valor ?? '');
    }
    return tipo === 'opcion' ? textoDeOpcion(valor) : String(valor ?? '');
}

function hoyLocal():string{
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function ValorDeItem({
    item,
    opciones,
    valor,
    onCambiar,
}:{
    item:Fila,
    opciones:Fila[],
    valor:string,
    onCambiar:(valor:string) => void,
}){
    const etiqueta = String(item.descripcion ?? item.item);
    switch(item.tipo_valor){
        case 'si_no':
            return <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Typography>{etiqueta}</Typography>
                <ToggleButtonGroup
                    exclusive
                    value={valor}
                    onChange={(_evento, nuevo:string|null) => onCambiar(nuevo ?? '')}
                    aria-label={etiqueta}
                >
                    {VALORES_SI_NO.map(v => <ToggleButton key={v} value={v} sx={{px:3}}>
                        {v === 'SI' ? 'sí' : 'no'}
                    </ToggleButton>)}
                </ToggleButtonGroup>
            </Stack>;
        case 'opcion':
            return <TextField
                select
                fullWidth
                label={etiqueta}
                value={valor}
                onChange={evento => onCambiar(evento.target.value)}
            >
                <MenuItem value="">Sin dato</MenuItem>
                {opciones.map(o => <MenuItem key={String(o.valor)} value={String(o.valor)}>
                    {textoDeOpcion(o.valor)}
                </MenuItem>)}
            </TextField>;
        default:
            return <TextField
                fullWidth
                label={etiqueta}
                value={valor}
                onChange={evento => onCambiar(evento.target.value)}
            />;
    }
}

export function ControlBien({
    bien,
    onVolver,
    onGuardado,
    onSiguiente,
}:{
    bien:Fila,
    onVolver:() => void,
    onGuardado:() => void,
    onSiguiente:(() => void)|null,
}){
    const conn = useConexion();
    const {mostrarError, mostrarMensaje} = useAvisos();
    const permisos = usePermisos();
    const ficha = String(bien.ficha);
    const grupo = bien.grupo == null ? null : String(bien.grupo);

    const [catalogo, setCatalogo] = React.useState<Catalogo>(CATALOGO_VACIO);
    const [historial, setHistorial] = React.useState<ControlConItems[]>([]);
    const [cargando, setCargando] = React.useState(true);
    const [fecha, setFecha] = React.useState(hoyLocal);
    const [observacion, setObservacion] = React.useState('');
    const [valores, setValores] = React.useState<Record<string, string>>({});
    const [guardando, setGuardando] = React.useState(false);
    const [error, setError] = React.useState<string|null>(null);

    const cargarHistorial = React.useCallback(async () => {
        const controles = await leer(conn, 'controles_bien', [{fieldName:'ficha', value:ficha}]);
        const conItems = await Promise.all(controles.map(async control => ({
            ...control,
            items:await leer(conn, 'controles_bien_items', [{fieldName:'control', value:control.control}]),
        })));
        conItems.sort((a, b) => claveDeOrden(b).localeCompare(claveDeOrden(a)));
        setHistorial(conItems);
    }, [conn, ficha]);

    React.useEffect(() => {
        let cancelado = false;
        setCargando(true);
        Promise.all([
            leer(conn, 'items_control'),
            leer(conn, 'items_control_opciones'),
            leer(conn, 'items_control_grupos'),
            cargarHistorial(),
        ]).then(([items, opciones, grupos]) => {
            if(!cancelado){
                setCatalogo({items, opciones, grupos});
            }
        }).catch(err => {
            if(!cancelado){
                mostrarError(err, 'No se pudo cargar el control del bien');
            }
        }).finally(() => {
            if(!cancelado){
                setCargando(false);
            }
        });
        return () => { cancelado = true; };
    }, [cargarHistorial, conn, mostrarError]);

    const itemsDelBien = React.useMemo(() => {
        const gruposPorItem = armarGruposPorItem(catalogo.grupos);
        return catalogo.items
            .filter(item => item.activo === true && itemAplica(String(item.item), grupo, gruposPorItem))
            .sort((a, b) => porOrden(a, b) || String(a.item).localeCompare(String(b.item)));
    }, [catalogo, grupo]);

    const itemPorCodigo = React.useMemo(
        () => new Map(catalogo.items.map(item => [String(item.item), item])),
        [catalogo.items],
    );

    const ultimo = historial[0];

    const copiarUltimo = () => {
        if(ultimo == null){
            return;
        }
        const aplican = new Set(itemsDelBien.map(item => String(item.item)));
        const copiados:Record<string, string> = {};
        for(const item of ultimo.items){
            if(aplican.has(String(item.item))){
                copiados[String(item.item)] = String(item.valor ?? '');
            }
        }
        setValores(copiados);
    };

    const guardar = async (despues:'quedarse'|'siguiente') => {
        setGuardando(true);
        setError(null);
        try{
            const resultado = await conn.ajax.control_registrar({
                ficha,
                fecha:fecha || null,
                observacion:observacion.trim() || null,
                items:JSON.stringify(valores),
            });
            mostrarMensaje(resultado.message);
            onGuardado();
            if(despues === 'siguiente' && onSiguiente){
                onSiguiente();
                return;
            }
            setObservacion('');
            setValores({});
            setFecha(hoyLocal());
            await cargarHistorial();
        }catch(err){
            setError(err instanceof Error ? err.message : String(err));
        }finally{
            setGuardando(false);
        }
    };

    return <Box sx={{p:{xs:1, md:2}, maxWidth:720, mx:'auto'}}>
        <Button startIcon={<ArrowBack/>} onClick={onVolver} sx={{mb:1}}>Volver al listado</Button>
        <Typography variant="h6" sx={{fontWeight:600}}>
            {ficha} · {textoDeReferencia(bien.detalle)}
        </Typography>
        <Typography color="text.secondary">
            {[
                textoDeReferencia(bien.grupo, bien.grupos__descripcion),
                textoDeReferencia(bien.marca, bien.marcas__descripcion),
                textoDeReferencia(bien.modelo),
                bien.serie ? `serie ${bien.serie}` : '',
                bien.imei ? `IMEI ${bien.imei}` : '',
                bien.linea ? `línea ${bien.linea}` : '',
            ].filter(Boolean).join(' · ')}
        </Typography>
        <Typography color="text.secondary" sx={{mb:2}}>
            {[
                textoDeReferencia(bien.sector, bien.sectores__sigla),
                espacioDe(bien) ? `espacio ${espacioDe(bien)}` : '',
                responsableDelSectorDe(bien) ? `responsable del sector: ${responsableDelSectorDe(bien)}` : '',
            ].filter(Boolean).join(' · ')}
        </Typography>

        {cargando
            ? <Box sx={{display:'flex', justifyContent:'center', p:6}}><CircularProgress/></Box>
            : <Stack spacing={3}>
                {permisos.controlar ? <Card variant="outlined">
                    <CardContent>
                        <Stack spacing={2}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography variant="subtitle1" sx={{fontWeight:600}}>Registrar control</Typography>
                                {ultimo
                                    ? <Button size="small" onClick={copiarUltimo}>Copiar último control</Button>
                                    : null}
                            </Stack>
                            <TextField
                                type="date"
                                label="Fecha"
                                value={fecha}
                                onChange={evento => setFecha(evento.target.value)}
                                inputProps={{max:hoyLocal()}}
                                InputLabelProps={{shrink:true}}
                                fullWidth
                            />
                            {itemsDelBien.length ? <Divider/> : null}
                            {itemsDelBien.map(item => <ValorDeItem
                                key={String(item.item)}
                                item={item}
                                opciones={catalogo.opciones
                                    .filter(o => o.item === item.item)
                                    .sort(porOrden)}
                                valor={valores[String(item.item)] ?? ''}
                                onCambiar={valor => setValores(anteriores => ({...anteriores, [String(item.item)]:valor}))}
                            />)}
                            <TextField
                                label="Observación"
                                value={observacion}
                                onChange={evento => setObservacion(evento.target.value)}
                                multiline
                                minRows={2}
                                fullWidth
                            />
                            {error ? <Alert severity="error">{error}</Alert> : null}
                            <Stack direction="row" spacing={2}>
                                <Button
                                    variant={onSiguiente ? 'outlined' : 'contained'}
                                    size="large"
                                    fullWidth
                                    disabled={guardando}
                                    onClick={() => void guardar('quedarse')}
                                >
                                    Guardar
                                </Button>
                                {onSiguiente
                                    ? <Button
                                        variant="contained"
                                        size="large"
                                        fullWidth
                                        disabled={guardando}
                                        onClick={() => void guardar('siguiente')}
                                    >
                                        Guardar y siguiente
                                    </Button>
                                    : null}
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card> : null}

                <Box>
                    <Typography variant="subtitle1" sx={{fontWeight:600, mb:1}}>
                        Historial de controles
                    </Typography>
                    {historial.length === 0
                        ? <Typography color="text.secondary">Este bien nunca fue controlado.</Typography>
                        : <Stack spacing={1}>
                            {historial.map(control => <Card key={String(control.control)} variant="outlined">
                                <CardContent>
                                    <Typography sx={{fontWeight:600}}>
                                        {formatearValor(control.fecha)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        control {String(control.control)}
                                        {control.usuario_creacion ? ` · ${String(control.usuario_creacion)}` : ''}
                                    </Typography>
                                    {control.items.map(item => <Typography key={String(item.item)} variant="body2">
                                        {String(itemPorCodigo.get(String(item.item))?.descripcion ?? item.item)}: {textoDeValor(itemPorCodigo.get(String(item.item))?.tipo_valor, item.valor)}
                                    </Typography>)}
                                    {control.observacion
                                        ? <Typography variant="body2" sx={{mt:1}}>{String(control.observacion)}</Typography>
                                        : null}
                                </CardContent>
                            </Card>)}
                        </Stack>
                    }
                </Box>
            </Stack>
        }
    </Box>;
}
