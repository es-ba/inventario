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

test('registers principal with the SIPER connector pattern', () => {
    const source = read('src/client/ws-principal.tsx');

    assert.match(source, /Connector/);
    assert.match(source, /FixedFields/);
    assert.match(source, /ICON\.Menu/);
    assert.match(source, /renderConnectedAppInventario/);
    assert.match(source, /myOwn\.wScreens\.principal/);
    assert.doesNotMatch(source, /frontend-plus-react/);
});

test('manages a single React 18 root for connected wScreens', () => {
    const source = read('src/client/principal/render-connected-app-inventario.tsx');

    assert.match(source, /createRoot/);
    assert.match(source, /connectedRoot\.unmount/);
    assert.match(source, /normalizeFixedFields/);
    assert.match(source, /conn/);
    assert.match(source, /fixedFields/);
});

test('provides compound field and attribute filters', () => {
    const source = read('src/client/principal/filtros-compuestos.tsx');

    assert.match(source, /logicOperator/);
    assert.match(source, /source:\s*'field'/);
    assert.match(source, /target\?\.source === 'attribute'/);
    assert.match(source, /Autocomplete/);
    assert.match(source, /searchAttributeTargets/);
    assert.match(source, /searchAttributeValues/);
    assert.match(source, /Agregar condici[oó]n/);
    assert.match(source, /between/);
    assert.match(source, /not_empty/);
});

test('uses a server-side MUI Data Grid through conn.ajax', () => {
    const source = read('src/client/principal/busqueda-bienes.tsx');

    assert.match(source, /DataGrid/);
    assert.match(source, /paginationMode="server"/);
    assert.match(source, /sortingMode="server"/);
    assert.match(source, /filterMode="server"/);
    assert.match(source, /filterOperators:supportedGridFilterOperators/);
    assert.match(source, /'=':'equals'/);
    assert.match(source, /doesNotEqual:'not_equals'/);
    assert.match(source, /conn\.ajax\.bienes_buscar_avanzado/);
    assert.match(source, /conn\.ajax\.bienes_busqueda_exportar/);
    assert.match(source, /conn\.ajax\.bienes_atributos_buscar/);
    assert.match(source, /conn\.ajax\.bienes_atributo_valores_buscar/);
    assert.match(source, /conn\.ajax\.table_structure/);
    assert.doesNotMatch(source, /table:'bienes_atributos'/);
    assert.doesNotMatch(source, /table:'bienes_atributo_valores'/);
    assert.match(source, /expandedRowIds/);
    assert.match(source, /getRowHeight/);
    assert.doesNotMatch(source, /getDetailPanelContent/);
    assert.match(source, /myOwn\.gotoAddrParams/);
    assert.match(source, /unmountConnectedAppInventario\(\)/);
    assert.match(source, /gridColumnType/);
    assert.match(source, /Bienes activos/);
    assert.match(source, /Bienes en baja/);
});

test('loads the first page of bienes when Principal opens', () => {
    const source = read('src/client/principal/busqueda-bienes.tsx');

    assert.match(
        source,
        /const \[hasSearched, setHasSearched\] = React\.useState\(true\)/,
    );
});

test('initializes compact density without controlling the toolbar selector', () => {
    const source = read('src/client/principal/busqueda-bienes.tsx');

    assert.doesNotMatch(source, /density="compact"/);
    assert.match(source, /initialState=\{\{[\s\S]*density:\s*'compact'/);
});

test('keeps the selection checkbox out of the columns management panel', () => {
    const source = read('src/client/principal/busqueda-bienes.tsx');

    assert.match(source, /GRID_CHECKBOX_SELECTION_FIELD/);
    assert.match(source, /getTogglableColumns/);
    assert.match(source, /column\.field !== GRID_CHECKBOX_SELECTION_FIELD/);
    assert.match(source, /columnsManagement:\s*\{getTogglableColumns\}/);
});
