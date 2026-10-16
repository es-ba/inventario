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
    armarOrganigrama, aplanar, ancestros, abiertosAlEntrar, coincide, previosDeArea, PREVIOS_SIN_SECTOR, etiquetaDeArea,
} = require(path.join(projectRoot, 'src/client/principal/sectores/organigrama-datos.ts'));
const {filtroDeCelda, hashDeBusqueda, OTROS} = require(path.join(projectRoot, 'src/client/principal/categorias/categorias-datos.ts'));
const {grupoFiltroDesdeTexto} = require(path.join(projectRoot, 'src/common/bienes-agrupar.ts'));

const ESTADOS = [
    {estado: 'BAJA', etiqueta: 'Baja', descripcion: null, orden: null},
    {estado: 'ASIGNADO', etiqueta: 'Asignado', descripcion: null, orden: 1},
    {estado: 'SIN_ASIGNAR', etiqueta: 'Sin asignar', descripcion: null, orden: 2},
];

const SECTORES = [
    {sector: 'DE', sigla: 'DE', nombre_sector: 'Dirección Ejecutiva', pertenece_a: null, activo: true},
    {sector: 'DG', sigla: 'DGE', nombre_sector: 'Dirección General de Estadística', pertenece_a: 'DE', activo: true},
    {sector: 'SOP', sigla: 'SOP', nombre_sector: 'Departamento Soporte Técnico', pertenece_a: 'DG', activo: true},
    {sector: 'ADM', sigla: 'ADM', nombre_sector: 'Administración', pertenece_a: 'DE', activo: true},
    {sector: 'VIE', sigla: 'VIE', nombre_sector: 'Sector viejo', pertenece_a: 'DE', activo: false},
    {sector: 'OLD', sigla: 'OLD', nombre_sector: 'Otro viejo', pertenece_a: 'DE', activo: false},
    {sector: 'X', sigla: 'X', nombre_sector: 'Ciclo X', pertenece_a: 'Y', activo: true},
    {sector: 'Y', sigla: 'Y', nombre_sector: 'Ciclo Y', pertenece_a: 'X', activo: true},
    {sector: 'Z', sigla: 'Z', nombre_sector: 'Cuelga del ciclo', pertenece_a: 'X', activo: true},
    {sector: 'SUELTO', sigla: 'SU', nombre_sector: 'Padre inexistente', pertenece_a: 'NOEXISTE', activo: true},
];

const fila = (sector, estado, cantidad, enUso = 'NO') => ({valores: [sector, estado, enUso], textos: [sector, estado, enUso], cantidad});

const FILAS = [
    fila('DE', 'ASIGNADO', 2),
    fila('DG', 'ASIGNADO', 10, 'SI'),
    fila('DG', 'SIN_ASIGNAR', 3),
    fila('SOP', 'ASIGNADO', 20),
    fila('SOP', 'ASIGNADO', 5, 'SI'),
    fila('VIE', 'SIN_ASIGNAR', 4),
    fila('Z', 'ASIGNADO', 1),
    fila(null, 'SIN_ASIGNAR', 7),
    fila('NUEVO', 'ASIGNADO', 1),
];

const PERSONAS = [{sector: 'DE', personas: '1'}, {sector: 'DG', personas: '4'}, {sector: 'SOP', personas: '6'}];

const armar = (filas = FILAS) => armarOrganigrama(SECTORES, filas, PERSONAS, ESTADOS);
const buscar = (organigrama, sector) => aplanar(organigrama).find((n) => n.sector === sector);

test('la rama suma propios y subsectores en tres niveles, con estados, en uso y personas', () => {
    const o = armar();
    const de = buscar(o, 'DE');
    const dg = buscar(o, 'DG');
    assert.equal(buscar(o, 'SOP').rama.total, 25);
    assert.equal(dg.propios.total, 13);
    assert.equal(dg.rama.total, 38);
    assert.deepEqual(dg.rama.porEstado, {ASIGNADO: 35, SIN_ASIGNAR: 3});
    assert.equal(dg.rama.enUso, 15);
    assert.equal(dg.personasRama, 10);
    assert.equal(de.rama.total, 2 + 38 + 4);
    assert.equal(de.personasRama, 11);
});

test('la suma de las raíces más «Sin sector» es el total', () => {
    const o = armar();
    const raices = o.raices.reduce((t, r) => t + r.rama.total, 0);
    assert.equal(o.sinSector.total, 7);
    assert.equal(raices + o.sinSector.total, FILAS.reduce((t, f) => t + f.cantidad, 0));
    assert.equal(o.total.total, 53);
    assert.equal(buscar(o, 'DE').proporcion, 44 / 53);
});

test('inactivos: con bienes aparecen, sin bienes no', () => {
    const o = armar();
    assert.equal(buscar(o, 'VIE').activo, false);
    assert.equal(buscar(o, 'VIE').rama.total, 4);
    assert.equal(buscar(o, 'OLD'), undefined);
    assert.equal(buscar(o, 'ADM').rama.total, 0);
});

test('un ciclo o un padre inexistente no cuelgan y no pierden bienes', () => {
    const o = armar();
    const raices = o.raices.map((r) => r.sector).sort();
    assert.deepEqual(raices, ['DE', 'NUEVO', 'SUELTO', 'X', 'Y'].sort());
    assert.deepEqual(buscar(o, 'X').hijos.map((h) => h.sector), ['Z']);
    assert.equal(buscar(o, 'X').rama.total, 1);
    assert.equal(buscar(o, 'NUEVO').rama.total, 1);
});

test('las raíces van de mayor a menor y los hijos por sigla', () => {
    const o = armar();
    assert.equal(o.raices[0].sector, 'DE');
    assert.deepEqual(buscar(o, 'DE').hijos.map((h) => h.sigla), ['ADM', 'DGE', 'VIE']);
});

test('un estado sin orden va a «Otros»', () => {
    assert.deepEqual(armar().columnas.map((c) => c.clave), ['ASIGNADO', 'SIN_ASIGNAR']);
    const o = armar([...FILAS, fila('SOP', 'BAJA', 2)]);
    assert.deepEqual(o.columnas.map((c) => c.clave), ['ASIGNADO', 'SIN_ASIGNAR', OTROS]);
    assert.equal(buscar(o, 'DG').rama.porEstado[OTROS], 2);
});

test('buscador, ancestros y ramas abiertas al entrar', () => {
    const o = armar();
    assert.ok(coincide(buscar(o, 'SOP'), 'soporte tecnico'));
    assert.ok(coincide(buscar(o, 'DG'), 'dge'));
    assert.ok(!coincide(buscar(o, 'DG'), 'soporte'));
    assert.deepEqual(ancestros(o, 'SOP'), ['DE', 'DG']);
    assert.deepEqual(ancestros(o, 'DE'), []);
    assert.deepEqual([...abiertosAlEntrar(o)].sort(), ['DE', 'DG', 'X']);
    assert.equal(etiquetaDeArea(buscar(o, 'DG')), 'DGE — Dirección General de Estadística');
});

test('los filtros de un área viajan a la búsqueda y se vuelven a leer igual', () => {
    const o = armar();
    const dg = buscar(o, 'DG');
    const rama = filtroDeCelda({previos: previosDeArea(dg, true), estado: {clave: 'ASIGNADO', etiqueta: 'Asignado'}});
    assert.deepEqual(rama, {
        partes: [{dimension: 'sector_rama', valor: 'DG'}, {dimension: 'estado', valor: 'ASIGNADO'}],
        textos: ['DGE', 'Asignado'],
        etiquetas: ['sector y subsectores', 'estado'],
    });
    const valor = decodeURIComponent(new URLSearchParams(hashDeBusqueda(rama)).get('filtro'));
    assert.deepEqual(grupoFiltroDesdeTexto(valor), rama);
    assert.deepEqual(previosDeArea(dg, false), [{dimension: 'sector', etiqueta: 'sector', valor: 'DG', texto: 'DGE'}]);
    assert.deepEqual(filtroDeCelda({previos: PREVIOS_SIN_SECTOR}).textos, ['Sin sector']);
});

test('el organigrama cuenta comodatos y actas por rama, con la cuarta dimensión', () => {
    const conTipo = (sector, tipo, cantidad) => ({valores: [sector, 'ASIGNADO', 'NO', tipo], textos: [], cantidad});
    const tipos = [{tipo: 'COMODATO', descripcion: 'Comodato', orden: 1}, {tipo: 'NORMAL', descripcion: 'Normal', orden: null}];
    const organigrama = armarOrganigrama(SECTORES, [conTipo('SOP', 'COMODATO', 3), conTipo('DG', 'COMODATO', 2), conTipo('DG', 'NORMAL', 1), conTipo(null, 'COMODATO', 4)],
        PERSONAS, ESTADOS, tipos);
    assert.deepEqual(organigrama.tipos, [{clave: 'COMODATO', etiqueta: 'Comodato'}]);
    assert.equal(buscar(organigrama, 'DG').rama.porTipo.COMODATO, 5);
    assert.equal(buscar(organigrama, 'DG').propios.porTipo.COMODATO, 2);
    assert.equal(buscar(organigrama, 'DE').rama.porTipo.COMODATO, 5);
    assert.equal(organigrama.sinSector.porTipo.COMODATO, 4);
    assert.equal(organigrama.total.porTipo.COMODATO, 9);
    assert.equal(organigrama.total.total, 10);
});
