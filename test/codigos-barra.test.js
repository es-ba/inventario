const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');

require.extensions['.ts'] = function transpileTypeScript(module, filename) {
    const source = fs.readFileSync(filename, 'utf8');
    const result = ts.transpileModule(source, {
        compilerOptions: {
            esModuleInterop: true,
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
        },
        fileName: filename,
    });
    module._compile(result.outputText, filename);
};

const { fichaDesdeEAN13, prepararEtiquetasCodigosBarra } = require(path.join(projectRoot, 'src/common/codigos-barra.ts'));

test('lee la ficha de un EAN-13 escaneado', () => {
    assert.equal(fichaDesdeEAN13('0000132447643'), '13244764');
    assert.equal(fichaDesdeEAN13(' 0000132447643 '), '13244764');
});

test('lo que se imprime en la etiqueta se vuelve a leer como la misma ficha', () => {
    for (const ficha of ['1', '1027', '13244764', '103335178', '1126675833']) {
        const [etiqueta] = prepararEtiquetasCodigosBarra([{ ficha, detalle: '' }]);
        const d = etiqueta.valorEAN13.split('').map(Number);
        const verificador = (10 - d.reduce((t, x, i) => t + x * (i % 2 ? 3 : 1), 0) % 10) % 10;
        assert.equal(fichaDesdeEAN13(etiqueta.valorEAN13 + verificador), ficha);
    }
});

test('un verificador inválido no es un EAN', () => {
    assert.equal(fichaDesdeEAN13('0000132447648'), null);
});

test('una ficha tipeada no se confunde con un EAN', () => {
    assert.equal(fichaDesdeEAN13('13244764'), null);
    assert.equal(fichaDesdeEAN13('abc'), null);
    assert.equal(fichaDesdeEAN13(''), null);
    assert.equal(fichaDesdeEAN13(null), null);
});
