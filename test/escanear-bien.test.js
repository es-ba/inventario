const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(projectRoot, rel), 'utf8');

test('el lector pide la etiqueta en sus dos formatos, con la cámara trasera, y la apaga al desmontarse', () => {
    const lector = leer('src/client/principal/escanear/lector-de-camara.tsx');
    assert.match(lector, /const FORMATOS = \['ean_13', 'upc_a'\];/);
    assert.match(lector, /new BarcodeDetector\(\{formats:FORMATOS\}\)/);
    assert.match(lector, /getUserMedia\(\{video:\{facingMode:'environment'\}\}\)/);
    assert.match(lector, /return \(\) => \{\s*cancelado = true;\s*window\.clearInterval\(intervalo\);\s*stream\?\.getTracks\(\)\.forEach\(pista => pista\.stop\(\)\);\s*\};/);
    assert.match(lector, /!window\.isSecureContext \|\| navigator\.mediaDevices == null/);
    for (const motivo of ['insegura', 'sin_lector', 'sin_camara', 'sin_permiso']) {
        assert.match(lector, new RegExp(`onSinCamara\\([^)]*'${motivo}'`), `falta avisar ${motivo}`);
    }
});

test('la pantalla lee el bien de bienes por ficha, monta la cámara sólo mientras lee y no escribe nada', () => {
    const pantalla = leer('src/client/principal/escanear/escanear-bien.tsx');
    assert.match(pantalla, /leerTabla\(conn, 'bienes', \[\{fieldName:'ficha', value:ficha\}\]\)/);
    assert.match(pantalla, /estado\.nombre === 'leyendo' && motivo == null\s*\? <>\s*<LectorDeCamara onLeido=\{alLeer\} onSinCamara=\{setMotivo\}\/>/);
    assert.equal(pantalla.match(/<LectorDeCamara/g).length, 1);
    assert.match(pantalla, /<SeccionesDeBien secciones=\{seccionesDeVistaRapida\(estado\.bien, descripcionDeEstado\)\}\/>/);
    assert.match(pantalla, /irA\(`w=principal&ficha=\$\{encodeURIComponent\(String\(estado\.bien\.ficha\)\)\}`\)/);
    assert.match(pantalla, /fichaDesdeCodigoLeido\(texto\) \?\? texto/);
    assert.match(pantalla, /No encontré la ficha \$\{ficha\}\./);
    for (const motivo of ['insegura', 'sin_lector', 'sin_camara', 'sin_permiso']) {
        assert.match(pantalla, new RegExp(`${motivo}:'`), `falta el texto de ${motivo}`);
    }
    const fuentes = pantalla + leer('src/client/principal/escanear/lector-de-camara.tsx') + leer('src/client/ws-escanear.tsx');
    assert.equal(/conn\.ajax|table_record_save|table_record_delete|control_registrar|MoverBienes|useRowEditor/.test(fuentes), false);
});

test('la pantalla de escanear usa el encabezado común y se carga con las demás', () => {
    assert.match(leer('src/client/ws-escanear.tsx'), /myOwn\.wScreens\.escanear = /);
    assert.match(leer('src/client/ws-escanear.tsx'), /<PantallaInventario titulo="Escanear">/);
    assert.match(leer('src/client/ws-principal.tsx'), /import '\.\/ws-escanear';/);
});
