"use strict";

import {
    PDFArray,
    PDFDict,
    PDFDocument,
    PDFHexString,
    PDFName,
    PDFRef,
    PDFString,
    StandardFonts,
    rgb,
} from 'pdf-lib';

import {NOMBRE_HUECO_FIRMA, PREFIJO_CAMPO, partesDeMarca} from './solicitud-documento';


const ALTO_MINIMO = 11;

const CUERPO_CAMPO = 8.5;

const NOMBRE_TIPOGRAFIA = 'Helvetica';

const ALTO_FIRMA = 34;

export type UbicacionFirma = {pagina:number, rect:{x:number, y:number, ancho:number, alto:number}};

export type ResultadoFormulario = {
    buffer:Buffer,
    firma:UbicacionFirma|null,
};

type HuecoDetectado = {
    nombre:string,
    valor:string,
    pagina:number,
    rect:[number, number, number, number],
    anotacion:PDFRef|null,
    accion:PDFRef|null,
};

function textoDe(valor:unknown):string|null{
    if(valor instanceof PDFString || valor instanceof PDFHexString){
        return valor.decodeText();
    }
    return null;
}

function uriDeAnotacion(anotacion:PDFDict):string|null{
    const accion = anotacion.lookupMaybe(PDFName.of('A'), PDFDict);
    if(!accion){
        return null;
    }
    return textoDe(accion.get(PDFName.of('URI')));
}

function rectDe(anotacion:PDFDict):[number, number, number, number]|null{
    const rect = anotacion.lookupMaybe(PDFName.of('Rect'), PDFArray);
    if(!rect || rect.size() < 4){
        return null;
    }
    const numeros = [0, 1, 2, 3]
        .map(i => (rect.lookup(i) as {asNumber?:() => number} | undefined)?.asNumber?.());
    if(numeros.some(n => typeof n !== 'number' || Number.isNaN(n))){
        return null;
    }
    const [x1, y1, x2, y2] = numeros as number[];
    return [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];
}

function extraerHuecos(doc:PDFDocument):HuecoDetectado[]{
    const huecos:HuecoDetectado[] = [];
    doc.getPages().forEach((pagina, indice) => {
        const anotaciones = pagina.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
        if(!anotaciones){
            return;
        }
        const sobreviven:PDFRef[] = [];
        for(let i = 0; i < anotaciones.size(); i++){
            const referencia = anotaciones.get(i);
            const anotacion = anotaciones.lookupMaybe(i, PDFDict);
            const uri = anotacion ? uriDeAnotacion(anotacion) : null;
            const marca = uri != null && uri.startsWith(PREFIJO_CAMPO) ? partesDeMarca(uri) : null;
            const rect = anotacion ? rectDe(anotacion) : null;
            if(!anotacion || !marca || !rect){
                if(referencia instanceof PDFRef){
                    sobreviven.push(referencia);
                }
                continue;
            }
            const accion = anotacion.get(PDFName.of('A'));
            huecos.push({
                nombre:marca.nombre,
                valor:marca.valor,
                pagina:indice,
                rect,
                anotacion:referencia instanceof PDFRef ? referencia : null,
                accion:accion instanceof PDFRef ? accion : null,
            });
        }
        pagina.node.set(PDFName.of('Annots'), doc.context.obj(sobreviven));
    });
    return huecos;
}

function mismaLinea(a:[number, number, number, number], b:[number, number, number, number]):boolean{
    return a[1] < b[3] && b[1] < a[3];
}

function unir(
    a:[number, number, number, number],
    b:[number, number, number, number],
):[number, number, number, number]{
    return [
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.max(a[2], b[2]),
        Math.max(a[3], b[3]),
    ];
}

function fusionarHuecos(huecos:HuecoDetectado[]):HuecoDetectado[]{
    const juntos:HuecoDetectado[] = [];
    for(const hueco of huecos){
        const previo = juntos[juntos.length - 1];
        if(previo
            && previo.nombre === hueco.nombre
            && previo.pagina === hueco.pagina
            && mismaLinea(previo.rect, hueco.rect)
        ){
            previo.rect = unir(previo.rect, hueco.rect);
            continue;
        }
        juntos.push({...hueco});
    }
    return juntos;
}

export async function convertirEnFormulario(pdf:Buffer):Promise<ResultadoFormulario>{
    const doc = await PDFDocument.load(pdf);
    const huecos = extraerHuecos(doc);
    if(huecos.length === 0){
        return {buffer:pdf, firma:null};
    }

    const paginas = doc.getPages();
    const form = doc.getForm();
    const tipografia = await doc.embedFont(StandardFonts.Helvetica);
    const usados = new Map<string, number>();

    for(const hueco of huecos){
        if(hueco.anotacion){
            doc.context.delete(hueco.anotacion);
        }
        if(hueco.accion){
            doc.context.delete(hueco.accion);
        }
    }

    let firma:UbicacionFirma|null = null;

    for(const hueco of fusionarHuecos(huecos)){
        if(hueco.nombre === NOMBRE_HUECO_FIRMA){
            const [x1, y1, x2] = hueco.rect;
            firma = {
                pagina:hueco.pagina,
                rect:{x:x1, y:y1, ancho:x2 - x1, alto:ALTO_FIRMA},
            };
            continue;
        }
        const repeticion = (usados.get(hueco.nombre) ?? 0) + 1;
        usados.set(hueco.nombre, repeticion);
        const nombre = repeticion === 1 ? hueco.nombre : `${hueco.nombre}_${repeticion}`;

        const [x1, y1, x2, y2] = hueco.rect;
        const altoTexto = y2 - y1;
        const alto = Math.max(altoTexto, ALTO_MINIMO);
        const campo = form.createTextField(nombre);
        if(hueco.valor !== ''){
            campo.setText(hueco.valor);
        }
        campo.addToPage(paginas[hueco.pagina], {
            x:x1,
            y:y1 - (alto - altoTexto) / 2,
            width:x2 - x1,
            height:alto,
            font:tipografia,
            borderWidth:0.5,
            borderColor:rgb(0.72, 0.75, 0.8),
            backgroundColor:rgb(1, 1, 1),
        });
        campo.setFontSize(CUERPO_CAMPO);
    }

    form.updateFieldAppearances(tipografia);

    form.acroForm.dict.set(PDFName.of('DR'), doc.context.obj({
        Font:doc.context.obj({[NOMBRE_TIPOGRAFIA]:tipografia.ref}),
    }));

    return {buffer:Buffer.from(await doc.save({useObjectStreams:false})), firma};
}
