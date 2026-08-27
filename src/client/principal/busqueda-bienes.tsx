import * as React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Stack,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import {
    Add,
    Download,
    Block,
    EditNote,
    KeyboardArrowDown,
    LocalShipping,
    KeyboardArrowUp,
    OpenInNew,
    PlaylistAdd,
    Print,
    Refresh,
} from '@mui/icons-material';
import {
    DataGrid,
    GridColDef,
    GridFilterItem,
    GridFilterModel,
    GridFilterOperator,
    GridPaginationModel,
    GridRenderCellParams,
    GridRowSelectionModel,
    GridSortModel,
    GridToolbarColumnsButton,
    GridToolbarContainer,
    GridToolbarDensitySelector,
    GridToolbarFilterButton,
    GridToolbarQuickFilter,
    GRID_CHECKBOX_SELECTION_FIELD,
    getGridBooleanOperators,
    getGridDateOperators,
    getGridNumericOperators,
    getGridStringOperators,
} from '@mui/x-data-grid';
import type {
    Connector,
    FieldDefinition,
    FixedFields,
    TableDefinition,
} from 'frontend-plus';
import type {
    BienAtributoResumen,
    BienesAtributosOpcionesResponse,
    BienesAtributoValoresOpcionesResponse,
    BienesBuscarAvanzadoParameters,
    BienesBusquedaExportResponse,
    BienesBusquedaExportarParameters,
    BienesBusquedaFilter,
    BienesBusquedaOperator,
    BienesBusquedaRequest,
    BienesBusquedaResponse,
    BienesBusquedaRow,
} from '../../common/contracts';
import {selectBienesGridFields} from '../../common/bienes-busqueda';
import {
    filasSeleccionadasEnOrden,
    prepararEtiquetasCodigosBarra,
    sincronizarFilasSeleccionadas,
} from '../../common/codigos-barra';
import {
    BienesBusquedaFilterDraft,
    BienesBusquedaTarget,
    FiltrosCompuestos,
    isCompleteFilter,
} from './filtros-compuestos';
import {bienesGridLocaleText} from './localizacion-grid';
import {imprimirEtiquetasCodigosBarra} from './imprimir-codigos-barra';
import {unmountConnectedAppInventario} from './render-connected-app-inventario';
import {EdicionMasivaBienes} from './edicion-masiva-bienes';
import {MoverBienes} from './mover-bienes';
import {BajaBienes} from './baja-bienes';

declare module 'frontend-plus' {
    interface FieldDefinition {
        label?:string;
        inTable?:boolean;
    }
    interface TableDefinition {
        hiddenColumns?:string[];
    }
    interface BEAPI {
        bienes_buscar_avanzado:
            (params:BienesBuscarAvanzadoParameters) => Promise<BienesBusquedaResponse>;
        bienes_busqueda_exportar:
            (params:BienesBusquedaExportarParameters) => Promise<BienesBusquedaExportResponse>;
        bienes_atributos_buscar:
            (params:{busqueda:string}) => Promise<BienesAtributosOpcionesResponse>;
        bienes_atributo_valores_buscar:
            (params:{atributo:string, busqueda:string}) =>
                Promise<BienesAtributoValoresOpcionesResponse>;
    }
}

export type AccionSeleccionBienes = {
    etiqueta:string;
    ejecutar:(fichas:string[]) => Promise<string>;
};

type BusquedaBienesProps = {
    conn:Connector;
    fixedFields:FixedFields;
    onAbrirBien?:(ficha:string) => void;
    onNuevoBien?:() => void;
    accionSeleccion?:AccionSeleccionBienes;
    fichasExcluidas?:ReadonlySet<string>;
};

const operatorMap:Record<string, BienesBusquedaOperator> = {
    contains:'contains',
    equals:'equals',
    doesNotEqual:'not_equals',
    is:'equals',
    not:'not_equals',
    '=':'equals',
    '!=':'not_equals',
    startsWith:'starts_with',
    endsWith:'ends_with',
    isEmpty:'empty',
    isNotEmpty:'not_empty',
    '>':'greater_than',
    '>=':'greater_or_equal',
    '<':'less_than',
    '<=':'less_or_equal',
    after:'greater_than',
    onOrAfter:'greater_or_equal',
    before:'less_than',
    onOrBefore:'less_or_equal',
};

function supportedGridFilterOperators(type:GridColDef['type']):GridFilterOperator[]{
    const operators = type === 'number'
        ? getGridNumericOperators()
        : type === 'date'
            ? getGridDateOperators()
            : type === 'boolean'
                ? getGridBooleanOperators()
                : getGridStringOperators();
    return operators.filter(operator => operatorMap[operator.value] != null);
}

function gridItemToFilter(item:GridFilterItem):BienesBusquedaFilter|null{
    const operator = operatorMap[item.operator];
    if(!item.field || !operator){
        return null;
    }
    if(['empty', 'not_empty'].indexOf(operator) < 0
        && (item.value == null || String(item.value).trim() === '')
    ){
        return null;
    }
    return {
        source:'field',
        target:item.field,
        operator,
        value:item.value,
    };
}

function estadoFromTab(tab:number):BienesBusquedaRequest['estado']{
    return tab === 0 ? 'activo' : tab === 1 ? 'baja' : 'todos';
}

function normalizeAttributeType(value:unknown):string{
    const typeName = String(value ?? '').toLowerCase();
    if(/decimal|numeric|numero|número|integer|entero/.test(typeName)){
        return 'decimal';
    }
    if(/date|fecha/.test(typeName)){
        return 'date';
    }
    if(/boolean|logico|lógico|si\/no/.test(typeName)){
        return 'boolean';
    }
    return 'text';
}

function gridColumnType(typeName:string):GridColDef['type']{
    const normalized = normalizeAttributeType(typeName);
    if(normalized === 'decimal'){
        return 'number';
    }
    if(normalized === 'date'){
        return 'date';
    }
    if(normalized === 'boolean'){
        return 'boolean';
    }
    return 'string';
}

function gridValue(value:unknown, type:GridColDef['type']):unknown{
    if(value == null || value === ''){
        return null;
    }
    if(type === 'number'){
        const numberValue = Number(value);
        return Number.isNaN(numberValue) ? null : numberValue;
    }
    if(type === 'date'){
        return value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00`);
    }
    if(type === 'boolean'){
        return value === true || value === 1 || String(value).toLowerCase() === 'true';
    }
    return String(value);
}

function attributesText(attributes:BienAtributoResumen[]|undefined):string{
    return (attributes ?? []).map(attribute =>
        `${attribute.nombre || attribute.atributo}: ${attribute.valor ?? ''}`
    ).join(' | ');
}

function getTogglableColumns(columns:GridColDef[]):GridColDef['field'][]{
    return columns
        .filter(column => column.field !== GRID_CHECKBOX_SELECTION_FIELD)
        .map(column => column.field);
}

function AtributosDetalle({row}:{row:BienesBusquedaRow}){
    return <Box sx={{py:1, width:'100%'}}>
        <Typography variant="subtitle2" gutterBottom>
            Atributos del bien {String(row.ficha)}
        </Typography>
        {row.atributos?.length
            ? <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                {row.atributos.map(attribute =>
                    <Chip
                        key={attribute.atributo}
                        size="small"
                        label={`${attribute.nombre || attribute.atributo}: ${attribute.valor ?? ''}`}
                    />
                )}
            </Stack>
            : <Typography variant="body2" color="text.secondary">
                Sin atributos cargados.
            </Typography>
        }
    </Box>;
}

export function BusquedaBienes({
    conn,
    fixedFields,
    onAbrirBien,
    onNuevoBien,
    accionSeleccion,
    fichasExcluidas,
}:BusquedaBienesProps){
    const [tableDefinition, setTableDefinition] = React.useState<TableDefinition|null>(null);
    const [metadataLoading, setMetadataLoading] = React.useState(true);
    const [metadataError, setMetadataError] = React.useState<string|null>(null);
    const [filters, setFilters] = React.useState<BienesBusquedaFilterDraft[]>([]);
    const [appliedFilters, setAppliedFilters] = React.useState<BienesBusquedaFilter[]>([]);
    const [logicOperator, setLogicOperator] =
        React.useState<BienesBusquedaRequest['logicOperator']>('and');
    const [appliedLogicOperator, setAppliedLogicOperator] =
        React.useState<BienesBusquedaRequest['logicOperator']>('and');
    const [showValidation, setShowValidation] = React.useState(false);
    const [tab, setTab] = React.useState(0);
    const [rows, setRows] = React.useState<BienesBusquedaRow[]>([]);
    const [total, setTotal] = React.useState(0);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string|null>(null);
    const [hasSearched, setHasSearched] = React.useState(true);
    const [paginationModel, setPaginationModel] =
        React.useState<GridPaginationModel>({page:0, pageSize:25});
    const [sortModel, setSortModel] =
        React.useState<GridSortModel>([{field:'ficha', sort:'asc'}]);
    const [filterModel, setFilterModel] =
        React.useState<GridFilterModel>({items:[], quickFilterValues:[]});
    const [searchVersion, setSearchVersion] = React.useState(0);
    const [expandedRowIds, setExpandedRowIds] = React.useState<Set<string>>(new Set());
    const [rowSelectionModel, setRowSelectionModel] =
        React.useState<GridRowSelectionModel>([]);
    const [selectedRows, setSelectedRows] =
        React.useState<Map<string, BienesBusquedaRow>>(new Map());
    const [edicionMasivaAbierta, setEdicionMasivaAbierta] = React.useState(false);
    const [moverAbierto, setMoverAbierto] = React.useState(false);
    const [bajaAbierta, setBajaAbierta] = React.useState(false);
    const [avisoMasivo, setAvisoMasivo] = React.useState<string|null>(null);
    const requestSequence = React.useRef(0);

    const clearSelection = React.useCallback(() => {
        setRowSelectionModel([]);
        setSelectedRows(new Map());
    }, []);

    const handleRowSelectionModelChange = React.useCallback((
        selection:GridRowSelectionModel,
    ) => {
        setRowSelectionModel(selection);
        setSelectedRows(previous => sincronizarFilasSeleccionadas(
            previous,
            selection,
            rows,
        ));
    }, [rows]);

    const printSelectedRows = React.useCallback(async () => {
        setError(null);
        try{
            const selected = filasSeleccionadasEnOrden(
                rowSelectionModel,
                selectedRows,
            );
            const etiquetas = prepararEtiquetasCodigosBarra(selected);
            await imprimirEtiquetasCodigosBarra(etiquetas);
        }catch(err){
            setError(err instanceof Error ? err.message : String(err));
        }
    }, [rowSelectionModel, selectedRows]);

    React.useEffect(() => {
        let cancelled = false;
        async function loadMetadata(){
            setMetadataLoading(true);
            setMetadataError(null);
            try{
                const definition = await conn.ajax.table_structure({table:'bienes'});
                if(!cancelled){
                    setTableDefinition(definition);
                }
            }catch(err){
                if(!cancelled){
                    setMetadataError(err instanceof Error ? err.message : String(err));
                }
            }finally{
                if(!cancelled){
                    setMetadataLoading(false);
                }
            }
        }
        void loadMetadata();
        return () => {cancelled = true;};
    }, [conn]);

    const fieldTargets = React.useMemo<BienesBusquedaTarget[]>(() => {
        return (tableDefinition?.fields ?? []).map(field => ({
            source:'field' as const,
            target:field.name,
            label:field.label || field.title || field.name,
            typeName:field.typeName,
        }));
    }, [tableDefinition]);

    const searchAttributeTargets = React.useCallback(async (search:string) => {
        const response = await conn.ajax.bienes_atributos_buscar({busqueda:search});
        return response.rows.map(attribute => ({
            source:'attribute' as const,
            target:attribute.atributo,
            label:attribute.nombre && attribute.nombre !== attribute.atributo
                ? `${attribute.nombre} (${attribute.atributo})`
                : attribute.atributo,
            typeName:normalizeAttributeType(attribute.tipo_valor),
        }));
    }, [conn]);

    const searchAttributeValues = React.useCallback(async (
        attribute:string,
        search:string,
    ) => {
        const response = await conn.ajax.bienes_atributo_valores_buscar({
            atributo:attribute,
            busqueda:search,
        });
        return response.rows.map(option => option.valor);
    }, [conn]);

    const buildRequest = React.useCallback(():BienesBusquedaRequest => {
        const quickSearch = (filterModel.quickFilterValues ?? [])
            .map(value => String(value ?? '').trim())
            .filter(Boolean)
            .join(' ');
        return {
            estado:estadoFromTab(tab),
            logicOperator:appliedLogicOperator,
            filters:appliedFilters,
            quickSearch,
            gridFilters:filterModel.items
                .map(gridItemToFilter)
                .filter((filter):filter is BienesBusquedaFilter => filter != null),
            page:paginationModel.page,
            pageSize:paginationModel.pageSize as BienesBusquedaRequest['pageSize'],
            sortModel:sortModel
                .filter(sort => sort.sort != null)
                .map(sort => ({field:sort.field, sort:sort.sort as 'asc'|'desc'})),
        };
    }, [
        appliedFilters,
        appliedLogicOperator,
        filterModel,
        paginationModel,
        sortModel,
        tab,
    ]);

    const loadRows = React.useCallback(async () => {
        const sequence = ++requestSequence.current;
        setLoading(true);
        setError(null);
        try{
            const response = await conn.ajax.bienes_buscar_avanzado({
                consulta:JSON.stringify(buildRequest()),
            });
            if(sequence === requestSequence.current){
                setRows(response.rows ?? []);
                setTotal(Number(response.total ?? 0));
            }
        }catch(err){
            if(sequence === requestSequence.current){
                setError(err instanceof Error ? err.message : String(err));
            }
        }finally{
            if(sequence === requestSequence.current){
                setLoading(false);
            }
        }
    }, [buildRequest, conn]);

    React.useEffect(() => {
        if(hasSearched){
            void loadRows();
        }
    }, [hasSearched, loadRows, searchVersion]);

    const exportRows = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try{
            const response = await conn.ajax.bienes_busqueda_exportar({
                consulta:JSON.stringify(buildRequest()),
            });
            const blob = new Blob([response.csv], {type:'text/csv;charset=utf-8'});
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = response.fileName;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        }catch(err){
            setError(err instanceof Error ? err.message : String(err));
        }finally{
            setLoading(false);
        }
    }, [buildRequest, conn]);

    const columns = React.useMemo<GridColDef<BienesBusquedaRow>[]>(() => {
        if(!tableDefinition){
            return [];
        }
        const baseColumns = selectBienesGridFields(tableDefinition.fields)
            .map((field:FieldDefinition):GridColDef<BienesBusquedaRow> => {
                const type = gridColumnType(field.typeName);
                return {
                    field:field.name,
                    headerName:field.label || field.title || field.name,
                    type,
                    filterOperators:supportedGridFilterOperators(type),
                    minWidth:130,
                    flex:field.name === 'detalle' || field.name === 'observacion' ? 1.6 : 1,
                    valueGetter:(_value, row) => gridValue(row[field.name], type),
                    renderCell:(params:GridRenderCellParams<BienesBusquedaRow>) =>
                        params.value instanceof Date
                            ? params.value.toLocaleDateString('es-AR')
                            : String(params.value ?? ''),
                };
            });
        const attributesColumn:GridColDef<BienesBusquedaRow> = {
            field:'__atributos',
            headerName:'Atributos',
            minWidth:320,
            flex:1.5,
            sortable:false,
            filterable:false,
            valueGetter:(_value, row) => attributesText(row.atributos),
            renderCell:(params) => {
                const rowId = String(params.id);
                const expanded = expandedRowIds.has(rowId);
                return <Box sx={expanded
                    ? {width:'100%', py:0.5}
                    : {width:'100%', display:'flex', alignItems:'center', gap:1}
                }>
                    <Button
                        size="small"
                        startIcon={expanded ? <KeyboardArrowUp/> : <KeyboardArrowDown/>}
                        onClick={(event) => {
                            event.stopPropagation();
                            setExpandedRowIds(current => {
                                const next = new Set(current);
                                if(next.has(rowId)){
                                    next.delete(rowId);
                                }else{
                                    next.add(rowId);
                                }
                                return next;
                            });
                        }}
                    >
                        {expanded ? 'Ocultar atributos' : 'Ver atributos'}
                    </Button>
                    {expanded
                        ? <AtributosDetalle row={params.row}/>
                        : <Typography
                            variant="body2"
                            noWrap
                            title={String(params.value ?? '')}
                        >
                            {String(params.value ?? '')}
                        </Typography>
                    }
                </Box>;
            },
        };
        const actionsColumn:GridColDef<BienesBusquedaRow> = {
            field:'__acciones',
            headerName:'',
            width:120,
            sortable:false,
            filterable:false,
            disableColumnMenu:true,
            renderCell:(params) =>
                <Button
                    size="small"
                    startIcon={<OpenInNew/>}
                    onClick={(event) => {
                        event.stopPropagation();
                        const ficha = String(params.row.ficha);
                        if(onAbrirBien){
                            onAbrirBien(ficha);
                            return;
                        }
                        unmountConnectedAppInventario();
                        (myOwn.gotoAddrParams as (params:any) => void)({
                            i:['bienes', 'bienes'],
                            ff:{ficha},
                        });
                    }}
                >
                    Abrir
                </Button>,
        };
        return [...baseColumns, attributesColumn, actionsColumn];
    }, [expandedRowIds, onAbrirBien, tableDefinition]);

    const columnVisibilityModel = React.useMemo(() => {
        const model:Record<string, boolean> = {};
        (tableDefinition?.hiddenColumns ?? []).forEach(field => {
            model[field] = false;
        });
        return model;
    }, [tableDefinition]);

    const [ejecutandoAccion, setEjecutandoAccion] = React.useState(false);

    const ejecutarAccionSeleccion = React.useCallback(async () => {
        if(!accionSeleccion){
            return;
        }
        const fichas = filasSeleccionadasEnOrden(rowSelectionModel, selectedRows)
            .map(fila => String(fila.ficha));
        if(fichas.length === 0){
            return;
        }
        setEjecutandoAccion(true);
        try{
            const mensaje = await accionSeleccion.ejecutar(fichas);
            setAvisoMasivo(mensaje);
            clearSelection();
        }catch(err){
            setError(err instanceof Error ? err.message : String(err));
        }finally{
            setEjecutandoAccion(false);
        }
    }, [accionSeleccion, clearSelection, rowSelectionModel, selectedRows]);

    const Toolbar = React.useCallback(() =>
        <GridToolbarContainer>
            <GridToolbarColumnsButton/>
            <GridToolbarFilterButton/>
            <GridToolbarDensitySelector/>
            {}
            {onNuevoBien
                ? <Button
                    size="small"
                    variant="contained"
                    startIcon={<Add/>}
                    onClick={onNuevoBien}
                >
                    Nuevo bien
                </Button>
                : null}
            <Button
                size="small"
                startIcon={<Refresh/>}
                disabled={loading}
                onClick={() => {
                    clearSelection();
                    setSearchVersion(version => version + 1);
                }}
            >
                Actualizar
            </Button>
            <Button
                size="small"
                startIcon={<Download/>}
                disabled={loading || !hasSearched}
                onClick={() => void exportRows()}
            >
                Exportar CSV
            </Button>
            <Typography variant="body2" sx={{ml:1}}>
                {rowSelectionModel.length}{' '}
                {rowSelectionModel.length === 1 ? 'bien seleccionado' : 'bienes seleccionados'}
            </Typography>
            {}
            {accionSeleccion
                ? <Button
                    size="small"
                    variant="contained"
                    startIcon={ejecutandoAccion ? <CircularProgress size={14}/> : <PlaylistAdd/>}
                    disabled={rowSelectionModel.length === 0 || ejecutandoAccion}
                    onClick={() => void ejecutarAccionSeleccion()}
                >
                    {accionSeleccion.etiqueta}
                </Button>
                : <>
                    <Button
                        size="small"
                        startIcon={<Print/>}
                        disabled={rowSelectionModel.length === 0}
                        onClick={() => void printSelectedRows()}
                    >
                        Imprimir códigos de barra
                    </Button>
                    <Button
                        size="small"
                        startIcon={<EditNote/>}
                        disabled={rowSelectionModel.length === 0}
                        onClick={() => setEdicionMasivaAbierta(true)}
                    >
                        Editar seleccionados
                    </Button>
                    <Button
                        size="small"
                        color="error"
                        startIcon={<Block/>}
                        disabled={rowSelectionModel.length === 0}
                        onClick={() => setBajaAbierta(true)}
                    >
                        Dar de baja
                    </Button>
                    <Button
                        size="small"
                        startIcon={<LocalShipping/>}
                        disabled={rowSelectionModel.length === 0}
                        onClick={() => setMoverAbierto(true)}
                    >
                        Mover seleccionados
                    </Button>
                </>}
            <Box sx={{flex:1}}/>
            <GridToolbarQuickFilter debounceMs={400}/>
        </GridToolbarContainer>,
    [
        accionSeleccion,
        clearSelection,
        ejecutandoAccion,
        ejecutarAccionSeleccion,
        exportRows,
        hasSearched,
        loading,
        onNuevoBien,
        printSelectedRows,
        rowSelectionModel.length,
    ]);

    if(metadataLoading){
        return <Box sx={{display:'flex', justifyContent:'center', p:4}}>
            <CircularProgress/>
        </Box>;
    }
    if(metadataError || !tableDefinition){
        return <Alert severity="error">
            No se pudo cargar la definición de bienes: {metadataError || 'respuesta vacía'}
        </Alert>;
    }

    return <Box sx={{p:{xs:1, md:2}}}>
        <Tabs
            value={tab}
            onChange={(_event, value:number) => {
                clearSelection();
                setTab(value);
                setPaginationModel(current => ({...current, page:0}));
            }}
            sx={{mb:2}}
        >
            <Tab label="Bienes activos"/>
            <Tab label="Bienes en baja"/>
            <Tab label="Todos"/>
        </Tabs>

        <FiltrosCompuestos
            filters={filters}
            fieldTargets={fieldTargets}
            searchAttributeTargets={searchAttributeTargets}
            searchAttributeValues={searchAttributeValues}
            logicOperator={logicOperator}
            loading={loading}
            showValidation={showValidation}
            onFiltersChange={setFilters}
            onLogicOperatorChange={setLogicOperator}
            onSearch={() => {
                if(filters.some(filter => !isCompleteFilter(filter))){
                    setShowValidation(true);
                    return;
                }
                clearSelection();
                setShowValidation(false);
                setAppliedFilters(filters.map(filter => ({
                    source:filter.source,
                    target:filter.target,
                    operator:filter.operator,
                    value:filter.value,
                    valueTo:filter.valueTo,
                })));
                setAppliedLogicOperator(logicOperator);
                setPaginationModel(current => ({...current, page:0}));
                setHasSearched(true);
                setSearchVersion(version => version + 1);
            }}
            onClear={() => {
                clearSelection();
                setFilters([]);
                setShowValidation(false);
            }}
        />

        {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}
        {avisoMasivo && <Alert
            severity="success"
            sx={{mb:2}}
            onClose={() => setAvisoMasivo(null)}
        >
            {avisoMasivo}
        </Alert>}

        {!hasSearched
            ? <Alert severity="info">
                Configurá los filtros y pulsá Buscar para consultar bienes.
            </Alert>
            : <Box sx={{
                height:'calc(100vh - 330px)',
                minHeight:480,
                width:'100%',
                '& .fila-ya-asignada':{opacity:0.5},
            }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    rowCount={total}
                    loading={loading}
                    getRowId={(row) => String(row.ficha)}
                    pagination
                    paginationMode="server"
                    paginationModel={paginationModel}
                    onPaginationModelChange={setPaginationModel}
                    pageSizeOptions={[10, 25, 50, 100]}
                    sortingMode="server"
                    sortModel={sortModel}
                    onSortModelChange={setSortModel}
                    filterMode="server"
                    filterModel={filterModel}
                    onFilterModelChange={(model) => {
                        clearSelection();
                        setFilterModel(model);
                        setPaginationModel(current => ({...current, page:0}));
                    }}
                    filterDebounceMs={400}
                    checkboxSelection
                    isRowSelectable={({id}) => !fichasExcluidas?.has(String(id))}
                    getRowClassName={({id}) =>
                        fichasExcluidas?.has(String(id)) ? 'fila-ya-asignada' : ''}
                    disableRowSelectionOnClick
                    rowSelectionModel={rowSelectionModel}
                    onRowSelectionModelChange={handleRowSelectionModelChange}
                    keepNonExistentRowsSelected
                    slots={{toolbar:Toolbar}}
                    slotProps={{columnsManagement:{getTogglableColumns}}}
                    initialState={{
                        density:'compact',
                        columns:{columnVisibilityModel},
                    }}
                    getRowHeight={({id}) => expandedRowIds.has(String(id)) ? 'auto' : null}
                    localeText={bienesGridLocaleText}
                />
            </Box>
        }
        {fixedFields.length > 0 && <Box sx={{display:'none'}} data-fixed-fields={fixedFields.length}/>}
        <EdicionMasivaBienes
            abierto={edicionMasivaAbierta}
            conn={conn}
            definicion={tableDefinition}
            fichas={filasSeleccionadasEnOrden(rowSelectionModel, selectedRows)
                .map(fila => String(fila.ficha))}
            onCerrar={() => setEdicionMasivaAbierta(false)}
            onAplicado={(mensaje) => {
                setAvisoMasivo(mensaje);
                clearSelection();
                setSearchVersion(version => version + 1);
            }}
        />
        <MoverBienes
            abierto={moverAbierto}
            conn={conn}
            fichas={filasSeleccionadasEnOrden(rowSelectionModel, selectedRows)
                .map(fila => String(fila.ficha))}
            onCerrar={() => setMoverAbierto(false)}
            onCreada={(mensaje) => {
                setAvisoMasivo(mensaje);
                clearSelection();
                setSearchVersion(version => version + 1);
            }}
        />
        <BajaBienes
            abierto={bajaAbierta}
            conn={conn}
            fichas={filasSeleccionadasEnOrden(rowSelectionModel, selectedRows)
                .map(fila => String(fila.ficha))}
            onCerrar={() => setBajaAbierta(false)}
            onAplicada={(mensaje) => {
                setAvisoMasivo(mensaje);
                clearSelection();
                setSearchVersion(version => version + 1);
            }}
        />
    </Box>;
}
