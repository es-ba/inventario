import * as React from 'react';
import {
    Autocomplete,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormHelperText,
    MenuItem,
    TextField,
} from '@mui/material';
import type {FieldDefinition} from 'frontend-plus';

import {useDatosReferencial, useEstructuraTabla} from './cache-tablas';
import {aValorFechaInput, formatearValor} from './formato-valores';
import {Fila, nombreDeTipo} from './tipos-tabla';

/**
 * Texto para un input. Los strings se dejan intactos —reformatearlos rompería la
 * edición— y sólo los valores tipados que manda el backend se convierten.
 */
function comoTextoEditable(value:unknown):string{
    if(value == null){
        return '';
    }
    return typeof value === 'object' ? formatearValor(value) : String(value);
}

/*
    Renderiza un campo de formulario a partir de su FieldDefinition.

    Las fechas usan el input nativo de HTML, como ya hace filtros-compuestos.tsx, para no
    sumarle @mui/x-date-pickers y date-fns al bundle —que ya está en 714 KB— por un
    control que el navegador trae de fábrica.
*/

export type FormFieldRendererProps = {
    field:FieldDefinition,
    row:Fila,
    setField:(fieldName:string, value:unknown) => void,
    disabled?:boolean,
    error?:string|null,
    multiline?:boolean,
    minRows?:number,
    size?:'small'|'medium',
};

/** Pares (campo local, campo referenciado) de la FK; por defecto el campo consigo mismo. */
function paresDeReferencia(field:FieldDefinition):{source:string, target:string}[]{
    const declarados = field.referencesFields ?? [];
    return declarados.length ? declarados : [{source:field.name, target:field.name}];
}

function CampoReferencia({field, row, setField, disabled, error, size}:FormFieldRendererProps){
    const {filas, cargando} = useDatosReferencial(field.references);
    const {definicion} = useEstructuraTabla(field.references);

    const pares = paresDeReferencia(field);
    const camposVisibles = React.useMemo(() => {
        const objetivos = pares.map(par => par.target);
        const nombres = definicion?.nameFields ?? [];
        const unidos = [...objetivos, ...nombres]
            .filter((nombre, i, todos) => nombre && todos.indexOf(nombre) === i);
        return unidos.length ? unidos : [field.name];
        // pares se recalcula en cada render pero su contenido depende sólo del field
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [definicion, field.name, field.references]);

    const etiquetaDe = React.useCallback(
        (fila:Fila) => camposVisibles
            .map(nombre => formatearValor(fila[nombre]))
            .filter(parte => parte !== '')
            .join(' - '),
        [camposVisibles],
    );

    const seleccionada = filas.find(
        fila => pares.every(({source, target}) => fila[target] === row[source]),
    ) ?? null;

    return <Autocomplete
        size={size}
        options={filas}
        value={seleccionada}
        loading={cargando}
        fullWidth
        disabled={disabled || field.editable === false}
        getOptionLabel={etiquetaDe}
        isOptionEqualToValue={(opcion, valor) =>
            pares.every(({target}) => opcion[target] === valor[target])}
        renderOption={(props, opcion) => {
            const {key, ...resto} = props as React.HTMLAttributes<HTMLLIElement> & {key?:React.Key};
            return <li {...resto} key={key ?? etiquetaDe(opcion)}>{etiquetaDe(opcion)}</li>;
        }}
        onChange={(_evento, nuevo) => {
            pares.forEach(({source, target}) => {
                setField(source, nuevo && target in nuevo ? nuevo[target] : null);
            });
        }}
        renderInput={params => <TextField
            {...params}
            label={field.label ?? field.title ?? field.name}
            required={field.nullable === false}
            error={Boolean(error)}
            helperText={error ?? undefined}
        />}
    />;
}

export function FormFieldRenderer(props:FormFieldRendererProps){
    const {field, row, setField, disabled = false, error = null, multiline = false, minRows, size} = props;
    const value = row[field.name];
    const etiqueta = field.label ?? field.title ?? field.name;
    const deshabilitado = disabled || field.editable === false;
    const tipo = nombreDeTipo(field.typeName);

    if(field.references){
        return <CampoReferencia {...props}/>;
    }

    if(field.options?.length){
        return <TextField
            select
            label={etiqueta}
            value={comoTextoEditable(value)}
            onChange={evento => setField(field.name, evento.target.value || null)}
            disabled={deshabilitado}
            required={field.nullable === false}
            error={Boolean(error)}
            helperText={error ?? undefined}
            fullWidth
            size={size}
        >
            <MenuItem value=""><em>sin valor</em></MenuItem>
            {field.options.map(opcion =>
                <MenuItem key={opcion} value={opcion}>{opcion}</MenuItem>
            )}
        </TextField>;
    }

    if(tipo === 'boolean'){
        return <FormControl error={Boolean(error)}>
            <FormControlLabel
                control={<Checkbox
                    checked={Boolean(value)}
                    onChange={(_evento, marcado) => setField(field.name, marcado)}
                    disabled={deshabilitado}
                />}
                label={etiqueta}
            />
            {error ? <FormHelperText>{error}</FormHelperText> : null}
        </FormControl>;
    }

    if(tipo === 'date'){
        return <TextField
            type="date"
            label={etiqueta}
            value={aValorFechaInput(value)}
            onChange={evento => setField(field.name, evento.target.value || null)}
            disabled={deshabilitado}
            required={field.nullable === false}
            error={Boolean(error)}
            helperText={error ?? undefined}
            fullWidth
            size={size}
            InputLabelProps={{shrink:true}}
        />;
    }

    const esNumero = tipo === 'decimal' || tipo === 'bigint' || tipo === 'integer';

    return <TextField
        type={esNumero ? 'number' : 'text'}
        label={etiqueta}
        value={comoTextoEditable(value)}
        onChange={evento => setField(field.name, evento.target.value)}
        disabled={deshabilitado}
        required={field.nullable === false}
        error={Boolean(error)}
        helperText={error ?? undefined}
        fullWidth
        size={size}
        multiline={multiline}
        minRows={multiline ? minRows : undefined}
    />;
}
