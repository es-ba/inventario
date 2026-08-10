import * as JsBarcode from 'jsbarcode';
import type {EtiquetaCodigoBarra} from '../../common/codigos-barra';
import escudoCiudad from './assets/escudoCiudad.png';
import {esperarImagen} from './esperar-imagen';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

function crearDocumentoBase(printWindow:Window):HTMLElement{
    const document = printWindow.document;
    document.open();
    document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Etiquetas de bienes</title>
<style>
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
.etiquetas {
    display: grid;
    grid-template-columns: repeat(2, 93mm);
    grid-auto-rows: 31mm;
    gap: 3mm 4mm;
}
.etiqueta {
    width: 93mm;
    height: 31mm;
    display: grid;
    grid-template-columns: 20mm 1fr;
    align-items: center;
    gap: 3mm;
    padding: 2mm;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
}
.escudo { display: block; max-width: 20mm; max-height: 20mm; margin: auto; }
.contenido { min-width: 0; text-align: center; }
.barcode { display: block; max-width: 100%; height: auto; margin: 0 auto; }
.detalle {
    display: block;
    margin-top: 1mm;
    overflow: hidden;
    font-size: 9pt;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
</head>
<body><main id="etiquetas" class="etiquetas"></main></body>
</html>`);
    document.close();
    const container = document.getElementById('etiquetas');
    if(container == null){
        throw new Error('No se pudo preparar el documento de impresión.');
    }
    return container;
}

export async function imprimirEtiquetasCodigosBarra(
    etiquetas:readonly EtiquetaCodigoBarra[],
):Promise<void>{
    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if(printWindow == null){
        throw new Error('Ventanas emergentes bloqueadas. Habilitalas para imprimir las etiquetas.');
    }
    printWindow.opener = null;

    try{
        const container = crearDocumentoBase(printWindow);
        const images:HTMLImageElement[] = [];

        etiquetas.forEach(etiqueta => {
            const label = printWindow.document.createElement('section');
            label.className = 'etiqueta';

            const shield = printWindow.document.createElement('img');
            shield.className = 'escudo';
            shield.alt = 'Escudo de la Ciudad';
            shield.src = escudoCiudad;
            images.push(shield);

            const content = printWindow.document.createElement('div');
            content.className = 'contenido';

            const svg = printWindow.document.createElementNS(SVG_NAMESPACE, 'svg');
            svg.classList.add('barcode');
            svg.setAttribute('aria-label', `Código de barras ${etiqueta.ficha}`);
            JsBarcode(svg, etiqueta.valorEAN13, {
                format:'EAN13',
                width:2,
                height:50,
                fontSize:10,
                textMargin:0,
                margin:0,
            });

            const detail = printWindow.document.createElement('span');
            detail.className = 'detalle';
            detail.textContent = etiqueta.detalle;

            content.append(svg, detail);
            label.append(shield, content);
            container.append(label);
        });

        await Promise.all(images.map(esperarImagen));
        await new Promise<void>(resolve => {
            printWindow.requestAnimationFrame(() => resolve());
        });
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }catch(err){
        printWindow.close();
        throw err;
    }
}
