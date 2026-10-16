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

test('«en uso de un responsable» es una dimensión de sí/no sobre el responsable de uso', () => {
    const catalogo = armarCatalogoDeDimensiones(BIENES, (n) => n === 'grupos' ? GRUPOS : undefined, []);
    const enUso = catalogo.disponibles.find((d) => d.clave === 'en_uso');
    assert.equal(enUso.etiqueta, 'en uso de un responsable');
    const {valor} = catalogo.sql.en_uso(() => '$1');
    assert.match(valor, /CASE WHEN nullif\(btrim\(b\.enusode_responsable\), ''\) IS NULL THEN 'NO' ELSE 'SI' END/);
});

test('«sector y subsectores» filtra por la rama del organigrama y no se ofrece para agrupar', () => {
    const catalogo = armarCatalogoDeDimensiones(BIENES, (n) => n === 'grupos' ? GRUPOS : undefined, []);
    assert.equal(catalogo.disponibles.some((d) => d.clave === 'sector_rama'), false);
    const sql = catalogo.sql.sector_rama(() => '$1');
    assert.equal(sql.filtro('$7::text'), "sector_pertenece(nullif(btrim(b.sector), ''), $7::text)");
    assert.equal(catalogo.sql.sector(() => '$1').filtro, undefined);
});

test('el modelo es una dimensión de clasificación que compara por el texto sin espacios repetidos', () => {
    const conModelo = {...BIENES, fields: [...BIENES.fields, {name: 'modelo'}]};
    const catalogo = armarCatalogoDeDimensiones(conModelo, (n) => n === 'grupos' ? GRUPOS : undefined, []);
    const modelos = catalogo.disponibles.filter((d) => d.clave === 'modelo');
    assert.deepEqual(modelos, [{clave: 'modelo', etiqueta: 'modelo', familia: 'clasificación'}]);
    const modelo = "nullif(regexp_replace(btrim(b.modelo), '\\s+', ' ', 'g'), '')";
    assert.deepEqual(catalogo.sql.modelo(() => '$1'), {valor: modelo, texto: modelo});
});
