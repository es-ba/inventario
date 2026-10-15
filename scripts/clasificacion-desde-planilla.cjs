const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const raiz = path.resolve(__dirname, '..');
const planilla = process.argv[2] ?? path.join(raiz, 'local-clasificacion', 'equivalencias-grupos.xlsx');
const datos = process.argv[3] ?? path.resolve(raiz, '..', 'inventario-data', 'provisorio');

const libro = XLSX.readFile(planilla);
const hoja = (nombre) => {
    const ws = libro.Sheets[nombre];
    if (!ws) throw new Error(`falta la hoja «${nombre}» en ${planilla}`);
    return XLSX.utils.sheet_to_json(ws, {defval: ''});
};
const texto = (v) => String(v ?? '').trim();
const campoTab = (v) => texto(v).replace(/[|\r\n]+/g, ' ');

const categorias = hoja('Categorías')
    .filter((f) => texto(f['Código categoría']) && texto(f['Código categoría']) !== 'TOTAL')
    .map((f, i) => ({
        categoria: texto(f['Código categoría']),
        nombre: texto(f['Categoría']),
        incluye: texto(f['Incluye']),
        orden: i + 1,
        aparte: /^s[ií]$/i.test(texto(f['Aparte'])),
    }));
const codigosDeCategoria = new Set(categorias.map((c) => c.categoria));

const subcategorias = hoja('Subcategorías').map((f) => ({
    subcategoria: texto(f['Código subcategoría']),
    nombre: texto(f['Subcategoría']),
    categoria: texto(f['Código categoría']),
}));
const codigosDeSubcategoria = new Set(subcategorias.map((s) => s.subcategoria));

const errores = [];
for (const s of subcategorias) {
    if (!codigosDeCategoria.has(s.categoria)) errores.push(`subcategoría ${s.subcategoria}: categoría ${s.categoria} inexistente`);
}

const asignacion = new Map();
for (const f of hoja('Equivalencias')) {
    const grupo = texto(f['Grupo']);
    if (!grupo || grupo === '(vacío)') continue;
    const subcategoria = texto(f['Subcategoría corregida']) || texto(f['Subcategoría propuesta']);
    if (subcategoria && !codigosDeSubcategoria.has(subcategoria)) {
        errores.push(`grupo ${grupo}: subcategoría ${subcategoria} inexistente`);
    }
    asignacion.set(grupo, subcategoria);
}

function conSubcategoriaDelGrupo(archivo, exigirGrupo) {
    const [encabezado, ...lineas] = fs.readFileSync(archivo, 'utf8').split(/\r?\n/);
    const columnas = encabezado.split('|');
    const conSubcategoria = columnas.includes('subcategoria') ? columnas : [...columnas, 'subcategoria'];
    const posGrupo = columnas.indexOf('grupo');
    const posSub = conSubcategoria.indexOf('subcategoria');
    const salida = lineas.filter((l) => l !== '').map((l, i) => {
        const valores = l.split('|');
        if (valores.length !== columnas.length) errores.push(`${archivo}, línea ${i + 2}: tiene ${valores.length} columnas y el encabezado ${columnas.length}`);
        while (valores.length < conSubcategoria.length) valores.push('');
        const grupo = texto(valores[posGrupo]);
        if (grupo && !asignacion.has(grupo)) errores.push(`${archivo}: el grupo ${grupo} no figura en la planilla`);
        if (exigirGrupo && !grupo) errores.push(`${archivo}, línea ${i + 2}: sin grupo`);
        valores[posSub] = asignacion.get(grupo) ?? '';
        return valores.join('|');
    });
    return {archivo, lineas:[conSubcategoria.join('|'), ...salida]};
}

const grupos = conSubcategoriaDelGrupo(path.join(datos, 'grupos.tab'), true);
const bienes = conSubcategoriaDelGrupo(path.join(datos, 'bienes.tab'), false);
const gruposSalida = grupos.lineas.slice(1);

if (errores.length) {
    console.error(errores.join('\n'));
    process.exit(1);
}

const escribir = (archivo, cols, filas) => fs.writeFileSync(archivo,
    [cols.join('|'), ...filas.map((f) => cols.map((c) => campoTab(typeof f[c] === 'boolean' ? String(f[c]) : f[c])).join('|'))].join('\n') + '\n');

escribir(path.join(raiz, 'install', 'categorias.tab'), ['categoria', 'nombre', 'incluye', 'orden', 'aparte'], categorias);
escribir(path.join(raiz, 'install', 'subcategorias.tab'), ['subcategoria', 'nombre', 'categoria'], subcategorias);
for (const {archivo, lineas} of [grupos, bienes]) {
    fs.writeFileSync(archivo, lineas.join('\n') + '\n');
}

const sqlTexto = (v) => v === '' || v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
fs.writeFileSync(path.join(raiz, 'local-clasificacion', 'clasificacion-datos.sql'), [
    'INSERT INTO categorias (categoria, nombre, incluye, orden, aparte) VALUES',
    categorias.map((c) => `(${sqlTexto(c.categoria)}, ${sqlTexto(c.nombre)}, ${sqlTexto(c.incluye)}, ${c.orden}, ${c.aparte})`).join(',\n') + ';',
    '',
    'INSERT INTO subcategorias (subcategoria, nombre, categoria) VALUES',
    subcategorias.map((s) => `(${sqlTexto(s.subcategoria)}, ${sqlTexto(s.nombre)}, ${sqlTexto(s.categoria)})`).join(',\n') + ';',
    '',
    'UPDATE grupos g SET subcategoria = v.subcategoria FROM (VALUES',
    [...asignacion].map(([g, s]) => `(${sqlTexto(g)}, ${sqlTexto(s)})`).join(',\n'),
    ') AS v(grupo, subcategoria) WHERE g.grupo = v.grupo;',
    '',
].join('\n'));

console.log(`categorías ${categorias.length}, subcategorías ${subcategorias.length}, grupos ${gruposSalida.length} (${[...asignacion.values()].filter(Boolean).length} con subcategoría)`);
