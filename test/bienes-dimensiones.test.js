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

const {armarCatalogoDeDimensiones} = require(path.join(projectRoot, 'src/server/bienes-dimensiones.ts'));

const BIENES = {
    name: 'bienes',
    fields: [{name: 'ficha'}, {name: 'grupo'}, {name: 'categoria', title: 'categoría'}, {name: 'subcategoria', title: 'subcategoría'}],
    foreignKeys: [{references: 'grupos', fields: ['grupo']}],
};
const GRUPOS = {name: 'grupos', fields: [{name: 'grupo'}, {name: 'descripcion', isName: true}]};

test('categoría y subcategoría son dimensiones de clasificación que comparan por el código', () => {
    const catalogo = armarCatalogoDeDimensiones(BIENES, (n) => n === 'grupos' ? GRUPOS : undefined, []);
    const claves = catalogo.disponibles.map((d) => d.clave);
    assert.ok(claves.includes('categoria'));
    assert.ok(claves.includes('subcategoria'));
    assert.ok(claves.includes('grupo'));
    assert.equal(catalogo.disponibles.find((d) => d.clave === 'categoria').familia, 'clasificación');
    assert.deepEqual(catalogo.sql.categoria(() => '$1'), {valor: "nullif(btrim(b.categoria), '')", texto: 'b.categoria_texto'});
    assert.deepEqual(catalogo.sql.subcategoria(() => '$1'), {valor: "nullif(btrim(b.subcategoria), '')", texto: 'b.subcategoria_texto'});
});
