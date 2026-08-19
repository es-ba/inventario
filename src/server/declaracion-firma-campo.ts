"use strict";

import {PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFString} from 'pdf-lib';

import {RECT_CAMPO_FIRMA} from './declaracion-pdf';

/*
    Campo de firma del documento emitido.

    pdfmake dibuja el recuadro pero no genera campos AcroForm, así que el campo donde el
    responsable aplica la firma se agrega acá, sobre las mismas coordenadas que dibuja
    declaracion-pdf.ts (por eso las comparten en RECT_CAMPO_FIRMA).

    /SigFlags 1 = hay campos de firma.

    Antes iba en 3, que agrega el bit "sólo anexar" (2). Ese bit describe un documento que
    YA tiene firmas y que por lo tanto no se puede reescribir entero sin invalidarlas. En un
    documento recién emitido, sin ninguna firma puesta, Acrobat lo lee como que el archivo
    ya está cerrado y contesta que la seguridad del documento no permite firmarlo.

    No se pierde nada: el bit era sólo una indicación al visor. Firmar un PDF se hace
    siempre con incremental update —así funciona la firma—, que es lo que necesita la
    verificación de prefijo al recargar el documento firmado. Y cuando el firmador guarda,
    es él quien deja el flag en 3.

    Esto corre ANTES de calcular el hash y de guardar: el archivo con el campo es el
    documento emitido, y es contra ése que después se compara el firmado.
*/

export const NOMBRE_CAMPO_FIRMA = 'FirmaResponsable';

/** Bit 1 de /SigFlags: el documento tiene campos de firma. Sin el bit 2 (sólo anexar). */
export const SIG_FLAGS_HAY_FIRMAS = 1;

export type RectCampoFirma = {x:number, y:number, ancho:number, alto:number};

/**
 * Agrega un campo de firma vacío y devuelve el PDF resultante.
 *
 * Por defecto va en la última página, en las coordenadas que dibuja la declaración. Los
 * documentos de solicitud tienen otra maqueta y pasan las suyas: reusar las de la
 * declaración dejaba el campo contra el pie, lejos de la línea que dice "Firma".
 */
export async function agregarCampoDeFirma(
    pdf:Buffer,
    opts:{nombreCampo?:string, rect?:RectCampoFirma, pagina?:number} = {},
):Promise<Buffer>{
    const doc = await PDFDocument.load(pdf);
    const paginas = doc.getPages();
    if(!paginas.length){
        throw new Error('El PDF no tiene páginas: no se le puede agregar el campo de firma');
    }
    const indice = opts.pagina ?? paginas.length - 1;
    const ultima = paginas[indice] ?? paginas[paginas.length - 1];
    const ctx = doc.context;
    const rect = opts.rect ?? RECT_CAMPO_FIRMA;

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

    /*
        Si el documento ya trae un AcroForm —los de solicitud llegan con sus campos
        completables—, se le agrega el campo de firma en vez de reemplazarlo: pisar el
        diccionario dejaba los campos huérfanos, presentes en la página pero fuera del
        formulario, y el visor no los ofrecía para completar.
    */
    const acroFormExistente = doc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
    if(acroFormExistente){
        const campos = acroFormExistente.lookupMaybe(PDFName.of('Fields'), PDFArray);
        if(campos){
            campos.push(widgetRef);
        }else{
            acroFormExistente.set(PDFName.of('Fields'), ctx.obj([widgetRef]));
        }
        acroFormExistente.set(PDFName.of('SigFlags'), PDFNumber.of(SIG_FLAGS_HAY_FIRMAS));
    }else{
        doc.catalog.set(PDFName.of('AcroForm'), ctx.register(ctx.obj({
            Fields: ctx.obj([widgetRef]),
            SigFlags: PDFNumber.of(SIG_FLAGS_HAY_FIRMAS),
        })));
    }

    // Sin object streams el archivo queda en la forma más convencional posible, que es
    // con la que mejor se llevan los firmadores.
    return Buffer.from(await doc.save({useObjectStreams:false}));
}
