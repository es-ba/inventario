/*
    Ampliación de los tipos de frontend-plus.

    Los tipos que publica frontend-plus son el mínimo común (name, typeName, nullable,
    references, primaryKey). El backend manda bastante más en table_structure, y estas
    pantallas lo usan. Todas las ampliaciones viven acá para no repetirlas en cada
    archivo: al declararlas una vez quedan disponibles en toda la compilación.
*/
// Importar sólo los tipos: un import de valor arrastraría el runtime de frontend-plus
// al bundle, y su require dinámico de íconos rompe la resolución estática de webpack.
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
        referencesFields?:{source:string, target:string}[];
    }
    interface TableDefinition {
        name?:string;
        elementName?:string;
        title?:string;
        hiddenColumns?:string[];
        nameFields?:string[];
    }
}

export type Fila = Record<string, unknown>;

/** El estado 'delete' existe en el backend pero no está en el RecordStatus de frontend-plus. */
export type EstadoRegistro = 'new' | 'update' | 'delete';

/** typeName llega con más variantes de las que declara frontend-plus. */
export function nombreDeTipo(typeName:unknown):string{
    return String(typeName ?? 'text').toLowerCase();
}

/** Un campo es obligatorio si es parte de la PK o si no admite nulos. */
export function esObligatorio(field:FieldDefinition, primaryKey:string[]):boolean{
    return primaryKey.indexOf(field.name) >= 0 || Boolean(field.isPk) || field.nullable === false;
}

export function esEditable(field:FieldDefinition):boolean{
    return field.editable !== false;
}

export function estaVacio(value:unknown):boolean{
    return value === null
        || value === undefined
        || (typeof value === 'string' && value.trim() === '');
}

/** Los textos vacíos viajan como null: es lo que espera el backend. */
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
