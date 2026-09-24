"use strict";

import { GruposPorItem, itemAplica, TipoDeItem, VALORES_SI_NO } from "../common/controles";

export class ErrorControl extends Error{}

export type ItemDelCatalogo = {item:string, tipo_valor:TipoDeItem, activo:boolean};

export type CatalogoDeControl = {
    items:ItemDelCatalogo[],
    opciones:Map<string, Set<string>>,
    gruposPorItem:GruposPorItem,
    grupoDelBien:string|null,
    hoy:string,
};

export type PedidoDeControl = {
    ficha?:unknown,
    fecha?:unknown,
    observacion?:unknown,
    items?:unknown,
};

export type PlanDeControl = {
    ficha:string,
    fecha:string,
    observacion:string|null,
    items:{item:string, valor:string}[],
};

export const DIAS_DE_VIGENCIA_POR_DEFECTO = 365;

function texto(valor:unknown):string{
    return valor == null ? '' : String(valor).trim();
}

function esFechaValida(fecha:string):boolean{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)){
        return false;
    }
    const d = new Date(fecha + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

function leerItems(items:unknown):Record<string, unknown>{
    if(items == null || items === ''){
        return {};
    }
    let valor = items;
    if(typeof valor === 'string'){
        try{
            valor = JSON.parse(valor);
        }catch{
            throw new ErrorControl('Los ítems del control no tienen un formato válido');
        }
    }
    if(typeof valor !== 'object' || valor == null || Array.isArray(valor)){
        throw new ErrorControl('Los ítems del control no tienen un formato válido');
    }
    return valor as Record<string, unknown>;
}

function validarValor(item:ItemDelCatalogo, valor:string, opciones:Map<string, Set<string>>):string{
    switch(item.tipo_valor){
        case 'si_no':{
            const siNo = valor.toUpperCase();
            if(!(VALORES_SI_NO as readonly string[]).includes(siNo)){
                throw new ErrorControl(`El ítem ${item.item} sólo admite SI o NO`);
            }
            return siNo;
        }
        case 'opcion':
            if(!opciones.get(item.item)?.has(valor)){
                throw new ErrorControl(`El valor "${valor}" no es una opción del ítem ${item.item}`);
            }
            return valor;
        case 'texto':
            return valor;
        default:
            throw new ErrorControl(`El ítem ${item.item} tiene un tipo de valor desconocido`);
    }
}

export function planificarControl(pedido:PedidoDeControl, catalogo:CatalogoDeControl):PlanDeControl{
    const ficha = texto(pedido.ficha);
    if(ficha === ''){
        throw new ErrorControl('Falta la ficha del bien');
    }
    const fecha = texto(pedido.fecha) || catalogo.hoy;
    if(!esFechaValida(fecha)){
        throw new ErrorControl('La fecha del control no es válida');
    }
    if(fecha > catalogo.hoy){
        throw new ErrorControl('La fecha del control no puede ser posterior a hoy');
    }
    const porCodigo = new Map(catalogo.items.map(i => [i.item, i]));
    const items:{item:string, valor:string}[] = [];
    for(const [codigo, crudo] of Object.entries(leerItems(pedido.items))){
        const valor = texto(crudo);
        if(valor === ''){
            continue;
        }
        const item = porCodigo.get(codigo);
        if(item == null){
            throw new ErrorControl(`El ítem ${codigo} no existe`);
        }
        if(!item.activo){
            throw new ErrorControl(`El ítem ${codigo} está inactivo`);
        }
        if(!itemAplica(codigo, catalogo.grupoDelBien, catalogo.gruposPorItem)){
            throw new ErrorControl(`El ítem ${codigo} no aplica al grupo del bien`);
        }
        items.push({item:codigo, valor:validarValor(item, valor, catalogo.opciones)});
    }
    const observacion = texto(pedido.observacion);
    return {ficha, fecha, observacion:observacion || null, items};
}

export function diasDeVigencia(config:any):number{
    const dias = Number(config?.inventario?.control?.dias_vigencia);
    return Number.isInteger(dias) && dias > 0 ? dias : DIAS_DE_VIGENCIA_POR_DEFECTO;
}

export const CLASES_PARQUE_TECNOLOGICO = ['4', '6'];

export function condicionParqueTecnologico(alias:string):string{
    return `${alias}.activo`
        + ` AND btrim(coalesce(${alias}.rubro, '')) = '3'`
        + ` AND btrim(coalesce(${alias}.clase, '')) IN (${CLASES_PARQUE_TECNOLOGICO.map(c => `'${c}'`).join(', ')})`;
}

export function condicionControlable(alias:string):string{
    return `${alias}.activo`;
}

export function sqlUltimoControl(alias:string):string{
    return `LEFT JOIN LATERAL (
    SELECT c.fecha
      FROM controles_bien c
     WHERE c.ficha = ${alias}.ficha
     ORDER BY c.fecha DESC, c.control DESC
     LIMIT 1
) uc ON true`;
}

export function sqlSituacionControl(alias:string, fecha:string, dias:number):string{
    return `CASE
        WHEN NOT coalesce(${condicionControlable(alias)}, false) THEN NULL
        WHEN ${fecha} IS NULL THEN 'NUNCA'
        WHEN current_date - ${fecha} > ${Math.trunc(dias)} THEN 'VENCIDO'
        ELSE 'VIGENTE'
    END`;
}
