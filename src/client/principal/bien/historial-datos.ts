import {formatearValor} from '../base/formato-valores';

type Fila = Record<string, unknown>;

export type TipoDeEntrada = 'cambio'|'movimiento'|'control';

export const TIPOS_DE_ENTRADA:{tipo:TipoDeEntrada, etiqueta:string}[] = [
    {tipo:'cambio', etiqueta:'cambios'},
    {tipo:'movimiento', etiqueta:'movimientos'},
    {tipo:'control', etiqueta:'controles'},
];

export type EntradaDeHistorial = {
    clave:string,
    tipo:TipoDeEntrada,
    momento:string,
    fecha:unknown,
    usuario:string,
    titulo:string,
    detalle:string[],
    cambios:Fila[],
};

export type EventoConCambios = {evento:Fila, cambios:Fila[]};

export function agruparCambiosPorEvento(eventos:Fila[], cambios:Fila[]):EventoConCambios[]{
    const porOrden = new Map<string, Fila[]>();
    for(const cambio of cambios){
        const clave = String(cambio.orden);
        porOrden.set(clave, [...(porOrden.get(clave) ?? []), cambio]);
    }
    return [...eventos]
        .sort((a, b) => Number(b.orden) - Number(a.orden))
        .map(evento => ({
            evento,
            cambios:(porOrden.get(String(evento.orden)) ?? [])
                .slice()
                .sort((a, b) => String(a.campo).localeCompare(String(b.campo))),
        }));
}

const RANGO:Record<TipoDeEntrada, number> = {cambio:0, movimiento:1, control:2};

function dos(n:number):string{
    return String(n).padStart(2, '0');
}

export function momentoDe(valor:unknown):string{
    if(valor == null){
        return '';
    }
    if(typeof (valor as {toYmdHms?:unknown}).toYmdHms === 'function'){
        return (valor as {toYmdHms:() => string}).toYmdHms();
    }
    if(valor instanceof Date){
        return Number.isNaN(valor.getTime()) ? '' : `${valor.getFullYear()}-${dos(valor.getMonth() + 1)}-${dos(valor.getDate())}`
            + ` ${dos(valor.getHours())}:${dos(valor.getMinutes())}:${dos(valor.getSeconds())}`;
    }
    const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}(?::\d{2})?))?/.exec(String(valor).trim());
    if(!m){
        return '';
    }
    const hora = m[2] ?? '00:00:00';
    return `${m[1]} ${hora.length === 5 ? hora + ':00' : hora}`;
}

function texto(valor:unknown):string{
    return formatearValor(valor).trim();
}

function unir(...partes:string[]):string{
    return partes.filter(parte => parte !== '').join(' · ');
}

export function momentoDeControl(control:Fila):{momento:string, fecha:unknown}{
    const delControl = momentoDe(control.fecha);
    const deCarga = momentoDe(control.momento);
    return deCarga !== '' && deCarga.slice(0, 10) === delControl.slice(0, 10)
        ? {momento:deCarga, fecha:control.momento}
        : {momento:delControl, fecha:control.fecha};
}

export function tituloDeCambio(evento:Fila, cambios:Fila[]):string{
    const accion = texto(evento.accion).replace(/_/g, ' ');
    if(cambios.length === 1 && cambios[0].campo === '*'){
        return unir(accion, texto(cambios[0].valor_nuevo).toLowerCase());
    }
    const detallables = cambios.filter(c => c.campo !== '*');
    return unir(accion, detallables.length === 0 ? '' : detallables.length === 1 ? '1 campo' : `${detallables.length} campos`);
}

export function detalleDeMovimiento(m:Fila):string[]{
    return [
        texto(m.sector) ? `sector ${texto(m.sector)}` : '',
        texto(m.responsable_nombre) ? `responsable ${texto(m.responsable_nombre)}` : '',
        texto(m.espacio) ? `espacio ${texto(m.espacio)}` : '',
        texto(m.enusode) ? `en uso de ${texto(m.enusode)}` : '',
        m.acta_origen != null ? `solicitud ${texto(m.acta_origen)}` : '',
        texto(m.detalle),
    ].filter(parte => parte !== '');
}

export function armarHistorial({
    eventos,
    movimientos,
    controles,
    descripcionDeItem = item => item,
}:{
    eventos:EventoConCambios[],
    movimientos:Fila[],
    controles:(Fila & {items:Fila[]})[],
    descripcionDeItem?:(item:string) => string,
}):EntradaDeHistorial[]{
    const entradas:(EntradaDeHistorial & {orden:number})[] = [
        ...eventos.map(({evento, cambios}) => ({
            clave:`cambio-${texto(evento.orden)}`,
            tipo:'cambio' as const,
            momento:momentoDe(evento.fecha),
            fecha:evento.fecha,
            usuario:texto(evento.usuario),
            titulo:tituloDeCambio(evento, cambios),
            detalle:evento.motivo ? [texto(evento.motivo)] : [],
            cambios:cambios.filter(c => c.campo !== '*'),
            orden:Number(evento.orden ?? 0),
        })),
        ...movimientos.map(m => ({
            clave:`movimiento-${texto(m.orden)}`,
            tipo:'movimiento' as const,
            momento:momentoDe(m.momento ?? m.fecha_movimiento),
            fecha:m.momento ?? m.fecha_movimiento,
            usuario:texto(m.usuario_creacion),
            titulo:unir('movimiento', texto(m.accion).toLowerCase()),
            detalle:detalleDeMovimiento(m),
            cambios:[],
            orden:Number(m.orden ?? 0),
        })),
        ...controles.map(c => ({
            clave:`control-${texto(c.control)}`,
            tipo:'control' as const,
            ...momentoDeControl(c),
            usuario:texto(c.usuario_creacion),
            titulo:unir('control', c.items.length === 0 ? 'sin ítems' : c.items.length === 1 ? '1 ítem' : `${c.items.length} ítems`),
            detalle:[
                ...c.items.map(i => `${descripcionDeItem(String(i.item))}: ${texto(i.valor).replace(/_/g, ' ').toLowerCase()}`),
                texto(c.observacion),
            ].filter(parte => parte !== ''),
            cambios:[],
            orden:Number(c.control ?? 0),
        })),
    ];
    return entradas
        .sort((a, b) => b.momento.localeCompare(a.momento) || RANGO[a.tipo] - RANGO[b.tipo] || b.orden - a.orden)
        .map(({orden:_orden, ...entrada}) => entrada);
}
