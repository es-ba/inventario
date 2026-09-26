export const TIPOS_DE_EVENTO = ['MOVIMIENTO', 'BAJA', 'CONTROL', 'EGRESO'] as const;

export type TipoDeEvento = typeof TIPOS_DE_EVENTO[number];

export const COLORES_DE_EVENTO = ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info'] as const;

export type ColorDeEvento = typeof COLORES_DE_EVENTO[number];

export type ResumenDeEvento = {
    fecha:string,
    tipo:string,
    grupo:string,
    titulo:string,
    cantidad:number,
};

export const DIAS_MAXIMOS_DEL_RANGO = 62;

function dos(n:number):string{
    return String(n).padStart(2, '0');
}

function aFecha(ymd:string):Date{
    const [anio, mes, dia] = ymd.split('-').map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia));
}

function aYmd(fecha:Date):string{
    return `${fecha.getUTCFullYear()}-${dos(fecha.getUTCMonth() + 1)}-${dos(fecha.getUTCDate())}`;
}

export function hoyYmd(ahora:Date = new Date()):string{
    return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}

export function textoDeFecha(ymd:string, opciones:Intl.DateTimeFormatOptions):string{
    return new Intl.DateTimeFormat('es-AR', {...opciones, timeZone:'UTC'}).format(aFecha(ymd));
}

export function esYmd(texto:unknown):texto is string{
    return typeof texto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(texto) && aYmd(aFecha(texto)) === texto;
}

export function sumarDias(ymd:string, dias:number):string{
    const fecha = aFecha(ymd);
    fecha.setUTCDate(fecha.getUTCDate() + dias);
    return aYmd(fecha);
}

export function diasEntre(desde:string, hasta:string):number{
    return Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / 86400000);
}

export function primerDiaDelMes(ymd:string):string{
    return ymd.slice(0, 8) + '01';
}

export function sumarMeses(ymd:string, meses:number):string{
    const fecha = aFecha(primerDiaDelMes(ymd));
    fecha.setUTCMonth(fecha.getUTCMonth() + meses);
    return aYmd(fecha);
}

export function diasDeLaGrilla(ymd:string):string[]{
    const primero = aFecha(primerDiaDelMes(ymd));
    const desdeLunes = (primero.getUTCDay() + 6) % 7;
    const inicio = sumarDias(aYmd(primero), -desdeLunes);
    return Array.from({length:42}, (_, i) => sumarDias(inicio, i));
}

export function mismoMes(a:string, b:string):boolean{
    return a.slice(0, 7) === b.slice(0, 7);
}

export function agruparPorDia(resumen:ResumenDeEvento[], ordenDeTipo:(tipo:string) => number):Map<string, ResumenDeEvento[]>{
    const porDia = new Map<string, ResumenDeEvento[]>();
    for(const evento of resumen){
        if(!porDia.has(evento.fecha)){
            porDia.set(evento.fecha, []);
        }
        porDia.get(evento.fecha)!.push(evento);
    }
    for(const eventos of porDia.values()){
        eventos.sort((a, b) => ordenDeTipo(a.tipo) - ordenDeTipo(b.tipo) || b.cantidad - a.cantidad || a.titulo.localeCompare(b.titulo));
    }
    return porDia;
}
