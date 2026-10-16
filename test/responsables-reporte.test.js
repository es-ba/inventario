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
    filasDeResponsables, pasaBusqueda, previosDeResponsable, cantidadDelVinculo, SIN_RESPONSABLE,
} = require(path.join(projectRoot, 'src/client/principal/responsables/responsables-datos.ts'));
const {consultaDelReporte, filtroDeCelda} = require(path.join(projectRoot, 'src/client/principal/categorias/categorias-datos.ts'));

const FILAS = [
    {responsable: '27', responsables__apellido: 'PÉREZ', responsables__nombre: 'Ana', cantidad: '12', cantidad_asignados: '3', cantidad_dependientes: '40', personas_dependientes: '5', sectores: '2', sedes: '1'},
    {responsable: '31', responsables__apellido: 'GOMEZ', responsables__nombre: 'Luis', cantidad: '0', cantidad_asignados: '0', cantidad_dependientes: '0', personas_dependientes: '0', sectores: '0', sedes: '0'},
    {responsable: '(sin asignar)', cantidad: '300', cantidad_asignados: '0', cantidad_dependientes: '0', personas_dependientes: '0', sectores: '0', sedes: '0'},
    {responsable: '44', responsables__apellido: 'ACUÑA', responsables__nombre: 'Jesica', cantidad: '0', cantidad_asignados: '2', cantidad_dependientes: '0', personas_dependientes: '0', sectores: '1', sedes: '1'},
];

test('la lista deja afuera a quien no tiene nada y ordena por bienes a cargo', () => {
    const filas = filasDeResponsables(FILAS);
    assert.deepEqual(filas.map(f => f.nombre), [SIN_RESPONSABLE, 'PÉREZ, Ana', 'ACUÑA, Jesica']);
    assert.deepEqual(filas[1], {
        responsable: '27', nombre: 'PÉREZ, Ana', aCargo: 12, enUso: 3,
        bienesDeSectoresACargo: 40, personasACargo: 5, sectores: 2, sedes: 1,
    });
});

test('la búsqueda ignora acentos y mayúsculas, y busca por nombre o código', () => {
    const [, perez, acuna] = filasDeResponsables(FILAS);
    assert.ok(pasaBusqueda(perez, 'perez'));
    assert.ok(pasaBusqueda(perez, 'ana pérez'));
    assert.ok(pasaBusqueda(acuna, 'acuna'));
    assert.ok(pasaBusqueda(perez, '27'));
    assert.ok(!pasaBusqueda(perez, 'gomez'));
    assert.ok(pasaBusqueda(perez, ''));
});

test('los bienes de una persona se piden por el vínculo elegido', () => {
    const [sin, perez] = filasDeResponsables(FILAS);
    assert.deepEqual(previosDeResponsable(perez, 'cargo'),
        [{dimension: 'responsable_sector', etiqueta: 'responsable del sector', valor: '27', texto: 'PÉREZ, Ana'}]);
    assert.deepEqual(previosDeResponsable(perez, 'uso'),
        [{dimension: 'enusode_responsable', etiqueta: 'en uso de', valor: '27', texto: 'PÉREZ, Ana'}]);
    assert.deepEqual(previosDeResponsable(sin, 'cargo')[0].valor, null);
    assert.deepEqual(consultaDelReporte(previosDeResponsable(perez, 'uso')).grupoFiltro, [{dimension: 'enusode_responsable', valor: '27'}]);
    assert.equal(cantidadDelVinculo(perez, 'cargo'), 12);
    assert.equal(cantidadDelVinculo(perez, 'uso'), 3);
});

test('desde un número, la búsqueda queda filtrada por la persona y la categoría', () => {
    const [sin] = filasDeResponsables(FILAS);
    assert.deepEqual(filtroDeCelda({previos: previosDeResponsable(sin, 'cargo'), categoria: {valor: 'CMP', nombre: 'Computadoras'}}), {
        partes: [{dimension: 'responsable_sector', valor: null}, {dimension: 'categoria', valor: 'CMP'}],
        textos: ['Sin responsable', 'Computadoras'],
        etiquetas: ['responsable del sector', 'categoría'],
    });
});
