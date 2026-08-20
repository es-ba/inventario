"use strict";

import {TOPE_FICHAS} from './bienes-edicion-masiva';

/*
    Baja de bienes: validación del pedido.

    Módulo puro —entra el pedido, sale lo que hay que ejecutar— para poder probar la parte
    delicada sin base.

    Dar de baja es un acto directo: pone bienes.activo en BAJA y deja asentado el motivo.
    No usa estado_baja: ese referencial existe para un circuito de solicitud y aprobación
    que hoy no está implementado, y llenarlo a medias sería peor que dejarlo vacío.

    Quién y cuándo no se guardan acá: los registra la auditoría, que ya anota cada cambio de
    campo con usuario y fecha.
*/

export const ESTADO_BAJA = 'BAJA';

export class ErrorBaja extends Error {}

export type BajaRequest = {
    fichas:unknown,
    motivo:unknown,
};

export type BajaPlan = {
    fichas:string[],
    motivo:string,
};

function fallar(mensaje:string):never{
    throw new ErrorBaja(mensaje);
}

/** Acepta el arreglo o su JSON, que es como viaja desde el cliente. */
export function normalizarFichas(fichas:unknown):string[]{
    const lista = typeof fichas === 'string' ? JSON.parse(fichas) : fichas;
    if(!Array.isArray(lista)){
        fallar('No se recibió la lista de bienes.');
    }
    const limpias = lista
        .map(ficha => String(ficha ?? '').trim())
        .filter(ficha => ficha !== '');
    const unicas = limpias.filter((ficha, i) => limpias.indexOf(ficha) === i);
    if(unicas.length === 0){
        fallar('No se seleccionó ningún bien.');
    }
    if(unicas.length > TOPE_FICHAS){
        fallar(
            `Se seleccionaron ${unicas.length} bienes y el máximo por baja es ${TOPE_FICHAS}.`
        );
    }
    return unicas;
}

/**
 * Valida el pedido de baja.
 *
 * El motivo es obligatorio: una baja sin motivo no se puede explicar después, y es
 * justamente lo que se le va a preguntar a quien mire el bien dentro de un año. Se valida
 * contra los motivos cargados y no contra una lista fija, porque son datos.
 */
export function planificarBaja(pedido:BajaRequest, motivosValidos:string[]):BajaPlan{
    const fichas = normalizarFichas(pedido.fichas);
    const motivo = String(pedido.motivo ?? '').trim();
    if(motivo === ''){
        fallar('Hay que indicar el motivo de la baja.');
    }
    if(motivosValidos.indexOf(motivo) < 0){
        fallar(`El motivo "${motivo}" no está en la tabla de motivos de baja.`);
    }
    return {fichas, motivo};
}

/** Mensaje del resultado, contando lo que no se tocó porque ya estaba de baja. */
export function describirBaja(pedidas:number, dadasDeBaja:number):string{
    const yaEstaban = pedidas - dadasDeBaja;
    const cuantos = `${dadasDeBaja} ${dadasDeBaja === 1 ? 'bien' : 'bienes'}`;
    if(dadasDeBaja === 0){
        return 'No se dio de baja ningún bien: todos los seleccionados ya estaban de baja.';
    }
    return `Se dieron de baja ${cuantos}.`
        + (yaEstaban > 0 ? ` ${yaEstaban} ya estaban de baja y no se tocaron.` : '');
}
