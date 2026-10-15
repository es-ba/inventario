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

const {
    armarReporte, consultaDelReporte, filtroDeCelda, hashDeBusqueda, csvDelReporte, nombreDelCsv, OTROS,
} = require(path.join(projectRoot, 'src/client/principal/categorias/categorias-datos.ts'));
const {grupoFiltroDesdeTexto} = require(path.join(projectRoot, 'src/common/bienes-agrupar.ts'));

const CATEGORIAS = [
    {categoria: 'CMP', nombre: 'Computadoras', orden: 1, aparte: false},
    {categoria: 'MOV', nombre: 'Dispositivos móviles', orden: 2, aparte: false},
    {categoria: 'VEH', nombre: 'Vehículos', orden: 3, aparte: false},
    {categoria: 'ACC', nombre: 'Accesorios y componentes', orden: 4, aparte: true},
];

const ESTADOS = [
    {estado: 'BAJA', etiqueta: 'Baja', descripcion: 'Bien dado de baja', orden: null},
    {estado: 'SIN_ASIGNAR', etiqueta: 'Sin asignar', descripcion: 'Sin sector asignado', orden: 2},
    {estado: 'ASIGNADO', etiqueta: 'Asignado', descripcion: 'Ubicado en un sector', orden: 1},
];

const fila = (categoria, subcategoria, estado, cantidad, nombre) => ({
    valores: [categoria, subcategoria, estado],
    textos: [categoria, subcategoria && `${subcategoria} — ${nombre}`, estado],
    cantidad,
});

const FILAS = [
    fila('MOV', 'MOV-02', 'ASIGNADO', 50, 'Tablet'),
    fila('CMP', 'CMP-02', 'ASIGNADO', 7, 'PC de escritorio'),
    fila('CMP', 'CMP-01', 'ASIGNADO', 10, 'Notebook'),
    fila('CMP', 'CMP-01', 'SIN_ASIGNAR', 3, 'Notebook'),
    fila('ACC', 'ACC-01', 'ASIGNADO', 20, 'Mouse'),
    fila(null, null, 'SIN_ASIGNAR', 4),
];

test('ordena por el catálogo, separa las categorías aparte y deja sin categoría al final', () => {
    const reporte = armarReporte(FILAS, CATEGORIAS, ESTADOS);
    assert.deepEqual(reporte.principal.map(f => f.nombre), ['Computadoras', 'Dispositivos móviles', 'Sin categoría']);
    assert.deepEqual(reporte.aparte.map(f => f.nombre), ['Accesorios y componentes']);
    assert.deepEqual(reporte.principal[0].subcategorias.map(s => s.nombre), ['Notebook', 'PC de escritorio']);
});

test('los totales cierran', () => {
    const reporte = armarReporte(FILAS, CATEGORIAS, ESTADOS);
    assert.equal(reporte.principal[0].cuenta.total, 20);
    assert.deepEqual(reporte.principal[0].cuenta.porEstado, {ASIGNADO: 17, SIN_ASIGNAR: 3});
    assert.equal(reporte.totalPrincipal.total, 74);
    assert.equal(reporte.totalAparte.total, 20);
    assert.equal(reporte.total.total, 94);
    assert.equal(reporte.total.total, FILAS.reduce((t, f) => t + f.cantidad, 0));
    for (const categoria of [...reporte.principal, ...reporte.aparte]) {
        assert.equal(categoria.subcategorias.reduce((t, s) => t + s.cuenta.total, 0), categoria.cuenta.total);
    }
});

test('las columnas son los estados con orden; uno sin orden va a «Otros»', () => {
    assert.deepEqual(armarReporte(FILAS, CATEGORIAS, ESTADOS).columnas.map(c => c.clave), ['ASIGNADO', 'SIN_ASIGNAR']);
    const conBaja = armarReporte([...FILAS, fila('CMP', 'CMP-01', 'BAJA', 2, 'Notebook')], CATEGORIAS, ESTADOS);
    assert.deepEqual(conBaja.columnas.map(c => c.clave), ['ASIGNADO', 'SIN_ASIGNAR', OTROS]);
    assert.equal(conBaja.principal[0].cuenta.porEstado[OTROS], 2);
    assert.equal(conBaja.principal[0].cuenta.total, 22);
});

test('una categoría sin bienes no aparece y la barra es relativa al bloque', () => {
    const reporte = armarReporte(FILAS, CATEGORIAS, ESTADOS);
    assert.equal(reporte.principal.some(f => f.categoria === 'VEH'), false);
    assert.equal(reporte.principal[1].proporcion, 1);
    assert.equal(reporte.principal[0].proporcion, 20 / 50);
    assert.equal(reporte.aparte[0].proporcion, 1);
});

test('el filtro de cada celda', () => {
    const sector = {sector: '24', texto: 'DGE'};
    assert.deepEqual(filtroDeCelda({sector: null, subcategoria: {valor: 'CMP-01', nombre: 'Notebook'}, estado: {clave: 'SIN_ASIGNAR', etiqueta: 'Sin asignar'}}), {
        partes: [{dimension: 'subcategoria', valor: 'CMP-01'}, {dimension: 'estado', valor: 'SIN_ASIGNAR'}],
        textos: ['Notebook', 'Sin asignar'],
        etiquetas: ['subcategoría', 'estado'],
    });
    assert.deepEqual(filtroDeCelda({sector, categoria: {valor: null, nombre: 'Sin categoría'}}), {
        partes: [{dimension: 'sector', valor: '24'}, {dimension: 'categoria', valor: null}],
        textos: ['DGE', '(sin dato)'],
        etiquetas: ['sector', 'categoría'],
    });
    assert.equal(filtroDeCelda({sector: null}), null);
    assert.equal(filtroDeCelda({sector, categoria: {valor: 'CMP', nombre: 'Computadoras'}, estado: {clave: OTROS, etiqueta: 'Otros'}}), null);
});

test('el filtro viaja en la dirección y se vuelve a leer igual', () => {
    const filtro = filtroDeCelda({sector: null, categoria: {valor: 'CMP', nombre: 'Computadoras'}});
    const hash = hashDeBusqueda(filtro);
    assert.equal(hashDeBusqueda(null), 'w=principal');
    const valor = decodeURIComponent(new URLSearchParams(hash).get('filtro'));
    assert.deepEqual(grupoFiltroDesdeTexto(valor), filtro);
});

test('un filtro de la dirección inválido se ignora', () => {
    assert.equal(grupoFiltroDesdeTexto(undefined), null);
    assert.equal(grupoFiltroDesdeTexto('{roto'), null);
    assert.equal(grupoFiltroDesdeTexto(JSON.stringify({partes: [], textos: [], etiquetas: []})), null);
    assert.equal(grupoFiltroDesdeTexto(JSON.stringify({partes: [{dimension: 'categoria', valor: 'CMP'}], textos: [], etiquetas: []})), null);
    assert.equal(grupoFiltroDesdeTexto(JSON.stringify({partes: [{dimension: 'categoria', valor: 3}], textos: ['x'], etiquetas: ['y']})), null);
    assert.deepEqual(grupoFiltroDesdeTexto(JSON.stringify({partes: [{dimension: 'categoria', valor: null, otra: 1}], textos: ['x'], etiquetas: ['y']})),
        {partes: [{dimension: 'categoria', valor: null}], textos: ['x'], etiquetas: ['y']});
});

test('la consulta pide los activos y lleva el sector', () => {
    assert.deepEqual(consultaDelReporte(null).agruparPor, ['categoria', 'subcategoria', 'estado']);
    assert.equal(consultaDelReporte(null).estado, 'activo');
    assert.equal(consultaDelReporte(null).grupoFiltro, undefined);
    assert.deepEqual(consultaDelReporte({sector: '24', texto: 'DGE'}).grupoFiltro, [{dimension: 'sector', valor: '24'}]);
});

test('el CSV abre en Excel con acentos y tiene los mismos números', () => {
    const csv = csvDelReporte(armarReporte(FILAS, CATEGORIAS, ESTADOS));
    assert.equal(csv.charCodeAt(0), 0xFEFF);
    const lineas = csv.slice(1).trimEnd().split('\r\n');
    assert.equal(lineas[0], 'Categoría;Subcategoría;Total;Asignado;Sin asignar');
    assert.ok(lineas.includes('Computadoras;Notebook;13;10;3'));
    assert.ok(lineas.includes('Dispositivos móviles;Tablet;50;50;0'));
    assert.ok(lineas.includes('Sin categoría;(sin dato);4;0;4'));
    assert.ok(lineas.includes('Total principal;;74;67;7'));
    assert.ok(lineas.includes('Accesorios y componentes;Mouse;20;20;0'));
    assert.equal(lineas.at(-1), 'Total general;;94;87;7');
    assert.equal(nombreDelCsv({sector: '2 4', texto: ''}, new Date(2026, 9, 5)), 'bienes-por-categoria-2_4-2026-10-05.csv');
    assert.equal(nombreDelCsv(null, new Date(2026, 9, 5)), 'bienes-por-categoria-2026-10-05.csv');
});
