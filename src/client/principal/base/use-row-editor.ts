import * as React from 'react';
import type {TableDefinition} from 'frontend-plus';

import {useAvisos, useConexion, usePermisos} from './contexto-base';
import {
    Fila,
    esEditable,
    esObligatorio,
    estaVacio,
    loCompletaLaBase,
    normalizarValor,
} from './tipos-tabla';


const MARCA_NUEVA = '$new';

export type ResultadoRowEditor = {
    row:Fila,
    setField:(fieldName:string, value:unknown) => void,
    reiniciar:(row:Fila) => void,
    guardar:() => Promise<boolean>,
    puedeGuardar:boolean,
    soloLectura:boolean,
    esAlta:boolean,
    modificado:boolean,
    errores:Record<string, string|null>,
};

export function useRowEditor({
    tabla,
    definicion,
    filaInicial,
}:{
    tabla:string,
    definicion:TableDefinition,
    filaInicial?:Fila,
}):ResultadoRowEditor{
    const conn = useConexion();
    const {mostrarError} = useAvisos();
    const permisos = usePermisos();
    const primaryKey = definicion.primaryKey ?? [];

    const soloLectura = !permisos.guardar
        || definicion.editable === false
        || definicion.allow?.update === false;

    const [row, setRow] = React.useState<Fila>(() => filaInicial ?? {[MARCA_NUEVA]:true});
    const [original, setOriginal] = React.useState<Fila>(() => filaInicial ?? {});
    const [modificado, setModificado] = React.useState(false);

    const huella = React.useMemo(() => {
        if(!filaInicial){
            return 'alta';
        }
        return primaryKey.map(pk => `${pk}=${String(filaInicial[pk] ?? '')}`).join('|');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filaInicial, primaryKey.join(',')]);
    const [huellaCargada, setHuellaCargada] = React.useState(huella);

    React.useEffect(() => {
        if(huella === huellaCargada){
            return;
        }
        setRow(filaInicial ?? {[MARCA_NUEVA]:true});
        setOriginal(filaInicial ?? {});
        setModificado(false);
        setHuellaCargada(huella);
    }, [huella, huellaCargada, filaInicial]);

    const esAlta = React.useMemo(() => {
        if(row[MARCA_NUEVA]){
            return true;
        }
        if(primaryKey.length === 0){
            return filaInicial === undefined;
        }
        return primaryKey.some(pk => estaVacio(row[pk]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [row, filaInicial, primaryKey.join(',')]);

    const errores = React.useMemo(() => {
        const resultado:Record<string, string|null> = {};
        definicion.fields.forEach(field => {
            const debeTenerValor = esObligatorio(field, primaryKey)
                && esEditable(field)
                && !loCompletaLaBase(field);
            resultado[field.name] = debeTenerValor && estaVacio(row[field.name])
                ? 'Campo obligatorio'
                : null;
        });
        return resultado;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [row, definicion.fields, primaryKey.join(',')]);

    const faltanObligatorios = React.useMemo(
        () => Object.keys(errores).some(nombre => errores[nombre] != null),
        [errores],
    );

    const setField = React.useCallback((fieldName:string, value:unknown) => {
        setRow(previa => ({...previa, [fieldName]:value}));
        setModificado(true);
    }, []);

    const reiniciar = React.useCallback((nueva:Fila) => {
        setRow(nueva);
        setOriginal(nueva);
        setModificado(false);
    }, []);

    const puedeGuardar = !soloLectura && !faltanObligatorios && (modificado || esAlta);

    const armarFilaAEnviar = React.useCallback(():Fila => {
        const resultado:Fila = {};
        definicion.fields.forEach(field => {
            const esPk = primaryKey.indexOf(field.name) >= 0 || Boolean(field.isPk);
            const actual = normalizarValor(row[field.name]);
            if(esAlta){
                if(!estaVacio(actual) || esPk){
                    resultado[field.name] = actual ?? null;
                }
                return;
            }
            if(esPk){
                resultado[field.name] = actual ?? null;
                return;
            }
            if(!esEditable(field)){
                return;
            }
            if(actual !== normalizarValor(original[field.name])){
                resultado[field.name] = actual ?? null;
            }
        });
        delete resultado[MARCA_NUEVA];
        return resultado;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [definicion.fields, esAlta, original, row, primaryKey.join(',')]);

    const guardar = React.useCallback(async ():Promise<boolean> => {
        if(soloLectura){
            mostrarError('No tiene permiso para guardar');
            return false;
        }
        if(faltanObligatorios){
            mostrarError('Faltan completar campos obligatorios');
            return false;
        }
        if(!esAlta && !modificado){
            return true;
        }
        try{
            const respuesta = await conn.ajax.table_record_save({
                table:tabla,
                primaryKeyValues:primaryKey.map(pk => row[pk]),
                newRow:armarFilaAEnviar() as never,
                oldRow:(esAlta ? null : original) as never,
                status:esAlta ? 'new' : 'update',
            });
            const devuelta = respuesta?.row as Fila|undefined;
            const limpia = {...(devuelta ?? row)};
            delete limpia[MARCA_NUEVA];
            setRow(limpia);
            setOriginal(limpia);
            setModificado(false);
            return true;
        }catch(err){
            mostrarError(err, `No se pudo guardar en ${tabla}`);
            return false;
        }
    }, [
        armarFilaAEnviar, conn, esAlta, faltanObligatorios, modificado,
        mostrarError, original, row, soloLectura, tabla,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        primaryKey.join(','),
    ]);

    return {row, setField, reiniciar, guardar, puedeGuardar, soloLectura, esAlta, modificado, errores};
}
