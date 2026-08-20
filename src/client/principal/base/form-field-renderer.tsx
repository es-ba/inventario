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

/**
 * Opciones de una referencia, acotadas por las partes de la clave que la fila ya tiene.
 *
 * Una parte todavía vacía no filtra: filtrar por nada dejaría el selector en blanco sin
 * explicación, y es peor que ofrecer de más.
 */
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

    /*
        En una referencia compuesta, las partes de la clave que ya están elegidas acotan la
        lista. El valor de un atributo se identifica por (atributo, valor): sin esto, al
        cargar la memoria RAM de una notebook se ofrecen también los tamaños de pantalla y
        los colores de etiqueta, que son valores de otros atributos.

        Vale para toda referencia compuesta, no sólo para ésta: elegir una clase ofrece las
        del rubro elegido, y una cuenta las de esa clase.

        Si la parte que condiciona todavía está vacía se muestra todo: filtrar por nada no
        tiene sentido y dejaría el selector en blanco sin explicación.
    */
    const condiciones = pares.filter(par => par.source !== field.name);
    const claveCondiciones = JSON.stringify(condiciones.map(({source}) => row[source] ?? null));
    const opciones = React.useMemo(
        () => opcionesDeReferencia(filas, condiciones, row),
        // condiciones se rearma en cada render; lo que importa es qué valores impone la fila
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filas, claveCondiciones],
    );

    /*
        La seleccionada se busca en la lista completa y no en la filtrada: si la fila ya
        tenía un valor que no encaja con el atributo actual, se muestra igual en vez de
        aparecer vacía como si no hubiera nada cargado.
    */
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
