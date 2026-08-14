"use strict";

import {PDFDocument, PDFName, PDFNumber, PDFString} from 'pdf-lib';

import {RECT_CAMPO_FIRMA} from './declaracion-pdf';

/*
    Campo de firma del documento emitido.

    pdfmake dibuja el recuadro pero no genera campos AcroForm, así que el campo donde el
    responsable aplica la firma se agrega acá, sobre las mismas coordenadas que dibuja
    declaracion-pdf.ts (por eso las comparten en RECT_CAMPO_FIRMA).

    /SigFlags 3 = hay campos de firma (1) + sólo anexar (2). El segundo bit le indica al
    visor que guarde con incremental update en vez de reescribir el archivo, que es
    justamente la condición de la que depende la verificación de prefijo al recargar el
    documento firmado.

    Esto corre ANTES de calcular el hash y de guardar: el archivo con el campo es el
    documento emitido, y es contra ése que después se compara el firmado.
*/

export const NOMBRE_CAMPO_FIRMA = 'FirmaResponsable';

/** Agrega un campo de firma vacío en la última página y devuelve el PDF resultante. */
export async function agregarCampoDeFirma(
    pdf:Buffer,
    opts:{nombreCampo?:string} = {},
):Promise<Buffer>{
    const doc = await PDFDocument.load(pdf);
    const paginas = doc.getPages();
    if(!paginas.length){
        throw new Error('El PDF no tiene páginas: no se le puede agregar el campo de firma');
    }
    const ultima = paginas[paginas.length - 1];
    const ctx = doc.context;
    const rect = RECT_CAMPO_FIRMA;

    const widget = ctx.obj({
        Type: PDFName.of('Annot'),
        Subtype: PDFName.of('Widget'),
        FT: PDFName.of('Sig'),
        T: PDFString.of(opts.nombreCampo ?? NOMBRE_CAMPO_FIRMA),
        Rect: ctx.obj([
            rect.x,
            rect.y,
            rect.x + rect.ancho,
            rect.y + rect.alto,
        ]),
        F: PDFNumber.of(4), // imprimible
        P: ultima.ref,
    });
    const widgetRef = ctx.register(widget);
    ultima.node.addAnnot(widgetRef);

    doc.catalog.set(PDFName.of('AcroForm'), ctx.register(ctx.obj({
        Fields: ctx.obj([widgetRef]),
        SigFlags: PDFNumber.of(3),
    })));

    // Sin object streams el archivo queda en la forma más convencional posible, que es
    // con la que mejor se llevan los firmadores.
    return Buffer.from(await doc.save({useObjectStreams:false}));
}
