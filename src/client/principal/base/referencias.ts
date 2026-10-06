import type {Connector, FixedFields} from 'frontend-plus';

import type {Fila} from './tipos-tabla';

export function textoDeReferencia(codigo:unknown, ...descripciones:unknown[]):string{
    const texto = descripciones
        .map(parte => String(parte ?? '').trim())
        .filter(parte => parte !== '')
        .join(' ');
    return texto !== '' ? texto : String(codigo ?? '').trim();
}

export function codigo(fila:Fila, campo:string):string{
    return String(fila[campo] ?? '').trim();
}

export type CampoFijo = {fieldName:string, value:unknown, until?:unknown};

export function leerTabla(conn:Connector, tabla:string, fixedFields:CampoFijo[] = []):Promise<Fila[]>{
    return conn.ajax.table_data({
        table:tabla,
        fixedFields:fixedFields as FixedFields,
        paramfun:{},
    }) as unknown as Promise<Fila[]>;
}
