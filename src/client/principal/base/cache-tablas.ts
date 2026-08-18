import * as React from 'react';
import type {Connector, FixedFields, TableDefinition} from 'frontend-plus';

import {useAvisos, useConexion} from './contexto-base';
import type {Fila} from './tipos-tabla';

/*
    Caché de metadata y de tablas referenciales.

    El formulario de un bien tiene una docena de claves foráneas, y cada campo necesita
    la estructura y el contenido de la tabla referenciada. Sin caché eso son dos pedidos
    por campo cada vez que se abre el formulario. Acá se guarda la promesa —no el
    resultado— así varios campos que piden la misma tabla al mismo tiempo comparten un
    único pedido en vuelo.

    Las estructuras no cambian durante la sesión. Los datos referenciales (marcas, sedes,
    rubros) cambian poco; si se editan, invalidarTabla() limpia la entrada.
*/

const cacheEstructura = new Map<string, Promise<TableDefinition>>();
const cacheDatos = new Map<string, Promise<Fila[]>>();

const SIN_FILTRO:FixedFields = [];

export function traerEstructura(conn:Connector, tabla:string):Promise<TableDefinition>{
    const enCache = cacheEstructura.get(tabla);
    if(enCache){
        return enCache;
    }
    const pedido = conn.ajax.table_structure({table:tabla});
    cacheEstructura.set(tabla, pedido);
    // Un fallo no debe quedar cacheado: el próximo intento tiene que volver a pedirlo.
    pedido.catch(() => { cacheEstructura.delete(tabla); });
    return pedido;
}

export function traerDatosReferencial(conn:Connector, tabla:string):Promise<Fila[]>{
    const enCache = cacheDatos.get(tabla);
    if(enCache){
        return enCache;
    }
    // El genérico de table_data exige RowType (valores escalares); acá se trabaja con
    // filas genéricas, así que se convierte a la salida.
    const pedido = conn.ajax.table_data({
        table:tabla,
        fixedFields:SIN_FILTRO,
        paramfun:{},
    }) as unknown as Promise<Fila[]>;
    cacheDatos.set(tabla, pedido);
    pedido.catch(() => { cacheDatos.delete(tabla); });
    return pedido;
}

/** Limpia lo cacheado de una tabla; sin argumento limpia todo. */
export function invalidarTabla(tabla?:string):void{
    if(tabla == null){
        cacheEstructura.clear();
        cacheDatos.clear();
        return;
    }
    cacheEstructura.delete(tabla);
    cacheDatos.delete(tabla);
}

/** Evita actualizar estado de un componente ya desmontado. */
function useCargaCancelable<T>(
    cargar:(() => Promise<T>)|null,
    inicial:T,
    descripcionError:string,
):{valor:T, cargando:boolean}{
    const {mostrarError} = useAvisos();
    const [valor, setValor] = React.useState<T>(inicial);
    const [cargando, setCargando] = React.useState(false);

    React.useEffect(() => {
        if(cargar == null){
            setValor(inicial);
            setCargando(false);
            return;
        }
        let cancelado = false;
        setCargando(true);
        cargar().then(resultado => {
            if(!cancelado){
                setValor(resultado);
            }
        }).catch(err => {
            if(!cancelado){
                mostrarError(err, descripcionError);
                setValor(inicial);
            }
        }).finally(() => {
            if(!cancelado){
                setCargando(false);
            }
        });
        return () => { cancelado = true; };
        // inicial se omite a propósito: es un valor literal en cada llamada
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cargar, mostrarError, descripcionError]);

    return {valor, cargando};
}

export function useEstructuraTabla(tabla:string|undefined):{
    definicion:TableDefinition|null,
    cargando:boolean,
}{
    const conn = useConexion();
    const cargar = React.useMemo(
        () => tabla ? () => traerEstructura(conn, tabla) : null,
        [conn, tabla],
    );
    const {valor, cargando} = useCargaCancelable<TableDefinition|null>(
        cargar,
        null,
        `No se pudo leer la estructura de ${tabla ?? ''}`,
    );
    return {definicion:valor, cargando};
}

export function useDatosReferencial(tabla:string|undefined):{
    filas:Fila[],
    cargando:boolean,
}{
    const conn = useConexion();
    const cargar = React.useMemo(
        () => tabla ? () => traerDatosReferencial(conn, tabla) : null,
        [conn, tabla],
    );
    const {valor, cargando} = useCargaCancelable<Fila[]>(
        cargar,
        [],
        `No se pudieron cargar las opciones de ${tabla ?? ''}`,
    );
    return {filas:valor, cargando};
}
