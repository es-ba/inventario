const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(projectRoot, rel), 'utf8');

function cargarModulo() {
    const codigo = leer('src/client/principal/base/form-field-renderer.tsx');
    const desde = codigo.indexOf('export const CAMPO_SECTOR');
    const hasta = codigo.indexOf('\nexport function opcionesDeReferencia', desde);
    const trozo = codigo.slice(desde, hasta).replace(/^export /gm, '');
    const js = ts.transpileModule(trozo, {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText;
    // eslint-disable-next-line no-new-func
    return new Function(`${js}; return {camposDeEtiqueta};`)();
}

function etiqueta(fila, campos) {
    return campos.map(c => String(fila[c] ?? '').trim()).filter(Boolean).join(' - ');
}

test('la opción de un sector muestra a su responsable, y así se lo encuentra escribiendo el apellido', () => {
    const { camposDeEtiqueta } = cargarModulo();
    const campos = camposDeEtiqueta('sectores', ['sector'], ['nombre_sector', 'sigla']);
    const fila = {
        sector: '221', nombre_sector: 'Dirección X', sigla: 'DX',
        responsables__apellido: 'PEREZ', responsables__nombre: 'Juan',
    };
    const texto = etiqueta(fila, campos);
    assert.equal(texto, '221 - Dirección X - DX - PEREZ - Juan');
    assert.ok(texto.toLowerCase().includes('perez'));
});

test('un sector sin responsable se muestra igual', () => {
    const { camposDeEtiqueta } = cargarModulo();
    const campos = camposDeEtiqueta('sectores', ['sector'], ['nombre_sector', 'sigla']);
    assert.equal(etiqueta({ sector: '9', nombre_sector: 'Sin jefe', sigla: 'SJ' }, campos), '9 - Sin jefe - SJ');
});

test('las otras referencias no cambian su etiqueta', () => {
    const { camposDeEtiqueta } = cargarModulo();
    assert.deepEqual(camposDeEtiqueta('responsables', ['responsable'], ['apellido', 'nombre']),
        ['responsable', 'apellido', 'nombre']);
    assert.deepEqual(camposDeEtiqueta('espacios', ['espacio'], ['numero']),
        ['espacio', 'numero', 'sectores__sigla']);
});

test('los sectores traen el nombre de su responsable', () => {
    assert.match(leer('src/server/table-sectores.ts'),
        /references:'responsables', fields:\['responsable'\], displayFields:\['apellido', 'nombre'\]/);
});

function cargarCabecera() {
    const codigo = leer('src/client/principal/bien/bien-header.tsx');
    const trozo = [
        codigo.slice(codigo.indexOf('function comoTexto'), codigo.indexOf('\nconst CAMPO_DESCRIPTIVO')),
        codigo.slice(codigo.indexOf('export function responsablesDelBien'), codigo.indexOf('\nfunction estaEnAlta')),
    ].join('\n').replace(/^export /gm, '');
    const js = ts.transpileModule(trozo, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
    // eslint-disable-next-line no-new-func
    return new Function(`${js}; return {responsablesDelBien};`)();
}

test('la cabecera pone primero al responsable del sector y rotula al directo aparte', () => {
    const { responsablesDelBien } = cargarCabecera();
    assert.deepEqual(responsablesDelBien({
        responsable_sector: 'P', responsable_sector_nombre: 'PEREZ, Juan',
        responsable: 'G', responsable_nombre: 'GOMEZ, Ana',
    }), { delSector: 'PEREZ, Juan', directo: 'GOMEZ, Ana' });
});

test('sin directo, la cabecera muestra sólo el del sector', () => {
    const { responsablesDelBien } = cargarCabecera();
    assert.deepEqual(responsablesDelBien({ responsable_sector: 'P', responsable_sector_nombre: 'PEREZ, Juan' }),
        { delSector: 'PEREZ, Juan', directo: '' });
});

test('un directo igual al jefe no se repite', () => {
    const { responsablesDelBien } = cargarCabecera();
    assert.deepEqual(responsablesDelBien({
        responsable_sector: 'P', responsable_sector_nombre: 'PEREZ, Juan',
        responsable: 'P', responsable_nombre: 'PEREZ, Juan',
    }), { delSector: 'PEREZ, Juan', directo: '' });
});

test('sin sector, la cabecera muestra sólo el directo', () => {
    const { responsablesDelBien } = cargarCabecera();
    assert.deepEqual(responsablesDelBien({ responsable: 'G', responsable_nombre: 'GOMEZ, Ana' }),
        { delSector: '', directo: 'GOMEZ, Ana' });
});
