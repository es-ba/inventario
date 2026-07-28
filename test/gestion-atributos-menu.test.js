const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');

function loadGetMenu() {
    const sourcePath = path.join(projectRoot, 'src/server/app-principal.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');
    const sourceFile = ts.createSourceFile(
        sourcePath,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
    );
    const appClass = sourceFile.statements.find(
        (statement) => ts.isClassDeclaration(statement) && statement.name?.text === 'AppInventario'
    );
    const getMenuMethod = appClass?.members.find(
        (member) => ts.isMethodDeclaration(member) && member.name.getText(sourceFile) === 'getMenu'
    );

    assert.ok(getMenuMethod?.body, 'AppInventario debe definir getMenu');

    const transpiled = ts.transpileModule(
        `function getMenu(context) ${getMenuMethod.body.getText(sourceFile)}
         module.exports = getMenu;`,
        {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2020,
            },
        }
    ).outputText;
    const loadedModule = { exports: {} };

    new Function('module', 'exports', transpiled)(loadedModule, loadedModule.exports);
    return loadedModule.exports;
}

test('Gestión de datos permite acceder a las tablas de configuración de atributos', () => {
    const getMenu = loadGetMenu();
    const result = getMenu({
        user: { rol: 'admin' },
        es: { administrativo: true },
    });
    const gestion = result.menu.find((item) => item.name === 'gestion');
    const atributos = gestion?.menuContent.find((item) => item.name === 'atributos');

    assert.ok(atributos, 'Gestión de datos debe contener el submenú Atributos');
    assert.equal(atributos.menuType, 'menu');
    assert.equal(atributos.label, 'atributos');
    assert.deepEqual(
        atributos.menuContent.map(({ menuType, name, label }) => ({ menuType, name, label })),
        [
            { menuType: 'table', name: 'bienes_atributos', label: 'atributos de bienes' },
            { menuType: 'table', name: 'bienes_atributo_valores', label: 'valores posibles' },
        ]
    );
    assert.equal(
        atributos.menuContent.some((item) => item.name === 'bien_atributo'),
        false,
        'Las asignaciones por bien se administran desde el detalle del bien'
    );
});
