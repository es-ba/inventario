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

/*
    Convierte los huecos del documento en campos de formulario completables.

    pdfmake no genera AcroForm, y las coordenadas de un hueco metido en medio de un párrafo
    justificado no se conocen hasta después de maquetar. El rodeo: solicitud-documento.ts
    marca cada hueco como un link "campo:<nombre>|<valor>", pdfkit deja una anotación con el
    rectángulo exacto del fragmento, y acá se cambia esa anotación por un campo de texto en
    el mismo lugar.

    El link es un vehículo, no un enlace: al terminar no queda ninguno en el archivo.

    El campo va con fondo opaco y arranca con el valor cargado. Tapar lo que dibujó pdfmake
    es a propósito: si el campo fuera transparente, lo que el usuario escriba se montaría
    sobre el texto de abajo. Como el valor se copia al campo, el documento se ve igual que
    antes mientras nadie lo toque, y las apariencias de los campos también se imprimen.
*/

/** Alto mínimo de un campo: el alto de una línea de texto suele quedar al ras. */
const ALTO_MINIMO = 11;

const CUERPO_CAMPO = 8.5;

/** Con este nombre queda la fuente en el /DA de cada campo; el /DR tiene que usar el mismo. */
const NOMBRE_TIPOGRAFIA = 'Helvetica';

/** Alto de la caja de firma: la rúbrica va arriba de la línea, no encima de ella. */
const ALTO_FIRMA = 34;

export type UbicacionFirma = {pagina:number, rect:{x:number, y:number, ancho:number, alto:number}};

export type ResultadoFormulario = {
    buffer:Buffer,
    /** Dónde quedó la línea de firma, para apoyar ahí el campo de firma digital. */
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

/** El destino de un link: /A << /S /URI /URI (...) >>. */
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

/**
 * Busca los links "campo:" y los saca de las páginas. Devuelve dónde estaba cada uno, en
 * orden de lectura, que es el orden en que hay que crear los campos.
 */
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
                // El destino del link es otro objeto: la anotación sólo lo referencia.
                accion:accion instanceof PDFRef ? accion : null,
            });
        }
        // Se reemplaza la lista entera: quitar de a uno mientras se recorre saltea elementos.
        pagina.node.set(PDFName.of('Annots'), doc.context.obj(sobreviven));
    });
    return huecos;
}

/** Dos rectángulos están en el mismo renglón si sus alturas se pisan. */
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

/**
 * Junta los pedazos de un mismo hueco.
 *
 * pdfmake parte el texto en un fragmento por palabra y pdfkit deja una anotación por
 * fragmento. Así, "Bolivar 1 piso 5" llegaba como cuatro huecos y terminaba en cuatro
 * campos —domicilio, domicilio_2, domicilio_3 y domicilio_4— en vez de uno solo.
 *
 * Se unen los consecutivos del mismo nombre que estén en la misma página y en el mismo
 * renglón, tomando el rectángulo que los abarca. Si el valor cortó de renglón, la segunda
 * parte queda como un campo aparte: un campo no puede ocupar dos líneas.
 *
 * El valor no hace falta reconstruirlo: la marca lo lleva entero en cada pedazo, porque el
 * link se define una vez para todo el fragmento de texto.
 */
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

/**
 * Reemplaza los huecos marcados por campos de texto AcroForm.
 *
 * Un mismo nombre puede aparecer más de una vez en el formulario —el carácter, por
 * ejemplo—; en AcroForm dos campos no pueden llamarse igual, así que a partir del segundo
 * se numera.
 */
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

    /*
        Sacar la anotación de /Annots no la borra del archivo: el objeto sigue registrado y
        se escribe igual, con la marca adentro. Hay que darla de baja del contexto, y con
        ella el objeto /A que guarda la URI —que es donde vive el texto de la marca—.
    */
    for(const hueco of huecos){
        if(hueco.anotacion){
            doc.context.delete(hueco.anotacion);
        }
        if(hueco.accion){
            doc.context.delete(hueco.accion);
        }
    }

    let firma:UbicacionFirma|null = null;

    // Se recorre la lista ya fusionada: la de arriba tenía un pedazo por palabra, y sirvió
    // para dar de baja todas las anotaciones.
    for(const hueco of fusionarHuecos(huecos)){
        // La línea de firma no es un campo de texto: sólo marca dónde va la firma digital.
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
        // Después de addToPage: el cuerpo se guarda en /DA, que recién existe una vez que
        // el campo tiene widget en la página.
        campo.setFontSize(CUERPO_CAMPO);
    }

    // Las apariencias se generan acá y no al guardar: sin esto un visor estricto muestra
    // los campos en blanco aunque tengan valor.
    form.updateFieldAppearances(tipografia);

    /*
        /DR del formulario: cada campo declara en su /DA que escribe con "/Helvetica", pero
        sin este diccionario de recursos el nombre no resuelve a ninguna fuente y el visor
        no sabe con qué dibujar lo que el usuario tipea.
    */
    form.acroForm.dict.set(PDFName.of('DR'), doc.context.obj({
        Font:doc.context.obj({[NOMBRE_TIPOGRAFIA]:tipografia.ref}),
    }));

    return {buffer:Buffer.from(await doc.save({useObjectStreams:false})), firma};
}
