const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('defines the embedded React principal wScreen', () => {
    const source = read('src/client/ws-principal.tsx');
    const renderer = read('src/client/principal/render-connected-app-inventario.tsx');

    assert.match(source, /function PantallaPrincipal/);
    assert.match(source, /myOwn\.wScreens\.principal/);
    assert.match(source, /renderConnectedAppInventario/);
    assert.match(source, /unmountConnectedAppInventario/);
    assert.match(renderer, /createRoot/);
    assert.match(renderer, /connectedRoot\.unmount/);
    assert.match(renderer, /MutationObserver/);
    assert.match(renderer, /data\.reactScreen|dataset\.reactScreen/);
    assert.match(source, /Inventario - Principal/);
    assert.match(source, /aria-label="volver al menú"/);
    assert.match(source, /@mui\/material/);
    assert.match(source, /ICON\.Menu/);
    assert.match(source, /frontend-plus/);
    assert.doesNotMatch(source, /frontend-plus-react/);
});

test('publishes principal as the first menu entry', () => {
    const source = read('src/server/app-principal.ts');
    const firstMenuEntry = source.indexOf("{menuType:'principal', name:'principal', label:'principal'");
    const bienesMenu = source.indexOf("{menuType: 'menu', name: 'bienes'");

    assert.notEqual(firstMenuEntry, -1);
    assert.ok(firstMenuEntry < bienesMenu);
    assert.doesNotMatch(source, /menuType:'prueba'/);
});

test('loads React resources before the principal screen', () => {
    const source = read('src/server/app-principal.ts');
    const react = source.indexOf("module: 'react'");
    const reactDom = source.indexOf("module: 'react-dom'");
    const baseIncludes = source.indexOf('...super.clientIncludes(req, opts)');
    const adapt = source.indexOf("src: 'adapt.js'");
    const principal = source.indexOf("file: 'client/ws-principal.js'");
    const client = source.indexOf("src:'client/client.js'");
    const menuedResources = source.indexOf('... menuedResources');

    for (const position of [react, reactDom, baseIncludes, adapt, principal, client, menuedResources]) {
        assert.notEqual(position, -1);
    }
    assert.doesNotMatch(source, /module: '@mui\/material'/);
    assert.doesNotMatch(source, /module: 'frontend-plus'/);
    assert.ok(react < baseIncludes);
    assert.ok(reactDom < baseIncludes);
    assert.ok(baseIncludes < adapt);
    assert.ok(adapt < principal);
    assert.ok(principal < menuedResources);
});

test('provides modern skin fallbacks for dependency stylesheets', () => {
    const dialogPromise = read('skins/modern/dialog-promise/dialog-promise.css');
    const pikaday = read('skins/modern/pikaday/pikaday.css');

    assert.match(dialogPromise, /@import url\("\.\.\/\.\.\/dialog-promise\/dialog-promise\.css"\)/);
    assert.match(pikaday, /@import url\("\.\.\/\.\.\/pikaday\/pikaday\.css"\)/);
});

test('bundles the principal screen with MUI during every build', () => {
    const packageJson = JSON.parse(read('package.json'));
    const webpackConfig = read('webpack.config.cjs');
    const buildScript = read('scripts/build-client-bundle.cjs');

    for (const scriptName of ['build', 'build-ignore-error', 'build-cli']) {
        assert.match(packageJson.scripts[scriptName], /node scripts\/build-client-bundle\.cjs/);
        assert.match(
            packageJson.scripts[scriptName],
            /node node_modules\/mixin-patch\/bin\/mixin-patch-cli\.js/
        );
        assert.doesNotMatch(packageJson.scripts[scriptName], /&& mixin-patch &&/);
    }
    assert.equal(
        packageJson['mixin-patch'].patch,
        false,
        'mixin-patch 0.4.1 hangs on the generated frontend-plus BEAPI declaration'
    );
    assert.match(webpackConfig, /src[/\\]client[/\\]ws-principal\.tsx/);
    assert.match(webpackConfig, /dist[/\\]client[/\\]client/);
    assert.match(webpackConfig, /react-dom\/client/);
    assert.match(webpackConfig, /module:\s*'esnext'/);
    assert.match(buildScript, /webpack\(config/);
});

test('redirects successful logins to principal', () => {
    const source = read('src/server/def-config.ts');

    assert.match(source, /successRedirect: \/menu#i=principal/);
});

test('removes the obsolete prueba wScreen', () => {
    const source = read('src/client/client.ts');

    assert.doesNotMatch(source, /wScreens\.prueba/);
    assert.doesNotMatch(source, /Pantalla de prueba del inventario/);
});
