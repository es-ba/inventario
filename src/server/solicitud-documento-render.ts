"use strict";

import {createHash} from 'node:crypto';

import {
    DocumentoParams,
    buildDocumentoSolicitud,
    calcularCodigoContenido,
    ordenarItems,
} from './solicitud-documento';
import {agregarCampoDeFirma} from './declaracion-firma-campo';
import {convertirEnFormulario} from './solicitud-documento-formulario';
import {configurarPdfmake, pdfmake, resolverLogo} from './declaracion-pdf-render';

/*
    Render de los documentos de solicitud (comodato y acta).

    Comparte con las declaraciones la configuración de pdfmake, el logo y el agregado del
    campo de firma AcroForm: es el mismo circuito de emitir, firmar afuera y recargar.
*/

export type DocumentoGenerado = {
    buffer:Buffer,
    hashSha256:string,
    codigoContenido:string,
    cantidadItems:number,
};

export async function generarDocumentoSolicitud(
    params:Omit<DocumentoParams, 'logo'> & {logo?:string|null},
):Promise<DocumentoGenerado>{
    configurarPdfmake();
    const logo = params.logo === undefined ? resolverLogo() : params.logo;
    const docDefinition = buildDocumentoSolicitud({...params, logo});
    const renderizado:Buffer = await pdfmake.createPdf(docDefinition).getBuffer();
    /*
        Primero los campos completables y después el de firma: agregarCampoDeFirma es el que
        marca el AcroForm como "sólo anexar", y eso tiene que quedar al final.

        La conversión además devuelve dónde quedó la línea de firma, que es la única forma
        de ubicar el campo: la maqueta la resuelve pdfmake y cambia con el largo del texto.
    */
    const {buffer:conCampos, firma} = await convertirEnFormulario(renderizado);
    // El campo de firma se agrega antes del hash: el documento emitido es el que ya lo
    // tiene, y es contra ése que se compara el archivo firmado que vuelve.
    const buffer = await agregarCampoDeFirma(conCampos, firma
        ? {rect:firma.rect, pagina:firma.pagina}
        : {});
    return {
        buffer,
        hashSha256:createHash('sha256').update(buffer).digest('hex'),
        codigoContenido:calcularCodigoContenido(
            params.tipo,
            params.cabecera,
            params.items,
            params.emision.version,
        ),
        cantidadItems:ordenarItems(params.items).length,
    };
}
