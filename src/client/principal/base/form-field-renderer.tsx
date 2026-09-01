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

import {useDatosReferencial, useEspaciosDelSector, useEstructuraTabla} from './cache-tablas';
import {aValorFechaInput, formatearValor} from './formato-valores';
import {Fila, nombreDeTipo} from './tipos-tabla';

function comoTextoEditable(value:unknown):string{
    if(value == null){
        return '';
    }
    return typeof value === 'object' ? formatearValor(value) : String(value);
}


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

function paresDeReferencia(field:FieldDefinition):{source:string, target:string}[]{
    const declarados = field.referencesFields ?? [];
    return declarados.length ? declarados : [{source:field.name, target:field.name}];
}

export const CAMPO_SECTOR = 'sector';

export const PERTENENCIA_A_SECTOR:Record<string, {columna:string, sigla:string}> = {
    espacios:{columna:'espacio', sigla:'sectores__sigla'},
};

export const GRUPO_PROPIO = 'del sector';
export const GRUPO_AJENO = 'otros sectores';

export function grupoDePertenencia(fila:Fila, columna:string, propios:Set<string>):string{
    return propios.has(String(fila[columna] ?? '').trim()) ? GRUPO_PROPIO : GRUPO_AJENO;
}

export function ordenarPorPertenencia(opciones:Fila[], columna:string, propios:Set<string>):Fila[]{
    const esPropia = (fila:Fila) => grupoDePertenencia(fila, columna, propios) === GRUPO_PROPIO;
    const propias = opciones.filter(esPropia);
    if(propias.length === 0 || propias.length === opciones.length){
        return opciones;
    }
    return [...propias, ...opciones.filter(fila => !esPropia(fila))];
}

export function opcionesDeReferencia(
    filas:Fila[],
    condiciones:{source:string, target:string}[],
    row:Fila,
):Fila[]{
    if(condiciones.length === 0){
        return filas;
    }
    return filas.filter(fila => condiciones.every(({source, target}) => {
        const impuesto = row[source];
        return impuesto == null || impuesto === '' || fila[target] === impuesto;
    }));
}

function CampoReferencia({field, row, setField, disabled, error, size}:FormFieldRendererProps){
    const {filas, cargando} = useDatosReferencial(field.references);
    const {definicion} = useEstructuraTabla(field.references);

    const pertenencia = PERTENENCIA_A_SECTOR[field.references ?? ''];
    const sectorElegido = pertenencia ? comoTextoEditable(row[CAMPO_SECTOR]) : '';
    const propios = useEspaciosDelSector(sectorElegido || undefined);
    const agrupa = Boolean(pertenencia) && propios.size > 0;

    const pares = paresDeReferencia(field);
    const camposVisibles = React.useMemo(() => {
        const objetivos = pares.map(par => par.target);
        const nombres = definicion?.nameFields ?? [];
        const unidos = [...objetivos, ...nombres, ...(pertenencia ? [pertenencia.sigla] : [])]
            .filter((nombre, i, todos) => nombre && todos.indexOf(nombre) === i);
        return unidos.length ? unidos : [field.name];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [definicion, field.name, field.references]);

    const etiquetaDe = React.useCallback(
        (fila:Fila) => camposVisibles
            .map(nombre => formatearValor(fila[nombre]))
            .filter(parte => parte !== '')
            .join(' - '),
        [camposVisibles],
    );

    const condiciones = pares.filter(par => par.source !== field.name);
    const claveCondiciones = JSON.stringify(condiciones.map(({source}) => row[source] ?? null));
    const opciones = React.useMemo(
        () => {
            const permitidas = opcionesDeReferencia(filas, condiciones, row);
            return agrupa
                ? ordenarPorPertenencia(permitidas, pertenencia.columna, propios)
                : permitidas;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filas, claveCondiciones, agrupa, propios],
    );

    const seleccionada = filas.find(
        fila => pares.every(({source, target}) => fila[target] === row[source]),
    ) ?? null;

    return <Autocomplete
        size={size}
        options={opciones}
        value={seleccionada}
        loading={cargando}
        fullWidth
        disabled={disabled || field.editable === false}
        getOptionLabel={etiquetaDe}
        groupBy={agrupa
            ? opcion => grupoDePertenencia(opcion, pertenencia.columna, propios)
            : undefined}
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
