"use strict";

import {createHash} from 'node:crypto';
import * as fs from 'fs-extra';
import * as path from 'node:path';

import {
    DeclaracionDocParams,
    buildDeclaracionDocDefinition,
    calcularCodigoContenido,
    ordenarBienes,
} from './declaracion-pdf';
import {agregarCampoDeFirma} from './declaracion-firma-campo';

/*
    Render del documento de declaración con pdfmake.

    Separado de declaracion-pdf.ts para que el armado del contenido se pueda testear
    sin depender de pdfmake ni del sistema de archivos.
*/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfmake = require('pdfmake');

const RUTA_LOGO = 'src/client/principal/assets/logoIdecba.png';

let configurado = false;

function rutaFuentes():string{
    return path.join(path.dirname(require.resolve('pdfmake/package.json')), 'fonts', 'Roboto');
}

function configurarPdfmake(){
    if(configurado){
        return;
    }
    const fuentes = rutaFuentes();
    pdfmake.addFonts({
        Roboto:{
            normal:      path.join(fuentes, 'Roboto-Regular.ttf'),
            bold:        path.join(fuentes, 'Roboto-Medium.ttf'),
            italics:     path.join(fuentes, 'Roboto-Italic.ttf'),
            bolditalics: path.join(fuentes, 'Roboto-MediumItalic.ttf'),
        }
    });
    // El contenido del documento sale de la base: no queremos que una URL guardada
    // en un campo dispare una descarga desde el servidor.
    pdfmake.setUrlAccessPolicy(() => false);
    // Sólo se pueden embeber las fuentes y el escudo, nada más del disco.
    const permitidos = [fuentes, path.resolve(RUTA_LOGO)];
    pdfmake.setLocalAccessPolicy((rutaPedida:string) => {
        const resuelta = path.resolve(rutaPedida);
        return permitidos.some(permitido => resuelta.startsWith(permitido));
    });
    configurado = true;
}

/** Devuelve la ruta del logo institucional si está disponible. Su ausencia no debe frenar una emisión. */
export function resolverLogo():string|null{
    const ruta = path.resolve(RUTA_LOGO);
    return fs.existsSync(ruta) ? ruta : null;
}

export type DeclaracionPdfGenerado = {
    buffer:Buffer,
    hashSha256:string,
    codigoContenido:string,
    cantidadBienes:number,
};

/** Genera el PDF de la declaración y el hash del archivo resultante. */
export async function generarDeclaracionPdf(
    params:Omit<DeclaracionDocParams, 'logo'> & {logo?:string|null},
):Promise<DeclaracionPdfGenerado>{
    configurarPdfmake();
    const logo = params.logo === undefined ? resolverLogo() : params.logo;
    const docDefinition = buildDeclaracionDocDefinition({...params, logo});
    const renderizado:Buffer = await pdfmake.createPdf(docDefinition).getBuffer();
    // El campo de firma se agrega antes del hash: el documento emitido es el que ya lo
    // tiene, y es contra ése que se compara el archivo firmado que vuelve.
    const buffer = await agregarCampoDeFirma(renderizado);
    return {
        buffer,
        hashSha256: createHash('sha256').update(buffer).digest('hex'),
        codigoContenido: calcularCodigoContenido(
            params.cabecera,
            params.bienes,
            params.emision.version,
        ),
        cantidadBienes: ordenarBienes(params.bienes).length,
    };
}
