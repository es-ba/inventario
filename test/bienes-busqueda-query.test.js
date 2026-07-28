const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const queryModulePath = path.join(projectRoot, 'src/server/bienes-busqueda-query.ts');

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

function loadQueryModule() {
    assert.equal(
        fs.existsSync(queryModulePath),
        true,
        'falta implementar src/server/bienes-busqueda-query.ts',
    );
    delete require.cache[queryModulePath];
    return require(queryModulePath);
}

const allowedFields = {
    ficha: {typeName: 'text'},
    detalle: {typeName: 'text'},
    estado: {typeName: 'text'},
    fecha: {typeName: 'date'},
    valor_residual: {typeName: 'decimal'},
};

function request(overrides = {}) {
    return {
        estado: 'todos',
        logicOperator: 'and',
        filters: [],
        quickSearch: '',
        gridFilters: [],
        page: 0,
        pageSize: 25,
        sortModel: [{field: 'ficha', sort: 'asc'}],
        ...overrides,
    };
}

function options(overrides = {}) {
    return {
        baseSql: 'SELECT * FROM bienes',
        visibilitySql: "current_user = 'inventario'",
        allowedFields,
        ...overrides,
    };
}

test('combines attribute filters with EXISTS and AND', () => {
    const {buildBienesBusquedaQueries} = loadQueryModule();
    const result = buildBienesBusquedaQueries(request({
        filters: [
            {source: 'attribute', target: 'color', operator: 'equals', value: 'NEGRO'},
            {source: 'attribute', target: 'memoria', operator: 'contains', value: '16'},
        ],
    }), options());

    assert.match(result.dataSql, /EXISTS\s*\(\s*SELECT 1\s+FROM bien_atributo ba/);
    assert.match(result.dataSql, /ba\.ficha = b\.ficha/);
    assert.match(result.dataSql, /\)\s+AND\s+EXISTS/);
    assert.deepEqual(result.filterValues, ['color', 'NEGRO', 'memoria', '16']);
});

test('combines field and attribute filters with OR', () => {
    const {buildBienesBusquedaQueries} = loadQueryModule();
    const result = buildBienesBusquedaQueries(request({
        logicOperator: 'or',
        filters: [
            {source: 'field', target: 'detalle', operator: 'contains', value: 'notebook'},
            {source: 'attribute', target: 'tipo', operator: 'equals', value: 'PORTATIL'},
        ],
    }), options());

    assert.match(result.dataSql, /ILIKE[\s\S]+\sOR\s+EXISTS/);
    assert.deepEqual(result.filterValues, ['notebook', 'tipo', 'PORTATIL']);
});

test('uses whitelisted sorting and server pagination', () => {
    const {buildBienesBusquedaQueries} = loadQueryModule();
    const result = buildBienesBusquedaQueries(request({
        page: 2,
        pageSize: 50,
        sortModel: [{field: 'fecha', sort: 'desc'}],
    }), options());

    assert.match(result.dataSql, /ORDER BY bf\."fecha" DESC/);
    assert.match(result.dataSql, /bf\."fecha" DESC, bf\."ficha" ASC/);
    assert.match(result.dataSql, /LIMIT \$1 OFFSET \$2/);
    assert.deepEqual(result.dataValues, [50, 100]);
});

test('rejects unknown fields and oversized pages', () => {
    const {buildBienesBusquedaQueries, parseBienesBusquedaRequest} = loadQueryModule();

    assert.throws(
        () => buildBienesBusquedaQueries(request({
            filters: [{source: 'field', target: 'ficha; DROP TABLE bienes', operator: 'equals', value: '1'}],
        }), options()),
        /campo no permitido/i,
    );
    assert.throws(
        () => parseBienesBusquedaRequest(JSON.stringify(request({pageSize: 500}))),
        /tamaño de página/i,
    );
});

test('rejects unknown attributes, incompatible operators and injected sorting', () => {
    const {buildBienesBusquedaQueries} = loadQueryModule();
    const typedOptions = options({
        allowedAttributes: {
            peso: {typeName: 'decimal'},
        },
    });

    assert.throws(
        () => buildBienesBusquedaQueries(request({
            filters: [
                {source: 'attribute', target: 'color; DROP TABLE bienes', operator: 'equals', value: 'negro'},
            ],
        }), typedOptions),
        /atributo no permitido/i,
    );
    assert.throws(
        () => buildBienesBusquedaQueries(request({
            filters: [
                {source: 'attribute', target: 'peso', operator: 'contains', value: '10'},
            ],
        }), typedOptions),
        /no es .*lido/i,
    );
    assert.throws(
        () => buildBienesBusquedaQueries(request({
            sortModel: [{field: 'ficha DESC; DROP TABLE bienes', sort: 'asc'}],
        }), typedOptions),
        /campo de orden no permitido/i,
    );
});

test('builds state, quick-search, grid and typed range filters with parameters', () => {
    const {buildBienesBusquedaQueries} = loadQueryModule();
    const result = buildBienesBusquedaQueries(request({
        estado: 'activo',
        quickSearch: 'notebook',
        filters: [{
            source: 'field',
            target: 'fecha',
            operator: 'between',
            value: '2026-01-01',
            valueTo: '2026-12-31',
        }],
        gridFilters: [{
            source: 'field',
            target: 'valor_residual',
            operator: 'greater_or_equal',
            value: 100,
        }],
    }), options());

    assert.match(result.dataSql, /lower\(coalesce\(b\.estado, ''\)\) <> 'baja'/);
    assert.match(result.dataSql, /b\."fecha" BETWEEN \$1 AND \$2/);
    assert.match(result.dataSql, /b\."valor_residual" >= \$3/);
    assert.match(result.dataSql, /ILIKE '%' \|\| \$4 \|\| '%'/);
    assert.deepEqual(
        result.filterValues,
        ['2026-01-01', '2026-12-31', 100, 'notebook'],
    );
});

test('combines quick-filter terms with AND and columns with OR', () => {
    const {buildBienesBusquedaQueries} = loadQueryModule();
    const result = buildBienesBusquedaQueries(request({
        quickSearch: 'Dell 123',
    }), options());

    assert.match(result.dataSql, /\$1[\s\S]+\$1[\s\S]+\) AND \([\s\S]+\$2[\s\S]+\$2/);
    assert.deepEqual(result.filterValues, ['Dell', '123']);
});

test('guards attribute date casts against invalid calendar values', () => {
    const {buildBienesBusquedaQueries} = loadQueryModule();
    const result = buildBienesBusquedaQueries(request({
        filters: [{
            source: 'attribute',
            target: 'vencimiento',
            operator: 'greater_or_equal',
            value: '2026-01-01',
        }],
    }), options({
        allowedAttributes: {
            vencimiento: {typeName: 'date'},
        },
    }));

    assert.match(result.dataSql, /make_date\(/);
    assert.match(result.dataSql, /interval '1 month - 1 day'/);
    assert.match(
        result.dataSql,
        /WHEN ba\.valor ~ [\s\S]+THEN CASE\s+WHEN substring\(ba\.valor FROM 1 FOR 4\)/,
    );
    assert.match(result.dataSql, /substring\(ba\.valor FROM 9 FOR 2\)::integer <= extract/);
});

test('omits pagination for a full export while preserving safe ordering', () => {
    const {buildBienesBusquedaQueries} = loadQueryModule();
    const result = buildBienesBusquedaQueries(request({
        page: 2,
        pageSize: 100,
        sortModel: [{field: 'detalle', sort: 'desc'}],
    }), options({withoutPagination: true}));

    assert.doesNotMatch(result.dataSql, /\bLIMIT\b|\bOFFSET\b/);
    assert.match(result.dataSql, /ORDER BY bf\."detalle" DESC/);
    assert.deepEqual(result.dataValues, []);
});

test('rejects incomplete filters even when the client is bypassed', () => {
    const {parseBienesBusquedaRequest} = loadQueryModule();

    assert.throws(
        () => parseBienesBusquedaRequest(JSON.stringify(request({
            filters: [{source: 'field', target: 'detalle', operator: 'contains', value: '  '}],
        }))),
        /requiere un valor/i,
    );
    assert.throws(
        () => parseBienesBusquedaRequest(JSON.stringify(request({
            filters: [{
                source: 'field',
                target: 'fecha',
                operator: 'between',
                value: '2026-01-01',
                valueTo: '',
            }],
        }))),
        /requiere dos valores/i,
    );
});

test('exports CSV with quoted values and the full attribute summary', () => {
    const {rowsToCsv} = loadQueryModule();
    const csv = rowsToCsv([
        {
            ficha: 'A-1',
            detalle: 'Monitor, 24"',
            atributos: [
                {atributo: 'color', nombre: 'Color', valor: 'Negro'},
                {atributo: 'puertos', valor: 'HDMI'},
            ],
        },
    ], ['ficha', 'detalle']);

    assert.equal(
        csv,
        '\uFEFFficha;detalle;atributos\r\nA-1;"Monitor, 24""";"Color: Negro | puertos: HDMI"\r\n',
    );
});
