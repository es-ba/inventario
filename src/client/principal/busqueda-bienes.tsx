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
    Download,
    KeyboardArrowDown,
    KeyboardArrowUp,
    OpenInNew,
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
    BienesBusquedaExportResponse,
    BienesBusquedaFilter,
    BienesBusquedaOperator,
    BienesBusquedaRequest,
    BienesBusquedaResponse,
    BienesBusquedaRow,
} from '../../common/bienes-busqueda';
import {
    BienesBusquedaFilterDraft,
    BienesBusquedaTarget,
    FiltrosCompuestos,
    isCompleteFilter,
} from './filtros-compuestos';
import {unmountConnectedAppInventario} from './render-connected-app-inventario';

declare module 'frontend-plus' {
    interface FieldDefinition {
        label?:string;
        inTable?:boolean;
    }
    interface TableDefinition {
        hiddenColumns?:string[];
    }
    interface BEAPI {
        bienes_buscar_avanzado:(params:{consulta:string}) => Promise<BienesBusquedaResponse>;
        bienes_busqueda_exportar:(params:{consulta:string}) => Promise<BienesBusquedaExportResponse>;
        bienes_atributos_buscar:
            (params:{busqueda:string}) => Promise<BienesAtributosOpcionesResponse>;
        bienes_atributo_valores_buscar:
            (params:{atributo:string, busqueda:string}) =>
                Promise<BienesAtributoValoresOpcionesResponse>;
    }
}

type BusquedaBienesProps = {
    conn:Connector;
    fixedFields:FixedFields;
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

export function BusquedaBienes({conn, fixedFields}:BusquedaBienesProps){
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
    const requestSequence = React.useRef(0);

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
        const baseColumns = tableDefinition.fields
            .filter(field => field.inTable !== false)
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
                        unmountConnectedAppInventario();
                        (myOwn.gotoAddrParams as (params:any) => void)({
                            i:['bienes', 'bienes'],
                            ff:{ficha:String(params.row.ficha)},
                        });
                    }}
                >
                    Abrir
                </Button>,
        };
        return [...baseColumns, attributesColumn, actionsColumn];
    }, [expandedRowIds, tableDefinition]);

    const columnVisibilityModel = React.useMemo(() => {
        const model:Record<string, boolean> = {};
        (tableDefinition?.hiddenColumns ?? []).forEach(field => {
            model[field] = false;
        });
        return model;
    }, [tableDefinition]);

    const Toolbar = React.useCallback(() =>
        <GridToolbarContainer>
            <GridToolbarColumnsButton/>
            <GridToolbarFilterButton/>
            <GridToolbarDensitySelector/>
            <Button
                size="small"
                startIcon={<Refresh/>}
                disabled={loading}
                onClick={() => setSearchVersion(version => version + 1)}
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
            <Box sx={{flex:1}}/>
            <GridToolbarQuickFilter debounceMs={400}/>
        </GridToolbarContainer>,
    [exportRows, hasSearched, loading]);

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
                setFilters([]);
                setShowValidation(false);
            }}
        />

        {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}

        {!hasSearched
            ? <Alert severity="info">
                Configurá los filtros y pulsá Buscar para consultar bienes.
            </Alert>
            : <Box sx={{height:'calc(100vh - 330px)', minHeight:480, width:'100%'}}>
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
                        setFilterModel(model);
                        setPaginationModel(current => ({...current, page:0}));
                    }}
                    filterDebounceMs={400}
                    checkboxSelection
                    disableRowSelectionOnClick
                    slots={{toolbar:Toolbar}}
                    slotProps={{columnsManagement:{getTogglableColumns}}}
                    initialState={{
                        density:'compact',
                        columns:{columnVisibilityModel},
                    }}
                    getRowHeight={({id}) => expandedRowIds.has(String(id)) ? 'auto' : null}
                    localeText={{
                        noRowsLabel:'No se encontraron bienes',
                        toolbarQuickFilterPlaceholder:'Buscar en resultados…',
                    }}
                />
            </Box>
        }
        {fixedFields.length > 0 && <Box sx={{display:'none'}} data-fixed-fields={fixedFields.length}/>}
    </Box>;
}
