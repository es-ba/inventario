const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const queryModulePath = path.join(projectRoot, 'src/server/atributos-opciones-query.ts');

function loadModule() {
    assert.equal(
        fs.existsSync(queryModulePath),
        true,
        'falta implementar src/server/atributos-opciones-query.ts',
    );
    const source = fs.readFileSync(queryModulePath, 'utf8');
    const result = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
        },
    });
    const loadedModule = { exports: {} };
    new Function('module', 'exports', result.outputText)(loadedModule, loadedModule.exports);
    return loadedModule.exports;
}

test('builds a parameterized attribute search limited to 20 options', () => {
    const { buildAtributosOpcionesQuery } = loadModule();
    const result = buildAtributosOpcionesQuery('memo');

    assert.deepEqual(result.values, ['memo']);
    assert.match(result.sql, /atributo ILIKE '%' \|\| \$1 \|\| '%'/);
    assert.match(result.sql, /coalesce\(nombre, ''\) ILIKE '%' \|\| \$1 \|\| '%'/);
    assert.match(result.sql, /ORDER BY[\s\S]+LIMIT 20/);
});

test('builds a value search scoped to one attribute and limited to 20 options', () => {
    const { buildAtributoValoresOpcionesQuery } = loadModule();
    const result = buildAtributoValoresOpcionesQuery('memoria', '16');

    assert.deepEqual(result.values, ['memoria', '16']);
    assert.match(result.sql, /atributo = \$1/);
    assert.match(result.sql, /valor ILIKE '%' \|\| \$2 \|\| '%'/);
    assert.match(result.sql, /ORDER BY orden NULLS LAST, valor[\s\S]+LIMIT 20/);
});

test('rejects value searches without an attribute', () => {
    const { buildAtributoValoresOpcionesQuery } = loadModule();

    assert.throws(
        () => buildAtributoValoresOpcionesQuery('   ', ''),
        /atributo es obligatorio/i,
    );
});

