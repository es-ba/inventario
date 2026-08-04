const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
    const fullPath = path.join(projectRoot, relativePath);
    assert.equal(fs.existsSync(fullPath), true, `falta implementar ${relativePath}`);
    return fs.readFileSync(fullPath, 'utf8');
}

test('registra el usuario funcional y recupera el evento exacto del bien', () => {
    const source = read('install/historial_bien_acciones_trg.sql');

    assert.match(source, /get_app_user\(\)/);
    assert.match(source, /current_setting\('backend_plus\._user', true\)/);
    assert.match(source, /'!sistema'/);
    assert.match(source, /usuario_trazabilidad\(\)/);
    assert.doesNotMatch(source, /\bcurrent_user\b/i);
    assert.match(source, /INSERT INTO historial_evento_bien[\s\S]*RETURNING orden INTO v_orden/i);
    assert.doesNotMatch(source, /SELECT max\(orden\)/i);
});

test('permite consultar desde un bien las declaraciones relacionadas', () => {
    const source = read('src/server/table-bienes.ts');

    assert.match(
        source,
        /\{table:'declaraciones_bienes', fields:\['ficha'\],[^}]*label:'Declaraciones'\}/,
    );
});

test('registra altas, modificaciones y bajas de atributos del bien', () => {
    const source = read('install/trazabilidad_atributos_documentacion_trg.sql');

    assert.match(source, /CREATE OR REPLACE FUNCTION registrar_cambio_bien/i);
    assert.match(source, /CREATE TRIGGER bien_atributo_trazabilidad_trg/i);
    assert.match(source, /AFTER INSERT OR UPDATE OR DELETE\s+ON bien_atributo/i);
    assert.match(source, /'atributo_alta'/);
    assert.match(source, /'atributo_modificacion'/);
    assert.match(source, /'atributo_baja'/);
    assert.match(source, /'atributo:'\s*\|\|/);
    assert.match(source, /usuario_trazabilidad\(\)/);
    assert.doesNotMatch(source, /get_app_user\(\)/);
});

test('registra la documentacion directa y la documentacion de solicitudes por bien', () => {
    const source = read('install/trazabilidad_atributos_documentacion_trg.sql');

    assert.match(source, /CREATE TRIGGER adjuntos_bienes_trazabilidad_trg/i);
    assert.match(source, /AFTER INSERT OR UPDATE OR DELETE\s+ON adjuntos_bienes/i);
    assert.match(source, /'documentacion_bien:'\s*\|\|/);

    assert.match(source, /CREATE TRIGGER adjuntos_solicitudes_trazabilidad_trg/i);
    assert.match(source, /AFTER INSERT OR UPDATE OR DELETE\s+ON adjuntos_solicitudes/i);
    assert.match(source, /'documentacion_solicitud:'\s*\|\|/);
    assert.match(source, /FROM movimientos_solicitud_bien/i);

    assert.match(source, /CREATE TRIGGER movimientos_solicitud_bien_documentacion_trg/i);
    assert.match(source, /AFTER INSERT\s+ON movimientos_solicitud_bien/i);
    assert.match(source, /FROM adjuntos_solicitudes/i);
    assert.match(source, /'documentacion_vinculacion'/);
    assert.doesNotMatch(source, /\bmovimientos_bien\b/i);
});

test('registra el script de trazabilidad luego de adaptar las tablas', () => {
    const source = read('src/server/def-config.ts');

    const postAdapt = source.slice(source.indexOf('post-adapt:'));
    assert.match(postAdapt, /trazabilidad_atributos_documentacion_trg\.sql/);
});

test('mantiene opcional el detalle de la solicitud de movimiento', () => {
    const tableSource = read('src/server/table-movimientos_solicitudes.ts');
    const triggerSource = read('install/movimientos_solicitudes_estado_trg.sql');

    assert.match(
        tableSource,
        /\{name:'detalle'\s*, typeName:'text'\s*, nullable:true\}/,
    );
    assert.doesNotMatch(
        triggerSource,
        /detalle[\s\S]{0,160}RAISE EXCEPTION|RAISE EXCEPTION[\s\S]{0,160}detalle/i,
    );
});
