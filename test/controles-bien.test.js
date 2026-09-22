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

const controles = require(path.join(projectRoot, 'src/server/controles-bien.ts'));
const comun = require(path.join(projectRoot, 'src/common/controles.ts'));
const { planificarControl, ErrorControl, diasDeVigencia } = controles;

const TABLET = '1019';
const CELULAR = '1197';
const NOTEBOOK = '966';

function catalogo(grupoDelBien = TABLET) {
    return {
        items: [
            { item: 'ENCIENDE', tipo_valor: 'si_no', activo: true },
            { item: 'PANTALLA', tipo_valor: 'opcion', activo: true },
            { item: 'VERSION_SO', tipo_valor: 'texto', activo: true },
            { item: 'CHIP', tipo_valor: 'si_no', activo: true },
            { item: 'ETIQUETA', tipo_valor: 'si_no', activo: false },
        ],
        opciones: new Map([['PANTALLA', new Set(['SIN_DANOS', 'RAYADA', 'ROTA'])]]),
        gruposPorItem: comun.armarGruposPorItem([
            { item: 'CHIP', grupo: TABLET },
            { item: 'CHIP', grupo: CELULAR },
        ]),
        grupoDelBien,
        hoy: '2026-09-18',
    };
}

function rechaza(pedido, patron, cat = catalogo()) {
    assert.throws(
        () => planificarControl(pedido, cat),
        (err) => err instanceof ErrorControl && patron.test(err.message),
    );
}

const BASE = { ficha: '100' };

test('arma el plan con la fecha de hoy si no viene fecha', () => {
    const plan = planificarControl({ ...BASE, items: { ENCIENDE: 'si', VERSION_SO: ' Android 14 ' } }, catalogo());
    assert.deepEqual(plan, {
        ficha: '100', fecha: '2026-09-18', observacion: null,
        items: [{ item: 'ENCIENDE', valor: 'SI' }, { item: 'VERSION_SO', valor: 'Android 14' }],
    });
});

test('acepta los ítems como JSON, que es como viajan del cliente', () => {
    const plan = planificarControl({ ...BASE, items: '{"PANTALLA":"RAYADA"}' }, catalogo());
    assert.deepEqual(plan.items, [{ item: 'PANTALLA', valor: 'RAYADA' }]);
});

test('exige la ficha', () => {
    rechaza({}, /ficha/);
});

test('un control sin ítems ni observación es válido: el bien se vio', () => {
    assert.deepEqual(planificarControl(BASE, catalogo()).items, []);
});

test('rechaza una fecha futura', () => {
    rechaza({ ...BASE, fecha: '2026-09-19' }, /posterior a hoy/);
});

test('acepta una fecha pasada y rechaza una mal formada', () => {
    assert.equal(planificarControl({ ...BASE, fecha: '2025-03-01' }, catalogo()).fecha, '2025-03-01');
    rechaza({ ...BASE, fecha: '2025-02-30' }, /no es válida/);
    rechaza({ ...BASE, fecha: '01/03/2025' }, /no es válida/);
});

test('rechaza un ítem que no existe', () => {
    rechaza({ ...BASE, items: { BOTONES: 'SI' } }, /BOTONES no existe/);
});

test('rechaza un ítem inactivo', () => {
    rechaza({ ...BASE, items: { ETIQUETA: 'SI' } }, /ETIQUETA está inactivo/);
});

test('rechaza un ítem que no aplica al grupo del bien', () => {
    rechaza({ ...BASE, items: { CHIP: 'SI' } }, /CHIP no aplica/, catalogo(NOTEBOOK));
    rechaza({ ...BASE, items: { CHIP: 'SI' } }, /CHIP no aplica/, catalogo(null));
    assert.equal(planificarControl({ ...BASE, items: { CHIP: 'NO' } }, catalogo(CELULAR)).items[0].valor, 'NO');
});

test('un ítem sin grupos aplica a todos', () => {
    for (const grupo of [TABLET, NOTEBOOK, null]) {
        assert.equal(planificarControl({ ...BASE, items: { ENCIENDE: 'NO' } }, catalogo(grupo)).items.length, 1);
    }
});

test('un sí/no sólo admite SI o NO', () => {
    rechaza({ ...BASE, items: { ENCIENDE: 'tal vez' } }, /SI o NO/);
});

test('una opción tiene que estar en la lista del ítem', () => {
    rechaza({ ...BASE, items: { PANTALLA: 'ROTISIMA' } }, /no es una opción del ítem PANTALLA/);
});

test('los valores vacíos se descartan, aunque sean de ítems que no aplican', () => {
    const plan = planificarControl({ ...BASE, items: { ENCIENDE: '', PANTALLA: null, CHIP: '  ' } }, catalogo(NOTEBOOK));
    assert.deepEqual(plan.items, []);
});

test('rechaza ítems que no son un objeto', () => {
    rechaza({ ...BASE, items: '[1,2]' }, /formato válido/);
    rechaza({ ...BASE, items: '{roto' }, /formato válido/);
});

test('la observación se recorta y el vacío es nulo', () => {
    assert.equal(planificarControl({ ...BASE, observacion: '  golpe en la esquina ' }, catalogo()).observacion,
        'golpe en la esquina');
    assert.equal(planificarControl({ ...BASE, observacion: '   ' }, catalogo()).observacion, null);
});

test('la vigencia sale de la config y cae en 365 si falta o es inválida', () => {
    assert.equal(diasDeVigencia({ inventario: { control: { dias_vigencia: 180 } } }), 180);
    assert.equal(diasDeVigencia({ inventario: { control: { dias_vigencia: '90' } } }), 90);
    for (const config of [undefined, {}, { inventario: { control: { dias_vigencia: 0 } } },
        { inventario: { control: { dias_vigencia: -5 } } }, { inventario: { control: { dias_vigencia: 1.5 } } },
        { inventario: { control: { dias_vigencia: 'x' } } }]) {
        assert.equal(diasDeVigencia(config), 365);
    }
});

test('la config por defecto trae la vigencia de 365 días', () => {
    const fuente = fs.readFileSync(path.join(projectRoot, 'src/server/def-config.ts'), 'utf8');
    assert.match(fuente, /inventario:\s*\n\s*control:\s*\n\s*dias_vigencia:\s*365/);
});

test('el reporte de parque tecnológico usa la misma condición que el control', () => {
    const fuente = fs.readFileSync(path.join(projectRoot, 'src/server/reportes-bienes.ts'), 'utf8');
    const reporte = fuente.slice(fuente.indexOf('export function sqlParqueTecnologico'));
    assert.match(reporte, /WHERE \$\{condicionParqueTecnologico\('v'\)\}/);
    const vista = fs.readFileSync(path.join(projectRoot, 'src/server/table-bienes_control.ts'), 'utf8');
    assert.match(vista, /condicionParqueTecnologico\(/);
    const procedure = fs.readFileSync(path.join(projectRoot, 'src/server/procedures-controles.ts'), 'utf8');
    assert.match(procedure, /condicionParqueTecnologico\(/);
});

test('la vista marca vencido con más días que la vigencia y desempata por número de control', () => {
    const { sqlBienesControl } = require(path.join(projectRoot, 'src/server/table-bienes_control.ts'));
    const sql = sqlBienesControl(180);
    assert.match(sql, /WHEN uc\.fecha IS NULL THEN 'NUNCA'/);
    assert.match(sql, /WHEN current_date - uc\.fecha > 180 THEN 'VENCIDO'/);
    assert.match(sql, /ORDER BY c\.fecha DESC, c\.control DESC\s+LIMIT 1/);
    assert.match(sql, /WHERE v\.activo AND btrim\(coalesce\(v\.rubro, ''\)\) = '3'/);
});
