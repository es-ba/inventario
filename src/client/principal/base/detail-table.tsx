import * as React from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Drawer,
    IconButton,
    Stack,
    Toolbar,
    Typography,
} from '@mui/material';
import {Add, Close, Delete, Refresh} from '@mui/icons-material';
import {DataGrid, GridColDef, GridRowParams} from '@mui/x-data-grid';
import type {FieldDefinition, FixedFields, TableDefinition} from 'frontend-plus';

import {useAvisos, useConexion, usePermisos} from './contexto-base';
import {useEstructuraTabla} from './cache-tablas';
import {formatearValor} from './formato-valores';
import {FormFieldRenderer} from './form-field-renderer';
import {useRowEditor} from './use-row-editor';
import {bienesGridLocaleText} from '../localizacion-grid';
import {Fila, mensajeDeError} from './tipos-tabla';


function encabezadoDeColumna(field:FieldDefinition):string{
    if(field.referencedName != null){
        return `${field.referencedAlias ?? ''} ${field.referencedName}`.trim();
    }
    return field.label ?? field.title ?? field.name;
}

export type DetailTableProps = {
    tabla:string,
    camposFijos:Record<string, unknown>,
    titulo?:string,
    anchoPanel?:number,
    columnasOcultas?:string[],
    soloLectura?:boolean,
};

export function DetailTable({
    tabla,
    camposFijos,
    titulo,
    anchoPanel = 480,
    columnasOcultas,
    soloLectura: soloLecturaPedida = false,
}:DetailTableProps){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const permisos = usePermisos();
    const {definicion} = useEstructuraTabla(tabla);

    const soloLectura = soloLecturaPedida || !permisos.guardar
        || definicion?.editable === false
        || definicion?.allow?.update === false;

    const [filas, setFilas] = React.useState<Fila[]>([]);
    const [cargando, setCargando] = React.useState(true);
    const [panelAbierto, setPanelAbierto] = React.useState(false);
    const [filaDelPanel, setFilaDelPanel] = React.useState<Fila|undefined>(undefined);

    const claveCamposFijos = JSON.stringify(camposFijos);
    const nombresFijos = React.useMemo(
        () => Object.keys(camposFijos),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [claveCamposFijos],
    );
    const camposFijosArray = React.useMemo<FixedFields>(
        () => Object.keys(camposFijos).map(fieldName => ({fieldName, value:camposFijos[fieldName]})),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [claveCamposFijos],
    );

    const cargarFilas = React.useCallback(async () => {
        setCargando(true);
        try{
            const datos = await conn.ajax.table_data({
                table:tabla,
                fixedFields:camposFijosArray,
                paramfun:{},
            }) as unknown as Fila[];
            setFilas(datos);
        }catch(err){
            mostrarError(err, `No se pudieron cargar los datos de ${tabla}`);
            setFilas([]);
        }finally{
            setCargando(false);
        }
    }, [conn, camposFijosArray, mostrarError, tabla]);

    React.useEffect(() => { void cargarFilas(); }, [cargarFilas]);

    const columnas = React.useMemo<GridColDef[]>(() => {
        if(definicion == null){
            return [];
        }
        const ocultas = new Set([
            ...nombresFijos,
            ...(definicion.hiddenColumns ?? []),
            ...(columnasOcultas ?? []),
        ]);
        return definicion.fields
            .filter(field => !ocultas.has(field.name)
                && !field.clientSide
                && (field.inTable !== false || field.referencedName != null))
            .map(field => ({
                field:field.name,
                headerName:encabezadoDeColumna(field),
                flex:1,
                minWidth:110,
                sortable:true,
                valueFormatter:(valor:unknown) => formatearValor(valor),
            }));
    }, [columnasOcultas, definicion, nombresFijos]);

    const idDeFila = React.useCallback((fila:Fila):string => {
        const pk = definicion?.primaryKey ?? [];
        return pk.length
            ? pk.map(nombre => String(fila[nombre] ?? '')).join('|')
            : JSON.stringify(fila);
    }, [definicion]);

    const cerrarPanel = React.useCallback(() => {
        setPanelAbierto(false);
        setFilaDelPanel(undefined);
    }, []);

    const despuesDeGuardar = React.useCallback(() => {
        cerrarPanel();
        void cargarFilas();
    }, [cargarFilas, cerrarPanel]);

    return <Box sx={{display:'flex', flexDirection:'column', minHeight:320}}>
        <Toolbar disableGutters sx={{display:'flex', justifyContent:'space-between', gap:1}}>
            <Typography variant="h6">{titulo ?? definicion?.title ?? tabla}</Typography>
            <Stack direction="row" spacing={1}>
                <Button startIcon={<Refresh/>} onClick={() => void cargarFilas()}>
                    actualizar
                </Button>
                {soloLectura ? null : <Button
                    variant="contained"
                    startIcon={<Add/>}
                    disabled={definicion == null}
                    onClick={() => {
                        setFilaDelPanel({...camposFijos});
                        setPanelAbierto(true);
                    }}
                >
                    nuevo
                </Button>}
            </Stack>
        </Toolbar>

        {cargando
            ? <Box sx={{display:'flex', justifyContent:'center', p:4}}><CircularProgress/></Box>
            : <DataGrid
                rows={filas}
                columns={columnas}
                getRowId={idDeFila}
                onRowClick={(params:GridRowParams) => {
                    setFilaDelPanel(params.row as Fila);
                    setPanelAbierto(true);
                }}
                autoHeight
                density="compact"
                pageSizeOptions={[10, 25, 50]}
                initialState={{pagination:{paginationModel:{pageSize:10}}}}
                localeText={bienesGridLocaleText}
                sx={{cursor:'pointer'}}
            />
        }

        <Drawer
            anchor="right"
            open={panelAbierto}
            onClose={cerrarPanel}
            PaperProps={{sx:{width:anchoPanel, p:2}}}
        >
            {definicion != null && panelAbierto
                ? <PanelDeRegistro
                    tabla={tabla}
                    definicion={definicion}
                    filaInicial={filaDelPanel}
                    nombresFijos={nombresFijos}
                    onCerrar={cerrarPanel}
                    onGuardado={despuesDeGuardar}
                    soloLectura={soloLectura}
                />
                : null}
        </Drawer>
    </Box>;
}

function PanelDeRegistro({
    tabla,
    definicion,
    filaInicial,
    nombresFijos,
    onCerrar,
    onGuardado,
    soloLectura,
}:{
    tabla:string,
    definicion:TableDefinition,
    filaInicial:Fila|undefined,
    nombresFijos:string[],
    onCerrar:() => void,
    onGuardado:() => void,
    soloLectura:boolean,
}){
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const permisos = usePermisos();
    const [borrando, setBorrando] = React.useState(false);

    const esAlta = React.useMemo(() => {
        if(!filaInicial){
            return true;
        }
        return (definicion.primaryKey ?? []).some(pk =>
            nombresFijos.indexOf(pk) < 0
            && (filaInicial[pk] == null || filaInicial[pk] === '')
        );
    }, [definicion.primaryKey, filaInicial, nombresFijos]);

    const editor = useRowEditor({
        tabla,
        definicion,
        filaInicial:esAlta ? undefined : filaInicial,
    });

    const precargados = React.useRef(false);
    React.useEffect(() => {
        if(!esAlta || precargados.current){
            return;
        }
        precargados.current = true;
        Object.keys(filaInicial ?? {}).forEach(nombre => {
            editor.setField(nombre, (filaInicial ?? {})[nombre]);
        });
    }, [esAlta, filaInicial, editor]);

    const camposVisibles = React.useMemo(
        () => definicion.fields.filter(field =>
            nombresFijos.indexOf(field.name) < 0
            && !field.clientSide
            && field.referencedName == null
        ),
        [definicion.fields, nombresFijos],
    );

    const borrar = React.useCallback(async () => {
        if(!filaInicial){
            return;
        }
        if(!window.confirm('¿Eliminar este registro?')){
            return;
        }
        setBorrando(true);
        try{
            await conn.ajax.table_record_delete({
                table:tabla,
                primaryKeyValues:(definicion.primaryKey ?? []).map(pk => filaInicial[pk]),
            });
            onGuardado();
        }catch(err){
            mostrarError(mensajeDeError(err), 'No se pudo eliminar');
        }finally{
            setBorrando(false);
        }
    }, [conn, definicion.primaryKey, filaInicial, mostrarError, onGuardado, tabla]);

    return <Box sx={{display:'flex', flexDirection:'column', height:'100%'}}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb:2}}>
            <Typography variant="h6">
                {esAlta ? 'Nuevo' : 'Editar'} {definicion.elementName ?? definicion.name ?? tabla}
            </Typography>
            <IconButton onClick={onCerrar} size="small"><Close/></IconButton>
        </Stack>

        <Stack spacing={2} sx={{flex:1, overflow:'auto', pt:1}}>
            {camposVisibles.map(field => <FormFieldRenderer
                key={field.name}
                field={field}
                row={editor.row}
                setField={editor.setField}
                error={editor.errores[field.name]}
                disabled={soloLectura}
            />)}
        </Stack>

        <Stack
            direction="row"
            justifyContent="space-between"
            sx={{mt:2, pt:2, borderTop:1, borderColor:'divider'}}
        >
            {}
            {soloLectura || esAlta || !permisos.eliminar
                ? <span/>
                : <Button color="error" startIcon={<Delete/>} onClick={() => void borrar()} disabled={borrando}>
                    eliminar
                </Button>}
            <Stack direction="row" spacing={1}>
                <Button onClick={onCerrar}>{soloLectura ? 'cerrar' : 'cancelar'}</Button>
                {soloLectura ? null : <Button
                    variant="contained"
                    disabled={!editor.puedeGuardar}
                    onClick={async () => { if(await editor.guardar()){ onGuardado(); } }}
                >
                    guardar
                </Button>}
            </Stack>
        </Stack>
    </Box>;
}
