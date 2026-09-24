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
import {aValorFechaInput, etiquetaDeCampo, formatearValor} from './formato-valores';
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
    excluidos?:Set<string>,
    admitir?:(fila:Fila) => boolean,
};

function paresDeReferencia(field:FieldDefinition):{source:string, target:string}[]{
    const declarados = field.referencesFields ?? [];
    return declarados.length ? declarados : [{source:field.name, target:field.name}];
}

export const CAMPO_SECTOR = 'sector';

export const PERTENENCIA_A_SECTOR:Record<string, {columna:string, sigla:string}> = {
    espacios:{columna:'espacio', sigla:'sectores__sigla'},
};

export const COLUMNAS_EXTRA_DE_ETIQUETA:Record<string, string[]> = {
    sectores:['responsables__apellido', 'responsables__nombre'],
};

export function camposDeEtiqueta(referencia:string, ...listas:string[][]):string[]{
    const pertenencia = PERTENENCIA_A_SECTOR[referencia];
    return [
        ...([] as string[]).concat(...listas),
        ...(pertenencia ? [pertenencia.sigla] : []),
        ...(COLUMNAS_EXTRA_DE_ETIQUETA[referencia] ?? []),
    ].filter((nombre, i, todos) => nombre && todos.indexOf(nombre) === i);
}

export const GRUPO_PROPIO = 'Del sector';
export const GRUPO_AJENO = 'Otros sectores';

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

export function sinExcluidos(filas:Fila[], columna:string, excluidos:Set<string>|undefined):Fila[]{
    if(!excluidos || excluidos.size === 0){
        return filas;
    }
    return filas.filter(fila => !excluidos.has(String(fila[columna] ?? '')));
}

export function dependientesDeReferencia(
    fields:{name:string, referencesFields?:{source:string, target:string}[]}[],
):Map<string, string[]>{
    const dependientes = new Map<string, string[]>();
    for(const field of fields){
        for(const {source} of field.referencesFields ?? []){
            if(source === field.name){
                continue;
            }
            dependientes.set(source, [...(dependientes.get(source) ?? []), field.name]);
        }
    }
    return dependientes;
}

export const REFERENCIAS_SIN_INACTIVOS = new Set(['responsables']);

export function sinInactivos(referencia:string|undefined, opciones:Fila[], esActual:(fila:Fila) => boolean):Fila[]{
    if(referencia == null || !REFERENCIAS_SIN_INACTIVOS.has(referencia)){
        return opciones;
    }
    return opciones.filter(fila => fila.activo !== false || esActual(fila));
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

function CampoReferencia({field, row, setField, disabled, error, size, excluidos, admitir}:FormFieldRendererProps){
    const {filas, cargando} = useDatosReferencial(field.references);
    const {definicion} = useEstructuraTabla(field.references);

    const pertenencia = PERTENENCIA_A_SECTOR[field.references ?? ''];
    const sectorElegido = pertenencia ? comoTextoEditable(row[CAMPO_SECTOR]) : '';
    const propios = useEspaciosDelSector(sectorElegido || undefined);
    const agrupa = Boolean(pertenencia) && propios.size > 0;

    const pares = paresDeReferencia(field);
    const camposVisibles = React.useMemo(() => {
        const unidos = camposDeEtiqueta(
            field.references ?? '',
            pares.map(par => par.target),
            definicion?.nameFields ?? [],
        );
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
    const columnaPropia = pares.find(par => par.source === field.name)?.target ?? field.name;
    const claveCondiciones = JSON.stringify(condiciones.map(({source}) => row[source] ?? null));
    const esActual = (fila:Fila) => pares.every(({source, target}) => fila[target] === row[source]);
    const claveActual = JSON.stringify(pares.map(({source}) => row[source] ?? null));
    const opciones = React.useMemo(
        () => {
            const sinExcluir = sinExcluidos(
                opcionesDeReferencia(filas, condiciones, row), columnaPropia, excluidos);
            const vigentes = sinInactivos(field.references, sinExcluir, esActual);
            const permitidas = admitir ? vigentes.filter(admitir) : vigentes;
            return agrupa
                ? ordenarPorPertenencia(permitidas, pertenencia.columna, propios)
                : permitidas;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filas, claveCondiciones, claveActual, agrupa, propios, excluidos, admitir, field.references],
    );

    const seleccionada = filas.find(esActual) ?? null;

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
            label={etiquetaDeCampo(field)}
            required={field.nullable === false}
            error={Boolean(error)}
            helperText={error ?? undefined}
        />}
    />;
}

export function FormFieldRenderer(props:FormFieldRendererProps){
    const {field, row, setField, disabled = false, error = null, multiline = false, minRows, size} = props;
    const value = row[field.name];
    const etiqueta = etiquetaDeCampo(field);
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
            <MenuItem value=""><em>Sin valor</em></MenuItem>
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
