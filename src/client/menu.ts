"use strict";

declare function JsBarcode(element: HTMLElement | SVGElement, data: string, options?: any): void;

function ensureJsBarcodeLoaded(): Promise<void> {
  if (typeof JsBarcode !== 'undefined') {
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load JsBarcode library'));
    document.head.appendChild(script);
  });
}

myOwn.clientSides.codigo_barra = {
    prepare: function() {
        ensureJsBarcodeLoaded().catch(err => {
            console.error('Error loading JsBarcode:', err);
        });
    },
    update: function(depot, fieldName) {
        const ficha = depot.row.ficha;
        const detalle = depot.row.detalle;
        const fieldControl = depot.rowControls[fieldName];

        fieldControl.innerHTML = '';

        const container = document.createElement('div');        
        
        const textDisplay = document.createElement('div');
        container.appendChild(textDisplay);
        
        const barcodeElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        container.appendChild(barcodeElement);
        
        if (ficha) {
            ensureJsBarcodeLoaded()
                .then(() => {
                    JsBarcode(barcodeElement, ficha, {
                        format: 'CODE128',
                        displayValue: true,
                        fontSize: 14,
                        height: 80,
                        margin: 10
                    });
                })
                .catch(err => {
                    console.error('Error generating barcode:', err);
                    textDisplay.textContent += ' (Error generating barcode)';
                });
        }
        
        const printButton = document.createElement('button');
        printButton.textContent = 'Imprimir código';
        
        printButton.addEventListener('click', function() {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                const svgContent = barcodeElement.outerHTML;
                
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>Imprimir Código de Barras</title>
                        <style>
                            body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                            .print-container { text-align: center; padding: 20px; }
                            .detalle { font-size: 16px; margin-bottom: 10px; }
                            svg { max-width: 300px; width: 100%; }
                            @media print {
                                @page { margin: 0; }
                                body { margin: 1cm; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="print-container">
                            <div class="detalle">${detalle}</div>
                            ${svgContent}
                        </div>
                        <script>
                            setTimeout(function() { window.print(); window.close(); }, 500);
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            }
        });
        
        container.appendChild(printButton);
        
        fieldControl.appendChild(container);
    }
};