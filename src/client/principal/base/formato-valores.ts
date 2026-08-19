/*
    Formato de valores para mostrar en pantalla.

    backend-plus manda los valores tipados: json4all los reconstruye del otro lado, así
    que una fecha llega como objeto, no como texto. Y ahí está la trampa:

      - los `date` de best-globals extienden Date, así que String() los muestra (feo,
        pero legible);
      - los `datetime` NO extienden Date, y String() sobre ellos devuelve
        literalmente "[object Object]".

    Por eso todo lo que se pinte en una grilla o en un input tiene que pasar por acá y
    no por String() directo.
*/

function dosDigitos(valor:unknown):string{
    return String(valor).padStart(2, '0');
}

/** Los datetime de best-globals exponen sus componentes en `parts`. */
type PartesFechaHora = {
    year:number, month:number, day:number,
    hour?:number, minutes?:number, seconds?:number,
};

function partesDe(value:unknown):PartesFechaHora|null{
    if(value == null || typeof value !== 'object'){
        return null;
    }
    const partes = (value as {parts?:PartesFechaHora}).parts;
    return partes && typeof partes.year === 'number' ? partes : null;
}

function esFechaHora(value:unknown):boolean{
    if(value == null || typeof value !== 'object'){
        return false;
    }
    return Boolean((value as {isRealDateTime?:boolean}).isRealDateTime) || partesDe(value) != null;
}

/** dd/mm/aaaa a partir de un Date (los `date` de best-globals lo son). */
function fechaDeDate(value:Date):string{
    return [
        dosDigitos(value.getDate()),
        dosDigitos(value.getMonth() + 1),
        String(value.getFullYear()),
    ].join('/');
}

/** Normaliza el d/m/aaaa de best-globals a dd/mm/aaaa. */
function normalizarDmy(texto:string):string{
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim());
    return m ? `${dosDigitos(m[1])}/${dosDigitos(m[2])}/${m[3]}` : texto;
}

/**
 * Convierte cualquier valor que mande el backend en algo mostrable.
 * Nunca devuelve "[object Object]".
 */
export function formatearValor(value:unknown):string{
    if(value == null){
        return '';
    }
    if(typeof value === 'boolean'){
        return value ? 'sí' : 'no';
    }
    if(value instanceof Date){
        return Number.isNaN(value.getTime()) ? '' : fechaDeDate(value);
    }
    if(esFechaHora(value)){
        const objeto = value as {toDmy?:()=>string, toHm?:()=>string};
        const partes = partesDe(value);
        const fecha = typeof objeto.toDmy === 'function'
            ? normalizarDmy(objeto.toDmy())
            : partes
                ? `${dosDigitos(partes.day)}/${dosDigitos(partes.month)}/${partes.year}`
                : '';
        const hora = typeof objeto.toHm === 'function'
            ? objeto.toHm()
            : partes && partes.hour != null
                ? `${dosDigitos(partes.hour)}:${dosDigitos(partes.minutes ?? 0)}`
                : '';
        // La medianoche exacta suele ser una fecha sin hora real: no se muestra.
        return hora && hora !== '00:00' ? `${fecha} ${hora}` : fecha;
    }
    if(typeof value === 'object'){
        const objeto = value as {toYmd?:()=>string, toDmy?:()=>string};
        if(typeof objeto.toDmy === 'function'){
            return normalizarDmy(objeto.toDmy());
        }
        if(typeof objeto.toYmd === 'function'){
            return formatearValor(objeto.toYmd());
        }
    }
    const texto = String(value);
    // Texto ISO que llega sin tipar.
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(texto);
    if(iso){
        const fecha = `${iso[3]}/${iso[2]}/${iso[1]}`;
        return iso[4] && `${iso[4]}:${iso[5]}` !== '00:00' ? `${fecha} ${iso[4]}:${iso[5]}` : fecha;
    }
    return texto;
}

/** aaaa-mm-dd para los inputs nativos de tipo date. */
export function aValorFechaInput(value:unknown):string{
    if(value == null || value === ''){
        return '';
    }
    if(value instanceof Date){
        return Number.isNaN(value.getTime())
            ? ''
            : [
                String(value.getFullYear()),
                dosDigitos(value.getMonth() + 1),
                dosDigitos(value.getDate()),
            ].join('-');
    }
    if(typeof value === 'object'){
        const objeto = value as {toYmd?:()=>string};
        if(typeof objeto.toYmd === 'function'){
            return objeto.toYmd();
        }
        const partes = partesDe(value);
        if(partes){
            return `${partes.year}-${dosDigitos(partes.month)}-${dosDigitos(partes.day)}`;
        }
    }
    const texto = String(value).trim();
    const iso = /^(\d{4}-\d{2}-\d{2})/.exec(texto);
    return iso ? iso[1] : texto;
}
