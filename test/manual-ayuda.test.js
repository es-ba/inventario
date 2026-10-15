const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const clientDir = path.join(projectRoot, 'src/client');
const manualDir = path.join(clientDir, 'principal/ayuda/manual');

const secciones = fs.readdirSync(manualDir).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''));
const indice = fs.readFileSync(path.join(clientDir, 'principal/ayuda/manual.ts'), 'utf8');
const wScreens = fs.readdirSync(clientDir).filter(f => /^ws-.*\.tsx$/.test(f))
    .flatMap(f => [...fs.readFileSync(path.join(clientDir, f), 'utf8').matchAll(/myOwn\.wScreens\.(\w+)/g)].map(m => m[1]));

test('cada sección del manual está en el índice y empieza con su título', () => {
    for(const clave of secciones){
        assert.match(indice, new RegExp(`seccion\\('${clave}', `), `falta ${clave} en manual.ts`);
        assert.match(fs.readFileSync(path.join(manualDir, `${clave}.md`), 'utf8'), /^# \S/, `${clave}.md sin título`);
    }
});

test('los enlaces del manual llevan a secciones y pantallas que existen', () => {
    for(const clave of secciones){
        const texto = fs.readFileSync(path.join(manualDir, `${clave}.md`), 'utf8');
        for(const [, destino] of texto.matchAll(/\]\(#ayuda\/([\w-]+)\)/g)){
            assert.ok(secciones.includes(destino), `${clave}.md enlaza a la sección inexistente ${destino}`);
        }
        for(const [, pantalla] of texto.matchAll(/\]\(#w=(\w+)/g)){
            assert.ok(wScreens.includes(pantalla), `${clave}.md enlaza a la pantalla inexistente ${pantalla}`);
        }
    }
});

test('las capturas del manual existen y están importadas', () => {
    const imagenes = fs.readdirSync(path.join(manualDir, 'img'));
    for(const clave of secciones){
        const texto = fs.readFileSync(path.join(manualDir, `${clave}.md`), 'utf8');
        for(const [, nombre] of texto.matchAll(/\]\(img\/([\w.-]+)\)/g)){
            assert.ok(imagenes.includes(nombre), `${clave}.md usa la captura inexistente ${nombre}`);
            assert.ok(indice.includes(`'${nombre}':`), `falta importar ${nombre} en manual.ts`);
        }
    }
});

test('la ayuda de cada pantalla apunta a una sección del manual', () => {
    for(const f of fs.readdirSync(clientDir).filter(f => /^ws-.*\.tsx$/.test(f))){
        const fuente = fs.readFileSync(path.join(clientDir, f), 'utf8');
        const claves = [
            ...[...fuente.matchAll(/ayuda="(\w+)"/g)].map(m => m[1]),
            ...[...fuente.matchAll(/ayuda=\{([^}]*)\}/g)].flatMap(m => [...m[1].matchAll(/[?:] '(\w+)'/g)].map(c => c[1])),
        ];
        for(const clave of claves){
            assert.ok(secciones.includes(clave), `${f} pide la sección inexistente ${clave}`);
        }
    }
});
