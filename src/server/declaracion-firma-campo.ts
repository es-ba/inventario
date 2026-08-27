"use strict";

import {PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFString} from 'pdf-lib';

import {RECT_CAMPO_FIRMA} from './declaracion-pdf';


export const NOMBRE_CAMPO_FIRMA = 'FirmaResponsable';

export const SIG_FLAGS_HAY_FIRMAS = 1;

export type RectCampoFirma = {x:number, y:number, ancho:number, alto:number};

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
        F: PDFNumber.of(4),
        P: ultima.ref,
    });
    const widgetRef = ctx.register(widget);
    ultima.node.addAnnot(widgetRef);

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

    return Buffer.from(await doc.save({useObjectStreams:false}));
}
