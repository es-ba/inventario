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
    REPORTES, TAREAS, destinosDisponibles, hashDeBusquedaRapida, nombreDePila, saludo,
} = require(path.join(projectRoot, 'src/client/principal/inicio/inicio-datos.ts'));

const menu = [
    {clave: 'principal', etiqueta: 'principal', hash: 'i=principal'},
    {clave: 'mis_bienes', etiqueta: 'mis bienes', hijos: [
        {clave: 'mis_bienes,a_mi_cargo', etiqueta: 'a mi cargo', hash: 'i=mis_bienes,a_mi_cargo'},
    ]},
    {clave: 'reportes', etiqueta: 'reportes', hijos: [
        {clave: 'reportes,bienes_por_sector', etiqueta: 'bienes por sector', hash: 'i=reportes,bienes_por_sector'},
        {clave: 'reportes,consulta_movimientos', etiqueta: 'consulta de movimientos', hash: 'i=reportes,consulta_movimientos'},
    ]},
    {clave: 'gestion', etiqueta: 'gestion de datos', hijos: [
        {clave: 'gestion,sectores', etiqueta: 'sectores', hash: 'i=gestion,sectores'},
    ]},
];

test('la portada ofrece sólo las tareas curadas que el menú del usuario tiene', () => {
    assert.deepEqual(destinosDisponibles(menu, TAREAS).map(destino => [destino.titulo, destino.hash]), [
        ['Buscar bienes', 'i=principal'],
        ['Mis bienes', 'i=mis_bienes,a_mi_cargo'],
    ]);
});

test('los reportes de la portada no incluyen movimientos ni lo que no está curado', () => {
    assert.deepEqual(destinosDisponibles(menu, REPORTES).map(destino => [destino.titulo, destino.hash]), [
        ['bienes por sector', 'i=reportes,bienes_por_sector'],
    ]);
    assert.equal(REPORTES.some(reporte => /movimiento/.test(reporte.nombre)), false);
});

test('saludo, nombre de pila y búsqueda rápida', () => {
    assert.equal(saludo(9), 'Buen día');
    assert.equal(saludo(15), 'Buenas tardes');
    assert.equal(saludo(22), 'Buenas noches');
    assert.equal(nombreDePila('VANESA CELESTE'), 'Vanesa');
    assert.equal(nombreDePila(null), '');
    assert.equal(hashDeBusquedaRapida('  cámara web '), 'w=principal&texto=c%C3%A1mara%20web');
    assert.equal(hashDeBusquedaRapida(''), 'w=principal');
});

test('la entrada abre el inicio', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'src/server/app-principal.ts'), 'utf8');
    assert.match(source, /var menuContent: MenuInfoBase\[\] = \[\s*\{menuType:'inicio', name:'inicio', label:'inicio', selectedByDefault:true\}/);
});
