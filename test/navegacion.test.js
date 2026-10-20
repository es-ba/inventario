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

const {entradasDeNavegacion} = require(path.join(projectRoot, 'src/client/principal/base/navegacion.ts'));

test('arma el menú de navegación con el hash i= de backend-plus', () => {
    const entradas = entradasDeNavegacion([
        {menuType: 'principal', name: 'principal', label: 'principal'},
        {menuType: 'menu', name: 'reportes', menuContent: [
            {menuType: 'bienes_por_modelo', name: 'bienes_por_modelo', label: 'bienes por marca y modelo'},
            {menuType: 'table', name: 'parque_tecnologico'},
            {menuType: 'table', name: 'oculto', visible: false},
        ]},
    ]);
    assert.deepEqual(entradas, [
        {clave: 'principal', etiqueta: 'principal', hash: 'i=principal'},
        {clave: 'reportes', etiqueta: 'reportes', hijos: [
            {clave: 'reportes,bienes_por_modelo', etiqueta: 'bienes por marca y modelo', hash: 'i=reportes,bienes_por_modelo'},
            {clave: 'reportes,parque_tecnologico', etiqueta: 'parque tecnologico', hash: 'i=reportes,parque_tecnologico'},
        ]},
    ]);
});

test('PantallaInventario abre la navegación con el ☰', () => {
    const source = fs.readFileSync(path.join(projectRoot, 'src/client/principal/base/pantalla-inventario.tsx'), 'utf8');
    assert.match(source, /aria-label="ir a otra pantalla"/);
    assert.match(source, /vinculo\('', salir\)\}>[\s\S]*primary="Volver al menú"/);
    assert.doesNotMatch(source, /aria-label="volver al menú"/);
    assert.match(source, /component="a" sx=\{\{pl:2 \+ nivel \* 2\}\} \{\.\.\.vinculo\(entrada\.hash!, salir\)\}/);
    assert.match(source, /solicitarSalida\(destino\)/);
});
