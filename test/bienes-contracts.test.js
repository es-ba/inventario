const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const {guarantee} = require('guarantee-type');

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

function load(relativePath) {
    const modulePath = path.join(projectRoot, relativePath);
    delete require.cache[modulePath];
    return require(modulePath);
}

test('defines bienes procedures with one shared public row contract', () => {
    const contracts = load('src/common/contracts.ts');
    const response = {
        rows:[{
            ficha:'1',
            grupo:'1010 — Informática',
            marca:'DELL — Dell',
            rubro:null,
            clase:null,
            cuenta:null,
            responsable:'27 — Pérez, Ana',
            area:null,
            sede:null,
            espacio:null,
            tipo_asignacion:null,
            modalidad_uso:null,
            enusode:null,
            atributos:[],
        }],
        total:1,
    };

    assert.equal(contracts.bienes_buscar_avanzado.procedure, 'bienes_buscar_avanzado');
    assert.equal(contracts.bienes_busqueda_exportar.procedure, 'bienes_busqueda_exportar');
    assert.deepEqual(
        guarantee(contracts.bienes_buscar_avanzado.result, response),
        response,
    );
});

test('keeps SQL alias resolution out of the shared and server module contracts', () => {
    const contracts = load('src/common/contracts.ts');
    const presentation = load('src/server/bienes-presentacion.ts');

    assert.equal('BIENES_PRESENTATION_SQL_FIELDS' in contracts, false);
    assert.equal('BIENES_PRESENTATION_SQL_FIELDS' in presentation, false);
});

