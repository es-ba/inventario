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
        defaultDbValue?:string;
        sequence?:{name?:string, firstValue?:number};
        referencesFields?:{source:string, target:string}[];
        /*
            Las columnas <alias>__<campo> que backend-plus agrega por cada foreign key
            vienen con estas dos marcas. Son la única forma de distinguirlas de un campo
            calculado: las dos llegan con inTable:false.
        */
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
        /*
            Borrar es una acción propia, no un table_record_save con status 'delete':
            table_record_save no contempla ese estado y termina leyendo result.command
            sobre un result sin asignar ("Cannot read properties of undefined").
        */
        table_record_delete:(params:{
            table:string,
            primaryKeyValues:unknown[],
        }) => Promise<Record<string, unknown>>;
    }
}

export type Fila = Record<string, unknown>;

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

/**
 * Campos que completa la base: no tiene sentido exigírselos al usuario aunque sean
 * obligatorios. Es el caso de fecha_creacion (current_date), estado (default) o una PK
 * con secuencia: pedirlos deja el botón de guardar apagado sin forma de destrabarlo.
 */
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
