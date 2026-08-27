
function dosDigitos(valor:unknown):string{
    return String(valor).padStart(2, '0');
}

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

function fechaDeDate(value:Date):string{
    return [
        dosDigitos(value.getDate()),
        dosDigitos(value.getMonth() + 1),
        String(value.getFullYear()),
    ].join('/');
}

function normalizarDmy(texto:string):string{
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim());
    return m ? `${dosDigitos(m[1])}/${dosDigitos(m[2])}/${m[3]}` : texto;
}

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
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(texto);
    if(iso){
        const fecha = `${iso[3]}/${iso[2]}/${iso[1]}`;
        return iso[4] && `${iso[4]}:${iso[5]}` !== '00:00' ? `${fecha} ${iso[4]}:${iso[5]}` : fecha;
    }
    return texto;
}

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
