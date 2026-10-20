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
    armarArbolDeModelos, aplanarModelos, camposDelReporte, campoDeAtributo, csvDeModelos, dimensionesDeTiposDelCampo, dimensionesDelCampo,
    filtrarArbol, filtroDeCeldaDeModelos, MARCA, SIN_CATEGORIA, SIN_DATO, conjuntosDelReporte, respuestasDelReporte, armarCruce, filtroDeCeldaDeCruce, csvDeCruce,
} = require(path.join(projectRoot, 'src/client/principal/modelos/modelos-datos.ts'));
const {hashDeBusqueda, OTROS} = require(path.join(projectRoot, 'src/client/principal/categorias/categorias-datos.ts'));
const {grupoFiltroDesdeTexto, MAXIMO_DIMENSIONES} = require(path.join(projectRoot, 'src/common/bienes-agrupar.ts'));

const ESTADOS = [
    {estado: 'BAJA', etiqueta: 'Baja', descripcion: null, orden: null},
    {estado: 'ASIGNADO', etiqueta: 'Asignado', descripcion: null, orden: 1},
    {estado: 'SIN_ASIGNAR', etiqueta: 'Sin asignar', descripcion: null, orden: 2},
];
const CATEGORIAS = [
    {categoria: 'COMP', nombre: 'Computadoras', orden: 1, aparte: false},
    {categoria: 'MOB', nombre: 'Mobiliario', orden: 2, aparte: false},
];
const SUBCATEGORIAS = [
    {subcategoria: 'NB', nombre: 'Notebook', categoria: 'COMP'},
    {subcategoria: 'TAB', nombre: 'Tablet', categoria: 'COMP'},
    {subcategoria: 'SIL', nombre: 'Silla', categoria: 'MOB'},
];
const MEMORIA = campoDeAtributo({atributo: 'MEM', nombre: 'Memoria RAM'});
const FUNDA = campoDeAtributo({atributo: 'FUN', nombre: 'Funda'});
const PANTALLA = campoDeAtributo({atributo: 'PAN', nombre: 'Tamaño de pantalla'});
const fila = (valores, cantidad, textos = []) => ({valores, textos, cantidad});
const POR_MARCA = [
    fila(['NB', 'LEN', 'ASIGNADO', 'SI'], 30, [null, 'LEN — Lenovo']),
    fila(['NB', 'LEN', 'SIN_ASIGNAR', 'NO'], 15, [null, 'LEN — Lenovo']),
    fila(['NB', 'HP', 'ASIGNADO', 'NO'], 4, [null, 'HP — Hewlett Packard']),
    fila(['TAB', null, 'ASIGNADO', 'SI'], 80),
    fila(['TAB', null, 'EN_MOVIMIENTO', 'NO'], 2),
    fila(['SIL', null, 'SIN_ASIGNAR', 'NO'], 12),
    fila([null, null, 'ASIGNADO', 'NO'], 3),
];
const POR_PANTALLA = [
    fila(['NB', '14"', 'ASIGNADO', 'SI'], 30),
    fila(['NB', '14"', 'SIN_ASIGNAR', 'NO'], 15),
    fila(['NB', null, 'ASIGNADO', 'NO'], 4),
    fila(['TAB', '10"', 'ASIGNADO', 'SI'], 80),
    fila(['TAB', '10"', 'EN_MOVIMIENTO', 'NO'], 2),
    fila(['SIL', null, 'SIN_ASIGNAR', 'NO'], 12),
    fila([null, null, 'ASIGNADO', 'NO'], 3),
];
const POR_MEMORIA = [
    fila(['TAB', '8 GB', 'ASIGNADO', 'SI'], 60),
    fila(['TAB', '16 GB', 'ASIGNADO', 'SI'], 20),
    fila(['TAB', null, 'EN_MOVIMIENTO', 'NO'], 2),
    fila(['NB', '16 GB', 'ASIGNADO', 'NO'], 20),
    fila(['NB', null, 'ASIGNADO', 'SI'], 14),
    fila(['NB', null, 'SIN_ASIGNAR', 'NO'], 15),
    fila(['SIL', null, 'SIN_ASIGNAR', 'NO'], 12),
    fila([null, null, 'ASIGNADO', 'NO'], 3),
];
const POR_FUNDA = [
    fila(['TAB', null, 'ASIGNADO', 'SI'], 80),
    fila(['TAB', null, 'EN_MOVIMIENTO', 'NO'], 2),
    fila(['NB', null, 'ASIGNADO', 'SI'], 49),
    fila(['SIL', null, 'SIN_ASIGNAR', 'NO'], 12),
    fila([null, null, 'ASIGNADO', 'NO'], 3),
];
const respuesta = (campo, filas, deTipos = []) => ({campo, filas, deTipos});
const RESPUESTAS = [respuesta(MARCA, POR_MARCA), respuesta(PANTALLA, POR_PANTALLA), respuesta(FUNDA, POR_FUNDA), respuesta(MEMORIA, POR_MEMORIA)];

const armar = (respuestas = RESPUESTAS, tipos = []) => armarArbolDeModelos(respuestas, SUBCATEGORIAS, CATEGORIAS, ESTADOS, tipos);
const buscar = (arbol, ...nombres) => nombres.reduce((nodos, nombre) => {
    const encontrado = (Array.isArray(nodos) ? nodos : nodos.hijos).find((nodo) => nodo.nombre === nombre);
    assert.ok(encontrado, `no está ${nombre}`);
    return encontrado;
}, arbol.raices);

test('cada campo pide dos agrupamientos en una sola consulta, dentro de las dimensiones permitidas', () => {
    const campos = camposDelReporte([{atributo: 'MEM', nombre: 'Memoria RAM'}]);
    assert.deepEqual(campos, [MARCA, MEMORIA]);
    for(const campo of campos){
        assert.deepEqual(dimensionesDelCampo(campo), ['subcategoria', campo.dimension, 'estado', 'en_uso']);
        assert.ok(dimensionesDelCampo(campo).length <= MAXIMO_DIMENSIONES);
        assert.deepEqual(dimensionesDeTiposDelCampo(campo), ['subcategoria', campo.dimension, 'tipo_asignacion']);
    }
    const conjuntos = conjuntosDelReporte(campos);
    assert.equal(conjuntos.length, campos.length * 2);
    const respuestas = respuestasDelReporte(campos, conjuntos.map((_conjunto, indice) => [fila([String(indice)], 1)]));
    assert.deepEqual(respuestas.map(({campo, filas, deTipos}) => [campo, filas[0].valores[0], deTipos[0].valores[0]]),
        [[MARCA, '0', '1'], [MEMORIA, '2', '3']]);
});

test('cada subcategoría muestra marca y los atributos con algún dato, en ese orden', () => {
    const arbol = armar();
    assert.deepEqual(buscar(arbol, 'Computadoras', 'Tablet').hijos.map((n) => [n.nivel, n.nombre]),
        [['campo', 'Tamaño de pantalla'], ['campo', 'Memoria RAM']]);
    assert.deepEqual(buscar(arbol, 'Computadoras', 'Notebook').hijos.map((n) => n.nombre), ['Marca', 'Tamaño de pantalla', 'Memoria RAM']);
    assert.deepEqual(buscar(arbol, 'Mobiliario', 'Silla').hijos, []);
});

test('los valores de cada campo suman la subcategoría, con «(sin dato)» al final', () => {
    const arbol = armar();
    const tablet = buscar(arbol, 'Computadoras', 'Tablet');
    assert.equal(tablet.cuenta.total, 82);
    const memoria = buscar(arbol, 'Computadoras', 'Tablet', 'Memoria RAM');
    assert.deepEqual(memoria.hijos.map((n) => [n.nivel, n.nombre, n.cuenta.total]), [['valor', '8 GB', 60], ['valor', '16 GB', 20], ['valor', SIN_DATO, 2]]);
    for(const subcategoria of aplanarModelos(arbol.raices).filter((n) => n.nivel === 'subcategoria')){
        for(const campo of subcategoria.hijos){
            assert.equal(campo.hijos.reduce((total, valor) => total + valor.cuenta.total, 0), subcategoria.cuenta.total, campo.id);
        }
    }
    assert.equal(buscar(arbol, 'Computadoras', 'Notebook', 'Marca', 'Lenovo').cuenta.enUso, 30);
});

test('las categorías y subcategorías se cuentan una sola vez, con los vacíos al final', () => {
    const arbol = armar();
    assert.equal(arbol.total.total, 146);
    assert.deepEqual(arbol.raices.map((n) => [n.nombre, n.cuenta.total]), [['Computadoras', 131], ['Mobiliario', 12], [SIN_CATEGORIA, 3]]);
    assert.deepEqual(buscar(arbol, 'Computadoras').hijos.map((n) => n.nombre), ['Tablet', 'Notebook']);
    assert.equal(buscar(arbol, 'Computadoras').proporcion, 131 / 146);
    assert.deepEqual(arbol.columnas.map((c) => c.clave), ['ASIGNADO', 'SIN_ASIGNAR', OTROS]);
    assert.ok(buscar(arbol, 'Computadoras', 'Notebook', 'Marca', 'Hewlett Packard'));
});

test('el buscador encuentra por atributo o por valor, sin acentos, con sus ancestros abiertos', () => {
    const arbol = armar();
    const valores = (texto) => aplanarModelos(filtrarArbol(arbol.raices, texto).raices).filter((n) => n.nivel === 'valor').map((n) => n.nombre);
    assert.deepEqual(valores('LENÓVO'), ['Lenovo']);
    assert.deepEqual(valores('memoria 16'), ['16 GB', '16 GB']);
    assert.equal(filtrarArbol(arbol.raices, 'lenovo').abiertos.size, 3);
    assert.deepEqual(filtrarArbol(arbol.raices, '  ').raices, arbol.raices);
    assert.deepEqual(filtrarArbol(arbol.raices, 'nada').raices, []);
});

const AREA = {dimension: 'sector_rama', etiqueta: 'sector y subsectores', valor: 'DGE', texto: 'DGE'};
const CATEGORIA = {dimension: 'categoria', etiqueta: 'categoría', valor: 'COMP', texto: 'Computadoras'};
const SUBCATEGORIA = {dimension: 'subcategoria', etiqueta: 'subcategoría', valor: 'TAB', texto: 'Tablet'};
const FILTRO_MEMORIA = {dimension: 'atributo:MEM', etiqueta: 'Memoria RAM', valor: '8 GB', texto: '8 GB'};

test('con área, subcategoría y atributo, la celda «valor + estado» arma 5 partes sin repetir', () => {
    const arbol = armar();
    const diez = buscar(arbol, 'Computadoras', 'Tablet', 'Tamaño de pantalla', '10"');
    const filtro = filtroDeCeldaDeModelos({previos: [AREA, SUBCATEGORIA, FILTRO_MEMORIA], nodo: diez, estado: arbol.columnas[0]});
    assert.deepEqual(filtro.partes, [
        {dimension: 'sector_rama', valor: 'DGE'},
        {dimension: 'subcategoria', valor: 'TAB'},
        {dimension: 'atributo:MEM', valor: '8 GB'},
        {dimension: 'atributo:PAN', valor: '10"'},
        {dimension: 'estado', valor: 'ASIGNADO'},
    ]);
    assert.deepEqual(filtro.etiquetas, ['sector y subsectores', 'subcategoría', 'Memoria RAM', 'Tamaño de pantalla', 'estado']);
    assert.ok(filtro.partes.length <= MAXIMO_DIMENSIONES);
    assert.deepEqual(grupoFiltroDesdeTexto(decodeURIComponent(hashDeBusqueda(filtro).replace('w=principal&filtro=', ''))), filtro);
});

test('el valor de la fila reemplaza al filtro del mismo atributo, y «(sin dato)» filtra por vacío', () => {
    const arbol = armar();
    const ocho = buscar(arbol, 'Computadoras', 'Tablet', 'Memoria RAM', '8 GB');
    assert.deepEqual(filtroDeCeldaDeModelos({previos: [FILTRO_MEMORIA], nodo: ocho}).partes, [
        {dimension: 'atributo:MEM', valor: '8 GB'},
        {dimension: 'subcategoria', valor: 'TAB'},
    ]);
    const sinDato = buscar(arbol, 'Computadoras', 'Tablet', 'Memoria RAM', SIN_DATO);
    assert.deepEqual(filtroDeCeldaDeModelos({previos: [], nodo: sinDato}).partes.at(-1), {dimension: 'atributo:MEM', valor: null});
});

test('la categoría no se repite debajo de ella, el total usa sólo los filtros y «Otros» no lleva a la búsqueda', () => {
    const arbol = armar();
    const computadoras = buscar(arbol, 'Computadoras');
    assert.deepEqual(filtroDeCeldaDeModelos({previos: [CATEGORIA], nodo: computadoras}).partes, [{dimension: 'categoria', valor: 'COMP'}]);
    const lenovo = buscar(arbol, 'Computadoras', 'Notebook', 'Marca', 'Lenovo');
    assert.deepEqual(filtroDeCeldaDeModelos({previos: [CATEGORIA], nodo: lenovo, enUso: true}).partes,
        [{dimension: 'subcategoria', valor: 'NB'}, {dimension: 'marca', valor: 'LEN'}, {dimension: 'en_uso', valor: 'SI'}]);
    assert.deepEqual(filtroDeCeldaDeModelos({previos: [AREA, CATEGORIA]}).partes,
        [{dimension: 'sector_rama', valor: 'DGE'}, {dimension: 'categoria', valor: 'COMP'}]);
    assert.equal(filtroDeCeldaDeModelos({previos: []}), null);
    assert.equal(filtroDeCeldaDeModelos({previos: [], nodo: lenovo, estado: arbol.columnas[2]}), null);
});

test('el CSV tiene BOM y una fila por campo y valor con los mismos números', () => {
    const arbol = armar();
    const csv = csvDeModelos(arbol);
    assert.ok(csv.startsWith('﻿'));
    const lineas = csv.slice(1).trim().split('\r\n');
    assert.equal(lineas[0], 'Categoría;Subcategoría;Campo;Valor;Total;Asignado;Sin asignar;Otros;En uso');
    assert.equal(lineas.length, aplanarModelos(arbol.raices).filter((n) => n.nivel === 'valor').length + 2);
    assert.ok(lineas.includes('Computadoras;Tablet;Memoria RAM;8 GB;60;60;0;0;60'));
    assert.equal(lineas.at(-1), 'Total general;;;;146;117;27;2;110');
});

test('comodatos y actas se suman por valor y una sola vez en la subcategoría', () => {
    const tipos = [{tipo: 'COMODATO', descripcion: 'Comodato', orden: 1}, {tipo: 'ACTA', descripcion: 'Acta', orden: 2}];
    const arbol = armar([
        respuesta(MARCA, POR_MARCA, [fila(['TAB', null, 'COMODATO'], 70), fila(['NB', 'LEN', 'ACTA'], 3, [null, 'LEN — Lenovo'])]),
        respuesta(MEMORIA, POR_MEMORIA, [fila(['TAB', '8 GB', 'COMODATO'], 50), fila(['TAB', null, 'COMODATO'], 20), fila(['NB', null, 'ACTA'], 3)]),
    ], tipos);
    assert.deepEqual(arbol.tipos.map((t) => t.clave), ['COMODATO', 'ACTA']);
    assert.equal(buscar(arbol, 'Computadoras', 'Tablet').cuenta.porTipo.COMODATO, 70);
    assert.equal(buscar(arbol, 'Computadoras', 'Tablet', 'Memoria RAM', '8 GB').cuenta.porTipo.COMODATO, 50);
    assert.equal(arbol.total.porTipo.ACTA, 3);
    const lenovo = buscar(arbol, 'Computadoras', 'Notebook', 'Marca', 'Lenovo');
    assert.deepEqual(filtroDeCeldaDeModelos({previos: [AREA], nodo: lenovo, tipo: arbol.tipos[1]}).partes.at(-1), {dimension: 'tipo_asignacion', valor: 'ACTA'});
    assert.ok(csvDeModelos(arbol).includes(';En uso;Comodato;Acta'));
});

test('las categorías van por su orden del catálogo, no por cantidad, y «Sin categoría» al final', () => {
    const invertidas = [{...CATEGORIAS[0], orden: 2}, {...CATEGORIAS[1], orden: 1}];
    const arbol = armarArbolDeModelos(RESPUESTAS, SUBCATEGORIAS, invertidas, ESTADOS);
    assert.deepEqual(arbol.raices.map((n) => n.nombre), ['Mobiliario', 'Computadoras', SIN_CATEGORIA]);
    const sinOrden = armarArbolDeModelos(RESPUESTAS, SUBCATEGORIAS, [{...CATEGORIAS[0], orden: null}, CATEGORIAS[1]], ESTADOS);
    assert.deepEqual(sinOrden.raices.map((n) => n.nombre), ['Mobiliario', 'Computadoras', SIN_CATEGORIA]);
});

const POR_MEMORIA_SOLA = [
    fila(['NB', '8 GB'], 50, [null, '8 GB']),
    fila(['NB', '16 GB'], 20),
    fila(['NB', '4 GB'], 5),
    fila(['NB', null], 25),
    fila(['TAB', '8 GB'], 10),
    fila(['TAB', '2 GB'], 1),
    fila(['TAB', null], 4),
    fila(['SIL', null], 12),
];

test('el cruce muestra los valores más cargados, junta el resto en «Otros» y deja afuera las subcategorías sin dato', () => {
    const cruce = armarCruce(POR_MEMORIA_SOLA, MEMORIA, SUBCATEGORIAS, CATEGORIAS, 2);
    assert.deepEqual(cruce.columnas.map((c) => c.nombre), ['8 GB', '16 GB']);
    assert.equal(cruce.hayOtros, true);
    assert.deepEqual(cruce.filas.map((f) => [f.nivel, f.nombre, f.cuenta.total]),
        [['categoria', 'Computadoras', 115], ['subcategoria', 'Notebook', 100], ['subcategoria', 'Tablet', 15]]);
    const notebook = cruce.filas[1].cuenta;
    assert.deepEqual([notebook.porValor.get('8 GB'), notebook.porValor.get('16 GB'), notebook.otros, notebook.sinDato], [50, 20, 5, 25]);
    for(const f of cruce.filas){
        const {total, porValor, otros, sinDato} = f.cuenta;
        assert.equal([...porValor.values()].reduce((a, b) => a + b, 0) + otros + sinDato, total, f.nombre);
    }
    assert.equal(cruce.total.total, 115);
    assert.equal(armarCruce(POR_MEMORIA_SOLA, MEMORIA, SUBCATEGORIAS, CATEGORIAS).hayOtros, false);
});

test('las categorías del cruce van por su orden del catálogo', () => {
    const filas = [fila(['SIL', 'Roja'], 3), fila(['NB', '8 GB'], 50)];
    const invertidas = [{...CATEGORIAS[0], orden: 2}, {...CATEGORIAS[1], orden: 1}];
    assert.deepEqual(armarCruce(filas, MEMORIA, SUBCATEGORIAS, invertidas).filas.filter((f) => f.nivel === 'categoria').map((f) => f.nombre),
        ['Mobiliario', 'Computadoras']);
});

test('cada celda del cruce lleva a la búsqueda con la subcategoría o la categoría y el valor, y los filtros de arriba', () => {
    const cruce = armarCruce(POR_MEMORIA_SOLA, MEMORIA, SUBCATEGORIAS, CATEGORIAS);
    const [computadoras, notebook] = cruce.filas;
    const ocho = cruce.columnas[0];
    assert.deepEqual(filtroDeCeldaDeCruce(cruce, [AREA, CATEGORIA], notebook, ocho).partes, [
        {dimension: 'sector_rama', valor: 'DGE'}, {dimension: 'subcategoria', valor: 'NB'}, {dimension: 'atributo:MEM', valor: '8 GB'},
    ]);
    assert.deepEqual(filtroDeCeldaDeCruce(cruce, [], notebook, null).partes, [{dimension: 'subcategoria', valor: 'NB'}]);
    assert.deepEqual(filtroDeCeldaDeCruce(cruce, [], computadoras, ocho).partes,
        [{dimension: 'categoria', valor: 'COMP'}, {dimension: 'atributo:MEM', valor: '8 GB'}]);
    assert.deepEqual(filtroDeCeldaDeCruce(cruce, [CATEGORIA], null, ocho).partes,
        [{dimension: 'categoria', valor: 'COMP'}, {dimension: 'atributo:MEM', valor: '8 GB'}]);
    assert.equal(filtroDeCeldaDeCruce(cruce, [], computadoras, null), null);
    assert.equal(filtroDeCeldaDeCruce(cruce, [], null, null), null);
});

test('el CSV del cruce tiene una fila por subcategoría y el total general', () => {
    const lineas = csvDeCruce(armarCruce(POR_MEMORIA_SOLA, MEMORIA, SUBCATEGORIAS, CATEGORIAS, 2)).slice(1).trim().split('\r\n');
    assert.deepEqual(lineas, [
        'Categoría;Subcategoría;Total;8 GB;16 GB;Otros;(sin dato)',
        'Computadoras;Notebook;100;50;20;5;25',
        'Computadoras;Tablet;15;10;0;1;4',
        'Total general;;115;60;20;6;29',
    ]);
});
