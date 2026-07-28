import * as React from 'react';
import {
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {Add, Clear, Delete, Search} from '@mui/icons-material';
import type {
    BienesBusquedaFilter,
    BienesBusquedaLogicOperator,
    BienesBusquedaOperator,
    BienesBusquedaSource,
} from '../../common/bienes-busqueda';

export type BienesBusquedaTarget = {
    source: BienesBusquedaSource;
    target: string;
    label: string;
    typeName: string;
};

export type BienesBusquedaFilterDraft = BienesBusquedaFilter & {
    id: string;
    targetLabel?: string;
    targetTypeName?: string;
};

type FiltrosCompuestosProps = {
    filters: BienesBusquedaFilterDraft[];
    fieldTargets: BienesBusquedaTarget[];
    searchAttributeTargets: (search:string) => Promise<BienesBusquedaTarget[]>;
    searchAttributeValues: (attribute:string, search:string) => Promise<string[]>;
    logicOperator: BienesBusquedaLogicOperator;
    loading: boolean;
    showValidation: boolean;
    onFiltersChange: (filters:BienesBusquedaFilterDraft[]) => void;
    onLogicOperatorChange: (logicOperator:BienesBusquedaLogicOperator) => void;
    onSearch: () => void;
    onClear: () => void;
};

type OperatorOption = {
    value: BienesBusquedaOperator;
    label: string;
};

const textOperators:OperatorOption[] = [
    {value:'contains', label:'contiene'},
    {value:'equals', label:'es igual a'},
    {value:'not_equals', label:'es distinto de'},
    {value:'starts_with', label:'empieza con'},
    {value:'ends_with', label:'termina con'},
    {value:'empty', label:'está vacío'},
    {value:'not_empty', label:'no está vacío'},
];

const orderedOperators:OperatorOption[] = [
    {value:'equals', label:'es igual a'},
    {value:'not_equals', label:'es distinto de'},
    {value:'greater_than', label:'es mayor que'},
    {value:'greater_or_equal', label:'es mayor o igual que'},
    {value:'less_than', label:'es menor que'},
    {value:'less_or_equal', label:'es menor o igual que'},
    {value:'between', label:'está entre'},
    {value:'empty', label:'está vacío'},
    {value:'not_empty', label:'no está vacío'},
];

const booleanOperators:OperatorOption[] = [
    {value:'equals', label:'es igual a'},
    {value:'not_equals', label:'es distinto de'},
    {value:'empty', label:'está vacío'},
    {value:'not_empty', label:'no está vacío'},
];

let filterSequence = 0;

export function createEmptyFilter():BienesBusquedaFilterDraft{
    filterSequence += 1;
    return {
        id:`filtro-${filterSequence}`,
        source:'field',
        target:'',
        operator:'contains',
        value:'',
    };
}

function normalizedType(typeName:string):'text'|'number'|'date'|'boolean'{
    const normalized = typeName.toLowerCase();
    if(['decimal', 'bigint', 'integer', 'number'].indexOf(normalized) >= 0){
        return 'number';
    }
    if(normalized === 'date'){
        return 'date';
    }
    if(normalized === 'boolean'){
        return 'boolean';
    }
    return 'text';
}

export function operatorNeedsValue(operator:BienesBusquedaOperator):boolean{
    return operator !== 'empty' && operator !== 'not_empty';
}

export function isCompleteFilter(filter:BienesBusquedaFilterDraft):boolean{
    if(!filter.target){
        return false;
    }
    if(!operatorNeedsValue(filter.operator)){
        return true;
    }
    if(filter.value == null || String(filter.value).trim() === ''){
        return false;
    }
    return filter.operator !== 'between'
        || (filter.valueTo != null && String(filter.valueTo).trim() !== '');
}

function operatorsFor(target:BienesBusquedaTarget | undefined):OperatorOption[]{
    switch(normalizedType(target?.typeName ?? 'text')){
    case 'number':
    case 'date':
        return orderedOperators;
    case 'boolean':
        return booleanOperators;
    default:
        return textOperators;
    }
}

function targetFromFilter(
    filter:BienesBusquedaFilterDraft,
    fieldTargets:BienesBusquedaTarget[],
):BienesBusquedaTarget|null{
    if(!filter.target){
        return null;
    }
    const fieldTarget = fieldTargets.find(target =>
        target.source === filter.source && target.target === filter.target
    );
    return fieldTarget ?? {
        source:filter.source,
        target:filter.target,
        label:filter.targetLabel || filter.target,
        typeName:filter.targetTypeName || 'text',
    };
}

function TargetControl({
    filter,
    fieldTargets,
    disabled,
    error,
    searchAttributeTargets,
    onChange,
}:{
    filter:BienesBusquedaFilterDraft;
    fieldTargets:BienesBusquedaTarget[];
    disabled:boolean;
    error:boolean;
    searchAttributeTargets:(search:string) => Promise<BienesBusquedaTarget[]>;
    onChange:(target:BienesBusquedaTarget|null) => void;
}){
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [attributeTargets, setAttributeTargets] = React.useState<BienesBusquedaTarget[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [loadError, setLoadError] = React.useState<string|null>(null);
    const requestSequence = React.useRef(0);
    const selectedTarget = targetFromFilter(filter, fieldTargets);

    React.useEffect(() => {
        if(!open){
            return;
        }
        const sequence = ++requestSequence.current;
        const timeout = window.setTimeout(() => {
            setLoading(true);
            setLoadError(null);
            void searchAttributeTargets(search)
                .then(options => {
                    if(sequence === requestSequence.current){
                        setAttributeTargets(options);
                        setLoading(false);
                    }
                })
                .catch(err => {
                    if(sequence === requestSequence.current){
                        setAttributeTargets([]);
                        setLoadError(err instanceof Error ? err.message : String(err));
                        setLoading(false);
                    }
                });
        }, 300);
        return () => window.clearTimeout(timeout);
    }, [open, search, searchAttributeTargets]);

    const normalizedSearch = search.trim().toLocaleLowerCase('es-AR');
    const matchingFields = normalizedSearch
        ? fieldTargets.filter(target =>
            `${target.label} ${target.target}`.toLocaleLowerCase('es-AR').includes(normalizedSearch)
        )
        : fieldTargets;
    const options = [...matchingFields, ...attributeTargets];

    return <Autocomplete
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => {
            setOpen(false);
            setSearch('');
        }}
        options={options}
        value={selectedTarget}
        loading={loading}
        disabled={disabled}
        filterOptions={currentOptions => currentOptions}
        groupBy={option => option.source === 'field' ? 'Campos del bien' : 'Atributos'}
        getOptionLabel={option => option.label}
        isOptionEqualToValue={(option, value) =>
            option.source === value.source && option.target === value.target
        }
        onInputChange={(_event, value, reason) => {
            if(reason === 'input'){
                setSearch(value);
            }
        }}
        onChange={(_event, value) => onChange(value)}
        noOptionsText={loadError || 'No se encontraron campos ni atributos'}
        sx={{minWidth:{md:320}}}
        renderInput={params =>
            <TextField
                {...params}
                size="small"
                label="Campo o atributo"
                error={error || Boolean(loadError)}
                helperText={loadError || undefined}
                InputProps={{
                    ...params.InputProps,
                    endAdornment:<>
                        {loading ? <CircularProgress color="inherit" size={18}/> : null}
                        {params.InputProps.endAdornment}
                    </>,
                }}
            />
        }
    />;
}

function ValueControl({
    filter,
    target,
    disabled,
    error,
    searchAttributeValues,
    onChange,
}:{
    filter:BienesBusquedaFilterDraft;
    target:BienesBusquedaTarget | undefined;
    disabled:boolean;
    error:boolean;
    searchAttributeValues:(attribute:string, search:string) => Promise<string[]>;
    onChange:(patch:Partial<BienesBusquedaFilterDraft>) => void;
}){
    if(!operatorNeedsValue(filter.operator)){
        return null;
    }
    const type = normalizedType(target?.typeName ?? 'text');
    const commonProps = {
        size:'small' as const,
        disabled,
        error,
        sx:{minWidth:{md:210}, flex:1},
    };
    const valueControl = target?.source === 'attribute'
        ? <AttributeValueControl
            attribute={target.target}
            value={String(filter.value ?? '')}
            disabled={disabled}
            error={error}
            type={type}
            searchAttributeValues={searchAttributeValues}
            onChange={value => onChange({value})}
        />
        : type === 'boolean'
            ? <TextField
                {...commonProps}
                select
                label="Valor"
                value={String(filter.value ?? '')}
                onChange={(event) => onChange({value:event.target.value === 'true'})}
            >
                <MenuItem value="true">Sí</MenuItem>
                <MenuItem value="false">No</MenuItem>
            </TextField>
            : <TextField
                {...commonProps}
                type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
                label="Valor"
                value={String(filter.value ?? '')}
                InputLabelProps={type === 'date' ? {shrink:true} : undefined}
                onChange={(event) => onChange({value:event.target.value})}
            />;
    return <>
        {valueControl}
        {filter.operator === 'between' &&
            <TextField
                {...commonProps}
                type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
                label="Hasta"
                value={String(filter.valueTo ?? '')}
                InputLabelProps={type === 'date' ? {shrink:true} : undefined}
                onChange={(event) => onChange({valueTo:event.target.value})}
            />
        }
    </>;
}

function AttributeValueControl({
    attribute,
    value,
    disabled,
    error,
    type,
    searchAttributeValues,
    onChange,
}:{
    attribute:string;
    value:string;
    disabled:boolean;
    error:boolean;
    type:'text'|'number'|'date'|'boolean';
    searchAttributeValues:(attribute:string, search:string) => Promise<string[]>;
    onChange:(value:unknown) => void;
}){
    const [catalogState, setCatalogState] =
        React.useState<'loading'|'catalog'|'free'>('loading');
    const [options, setOptions] = React.useState<string[]>([]);
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [loadError, setLoadError] = React.useState<string|null>(null);
    const requestSequence = React.useRef(0);

    React.useEffect(() => {
        const sequence = ++requestSequence.current;
        setCatalogState('loading');
        setOptions([]);
        setOpen(false);
        setSearch('');
        setLoadError(null);
        void searchAttributeValues(attribute, '')
            .then(values => {
                if(sequence === requestSequence.current){
                    setOptions(values);
                    setCatalogState(values.length ? 'catalog' : 'free');
                }
            })
            .catch(err => {
                if(sequence === requestSequence.current){
                    setLoadError(err instanceof Error ? err.message : String(err));
                    setCatalogState('free');
                }
            });
    }, [attribute, searchAttributeValues]);

    React.useEffect(() => {
        if(catalogState !== 'catalog' || !open){
            return;
        }
        const sequence = ++requestSequence.current;
        const timeout = window.setTimeout(() => {
            void searchAttributeValues(attribute, search)
                .then(values => {
                    if(sequence === requestSequence.current){
                        setOptions(values);
                        setLoadError(null);
                    }
                })
                .catch(err => {
                    if(sequence === requestSequence.current){
                        setOptions([]);
                        setLoadError(err instanceof Error ? err.message : String(err));
                    }
                });
        }, 300);
        return () => window.clearTimeout(timeout);
    }, [attribute, catalogState, open, search, searchAttributeValues]);

    if(catalogState === 'loading'){
        return <TextField
            size="small"
            label="Valor"
            disabled
            sx={{minWidth:{md:210}, flex:1}}
            InputProps={{endAdornment:<CircularProgress color="inherit" size={18}/>}}
        />;
    }
    if(catalogState === 'catalog'){
        const visibleOptions = value && options.indexOf(value) < 0 ? [value, ...options] : options;
        return <Autocomplete
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => {
                setOpen(false);
                setSearch('');
            }}
            options={visibleOptions}
            value={value || null}
            disabled={disabled}
            filterOptions={currentOptions => currentOptions}
            onInputChange={(_event, inputValue, reason) => {
                if(reason === 'input'){
                    setSearch(inputValue);
                }
            }}
            onChange={(_event, selectedValue) => onChange(selectedValue ?? '')}
            noOptionsText={loadError || 'No se encontraron valores'}
            sx={{minWidth:{md:210}, flex:1}}
            renderInput={params =>
                <TextField
                    {...params}
                    size="small"
                    label="Valor"
                    error={error || Boolean(loadError)}
                    helperText={loadError || undefined}
                />
            }
        />;
    }
    if(type === 'boolean'){
        return <TextField
            size="small"
            select
            label="Valor"
            value={value}
            disabled={disabled}
            error={error}
            helperText={loadError || undefined}
            sx={{minWidth:{md:210}, flex:1}}
            onChange={(event) => onChange(event.target.value === 'true')}
        >
            <MenuItem value="true">Sí</MenuItem>
            <MenuItem value="false">No</MenuItem>
        </TextField>;
    }
    return <TextField
        size="small"
        type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
        label="Valor"
        value={value}
        disabled={disabled}
        error={error}
        helperText={loadError || undefined}
        InputLabelProps={type === 'date' ? {shrink:true} : undefined}
        sx={{minWidth:{md:210}, flex:1}}
        onChange={(event) => onChange(event.target.value)}
    />;
}

export function FiltrosCompuestos({
    filters,
    fieldTargets,
    searchAttributeTargets,
    searchAttributeValues,
    logicOperator,
    loading,
    showValidation,
    onFiltersChange,
    onLogicOperatorChange,
    onSearch,
    onClear,
}:FiltrosCompuestosProps){
    const updateFilter = (id:string, patch:Partial<BienesBusquedaFilterDraft>) => {
        onFiltersChange(filters.map(filter => filter.id === id ? {...filter, ...patch} : filter));
    };
    return <Paper variant="outlined" sx={{p:2, mb:2}}>
        <Stack spacing={1.5}>
            <Stack direction={{xs:'column', sm:'row'}} spacing={1.5} alignItems={{sm:'center'}}>
                <Typography variant="h6" sx={{flex:1}}>Búsqueda avanzada</Typography>
                <TextField
                    select
                    size="small"
                    label="Combinación"
                    value={logicOperator}
                    disabled={loading}
                    onChange={(event) => onLogicOperatorChange(
                        event.target.value as BienesBusquedaLogicOperator
                    )}
                    sx={{minWidth:230}}
                >
                    <MenuItem value="and">Cumplir todas (AND)</MenuItem>
                    <MenuItem value="or">Cumplir alguna (OR)</MenuItem>
                </TextField>
            </Stack>

            {filters.length === 0 &&
                <Typography variant="body2" color="text.secondary">
                    Sin condiciones: Buscar mostrará los bienes de la pestaña seleccionada.
                </Typography>
            }

            {filters.map(filter => {
                const selectedTarget = targetFromFilter(filter, fieldTargets) ?? undefined;
                const incomplete = showValidation && !isCompleteFilter(filter);
                return <Stack
                    key={filter.id}
                    direction={{xs:'column', md:'row'}}
                    spacing={1}
                    alignItems={{md:'center'}}
                >
                    <TargetControl
                        filter={filter}
                        fieldTargets={fieldTargets}
                        disabled={loading}
                        error={incomplete && !filter.target}
                        searchAttributeTargets={searchAttributeTargets}
                        onChange={(option) => {
                            if(option){
                                const firstOperator = operatorsFor(option)[0].value;
                                updateFilter(filter.id, {
                                    source:option.source,
                                    target:option.target,
                                    targetLabel:option.label,
                                    targetTypeName:option.typeName,
                                    operator:firstOperator,
                                    value:'',
                                    valueTo:'',
                                });
                            }else{
                                updateFilter(filter.id, {
                                    source:'field',
                                    target:'',
                                    targetLabel:'',
                                    targetTypeName:'',
                                    operator:'contains',
                                    value:'',
                                    valueTo:'',
                                });
                            }
                        }}
                    />

                    <TextField
                        select
                        size="small"
                        label="Operador"
                        value={filter.operator}
                        disabled={loading || !filter.target}
                        onChange={(event) => updateFilter(filter.id, {
                            operator:event.target.value as BienesBusquedaOperator,
                            valueTo:'',
                        })}
                        sx={{minWidth:{md:190}}}
                    >
                        {operatorsFor(selectedTarget).map(operator =>
                            <MenuItem key={operator.value} value={operator.value}>
                                {operator.label}
                            </MenuItem>
                        )}
                    </TextField>

                    <ValueControl
                        filter={filter}
                        target={selectedTarget}
                        disabled={loading || !filter.target}
                        error={incomplete && Boolean(filter.target)}
                        searchAttributeValues={searchAttributeValues}
                        onChange={(patch) => updateFilter(filter.id, patch)}
                    />

                    <Tooltip title="Quitar condición">
                        <span>
                            <IconButton
                                size="small"
                                disabled={loading}
                                onClick={() => onFiltersChange(
                                    filters.filter(current => current.id !== filter.id)
                                )}
                            >
                                <Delete fontSize="small"/>
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>;
            })}

            {showValidation && filters.some(filter => !isCompleteFilter(filter)) &&
                <Typography color="error" variant="body2">
                    Completá o eliminá las condiciones marcadas.
                </Typography>
            }

            <Box>
                <Button
                    size="small"
                    startIcon={<Add/>}
                    disabled={loading}
                    onClick={() => onFiltersChange([...filters, createEmptyFilter()])}
                >
                    Agregar condición
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<Search/>}
                    disabled={loading}
                    onClick={onSearch}
                    sx={{ml:1}}
                >
                    Buscar
                </Button>
                <Button
                    size="small"
                    startIcon={<Clear/>}
                    disabled={loading || filters.length === 0}
                    onClick={onClear}
                    sx={{ml:1}}
                >
                    Limpiar
                </Button>
            </Box>
        </Stack>
    </Paper>;
}
