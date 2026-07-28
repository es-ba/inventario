const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('publishes paged advanced search and CSV export procedures', () => {
    const source = read('src/server/procedures-principal.ts');

    assert.match(source, /action:\s*'bienes_buscar_avanzado'/);
    assert.match(source, /action:\s*'bienes_busqueda_exportar'/);
    assert.match(source, /buildBienesBusquedaQueries/);
    assert.match(source, /parseBienesBusquedaRequest/);
    assert.match(source, /rowsToCsv/);
    assert.match(source, /sqlBienes/);
    assert.match(source, /getPolicies/);
});

test('keeps the legacy attribute filter procedure available', () => {
    const source = read('src/server/procedures-principal.ts');

    assert.match(source, /action:\s*'bienes_filtrar_por_atributos'/);
});

test('exports the bienes base query for advanced search reuse', () => {
    const source = read('src/server/table-bienes.ts');

    assert.match(source, /export\s+(?:const|var)\s+sqlBienes/);
});

test('keeps backend-plus static root metadata while npm start uses the compiler output', () => {
    const packageJson = JSON.parse(read('package.json'));

    assert.equal(
        packageJson.scripts.start,
        'node dist/server/server/server-principal.js',
    );
    assert.equal(packageJson.main, 'dist/server/server-principal.js');
    assert.equal(packageJson.types, 'dist/server/server-principal.d.ts');
});

test('does not include a menu stylesheet that is absent from the client build', () => {
    const source = read('src/server/app-principal.ts');

    assert.doesNotMatch(source, /\{\s*type:\s*'css',\s*file:\s*'menu\.css'\s*\}/);
});
