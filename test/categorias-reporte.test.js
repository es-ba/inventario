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
    armarReporte, consultaDelReporte, filtroDeCelda, hashDeBusqueda, csvDelReporte, nombreDelCsv, opcionesDeAgrupado, opcionesDeSectores, OTROS,
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

const fila = (categoria, subcategoria, estado, cantidad, nombre, enUso = 'NO') => ({
    valores: [categoria, subcategoria, estado, enUso],
    textos: [categoria, subcategoria && `${subcategoria} — ${nombre}`, estado, enUso === 'SI' ? 'Sí' : 'No'],
    cantidad,
});

const FILAS = [
    fila('MOV', 'MOV-02', 'ASIGNADO', 50, 'Tablet', 'SI'),
    fila('CMP', 'CMP-02', 'ASIGNADO', 7, 'PC de escritorio'),
    fila('CMP', 'CMP-01', 'ASIGNADO', 6, 'Notebook', 'SI'),
    fila('CMP', 'CMP-01', 'ASIGNADO', 4, 'Notebook'),
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
    assert.equal(reporte.principal[0].cuenta.enUso, 6);
    assert.equal(reporte.principal[0].subcategorias[0].cuenta.enUso, 6);
    assert.equal(reporte.principal[1].cuenta.enUso, 50);
    assert.equal(reporte.aparte[0].cuenta.enUso, 0);
    assert.equal(reporte.totalPrincipal.enUso, 56);
    assert.equal(reporte.total.enUso, 56);
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
    const sector = {dimension: 'sector', valor: '24', texto: 'DGE', etiqueta: 'sector'};
    const persona = {dimension: 'enusode_responsable', valor: '27', texto: 'Pérez, Ana', etiqueta: 'en uso de'};
    assert.deepEqual(filtroDeCelda({previos: [], subcategoria: {valor: 'CMP-01', nombre: 'Notebook'}, estado: {clave: 'SIN_ASIGNAR', etiqueta: 'Sin asignar'}}), {
        partes: [{dimension: 'subcategoria', valor: 'CMP-01'}, {dimension: 'estado', valor: 'SIN_ASIGNAR'}],
        textos: ['Notebook', 'Sin asignar'],
        etiquetas: ['subcategoría', 'estado'],
    });
    assert.deepEqual(filtroDeCelda({previos: [sector, persona], categoria: {valor: null, nombre: 'Sin categoría'}}), {
        partes: [{dimension: 'sector', valor: '24'}, {dimension: 'enusode_responsable', valor: '27'}, {dimension: 'categoria', valor: null}],
        textos: ['DGE', 'Pérez, Ana', '(sin dato)'],
        etiquetas: ['sector', 'en uso de', 'categoría'],
    });
    assert.equal(filtroDeCelda({previos: []}), null);
    assert.deepEqual(filtroDeCelda({previos: [], categoria: {valor: 'CMP', nombre: 'Computadoras'}, enUso: true}), {
        partes: [{dimension: 'categoria', valor: 'CMP'}, {dimension: 'en_uso', valor: 'SI'}],
        textos: ['Computadoras', 'Sí'],
        etiquetas: ['categoría', 'en uso de un responsable'],
    });
    assert.equal(filtroDeCelda({previos: [sector], categoria: {valor: 'CMP', nombre: 'Computadoras'}, estado: {clave: OTROS, etiqueta: 'Otros'}}), null);
});

test('el filtro viaja en la dirección y se vuelve a leer igual', () => {
    const filtro = filtroDeCelda({previos: [], categoria: {valor: 'CMP', nombre: 'Computadoras'}});
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

test('la consulta pide los activos y lleva el sector y la persona', () => {
    assert.deepEqual(consultaDelReporte([]).agruparPor, ['categoria', 'subcategoria', 'estado', 'en_uso']);
    assert.equal(consultaDelReporte([]).estado, 'activo');
    assert.equal(consultaDelReporte([]).grupoFiltro, undefined);
    assert.deepEqual(consultaDelReporte([
        {dimension: 'sector', valor: '24', texto: 'DGE', etiqueta: 'sector'},
        {dimension: 'enusode_responsable', valor: '27', texto: 'Pérez, Ana', etiqueta: 'en uso de'},
    ]).grupoFiltro, [{dimension: 'sector', valor: '24'}, {dimension: 'enusode_responsable', valor: '27'}]);
    assert.deepEqual(consultaDelReporte([], ['enusode_responsable']).agruparPor, ['enusode_responsable']);
});

test('las opciones de «en uso de» salen del agrupado, sin código, sin vacíos y en orden', () => {
    assert.deepEqual(opcionesDeAgrupado([
        {valores: ['31'], textos: ['31 — Zárate, Luis'], cantidad: 2},
        {valores: [null], textos: [null], cantidad: 900},
        {valores: ['27'], textos: ['27 — Pérez, Ana'], cantidad: 5},
    ]), [
        {valor: '27', texto: 'Pérez, Ana', etiqueta: 'Pérez, Ana (5)'},
        {valor: '31', texto: 'Zárate, Luis', etiqueta: 'Zárate, Luis (2)'},
    ]);
});

test('el CSV abre en Excel con acentos y tiene los mismos números', () => {
    const csv = csvDelReporte(armarReporte(FILAS, CATEGORIAS, ESTADOS));
    assert.equal(csv.charCodeAt(0), 0xFEFF);
    const lineas = csv.slice(1).trimEnd().split('\r\n');
    assert.equal(lineas[0], 'Categoría;Subcategoría;Total;En uso de un responsable;Asignado;Sin asignar');
    assert.ok(lineas.includes('Computadoras;Notebook;13;6;10;3'));
    assert.ok(lineas.includes('Dispositivos móviles;Tablet;50;50;50;0'));
    assert.ok(lineas.includes('Sin categoría;(sin dato);4;0;0;4'));
    assert.ok(lineas.includes('Total principal;;74;56;67;7'));
    assert.ok(lineas.includes('Accesorios y componentes;Mouse;20;0;20;0'));
    assert.equal(lineas.at(-1), 'Total general;;94;56;87;7');
    assert.equal(nombreDelCsv([{dimension: 'sector', valor: '2 4', texto: '', etiqueta: ''}], new Date(2026, 9, 5)), 'bienes-por-categoria-2_4-2026-10-05.csv');
    assert.equal(nombreDelCsv([], new Date(2026, 9, 5)), 'bienes-por-categoria-2026-10-05.csv');
});

test('el selector de sectores ofrece sólo los activos, con su responsable', () => {
    assert.deepEqual(opcionesDeSectores([
        {sector: '24', sigla: 'DGE', nombre_sector: 'Dirección General', activo: true, responsables__apellido: 'PEREZ', responsables__nombre: 'Ana'},
        {sector: '9', sigla: 'VIE', nombre_sector: 'Sector viejo', activo: false, responsables__apellido: 'GOMEZ', responsables__nombre: 'Luis'},
        {sector: '31', sigla: 'ABC', nombre_sector: 'Sin jefe', activo: true},
    ]), [
        {valor: '31', texto: 'ABC', etiqueta: 'ABC — Sin jefe'},
        {valor: '24', texto: 'DGE', etiqueta: 'DGE — Dirección General · PEREZ, Ana'},
    ]);
});
