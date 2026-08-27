"use strict";

import type {TableDefinition} from './types-principal';


export type CambioMasivo = {
    campo:string,
    valor:string|number|boolean|null,
};

export type EdicionMasivaRequest = {
    fichas:string[],
    cambios:CambioMasivo[],
    dryRun?:boolean,
};

export type EdicionMasivaPlan = {
    fichas:string[],
    cambios:CambioMasivo[],
    sqlUpdate:string,
    sqlPrevio:string,
    valores:unknown[],
};

export const TOPE_FICHAS = 500;

export const CAMPOS_BLOQUEADOS:Record<string, string> = {
    ficha:'es la clave del bien',
    activo:'la baja y el alta son actos administrativos con campos propios',
    estado_baja:'depende del circuito de baja',
    motivo_baja:'depende del circuito de baja',
    sector:'se deriva del último movimiento',
    sede:'se deriva del último movimiento',
    espacio:'se deriva del último movimiento',
    responsable:'se deriva del último movimiento',
    enusode:'se deriva del último movimiento',
};

export class ErrorEdicionMasiva extends Error {}

function fallar(mensaje:string):never{
    throw new ErrorEdicionMasiva(mensaje);
}

export function camposEditablesEnLote(definicion:TableDefinition):string[]{
    return definicion.fields
        .filter(field =>
            field.editable !== false
            && !field.clientSide
            && field.inTable !== false
            && !(field.name in CAMPOS_BLOQUEADOS)
        )
        .map(field => field.name);
}

function normalizarFichas(fichas:unknown):string[]{
    if(!Array.isArray(fichas)){
        fallar('No se recibió la lista de bienes a modificar');
    }
    const limpias = fichas
        .map(f => String(f ?? '').trim())
        .filter(f => f !== '');
    const unicas = [...new Set(limpias)];
    if(unicas.length === 0){
        fallar('No hay bienes seleccionados');
    }
    if(unicas.length > TOPE_FICHAS){
        fallar(
            `Se seleccionaron ${unicas.length} bienes y el máximo por edición es ${TOPE_FICHAS}.`
            + ` Acotá la selección y repetí la operación.`
        );
    }
    return unicas;
}

function normalizarCambios(cambios:unknown, definicion:TableDefinition):CambioMasivo[]{
    if(!Array.isArray(cambios) || cambios.length === 0){
        fallar('No se indicó ningún campo para modificar');
    }
    const permitidos = new Set(camposEditablesEnLote(definicion));
    const vistos = new Set<string>();
    return cambios.map((cambio:any) => {
        const campo = String(cambio?.campo ?? '').trim();
        if(campo === ''){
            fallar('Hay un cambio sin campo indicado');
        }
        if(campo in CAMPOS_BLOQUEADOS){
            fallar(`El campo "${campo}" no se puede editar en lote: ${CAMPOS_BLOQUEADOS[campo]}`);
        }
        if(!permitidos.has(campo)){
            fallar(`El campo "${campo}" no existe o no es editable`);
        }
        if(vistos.has(campo)){
            fallar(`El campo "${campo}" está repetido en el pedido`);
        }
        vistos.add(campo);
        if(!('valor' in (cambio ?? {}))){
            fallar(`Falta el valor para el campo "${campo}"`);
        }
        let valor = cambio.valor;
        if(typeof valor === 'string'){
            const recortado = valor.trim();
            valor = recortado === '' ? null : recortado;
        }
        if(valor === undefined){
            valor = null;
        }
        return {campo, valor};
    });
}

export function planificarEdicionMasiva(
    pedido:EdicionMasivaRequest,
    definicion:TableDefinition,
):EdicionMasivaPlan{
    const fichas = normalizarFichas(pedido.fichas);
    const cambios = normalizarCambios(pedido.cambios, definicion);

    const valores:unknown[] = [fichas];
    const asignaciones = cambios.map((cambio, i) => {
        valores.push(cambio.valor);
        return `"${cambio.campo}" = $${i + 2}`;
    });

    const sqlUpdate = `UPDATE bienes SET ${asignaciones.join(', ')}\n`
        + ` WHERE ficha = ANY($1)\n`
        + ` RETURNING ficha`;

    const conteos = cambios.map((cambio, i) =>
        `    count(*) FILTER (WHERE b."${cambio.campo}" IS DISTINCT FROM $${i + 2})`
        + ` AS "cambian_${cambio.campo}"`
    );
    const sqlPrevio = `SELECT count(*) AS alcanzados,\n${conteos.join(',\n')}\n`
        + `  FROM bienes b WHERE b.ficha = ANY($1)`;

    return {fichas, cambios, sqlUpdate, sqlPrevio, valores};
}

export function describirPlan(
    plan:EdicionMasivaPlan,
    alcanzados:number,
    cambianPorCampo:Record<string, number>,
):string{
    const partes = plan.cambios.map(cambio => {
        const cantidad = cambianPorCampo[cambio.campo] ?? 0;
        const destino = cambio.valor === null ? 'vacío' : `"${cambio.valor}"`;
        return `${cambio.campo} → ${destino}: cambian ${cantidad}`;
    });
    const faltantes = plan.fichas.length - alcanzados;
    return `${plan.fichas.length} bienes seleccionados`
        + (faltantes > 0 ? `, ${faltantes} fuera de su alcance` : '')
        + `. ${partes.join(' · ')}`;
}
