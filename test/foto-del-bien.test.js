const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const leer = rel => fs.readFileSync(path.join(projectRoot, rel), 'utf8');

require.extensions['.ts'] = function transpileTypeScript(module, filename) {
    const source = fs.readFileSync(filename, 'utf8');
    const result = ts.transpileModule(source, {
        compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        fileName: filename,
    });
    module._compile(result.outputText, filename);
};

const {medidasDeFoto, esJpeg, LADO_MAXIMO, PESO_MAXIMO} = require(path.join(projectRoot, 'src/common/fotos.ts'));

test('la foto se achica a 1600 de lado mayor, conserva la proporción y nunca se agranda', () => {
    assert.equal(LADO_MAXIMO, 1600);
    assert.deepEqual(medidasDeFoto(4000, 3000), {ancho:1600, alto:1200});
    assert.deepEqual(medidasDeFoto(3000, 4000), {ancho:1200, alto:1600});
    assert.deepEqual(medidasDeFoto(800, 600), {ancho:800, alto:600});
    assert.deepEqual(medidasDeFoto(1600, 1600), {ancho:1600, alto:1600});
    assert.deepEqual(medidasDeFoto(8000, 2), {ancho:1600, alto:1});
});

test('sólo se reconoce como foto lo que empieza como un JPEG', () => {
    assert.equal(PESO_MAXIMO, 5 * 1024 * 1024);
    assert.equal(esJpeg(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00])), true);
    assert.equal(esJpeg(Buffer.from('%PDF-1.7')), false);
    assert.equal(esJpeg(Buffer.from([0x89, 0x50, 0x4E, 0x47])), false);
    assert.equal(esJpeg(Buffer.from([0xFF, 0xD8])), false);
    assert.equal(esJpeg(Buffer.alloc(0)), false);
});

test('una foto se valida antes de guardarse y cada adjunto queda en su propio archivo', () => {
    const procedures = leer('src/server/procedures-principal.ts');
    const subir = procedures.slice(procedures.indexOf("action:'archivo_subir'"), procedures.indexOf("action:'archivo_solicitud_subir'"));
    const solicitud = procedures.slice(procedures.indexOf("action:'archivo_solicitud_subir'"), procedures.indexOf("action:'declaracion_emitir'"));
    assert.match(subir, /\{name:'es_foto', typeName:'boolean', defaultValue:false\}/);
    assert.ok(subir.indexOf('await validarFoto(file.path)') > 0);
    assert.ok(subir.indexOf('await validarFoto(file.path)') < subir.indexOf('insert into adjuntos_bienes'));
    assert.match(subir, /nextval\('numero_adjunto_seq'\)/);
    assert.match(subir, /rutaDeAdjunto\(parameters\.ficha, numero, esFoto \? NOMBRE_DE_FOTO : file\.originalFilename\)/);
    assert.match(solicitud, /nextval\('adjuntos_solicitudes_numero_adjunto_seq'\)/);
    assert.match(solicitud, /rutaDeAdjunto\(`solicitudes\/\$\{parameters\.acta\}`, numero, file\.originalFilename\)/);
    for (const fuente of [subir, solicitud]) {
        assert.equal(/\$\{originalFilename\}|overwrite:true/.test(fuente), false);
        assert.match(fuente, /overwrite:false/);
    }
    const validar = procedures.slice(procedures.indexOf('async function validarFoto'), procedures.indexOf('function numeroDeActa'));
    assert.match(validar, /size > PESO_MAXIMO/);
    assert.match(validar, /!esJpeg\(inicio\)/);
    assert.match(validar, /throw new Error\(motivo\)/);
});

test('la foto del bien viaja en la fila, fuera de las columnas de la búsqueda y del conteo rápido', () => {
    const {bienes, sqlBienesConControl} = require(path.join(projectRoot, 'src/server/table-bienes.ts'));
    const {selectBienesGridFields} = require(path.join(projectRoot, 'src/common/bienes-busqueda.ts'));
    assert.match(sqlBienesConControl(365), /\(SELECT max\(ab\.numero_adjunto\) FROM adjuntos_bienes ab WHERE ab\.ficha = v\.ficha AND ab\.es_foto\) AS foto/);
    const tabla = bienes({be:{config:{inventario:{control:{dias_vigencia:365}}}}, es:{administrativo:true}, user:{rol:'admin'}});
    const campo = tabla.fields.find(field => field.name === 'foto');
    assert.equal(campo.inTable, false);
    assert.equal(campo.editable, false);
    assert.equal(campo.title, 'foto');
    assert.ok(tabla.hiddenColumns.includes('foto'));
    assert.equal(selectBienesGridFields(tabla.fields).some(field => field.name === 'foto'), false);
    const {adjuntos_bienes} = require(path.join(projectRoot, 'src/server/table-adjuntos_bienes.ts'));
    const adjuntos = adjuntos_bienes({es:{administrativo:true}, user:{usuario:'u'}});
    const esFoto = adjuntos.fields.find(field => field.name === 'es_foto');
    assert.deepEqual(
        {typeName:esFoto.typeName, nullable:esFoto.nullable, defaultDbValue:esFoto.defaultDbValue, editable:esFoto.editable},
        {typeName:'boolean', nullable:false, defaultDbValue:'false', editable:false},
    );
});

test('el componente de la foto abre la cámara, sube como foto y sólo se ofrece a quien puede guardar', () => {
    const componente = leer('src/client/principal/bien/foto-del-bien.tsx');
    assert.match(componente, /type="file"\s+accept="image\/\*"\s+capture="environment"\s+hidden/);
    assert.match(componente, /createImageBitmap\(archivo, \{imageOrientation:'from-image'\}\)/);
    assert.match(componente, /medidasDeFoto\(imagen\.width, imagen\.height\)/);
    assert.match(componente, /toBlob\(resolver, 'image\/jpeg', 0\.8\)/);
    assert.match(componente, /conn\.ajax\.archivo_subir\(\{ficha, es_foto:true, files:\[foto\]\}\)/);
    assert.match(componente, /const sacar = puedeSacar && permisos\.guardar && ficha !== '';/);
    assert.match(componente, /if\(!hayFoto && !sacar\)\{\s*return null;\s*\}/);
    assert.match(componente, /download\/adjunto_bien\?ficha=\$\{encodeURIComponent\(ficha\)\}&numero_adjunto=/);
    assert.match(componente, /onError=\{\(\) => setRota\(url\)\}/);
    assert.match(componente, /No pude leer la imagen/);
    assert.match(componente, /mostrarError\(err, 'No se pudo guardar la foto'\)/);
});

test('la foto se ve en la ficha, la vista rápida, el control y el escaneo, y sólo se saca donde corresponde', () => {
    const encabezado = leer('src/client/principal/bien/bien-header.tsx');
    assert.match(encabezado, /<FotoDelBien ficha=\{ficha\} numero=\{row\.foto\} puedeSacar=\{puedeSacarFoto\} lado=\{72\}\/>/);
    assert.match(leer('src/client/principal/bien/bien-formulario.tsx'), /puedeSacarFoto=\{guardado\}/);
    const rapida = leer('src/client/principal/bien/vista-rapida-bien.tsx');
    assert.match(rapida, /<FotoDelBien ficha=\{ficha!\} numero=\{fila\.foto\} lado=\{160\}\/>/);
    assert.equal(/puedeSacar/.test(rapida), false);
    const control = leer('src/client/principal/control/control-bien.tsx');
    assert.match(control, /<FotoDelBien ficha=\{String\(bienCompleto\.ficha\)\} numero=\{bienCompleto\.foto\} puedeSacar lado=\{120\}\/>/);
    assert.ok(control.indexOf('<FotoDelBien') > control.indexOf('Estado actual'));
    const escaneo = leer('src/client/principal/escanear/escanear-bien.tsx');
    assert.match(escaneo, /<FotoDelBien ficha=\{String\(bien\.ficha\)\} numero=\{bien\.foto\} puedeSacar lado=\{120\}\/>/);
});

test('la lista de adjuntos muestra el nombre original y la miniatura de las fotos', () => {
    const {nombreDeAdjunto} = require(path.join(projectRoot, 'src/client/principal/base/formato-valores.ts'));
    assert.equal(nombreDeAdjunto('1234/remito.pdf', 101), 'remito.pdf');
    assert.equal(nombreDeAdjunto('1234/101-remito.pdf', 101), 'remito.pdf');
    assert.equal(nombreDeAdjunto('solicitudes/7/105-acta firmada.pdf', '105'), 'acta firmada.pdf');
    assert.equal(nombreDeAdjunto('1234/2024-informe.pdf', 101), '2024-informe.pdf');
    assert.equal(nombreDeAdjunto('1234/101-foto.jpg', 101), 'foto.jpg');
    assert.equal(nombreDeAdjunto('1234/101-', 101), '101-');
    assert.equal(nombreDeAdjunto(null, 101), '');
    const panel = leer('src/client/principal/base/adjuntos-panel.tsx');
    assert.match(panel, /\{fila\.es_foto\s*\? <Box\s+component="img"\s+src=\{urlDescarga\(fila\)\}/);
    assert.equal(/nombreDeArchivo/.test(panel), false);
    assert.equal(panel.match(/nombreDeAdjunto\(fila\.archivo, fila\[campoNumero\]\)/g).length, 3);
});
