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
    const {buffer:conCampos, firma} = await convertirEnFormulario(renderizado);
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
