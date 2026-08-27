import type {FieldDefinition} from 'frontend-plus';

declare module 'frontend-plus' {
    interface FieldDefinition {
        label?:string;
        editable?:boolean;
        isPk?:boolean;
        inTable?:boolean;
        clientSide?:string;
        options?:string[];
        defaultValue?:unknown;
        defaultDbValue?:string;
        sequence?:{name?:string, firstValue?:number};
        referencesFields?:{source:string, target:string}[];
        referencedName?:string;
        referencedAlias?:string;
    }
    interface TableDefinition {
        name?:string;
        elementName?:string;
        title?:string;
        hiddenColumns?:string[];
        nameFields?:string[];
    }
    interface BEAPI {
        table_record_delete:(params:{
            table:string,
            primaryKeyValues:unknown[],
        }) => Promise<Record<string, unknown>>;
    }
}

export type Fila = Record<string, unknown>;

export function nombreDeTipo(typeName:unknown):string{
    return String(typeName ?? 'text').toLowerCase();
}

export function esObligatorio(field:FieldDefinition, primaryKey:string[]):boolean{
    return primaryKey.indexOf(field.name) >= 0 || Boolean(field.isPk) || field.nullable === false;
}

export function esEditable(field:FieldDefinition):boolean{
    return field.editable !== false;
}

export function loCompletaLaBase(field:FieldDefinition):boolean{
    return field.defaultDbValue != null
        || field.defaultValue !== undefined
        || field.sequence != null;
}

export function estaVacio(value:unknown):boolean{
    return value === null
        || value === undefined
        || (typeof value === 'string' && value.trim() === '');
}

export function normalizarValor(value:unknown):unknown{
    if(typeof value === 'string'){
        const recortado = value.trim();
        return recortado === '' ? null : recortado;
    }
    return value;
}

export function mensajeDeError(err:unknown):string{
    if(err instanceof Error){
        return err.message;
    }
    if(typeof err === 'string'){
        return err;
    }
    if(err != null && typeof err === 'object'){
        const posible = (err as {message?:unknown}).message;
        if(typeof posible === 'string'){
            return posible;
        }
    }
    return 'Error desconocido';
}
