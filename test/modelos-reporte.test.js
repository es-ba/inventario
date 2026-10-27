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
    DIMENSIONES_DE_LA_TABLA, DIMENSIONES_DE_TIPOS_DE_LA_TABLA, MARCA, SIN_CATEGORIA, SIN_DATO, alternarElegido, armarArbolDeModelos, armarFacetas,
    camposDelReporte, campoDeAtributo, csvDeModelos, destinoDeCelda, filtroDeCeldaDeModelos, filtrosDeFacetas, pedidosDeFacetas,
} = require(path.join(projectRoot, 'src/client/principal/modelos/modelos-datos.ts'));
const {OTROS} = require(path.join(projectRoot, 'src/client/principal/categorias/categorias-datos.ts'));
const {filtrosDeListaDesdeTexto, grupoFiltroDesdeTexto, MAXIMO_DIMENSIONES} = require(path.join(projectRoot, 'src/common/bienes-agrupar.ts'));

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
const PANTALLA = campoDeAtributo({atributo: 'PAN', nombre: 'Tamaño de pantalla'});
const fila = (valores, cantidad, textos = []) => ({valores, textos, cantidad});
const POR_ESTADO = [
    fila(['NB', 'ASIGNADO', 'SI'], 30),
    fila(['NB', 'SIN_ASIGNAR', 'NO'], 15),
    fila(['NB', 'ASIGNADO', 'NO'], 4),
    fila(['TAB', 'ASIGNADO', 'SI'], 80),
    fila(['TAB', 'EN_MOVIMIENTO', 'NO'], 2),
    fila(['SIL', 'SIN_ASIGNAR', 'NO'], 12),
    fila([null, 'ASIGNADO', 'NO'], 3),
];
const TIPOS = [{tipo: 'COMODATO', descripcion: 'Comodato', orden: 1}, {tipo: 'ACTA', descripcion: 'Acta', orden: 2}];
const POR_TIPO = [fila(['TAB', 'COMODATO'], 70), fila(['NB', 'ACTA'], 3), fila(['NB', null], 46)];

const armar = (categorias = CATEGORIAS) => armarArbolDeModelos(POR_ESTADO, POR_TIPO, SUBCATEGORIAS, categorias, ESTADOS, TIPOS);
const buscar = (arbol, ...nombres) => nombres.reduce((nodos, nombre) => {
    const encontrado = (Array.isArray(nodos) ? nodos : nodos.hijos).find((nodo) => nodo.nombre === nombre);
    assert.ok(encontrado, `no está ${nombre}`);
    return encontrado;
}, arbol.raices);

const AREA = {dimension: 'sector_rama', etiqueta: 'sector y subsectores', valor: 'DGE', texto: 'DGE'};
const CATEGORIA = {dimension: 'categoria', etiqueta: 'categoría', valor: 'COMP', texto: 'Computadoras'};
const SUBCATEGORIA = {dimension: 'subcategoria', etiqueta: 'subcategoría', valor: 'TAB', texto: 'Tablet'};

test('la tabla sale de dos agrupamientos dentro de las dimensiones permitidas, y los campos son marca y los atributos', () => {
    assert.deepEqual(DIMENSIONES_DE_LA_TABLA, ['subcategoria', 'estado', 'en_uso']);
    assert.deepEqual(DIMENSIONES_DE_TIPOS_DE_LA_TABLA, ['subcategoria', 'tipo_asignacion']);
    assert.deepEqual(camposDelReporte([{atributo: 'MEM', nombre: 'Memoria RAM'}]), [MARCA, MEMORIA]);
});

test('cada categoría trae sus subcategorías de mayor a menor, con los vacíos al final', () => {
    const arbol = armar();
    assert.equal(arbol.total.total, 146);
    assert.deepEqual(arbol.raices.map((n) => [n.nombre, n.cuenta.total]), [['Computadoras', 131], ['Mobiliario', 12], [SIN_CATEGORIA, 3]]);
    assert.deepEqual(buscar(arbol, 'Computadoras').hijos.map((n) => [n.nombre, n.cuenta.total, n.hijos.length]), [['Tablet', 82, 0], ['Notebook', 49, 0]]);
    assert.equal(buscar(arbol, 'Computadoras').proporcion, 131 / 146);
    assert.deepEqual(arbol.columnas.map((c) => c.clave), ['ASIGNADO', 'SIN_ASIGNAR', OTROS]);
    assert.equal(buscar(arbol, 'Computadoras', 'Notebook').cuenta.enUso, 30);
});

test('comodatos y actas se suman en la subcategoría y la categoría, sin contar los que no tienen tipo', () => {
    const arbol = armar();
    assert.deepEqual(arbol.tipos.map((t) => t.clave), ['COMODATO', 'ACTA']);
    assert.equal(buscar(arbol, 'Computadoras', 'Tablet').cuenta.porTipo.COMODATO, 70);
    assert.deepEqual(buscar(arbol, 'Computadoras').cuenta.porTipo, {COMODATO: 70, ACTA: 3});
    assert.equal(arbol.total.porTipo.ACTA, 3);
});

test('las categorías van por su orden del catálogo, no por cantidad, y «Sin categoría» al final', () => {
    assert.deepEqual(armar([{...CATEGORIAS[0], orden: 2}, {...CATEGORIAS[1], orden: 1}]).raices.map((n) => n.nombre),
        ['Mobiliario', 'Computadoras', SIN_CATEGORIA]);
    assert.deepEqual(armar([{...CATEGORIAS[0], orden: null}, CATEGORIAS[1]]).raices.map((n) => n.nombre),
        ['Mobiliario', 'Computadoras', SIN_CATEGORIA]);
});

test('la celda lleva la subcategoría sin repetir la categoría de los filtros, y el estado, en uso o tipo de su columna', () => {
    const arbol = armar();
    const tablet = buscar(arbol, 'Computadoras', 'Tablet');
    const filtro = filtroDeCeldaDeModelos({previos: [AREA, SUBCATEGORIA], nodo: tablet, estado: arbol.columnas[0]});
    assert.deepEqual(filtro.partes, [{dimension: 'sector_rama', valor: 'DGE'}, {dimension: 'subcategoria', valor: 'TAB'}, {dimension: 'estado', valor: 'ASIGNADO'}]);
    assert.deepEqual(filtro.etiquetas, ['sector y subsectores', 'subcategoría', 'estado']);
    assert.deepEqual(filtroDeCeldaDeModelos({previos: [CATEGORIA], nodo: tablet, enUso: true}).partes,
        [{dimension: 'subcategoria', valor: 'TAB'}, {dimension: 'en_uso', valor: 'SI'}]);
    assert.deepEqual(filtroDeCeldaDeModelos({previos: [CATEGORIA], nodo: buscar(arbol, 'Computadoras')}).partes, [{dimension: 'categoria', valor: 'COMP'}]);
    assert.deepEqual(filtroDeCeldaDeModelos({previos: [AREA], nodo: tablet, tipo: arbol.tipos[1]}).partes.at(-1), {dimension: 'tipo_asignacion', valor: 'ACTA'});
    assert.deepEqual(filtroDeCeldaDeModelos({previos: [], nodo: buscar(arbol, SIN_CATEGORIA, '(sin subcategoría)')}).partes,
        [{dimension: 'subcategoria', valor: null}]);
    assert.equal(filtroDeCeldaDeModelos({previos: []}), null);
    assert.equal(filtroDeCeldaDeModelos({previos: [], nodo: tablet, estado: arbol.columnas[2]}), null);
});

test('el CSV tiene BOM y una fila por subcategoría con los mismos números', () => {
    const csv = csvDeModelos(armar());
    assert.ok(csv.startsWith('﻿'));
    const lineas = csv.slice(1).trim().split('\r\n');
    assert.equal(lineas[0], 'Categoría;Subcategoría;Total;Asignado;Sin asignar;Otros;En uso;Comodato;Acta');
    assert.equal(lineas.length, 4 + 2);
    assert.ok(lineas.includes('Computadoras;Tablet;82;80;0;2;80;70;0'));
    assert.equal(lineas.at(-1), 'Total general;;146;117;27;2;110;70;3');
});

const LENOVO = {valor: 'LEN', nombre: 'Lenovo'};
const HP = {valor: 'HP', nombre: 'Hewlett Packard'};
const OCHO = {valor: '8 GB', nombre: '8 GB'};
const CAMPOS = [MARCA, PANTALLA, MEMORIA];

test('tildar dos marcas y una memoria arma un «Es alguno de» por campo, y destildar saca el campo', () => {
    let elegidos = alternarElegido({}, MARCA, LENOVO);
    elegidos = alternarElegido(elegidos, MARCA, HP);
    elegidos = alternarElegido(elegidos, MEMORIA, {...OCHO, cantidad: 60, elegido: false});
    assert.deepEqual(filtrosDeFacetas(CAMPOS, elegidos), [
        {source: 'field', target: 'marca', operator: 'in', value: ['LEN', 'HP'], targetLabel: 'Marca', valueLabels: ['Lenovo', 'Hewlett Packard']},
        {source: 'attribute', target: 'MEM', operator: 'in', value: ['8 GB'], targetLabel: 'Memoria RAM', valueLabels: ['8 GB']},
    ]);
    assert.deepEqual(Object.keys(alternarElegido(alternarElegido(elegidos, MARCA, LENOVO), MARCA, HP)), [MEMORIA.dimension]);
});

test('cada faceta elegida se cuenta sin su propio filtro y las demás van juntas con todos', () => {
    const elegidos = {marca: [LENOVO], [MEMORIA.dimension]: [OCHO]};
    const pedidos = pedidosDeFacetas(CAMPOS, elegidos);
    assert.deepEqual(pedidos.map(pedido => [pedido.campos.map(campo => campo.dimension), pedido.filtros.map(filtro => filtro.target)]), [
        [[PANTALLA.dimension], ['marca', 'MEM']],
        [['marca'], ['MEM']],
        [[MEMORIA.dimension], ['marca']],
    ]);
    assert.deepEqual(pedidosDeFacetas(CAMPOS, {}).map(pedido => pedido.campos.length), [3]);
});

test('las facetas muestran cada valor con su cantidad, «(sin dato)» al final y los elegidos aunque ya no estén', () => {
    const filas = new Map([
        ['marca', [fila(['HP'], 4, ['HP — Hewlett Packard']), fila([null], 99), fila(['LEN'], 45, ['LEN — Lenovo'])]],
        [PANTALLA.dimension, [fila([null], 150)]],
        [MEMORIA.dimension, [fila(['16 GB'], 40)]],
    ]);
    const facetas = armarFacetas(CAMPOS, filas, {[MEMORIA.dimension]: [OCHO]});
    assert.deepEqual(facetas.map(faceta => faceta.campo.etiqueta), ['Marca', 'Memoria RAM']);
    assert.deepEqual(facetas[0].valores.map(({nombre, cantidad}) => [nombre, cantidad]), [['Lenovo', 45], ['Hewlett Packard', 4], [SIN_DATO, 99]]);
    assert.deepEqual(facetas[1].valores.map(({valor, cantidad, elegido}) => [valor, cantidad, elegido]), [['16 GB', 40, false], ['8 GB', 0, true]]);
});

test('las facetas llegan enteras a la búsqueda como filtros de lista, sin sumar partes al grupo', () => {
    const arbol = armar();
    const tablet = buscar(arbol, 'Computadoras', 'Tablet');
    const filtros = filtrosDeFacetas(CAMPOS, {marca: [LENOVO, HP], [MEMORIA.dimension]: [OCHO, {valor: null, nombre: SIN_DATO}]});
    const destino = destinoDeCelda({previos: [AREA, SUBCATEGORIA], filtros, nodo: tablet, estado: arbol.columnas[0], enUso: true, tipo: arbol.tipos[0]});
    const parametros = new URLSearchParams(destino);
    assert.equal(grupoFiltroDesdeTexto(parametros.get('filtro')).partes.length, 5);
    assert.deepEqual(filtrosDeListaDesdeTexto(parametros.get('filtros')), filtros);
    assert.equal(destinoDeCelda({previos: [], filtros, estado: {clave: OTROS}}), null);
    assert.equal(destinoDeCelda({previos: []}), 'w=principal');
    assert.deepEqual(filtrosDeListaDesdeTexto(JSON.stringify([{...filtros[0], operator: 'equals'}, {...filtros[1], valueLabels: []}])), []);
});
